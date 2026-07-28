// src/lib/extract.test.ts
// Structural + fixture tests for extractResume and fixtures/sample-resume.md
// Run with: npx tsx --test src/lib/extract.test.ts
// NOTE: No live API calls — structural assertions only.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { preflightCheck } from "./preflight.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const fixturePath = resolve(root, "fixtures/sample-resume.md");
const extractSrcPath = resolve(root, "src/lib/extract.ts");

describe("extract.ts structural assertions (no live API call)", () => {
  // Test 2: extract.ts uses messages.parse, passes zodOutputFormat, uses correct model/max_tokens
  it("Test 2: extract.ts uses messages.parse with zodOutputFormat(ResumeSchema), haiku model, max_tokens 2048", async () => {
    const src = await readFile(extractSrcPath, "utf8");
    assert.ok(
      src.includes("messages.parse"),
      "extract.ts must use messages.parse (not messages.create)",
    );
    assert.ok(
      src.includes("zodOutputFormat(ResumeSchema)"),
      "extract.ts must pass zodOutputFormat(ResumeSchema) to output_config.format",
    );
    assert.ok(src.includes("claude-haiku-4-5"), "extract.ts must use model claude-haiku-4-5");
    assert.ok(src.includes("max_tokens: 2048"), "extract.ts must set max_tokens: 2048");
    assert.ok(
      !src.includes("messages.create"),
      "extract.ts must NOT use messages.create (anti-pattern)",
    );
  });

  // Test 3: extract.ts imports zodOutputFormat from the correct subpath with .js extension
  it('Test 3: extract.ts imports zodOutputFormat from "@anthropic-ai/sdk/helpers/zod.js"', async () => {
    const src = await readFile(extractSrcPath, "utf8");
    assert.ok(
      src.includes('"@anthropic-ai/sdk/helpers/zod.js"'),
      'extract.ts must import from "@anthropic-ai/sdk/helpers/zod.js" (with .js per NodeNext)',
    );
  });

  // Test 4: extract.ts guards parsed_output === null and throws
  it("Test 4: extract.ts has null guard on parsed_output and throws (never process.exit)", async () => {
    const src = await readFile(extractSrcPath, "utf8");
    assert.ok(
      src.includes("parsed_output === null"),
      "extract.ts must guard: if (response.parsed_output === null)",
    );
    assert.ok(!src.includes("process.exit"), "extract.ts must NOT call process.exit");
  });

  // Test 5: fixture has correct frontmatter with all 6 required fields matching sample-resume.json
  it("Test 5: fixtures/sample-resume.md has all 6 frontmatter fields with correct Alex Rivera values", async () => {
    const md = await readFile(fixturePath, "utf8");
    assert.ok(md.includes("name: Alex Rivera"), "must have name: Alex Rivera");
    assert.ok(md.includes("email: alex@example.com"), "must have email: alex@example.com");
    assert.ok(md.includes("phone: (555) 000-0000"), "must have phone: (555) 000-0000");
    assert.ok(md.includes("location: San Francisco, CA"), "must have location: San Francisco, CA");
    assert.ok(
      md.includes("linkedin: linkedin.com/in/alexrivera"),
      "must have linkedin: linkedin.com/in/alexrivera",
    );
    assert.ok(
      md.includes("github: github.com/alexrivera"),
      "must have github: github.com/alexrivera",
    );
  });

  // Test 6: fixture has required section headings and correct section order
  it("Test 6: fixtures/sample-resume.md has ## Experience, ## Education, ## Skills headings", async () => {
    const md = await readFile(fixturePath, "utf8");
    assert.ok(md.includes("## Experience"), "must have ## Experience section");
    assert.ok(md.includes("## Education"), "must have ## Education section");
    assert.ok(md.includes("## Skills"), "must have ## Skills section");
    // Check section order: Experience before Education before Skills
    const experienceIdx = md.indexOf("## Experience");
    const educationIdx = md.indexOf("## Education");
    const skillsIdx = md.indexOf("## Skills");
    assert.ok(experienceIdx < educationIdx, "## Experience must appear before ## Education");
    assert.ok(educationIdx < skillsIdx, "## Education must appear before ## Skills");
  });

  // Test 7: preflightCheck on the fixture returns [] (ties fixture to preflightCheck contract)
  it("Test 7: preflightCheck(fixtures/sample-resume.md) returns [] (fixture passes preflight)", async () => {
    const md = await readFile(fixturePath, "utf8");
    const errors = preflightCheck(md);
    assert.deepEqual(
      errors,
      [],
      `fixture should pass preflight with no errors, got: ${JSON.stringify(errors)}`,
    );
  });

  // Test 8: extract.ts exports ExtractResult interface with rawResponse and data fields
  it("Test 8: extract.ts exports ExtractResult interface with rawResponse and data: response.parsed_output fields", async () => {
    const src = await readFile(extractSrcPath, "utf8");
    assert.ok(
      src.includes("ExtractResult"),
      "extract.ts must export ExtractResult interface",
    );
    assert.ok(
      src.includes("rawResponse"),
      "ExtractResult must have rawResponse field",
    );
    assert.ok(
      src.includes("data: response.parsed_output"),
      "return statement must set data from response.parsed_output",
    );
  });
});
