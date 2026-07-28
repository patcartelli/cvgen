// src/lib/preflight.ts

const REQUIRED_FRONTMATTER_FIELDS = [
  "name",
  "email",
  "phone",
  "location",
  "linkedin",
  "github",
] as const;

const REQUIRED_SECTION_HEADINGS = ["## Experience", "## Education", "## Skills"] as const;

export interface PreflightError {
  type: "frontmatter" | "section";
  missing: string;
  message: string;
}

export function preflightCheck(markdown: string): PreflightError[] {
  const errors: PreflightError[] = [];

  // Extract frontmatter block (between first two ---)
  // Non-greedy match anchored at start — stops at first closing ---
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter = frontmatterMatch?.[1] ?? "";

  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    if (!new RegExp(`^${field}:`, "m").test(frontmatter)) {
      errors.push({
        type: "frontmatter",
        missing: field,
        message: `Missing required frontmatter field: ${field}`,
      });
    }
  }

  for (const heading of REQUIRED_SECTION_HEADINGS) {
    if (!markdown.includes(`\n${heading}`) && !markdown.startsWith(heading)) {
      errors.push({
        type: "section",
        missing: heading,
        message: `Missing required section: ${heading}`,
      });
    }
  }

  return errors;
}
