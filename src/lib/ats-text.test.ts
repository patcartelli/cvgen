// src/lib/ats-text.test.ts
// Tests for serializeAtsTxt / serializeAtsMd. No Puppeteer.
// Run with: npx tsx --test src/lib/ats-text.test.ts

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import type { ResumeData } from "../schema/resume.js";
import { ResumeSchema } from "../schema/resume.js";
import { serializeAtsMd, serializeAtsTxt } from "./ats-text.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

const FORBIDDEN_SERIALIZER_CHARS = /[\t\u2022\u2013\u2014\u2500-\u257F]/;

async function loadFixture(name: string): Promise<ResumeData> {
  const raw = await readFile(resolve(root, `fixtures/${name}`), "utf8");
  return ResumeSchema.parse(JSON.parse(raw));
}

function forbiddenIntroducedBySerializer(output: string, source: ResumeData): string[] {
  const sourceText = JSON.stringify(source);
  const found: string[] = [];
  for (const match of output.matchAll(new RegExp(FORBIDDEN_SERIALIZER_CHARS, "g"))) {
    const ch = match[0];
    if (ch !== undefined && !sourceText.includes(ch)) {
      found.push(`U+${ch.codePointAt(0)?.toString(16).toUpperCase()}`);
    }
  }
  return found;
}

function assertNoDanglingSeparators(serialized: string, label: string): void {
  for (const line of serialized.split("\n")) {
    assert.ok(!/^\s*\|\s*$/.test(line), `${label}: line is only a pipe: ${JSON.stringify(line)}`);
    assert.ok(!/ \|$/.test(line), `${label}: trailing dangling " |": ${JSON.stringify(line)}`);
    assert.ok(!/^\| /.test(line), `${label}: leading dangling "| ": ${JSON.stringify(line)}`);
    // Per-line so consecutive **heading** blocks (`**\n\n**`) are not false positives.
    assert.ok(
      !/\*\*[ \t]*\*\*/.test(line),
      `${label}: empty bold fragment on line ${JSON.stringify(line)}`,
    );
  }
}

function assertSingleTrailingNewline(serialized: string, label: string): void {
  assert.ok(serialized.endsWith("\n"), `${label} must end with a newline`);
  assert.ok(!serialized.endsWith("\n\n"), `${label} must not end with consecutive newlines`);
}

function parentalLeaveLine(serialized: string): string {
  const line = serialized.split("\n").find((l) => l.includes("Parental Leave"));
  assert.ok(line, "must include Parental Leave");
  return line;
}

function lineAfter(serialized: string, needle: string): string | undefined {
  const lines = serialized.split("\n");
  const idx = lines.findIndex((l) => l.includes(needle));
  assert.ok(idx >= 0, `expected a line containing ${JSON.stringify(needle)}`);
  return lines[idx + 1];
}

describe("serializeAtsTxt / serializeAtsMd", () => {
  it("sample-resume: txt has name, pipe contact, SUMMARY, hyphen bullets, ASCII date range", async () => {
    const data = await loadFixture("sample-resume.json");
    const txt = serializeAtsTxt(data);

    assert.ok(txt.includes("Alex Rivera"), "txt must contain candidate name");
    assert.ok(
      txt.includes(
        "alex@example.com | (555) 000-0000 | San Francisco, CA | linkedin.com/in/alexrivera | github.com/alexrivera",
      ),
      "txt contact line must join present fields with ' | '",
    );
    assert.match(txt, /^SUMMARY$/m);
    assert.ok(txt.includes("- Reduced API latency by 40%"), "hyphen bullets start with '- '");
    assert.ok(txt.includes("Jan 2022 - Present"), "ASCII hyphen date range");
    assert.ok(!txt.includes("Alex Rivera |"), "name must not be on the pipe contact line");
    assertNoDanglingSeparators(txt, "sample txt");
    assertSingleTrailingNewline(txt, "sample txt");
  });

  it("sample-resume: md starts with # name, uses ## sections and - bullets, no HTML entities or tables", async () => {
    const data = await loadFixture("sample-resume.json");
    const md = serializeAtsMd(data);

    assert.ok(md.startsWith("# Alex Rivera\n"), "md must start with '# Alex Rivera'");
    assert.match(md, /^## Summary$/m);
    assert.match(md, /^## Experience$/m);
    assert.match(md, /^## Education$/m);
    assert.match(md, /^## Skills$/m);
    assert.ok(md.includes("- Reduced API latency by 40%"), "md bullets start with '- '");
    assert.ok(!md.includes("&lt;"), "md must not HTML-escape <");
    assert.ok(!md.includes("&amp;"), "md must not HTML-escape &");
    assert.ok(!md.includes("&gt;"), "md must not HTML-escape >");
    assert.ok(!md.includes("&lt;table"), "md must not contain an escaped table tag");
    assert.ok(!md.includes("<table"), "md must not contain a table tag");
    assert.ok(!md.includes("<img"), "md must not contain an img tag");
    assertNoDanglingSeparators(md, "sample md");
    assertSingleTrailingNewline(md, "sample md");
  });

  it("all three fixtures serialize without empty headers or dangling separators", async () => {
    const names = [
      "sample-resume.json",
      "ez-cater-tailored.json",
      "two-column-acceptance.json",
    ] as const;
    for (const name of names) {
      const data = await loadFixture(name);
      const txt = serializeAtsTxt(data);
      const md = serializeAtsMd(data);
      assert.ok(txt.includes(data.contact.name), `${name} txt must include name`);
      assert.ok(md.includes(`# ${data.contact.name}`), `${name} md must include h1 name`);
      assertNoDanglingSeparators(txt, `${name} txt`);
      assertNoDanglingSeparators(md, `${name} md`);
      assertSingleTrailingNewline(txt, `${name} txt`);
      assertSingleTrailingNewline(md, `${name} md`);
      const introduced = forbiddenIntroducedBySerializer(txt, data);
      assert.deepEqual(introduced, [], `${name} txt introduced forbidden chars: ${introduced}`);
    }
  });

  it("txt serializer-owned punctuation has no tab, glyph bullet, en/em dash, or box-drawing", async () => {
    const data = await loadFixture("sample-resume.json");
    const txt = serializeAtsTxt(data);
    assert.equal(
      forbiddenIntroducedBySerializer(txt, data).length,
      0,
      "sample txt must not introduce forbidden punctuation",
    );
    assert.ok(!txt.includes("\t"), "no tabs");
    assert.ok(!txt.includes("\u2022"), "no glyph bullets");
  });

  it("two-column-acceptance includes headline, website, industry, via, location, nested engagement, selected work", async () => {
    const data = await loadFixture("two-column-acceptance.json");
    const txt = serializeAtsTxt(data);
    const md = serializeAtsMd(data);

    for (const serialized of [txt, md]) {
      assert.ok(serialized.includes("Senior Product Designer"), "headline");
      assert.ok(serialized.includes("studiocartelli.com"), "website");
      assert.ok(serialized.includes("Product and design consultancy"), "industry");
      assert.ok(serialized.includes("Client engagement"), "via");
      assert.ok(serialized.includes("Remote"), "location");
      assert.ok(serialized.includes("Selected work: studiocartelli.com/work"), "selected work url");
      assert.ok(serialized.includes("(password: fixture-password)"), "selected work password");
      const expStart = Math.max(
        serialized.indexOf("EXPERIENCE"),
        serialized.indexOf("## Experience"),
      );
      const studioIdx = serialized.indexOf("Studio Cartelli", expStart);
      const bluefishIdx = serialized.indexOf("Bluefish AI", studioIdx);
      assert.ok(
        studioIdx >= 0 && bluefishIdx > studioIdx,
        "Bluefish AI nests after Studio Cartelli",
      );
    }

    const headlineLine = txt.split("\n")[1];
    assert.equal(
      headlineLine,
      "Senior Product Designer",
      "headline is a plain line under the name",
    );
    assert.ok(!txt.includes("# Senior Product Designer"), "headline is not a heading in txt");
    const mdLines = md.split("\n");
    assert.equal(mdLines[0], "# Patrick Cartelli");
    assert.equal(mdLines[1], "Senior Product Designer", "md headline is a plain paragraph");
  });

  it("Parental Leave omits empty role/header fragments and empty lists", async () => {
    for (const name of ["two-column-acceptance.json", "ez-cater-tailored.json"] as const) {
      const data = await loadFixture(name);
      const txt = serializeAtsTxt(data);
      const md = serializeAtsMd(data);

      for (const serialized of [txt, md]) {
        const line = parentalLeaveLine(serialized);
        assert.ok(line.includes("Parental Leave"), `${name}: company present`);
        assert.ok(/July 2025/.test(line), `${name}: start date present`);
        assert.ok(
          !line.startsWith(" | "),
          `${name}: line must not start with empty role separator`,
        );
        assert.ok(!/^\*\*\s*\|/.test(line), `${name}: no empty bold then pipe`);
        assert.ok(!/\*\*[ \t]*\*\*/.test(line), `${name}: no empty bold fragment`);
        const next = lineAfter(serialized, "Parental Leave");
        assert.ok(
          next === "" || (next !== undefined && next !== "- " && !/^-\s*$/.test(next)),
          `${name}: no empty list after Parental Leave, got ${JSON.stringify(next)}`,
        );
      }
    }
  });

  it("omits optional and empty required-array sections", async () => {
    const sample = await loadFixture("sample-resume.json");
    const data: ResumeData = {
      ...sample,
      education: [],
      skills: [],
    };
    delete data.summary;
    delete data.coreCompetencies;

    const txt = serializeAtsTxt(data);
    const md = serializeAtsMd(data);

    assert.ok(!/^SUMMARY$/m.test(txt), "txt omits SUMMARY");
    assert.ok(!/^CORE COMPETENCIES$/m.test(txt), "txt omits CORE COMPETENCIES");
    assert.ok(!/^EDUCATION$/m.test(txt), "txt omits EDUCATION");
    assert.ok(!/^SKILLS$/m.test(txt), "txt omits SKILLS");
    assert.ok(!/^## Summary$/m.test(md), "md omits ## Summary");
    assert.ok(!/^## Core Competencies$/m.test(md), "md omits ## Core Competencies");
    assert.ok(!/^## Education$/m.test(md), "md omits ## Education");
    assert.ok(!/^## Skills$/m.test(md), "md omits ## Skills");
    assert.match(txt, /^EXPERIENCE$/m);
    assert.match(md, /^## Experience$/m);
    assert.ok(!txt.includes("Selected work:"), "sample has no selectedWork");
    assert.ok(!/^ADDITIONAL EXPERIENCE$/m.test(txt), "sample has no additionalExperience");
    assert.ok(!/^## Additional Experience$/m.test(md), "sample has no additionalExperience");
  });

  it("empty bullets array does not emit an empty '- ' item", async () => {
    const sample = await loadFixture("sample-resume.json");
    const first = sample.experience[0];
    assert.ok(first);
    const data: ResumeData = {
      ...sample,
      experience: [{ ...first, bullets: [] }, ...sample.experience.slice(1)],
    };
    const txt = serializeAtsTxt(data);
    const md = serializeAtsMd(data);
    for (const serialized of [txt, md]) {
      assert.ok(
        !serialized.split("\n").some((l) => l === "- " || /^-\s*$/.test(l)),
        `empty '- ' item found in:\n${serialized}`,
      );
      assert.ok(!serialized.includes("Reduced API latency"), "cleared bullets must not appear");
    }
  });

  it("additionalExperience is its own section with hyphen bullets", async () => {
    const sample = await loadFixture("sample-resume.json");
    const data: ResumeData = {
      ...sample,
      additionalExperience: ["Volunteer mentor", "Conference speaker"],
    };
    const txt = serializeAtsTxt(data);
    const md = serializeAtsMd(data);

    assert.match(txt, /^ADDITIONAL EXPERIENCE$/m);
    assert.ok(txt.includes("- Volunteer mentor"));
    assert.match(md, /^## Additional Experience$/m);
    assert.ok(md.includes("- Conference speaker"));
    const expIdx = txt.indexOf("EXPERIENCE");
    const addIdx = txt.indexOf("ADDITIONAL EXPERIENCE");
    assert.ok(expIdx >= 0 && addIdx > expIdx, "additional section follows Experience");
  });
});
