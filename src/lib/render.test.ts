// src/lib/render.test.ts
// Tests for render.ts: resolveOutputPaths unit tests + ATS PDF text-extraction
// Run with: npx tsx --test src/lib/render.test.ts
// NOTE: ATS extraction tests launch Puppeteer once (shared browser in before/after).

import assert from "node:assert/strict";
import { readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, before, after } from "node:test";

import puppeteer from "puppeteer";
import type { Browser } from "puppeteer";
import { PDFParse } from "pdf-parse";

import type { ResumeData } from "../schema/resume.js";
import { renderAts, resolveOutputPaths } from "./render.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

// ---------------------------------------------------------------------------
// resolveOutputPaths unit tests — pure function, no Puppeteer
// ---------------------------------------------------------------------------

describe("resolveOutputPaths", () => {
  // Test 1: absolute path — same directory as input, correct suffix pattern (D-O01 + D-O02)
  it("Test 1: /tmp/foo/my-resume.md → my-resume-resume.pdf / my-resume-resume-ats.pdf in same dir", () => {
    const paths = resolveOutputPaths("/tmp/foo/my-resume.md");
    assert.equal(
      paths.designed,
      "/tmp/foo/my-resume-resume.pdf",
      "designed path must be in same directory with -resume.pdf suffix",
    );
    assert.equal(
      paths.ats,
      "/tmp/foo/my-resume-resume-ats.pdf",
      "ats path must be in same directory with -resume-ats.pdf suffix",
    );
  });

  // Test 2: relative path — dirname preserved, basenames use correct stem
  it("Test 2: ./notes/alex.md → ./notes dir with alex-resume.pdf / alex-resume-ats.pdf", () => {
    const paths = resolveOutputPaths("./notes/alex.md");
    assert.equal(
      basename(paths.designed),
      "alex-resume.pdf",
      "designed basename must be alex-resume.pdf",
    );
    assert.equal(
      basename(paths.ats),
      "alex-resume-ats.pdf",
      "ats basename must be alex-resume-ats.pdf",
    );
    // Both paths must share the same directory
    assert.equal(
      dirname(paths.designed),
      dirname(paths.ats),
      "designed and ats must be in the same directory",
    );
  });

  // Test 3: stem with internal dots — only trailing .md stripped (Node basename semantics)
  it("Test 3: /x/2026.q3-resume.md → stem is 2026.q3-resume, suffix appended correctly", () => {
    const paths = resolveOutputPaths("/x/2026.q3-resume.md");
    assert.equal(
      paths.designed,
      "/x/2026.q3-resume-resume.pdf",
      "only trailing .md must be stripped from stem",
    );
    assert.equal(
      paths.ats,
      "/x/2026.q3-resume-resume-ats.pdf",
      "ats path must use same stem",
    );
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
    assert.ok(
      extractedText.includes("Acme Corp"),
      `ATS PDF text must include company "Acme Corp"`,
    );
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
    assert.ok(
      extractedText.includes("UCLA"),
      `ATS PDF text must include institution "UCLA"`,
    );
    assert.ok(
      extractedText.includes("2014"),
      `ATS PDF text must include year "2014"`,
    );
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
    assert.ok(
      extractedText.includes("Tools"),
      `ATS PDF text must include skill category "Tools"`,
    );
    assert.ok(
      extractedText.includes("Docker"),
      `ATS PDF text must include skill item "Docker"`,
    );
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
