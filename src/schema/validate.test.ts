// src/schema/validate.test.ts
// Tests for validateResume path-based Zod error formatting
// Run with: npx tsx --test src/schema/validate.test.ts

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { validateResume } from "./validate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

function asError(e: unknown): Error {
  if (e instanceof Error) return e;
  throw new Error(`Expected Error, got: ${String(e)}`);
}

// Test 1: Valid fixture passes without throwing
describe("validateResume", () => {
  it("Test 1: returns typed ResumeData for valid sample-resume.json without throwing", async () => {
    const raw = await readFile(resolve(root, "fixtures/sample-resume.json"), "utf8");
    const data = JSON.parse(raw) as unknown;
    const result = validateResume(data);
    assert.equal(result.contact.name, "Alex Rivera");
    assert.ok(Array.isArray(result.experience));
    assert.ok(Array.isArray(result.education));
    assert.ok(Array.isArray(result.skills));
  });

  // Test 2: Malformed fixture throws with "Resume validation failed:" prefix and path-shaped lines
  it('Test 2: validateResume(malformed) throws Error starting with "Resume validation failed:" containing "  {path}: {message}" lines', async () => {
    const raw = await readFile(resolve(root, "fixtures/sample-resume-malformed.json"), "utf8");
    const data = JSON.parse(raw) as unknown;
    let threw = false;
    try {
      validateResume(data);
    } catch (e) {
      threw = true;
      const err = asError(e);
      assert.ok(
        err.message.startsWith("Resume validation failed:"),
        `message should start with "Resume validation failed:", got: ${err.message}`,
      );
      // Must have at least one formatted error line: "  {path}: {message}"
      const lines = err.message.split("\n").slice(1);
      assert.ok(lines.length > 0, "should have at least one error line after the header");
      const pathLinePattern = /^\s{2}\S.*:\s.+/;
      const hasPathLine = lines.some((line: string) => pathLinePattern.test(line));
      assert.ok(
        hasPathLine,
        `at least one line should match "  {path}: {message}", got lines: ${JSON.stringify(lines)}`,
      );
    }
    assert.ok(threw, "validateResume should have thrown for malformed fixture");
  });

  // Test 3: Error message includes the specific field path for the malformed fixture's defect
  // sample-resume-malformed.json is missing: phone, location, linkedin, github from contact
  it("Test 3: error message includes field path for the specific defect in the malformed fixture", async () => {
    const raw = await readFile(resolve(root, "fixtures/sample-resume-malformed.json"), "utf8");
    const data = JSON.parse(raw) as unknown;
    try {
      validateResume(data);
      assert.fail("should have thrown");
    } catch (e) {
      const err = asError(e);
      // malformed fixture has contact missing phone, location, linkedin, github — should appear
      assert.ok(
        err.message.includes("contact.phone") ||
          err.message.includes("contact.location") ||
          err.message.includes("contact.linkedin") ||
          err.message.includes("contact.github"),
        `error message should reference a missing contact sub-field, got: ${err.message}`,
      );
    }
  });

  // Test 4: validateResume({}) throws Error naming top-level required fields like "contact"
  it('Test 4: validateResume({}) throws Error naming "contact" in the path', () => {
    try {
      validateResume({});
      assert.fail("should have thrown");
    } catch (e) {
      const err = asError(e);
      assert.ok(
        err.message.includes("contact"),
        `error message should mention "contact", got: ${err.message}`,
      );
    }
  });

  // Test 5: Numeric path segments render as "[N]", string segments after the first get a leading "."
  it('Test 5: numeric segment renders as "[N]", nested string segments render with "." prefix', () => {
    // Provide data where experience array exists but first entry is missing bullets
    const data = {
      contact: {
        name: "Test",
        email: "t@t.com",
        phone: "555",
        location: "City",
        linkedin: "li",
        github: "gh",
      },
      experience: [
        {
          role: "Dev",
          company: "Co",
          startDate: "Jan 2020",
          // bullets is required but omitted
        },
      ],
      education: [],
      skills: [],
    };
    try {
      validateResume(data);
      assert.fail("should have thrown");
    } catch (e) {
      const err = asError(e);
      // Path should contain "[0]" for the numeric index and "experience[0]" for the array item
      assert.ok(
        /\[0\]/.test(err.message),
        `error message should contain "[0]", got: ${err.message}`,
      );
      assert.ok(
        /experience\[0\]/.test(err.message),
        `error message should contain "experience[0]", got: ${err.message}`,
      );
    }
  });

  it("accepts nested engagements and top-level selectedWork", () => {
    const data = {
      contact: {
        name: "Test",
        email: "t@t.com",
        phone: "555",
        location: "City",
        linkedin: "li",
        github: "gh",
      },
      selectedWork: { url: "studiocartelli.com/work", password: "fixture-password" },
      experience: [
        {
          role: "Product Design Consultant",
          company: "Studio Cartelli",
          startDate: "January 2026",
          endDate: "Present",
          bullets: ["Built the studio site."],
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
      education: [{ degree: "B.F.A.", institution: "RIT", year: "2008" }],
      skills: [{ category: "Design", items: ["Figma"] }],
    };
    const result = validateResume(data);
    assert.equal(result.selectedWork?.url, "studiocartelli.com/work");
    assert.equal(result.experience[0]?.engagements?.[0]?.client, "Bluefish AI");
  });
});
