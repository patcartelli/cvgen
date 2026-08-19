// src/lib/render.test.ts
// Tests for render.ts: resolveOutputPaths unit tests + ATS PDF text-extraction
// Run with: npx tsx --test src/lib/render.test.ts
// NOTE: ATS extraction tests launch Puppeteer once (shared browser in before/after).

import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";
import type { Browser } from "puppeteer";
import puppeteer from "puppeteer";

import type { ResumeData } from "../schema/resume.js";
import {
  renderAts,
  renderDesigned,
  resolveOutputPaths,
  toCompanySlug,
  toNameSlug,
} from "./render.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

// ---------------------------------------------------------------------------
// resolveOutputPaths unit tests — pure function, no Puppeteer
// ---------------------------------------------------------------------------

describe("toNameSlug", () => {
  it("Test 1: converts full name to lowercase underscore slug", () => {
    assert.equal(toNameSlug("Pat Cartelli"), "pat_cartelli");
  });
  it("Test 2: handles multiple spaces", () => {
    assert.equal(toNameSlug("Patrick  James  Cartelli"), "patrick_james_cartelli");
  });
  it("Test 3: preserves hyphens in hyphenated names", () => {
    assert.equal(toNameSlug("J. Smith-Jones"), "j_smith-jones");
  });
  it("Test 4: strips leading/trailing underscores", () => {
    assert.equal(toNameSlug("  Alex Rivera  "), "alex_rivera");
  });
});

describe("resolveOutputPaths", () => {
  // Test 1: no company slug — name only
  it("Test 1: resolves paths using candidate name, no company suffix", () => {
    const paths = resolveOutputPaths("Pat Cartelli", "/some/output/dir");
    assert.equal(
      paths.designed,
      "/some/output/dir/pat_cartelli-resume.pdf",
      "designed path must use name slug with -resume.pdf suffix",
    );
    assert.equal(
      paths.ats,
      "/some/output/dir/pat_cartelli-resume-ats.pdf",
      "ats path must use name slug with -resume-ats.pdf suffix",
    );
  });

  // Test 2: with company slug appended to filename
  it("Test 2: appends company slug to filename when provided", () => {
    const paths = resolveOutputPaths("Alex Rivera", "/out/Acme-Corp", "Acme-Corp");
    assert.equal(
      basename(paths.designed),
      "alex_rivera-resume-Acme-Corp.pdf",
      "designed basename must include name and company slug",
    );
    assert.equal(
      basename(paths.ats),
      "alex_rivera-resume-Acme-Corp-ats.pdf",
      "ats basename must include name and company slug",
    );
    assert.equal(
      dirname(paths.designed),
      dirname(paths.ats),
      "designed and ats must be in the same directory",
    );
  });

  // Test 3: multi-word name with special chars
  it("Test 3: handles name with punctuation correctly", () => {
    const paths = resolveOutputPaths("J. Smith-Jones", "/out");
    assert.equal(
      paths.designed,
      "/out/j_smith-jones-resume.pdf",
      "dots become underscores, hyphens preserved",
    );
    assert.equal(paths.ats, "/out/j_smith-jones-resume-ats.pdf", "ats path uses same slug");
  });

  // Test 4: date appended after company slug
  it("Test 4: appends date after company slug when both provided", () => {
    const paths = resolveOutputPaths("Pat Cartelli", "/out/EZCater", "EZCater", "2026-07-31");
    assert.equal(basename(paths.designed), "pat_cartelli-resume-EZCater-2026-07-31.pdf");
    assert.equal(basename(paths.ats), "pat_cartelli-resume-EZCater-2026-07-31-ats.pdf");
  });

  // Test 5: date only, no company
  it("Test 5: appends date when no company slug provided", () => {
    const paths = resolveOutputPaths("Pat Cartelli", "/out", undefined, "2026-07-31");
    assert.equal(basename(paths.designed), "pat_cartelli-resume-2026-07-31.pdf");
    assert.equal(basename(paths.ats), "pat_cartelli-resume-2026-07-31-ats.pdf");
  });
});

// ---------------------------------------------------------------------------
// toCompanySlug unit tests — pure function, no I/O
// ---------------------------------------------------------------------------

describe("toCompanySlug", () => {
  it("spaces to hyphens, casing preserved (D-01)", () => {
    assert.equal(toCompanySlug("Acme Corp"), "Acme-Corp");
    assert.equal(toCompanySlug("Goldman Sachs"), "Goldman-Sachs");
  });

  it("strips special chars without replacement (D-02)", () => {
    assert.equal(toCompanySlug("Goldman Sachs & Partners"), "Goldman-Sachs-Partners");
    assert.equal(toCompanySlug("AT&T"), "ATT");
    assert.equal(toCompanySlug("Company, Inc."), "Company-Inc");
  });

  it("trims leading/trailing whitespace and collapses internal spaces", () => {
    assert.equal(toCompanySlug("  Spaces  Around  "), "Spaces-Around");
  });

  it("returns empty string for all-special or empty input (guard case)", () => {
    assert.equal(toCompanySlug("!!!"), "");
    assert.equal(toCompanySlug(""), "");
  });
});

// ---------------------------------------------------------------------------
// renderAts PDF text-extraction tests (shared Puppeteer lifecycle via before/after)
// ---------------------------------------------------------------------------

describe("renderAts pdf-parse extraction", () => {
  let browser: Browser;
  let tmpDir: string;
  let extractedText: string;

  before(async () => {
    // Launch a shared browser for this entire describe block — ~500ms, only once
    browser = await puppeteer.launch({ headless: true });

    // Create temp directory and render the ATS PDF once
    tmpDir = await mkdtemp(join(tmpdir(), "cvgen-test-"));
    const atsOutputPath = join(tmpDir, "test-resume-ats.pdf");

    // Read fixture via readFile + JSON.parse (not JSON import assertions — unstable across Node minor)
    const fixtureRaw = await readFile(resolve(root, "fixtures/sample-resume.json"), "utf8");
    const data = JSON.parse(fixtureRaw) as ResumeData;

    // Render the ATS PDF from the fixture
    await renderAts(data, atsOutputPath, browser);

    // Log path so human-verify checkpoint can locate the file if needed
    console.log(`[render.test.ts] ATS PDF written to: ${atsOutputPath}`);

    // Extract text via pdf-parse — done once, stored in module-scope variable
    const pdfBuffer = await readFile(atsOutputPath);
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    await parser.destroy();
    extractedText = result.text;
    // NOTE: temp directory NOT deleted — preserved for Task 2 human-verify checkpoint inspection
  });

  after(async () => {
    await browser.close();
  });

  // Test A: candidate name present
  it("Test A: extracted text includes candidate name (Alex Rivera)", () => {
    assert.ok(
      extractedText.includes("Alex Rivera"),
      `ATS PDF text must include candidate name "Alex Rivera"`,
    );
  });

  // Test B: full contact block present
  it("Test B: extracted text includes full contact block (email, phone, location, linkedin, github)", () => {
    assert.ok(
      extractedText.includes("alex@example.com"),
      `ATS PDF text must include email "alex@example.com"`,
    );
    assert.ok(
      extractedText.includes("(555) 000-0000"),
      `ATS PDF text must include phone "(555) 000-0000"`,
    );
    assert.ok(
      extractedText.includes("San Francisco, CA"),
      `ATS PDF text must include location "San Francisco, CA"`,
    );
    assert.ok(
      extractedText.includes("linkedin.com/in/alexrivera"),
      `ATS PDF text must include linkedin "linkedin.com/in/alexrivera"`,
    );
    assert.ok(
      extractedText.includes("github.com/alexrivera"),
      `ATS PDF text must include github "github.com/alexrivera"`,
    );
  });

  // Test C: summary present
  it("Test C: extracted text includes summary substring", () => {
    assert.ok(
      extractedText.includes("Senior software engineer with 10 years"),
      `ATS PDF text must include summary substring "Senior software engineer with 10 years"`,
    );
  });

  // Test D: every experience role/company pair present
  it("Test D: extracted text includes every experience role/company pair", () => {
    assert.ok(
      extractedText.includes("Senior Engineer"),
      `ATS PDF text must include role "Senior Engineer"`,
    );
    assert.ok(extractedText.includes("Acme Corp"), `ATS PDF text must include company "Acme Corp"`);
    assert.ok(
      extractedText.includes("Platform Consultant"),
      `ATS PDF text must include role "Platform Consultant"`,
    );
    assert.ok(
      extractedText.includes("Tech Partners LLC"),
      `ATS PDF text must include company "Tech Partners LLC"`,
    );
  });

  // Test E: key experience bullets present
  it("Test E: extracted text includes key experience bullet substrings", () => {
    assert.ok(
      extractedText.includes("Reduced API latency by 40%"),
      `ATS PDF text must include bullet "Reduced API latency by 40%"`,
    );
    assert.ok(
      extractedText.includes("Designed event-driven microservices"),
      `ATS PDF text must include bullet "Designed event-driven microservices"`,
    );
  });

  // Test F: education entry present
  it("Test F: extracted text includes education entry (degree, institution, year)", () => {
    assert.ok(
      extractedText.includes("B.S. Computer Science"),
      `ATS PDF text must include degree "B.S. Computer Science"`,
    );
    assert.ok(extractedText.includes("UCLA"), `ATS PDF text must include institution "UCLA"`);
    assert.ok(extractedText.includes("2014"), `ATS PDF text must include year "2014"`);
  });

  // Test G: skill categories and at least one item per category present
  it("Test G: extracted text includes skill categories and at least one item per category", () => {
    assert.ok(
      extractedText.includes("Languages"),
      `ATS PDF text must include skill category "Languages"`,
    );
    assert.ok(
      extractedText.includes("TypeScript"),
      `ATS PDF text must include skill item "TypeScript"`,
    );
    assert.ok(extractedText.includes("Tools"), `ATS PDF text must include skill category "Tools"`);
    assert.ok(extractedText.includes("Docker"), `ATS PDF text must include skill item "Docker"`);
  });

  // Test H: linear reading order — direct proof of ROADMAP Success Criterion #3 (T-03-04 mitigation)
  it("Test H: linear reading order — name → email → experience → education → skills", () => {
    const nameIdx = extractedText.indexOf("Alex Rivera");
    const emailIdx = extractedText.indexOf("alex@example.com");
    const roleIdx = extractedText.indexOf("Senior Engineer");
    const degreeIdx = extractedText.indexOf("B.S. Computer Science");
    const skillCatIdx = extractedText.indexOf("Languages");

    assert.ok(nameIdx !== -1, '"Alex Rivera" must appear in extracted text');
    assert.ok(emailIdx !== -1, '"alex@example.com" must appear in extracted text');
    assert.ok(roleIdx !== -1, '"Senior Engineer" must appear in extracted text');
    assert.ok(degreeIdx !== -1, '"B.S. Computer Science" must appear in extracted text');
    assert.ok(skillCatIdx !== -1, '"Languages" must appear in extracted text');

    assert.ok(
      nameIdx < emailIdx,
      `name (${nameIdx}) must appear before email (${emailIdx}) in reading order`,
    );
    assert.ok(
      emailIdx < roleIdx,
      `email (${emailIdx}) must appear before experience role (${roleIdx}) in reading order`,
    );
    assert.ok(
      roleIdx < degreeIdx,
      `experience role (${roleIdx}) must appear before education degree (${degreeIdx}) in reading order`,
    );
    assert.ok(
      degreeIdx < skillCatIdx,
      `education degree (${degreeIdx}) must appear before skills category (${skillCatIdx}) in reading order`,
    );
  });
});

const nestedResume: ResumeData = {
  contact: {
    name: "Patrick Cartelli",
    email: "patrick@studiocartelli.com",
    phone: "+1 555 010 1234",
    location: "Example City, NJ",
    linkedin: "linkedin.com/in/patrick-cartelli",
    github: "github.com/patcartelli",
    website: "studiocartelli.com",
  },
  selectedWork: { url: "studiocartelli.com/work", password: "fixture-password" },
  summary: "Product designer and design engineer.",
  experience: [
    {
      role: "Product Design Consultant",
      company: "Studio Cartelli",
      startDate: "January 2026",
      endDate: "Present",
      bullets: ["Built studiocartelli.com in production Astro."],
      engagements: [
        {
          client: "Bluefish AI",
          role: "Senior Product Designer",
          startDate: "April 2026",
          endDate: "June 2026",
          bullets: ["Defined what optimized meant."],
        },
      ],
    },
  ],
  education: [
    {
      degree: "B.F.A. New Media Design",
      institution: "Rochester Institute of Technology",
      year: "2008",
    },
  ],
  skills: [{ category: "Design", items: ["Figma"] }],
};

describe("designed PDF nested engagements and selected work", () => {
  let browser: Browser;
  let extractedText: string;

  before(async () => {
    browser = await puppeteer.launch({ headless: true });
    const tmpDir = await mkdtemp(join(tmpdir(), "cvgen-designed-"));
    const outputPath = join(tmpDir, "nested-resume.pdf");
    await renderDesigned(nestedResume, outputPath, browser);
    const pdfBuffer = await readFile(outputPath);
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    await parser.destroy();
    extractedText = result.text;
  });

  after(async () => {
    await browser.close();
  });

  it("prints selected work with password in the header", () => {
    assert.ok(extractedText.includes("Selected work:"), "must include Selected work label");
    assert.ok(extractedText.includes("studiocartelli.com/work"), "must include selected-work URL");
    assert.ok(extractedText.includes("fixture-password"), "must include selected-work password");
  });

  it("nests the client under the parent company instead of listing it as a sibling job", () => {
    assert.ok(extractedText.includes("Studio Cartelli, Product Design Consultant"));
    assert.ok(extractedText.includes("Bluefish AI, Senior Product Designer"));
    const studioIdx = extractedText.indexOf("Studio Cartelli, Product Design Consultant");
    const bluefishIdx = extractedText.indexOf("Bluefish AI, Senior Product Designer");
    assert.ok(studioIdx < bluefishIdx, "parent must appear before nested engagement");
  });

  it("does not use an em dash between company and role or in dates", () => {
    assert.ok(!extractedText.includes("\u2014"), `em dash found in: ${extractedText}`);
    assert.ok(extractedText.includes("January 2026 \u2013 Present"));
  });
});

describe("ATS PDF nested engagements use en dashes and selected work", () => {
  let browser: Browser;
  let extractedText: string;

  before(async () => {
    browser = await puppeteer.launch({ headless: true });
    const tmpDir = await mkdtemp(join(tmpdir(), "cvgen-ats-nested-"));
    const outputPath = join(tmpDir, "nested-resume-ats.pdf");
    await renderAts(nestedResume, outputPath, browser);
    const pdfBuffer = await readFile(outputPath);
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    await parser.destroy();
    extractedText = result.text;
  });

  after(async () => {
    await browser.close();
  });

  it("prints selected work and a client-engagement line", () => {
    assert.ok(extractedText.includes("Selected work:"));
    assert.ok(extractedText.includes("Client engagement"));
    assert.ok(extractedText.includes("Bluefish AI"));
    assert.ok(!extractedText.includes("\u2014"), `em dash found in: ${extractedText}`);
  });
});
