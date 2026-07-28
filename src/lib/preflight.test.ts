// src/lib/preflight.test.ts
// Tests for preflightCheck frontmatter + section heading validation
// Run with: npx tsx --test src/lib/preflight.test.ts

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { preflightCheck } from "./preflight.js";
import type { PreflightError } from "./preflight.js";

// Helper: build a minimal valid markdown string
function buildMarkdown({
  fields = ["name", "email", "phone", "location", "linkedin", "github"],
  headings = ["## Experience", "## Education", "## Skills"],
  extraBody = "",
}: {
  fields?: string[];
  headings?: string[];
  extraBody?: string;
} = {}): string {
  const frontmatterBlock =
    fields.length > 0 ? `---\n${fields.map((f) => `${f}: value`).join("\n")}\n---\n` : "";
  const headingLines = headings.map((h) => `\n${h}\nContent here.`).join("\n");
  return `${frontmatterBlock}${headingLines}${extraBody}`;
}

describe("preflightCheck", () => {
  // Test 1: All required fields + headings present → returns []
  it("Test 1: returns [] when all 6 frontmatter fields and 3 required headings are present", () => {
    const markdown = buildMarkdown();
    const errors = preflightCheck(markdown);
    assert.deepEqual(errors, []);
  });

  // Test 2: Empty string → 9 errors (6 frontmatter + 3 section)
  it("Test 2: returns 9 errors for an empty string (6 frontmatter + 3 section)", () => {
    const errors = preflightCheck("");
    assert.equal(errors.length, 9, `expected 9 errors, got ${errors.length}: ${JSON.stringify(errors)}`);
    const frontmatterErrors = errors.filter((e: PreflightError) => e.type === "frontmatter");
    const sectionErrors = errors.filter((e: PreflightError) => e.type === "section");
    assert.equal(frontmatterErrors.length, 6);
    assert.equal(sectionErrors.length, 3);
  });

  // Test 3: Missing only "linkedin" → exactly 1 error with correct shape
  it("Test 3: missing only linkedin → exactly 1 frontmatter error with correct shape", () => {
    const markdown = buildMarkdown({
      fields: ["name", "email", "phone", "location", "github"], // linkedin omitted
    });
    const errors = preflightCheck(markdown);
    assert.equal(errors.length, 1, `expected 1 error, got ${errors.length}: ${JSON.stringify(errors)}`);
    assert.equal(errors[0]?.type, "frontmatter");
    assert.equal(errors[0]?.missing, "linkedin");
    assert.equal(errors[0]?.message, "Missing required frontmatter field: linkedin");
  });

  // Test 4: All frontmatter present but missing ## Education → exactly 1 section error
  it("Test 4: missing ## Education → exactly 1 section error with correct shape", () => {
    const markdown = buildMarkdown({
      headings: ["## Experience", "## Skills"], // ## Education omitted
    });
    const errors = preflightCheck(markdown);
    assert.equal(errors.length, 1, `expected 1 error, got ${errors.length}: ${JSON.stringify(errors)}`);
    assert.equal(errors[0]?.type, "section");
    assert.equal(errors[0]?.missing, "## Education");
    assert.equal(errors[0]?.message, "Missing required section: ## Education");
  });

  // Test 5: Optional sections (## Professional Summary, ## Core Competencies) absent → no error
  it("Test 5: absent optional sections (## Professional Summary, ## Core Competencies) are not flagged", () => {
    const markdown = buildMarkdown({
      // No ## Professional Summary or ## Core Competencies in headings
      headings: ["## Experience", "## Education", "## Skills"],
    });
    const errors = preflightCheck(markdown);
    const optionalSectionErrors = errors.filter(
      (e: PreflightError) =>
        e.missing === "## Professional Summary" || e.missing === "## Core Competencies",
    );
    assert.equal(
      optionalSectionErrors.length,
      0,
      "optional sections should not generate errors when absent",
    );
  });

  // Test 6: Heading at very start of document (no frontmatter, no leading newline) is still detected
  it("Test 6: heading at document start (no leading newline) is detected", () => {
    // Document starts directly with ## Experience (no frontmatter, no newline before)
    const markdown = "## Experience\nSome content here.";
    const errors = preflightCheck(markdown);
    // ## Experience should NOT be in the section errors (it IS present)
    const experienceError = errors.find((e: PreflightError) => e.missing === "## Experience");
    assert.equal(
      experienceError,
      undefined,
      '## Experience at document start should be detected (no "Missing" error)',
    );
  });

  // Test 7: A "---" horizontal rule later in body does not truncate the frontmatter check
  it("Test 7: --- horizontal rule in body does not truncate frontmatter extraction", () => {
    // A document with proper frontmatter AND a --- divider in the body
    const markdown =
      "---\nname: Test\nemail: t@t.com\nphone: 555\nlocation: City\nlinkedin: li\ngithub: gh\n---\n\n## Experience\nContent.\n\n---\n\nMore content after horizontal rule.\n\n## Education\nContent.\n\n## Skills\nContent.";
    const errors = preflightCheck(markdown);
    assert.deepEqual(errors, [], `expected no errors, got: ${JSON.stringify(errors)}`);
  });
});
