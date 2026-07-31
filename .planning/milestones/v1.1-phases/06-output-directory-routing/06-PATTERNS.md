# Phase 6: Output Directory Routing - Pattern Map

**Mapped:** 2026-07-30
**Files analyzed:** 4 files modified; 0 files created
**Analogs found:** 4 / 4

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/cli/index.ts` | controller (CLI entry) | request-response + file-I/O | `src/cli/index.ts` itself (self-analog — Steps A–H) | exact |
| `src/lib/render.ts` | utility / lib | transform | `src/lib/render.ts` itself (`resolveOutputPaths` at lines 15–25) | exact |
| `src/lib/render.test.ts` | test | transform | `src/lib/render.test.ts` itself (Tests 1–3 and describe pattern at lines 26–73) | exact |
| `scripts/smoke-render.ts` | utility / script | file-I/O | `scripts/smoke-render.ts` itself (resolveOutputPaths call at line 27) | exact |

All four targets are modifications to existing files. Each file is its own closest analog.

---

## Pattern Assignments

### `src/cli/index.ts` (CLI controller — adding Step D.5 between Step D and Step E)

**Analog:** `src/cli/index.ts` (self)

**Existing imports pattern** (`src/cli/index.ts` lines 1–9):
```typescript
#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Command } from "commander";
import puppeteer from "puppeteer";
import { extractResume } from "../lib/extract.js";
import { preflightCheck } from "../lib/preflight.js";
import { renderAts, renderDesigned, resolveOutputPaths } from "../lib/render.js";
```

**New imports to add** — add `mkdir` to the fs/promises import and add `join` to the path import, then add `createInterface`:
```typescript
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
// ...and add toCompanySlug to the render.js named import
import { renderAts, renderDesigned, resolveOutputPaths, toCompanySlug } from "../lib/render.js";
```

**Error handling pattern** (`src/cli/index.ts` lines 76–81 and 89–93 and 99–103):
```typescript
// Canonical error pattern — always: program.error(message, { exitCode: 1 })
program.error(
  "Error: ANTHROPIC_API_KEY is not set. ...",
);
// — or with explicit exitCode —
program.error(
  `Cannot read file: ${absPath} — ${err instanceof Error ? err.message : String(err)}`,
  { exitCode: 1 },
);
// — or for multi-line preflight —
for (const err of preflightErrors) {
  console.error(err.message);
}
program.error("Preflight checks failed.", { exitCode: 1 });
```

**Step D (preflight) + Step E (extraction) — insertion point** (`src/cli/index.ts` lines 96–106):
```typescript
      // Step D — preflight check
      const preflightErrors = preflightCheck(markdown);
      if (preflightErrors.length > 0) {
        for (const err of preflightErrors) {
          console.error(err.message);
        }
        program.error("Preflight checks failed.", { exitCode: 1 });
      }

      // Step E — extract via Claude    <-- new Step D.5 inserts HERE (between D and E)
      const { data, rawResponse } = await extractResume(markdown);
```

**Step D.5 to insert** — full readline/promises block follows the try/finally pattern established by `renderDesigned`/`renderAts` (lines 499–516 of render.ts); the IIFE wraps the rl lifetime:
```typescript
      // Step D.5 — prompt for output routing (readline released in finally — prevents process hang)
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      let outputDir: string;
      try {
        const tailored = await rl.question(
          "Is this resume tailored for a specific company? (y/n): ",
        );
        if (tailored.trim().toLowerCase().startsWith("y")) {
          const company = await rl.question("Company name: ");
          const slug = toCompanySlug(company.trim());
          if (!slug) {
            program.error(
              "Company name must contain at least one letter or digit.",
              { exitCode: 1 },
            );
          }
          outputDir = join(process.cwd(), "output", slug);
        } else {
          outputDir = join(process.cwd(), "output");
        }
      } finally {
        rl.close();
      }

      // mkdir only when PDFs will actually be written
      const isValidateOnly = options.validateOnly || options.dryRun;
      if (!isValidateOnly) {
        await mkdir(outputDir, { recursive: true });
      }
```

**Step G (validate-only check)** (`src/cli/index.ts` lines 116–121) — `isValidateOnly` is already computed above, so Step G reduces to:
```typescript
      // Step G — validate-only routing  (isValidateOnly computed at Step D.5 — reuse it here)
      if (isValidateOnly) {
        console.log(JSON.stringify(data, null, 2));
        process.exit(0);
      }
```

**Step H — updated resolveOutputPaths call** (`src/cli/index.ts` line 124):
```typescript
      // Before (line 124):
      const paths = resolveOutputPaths(absPath);

      // After:
      const paths = resolveOutputPaths(absPath, outputDir);
```

**try/finally for resource cleanup** (`src/cli/index.ts` lines 126–132) — keep unchanged; the mkdir/readline cleanup happens earlier:
```typescript
      const browser = await puppeteer.launch({ headless: true });
      try {
        await renderDesigned(data, paths.designed, browser);
        await renderAts(data, paths.ats, browser);
      } finally {
        await browser.close();
      }
```

---

### `src/lib/render.ts` (utility — signature change + new export)

**Analog:** `src/lib/render.ts` (self)

**Existing imports** (`src/lib/render.ts` lines 1–5):
```typescript
// src/lib/render.ts
import { basename, dirname, join } from "node:path";
import type { Browser } from "puppeteer";
import type { ResumeData } from "../schema/resume.js";
```

**`dirname` is no longer needed after the change.** Updated import:
```typescript
import { basename, join } from "node:path";
```

**Current `resolveOutputPaths`** (`src/lib/render.ts` lines 15–25 — full current body to replace):
```typescript
/**
 * Pure helper: derives the two PDF output paths from an input .md path.
 * Per D-O01 (same directory) and D-O02 (stem-based naming):
 *   my-resume.md → my-resume-resume.pdf / my-resume-resume-ats.pdf
 */
export function resolveOutputPaths(inputMdPath: string): {
  designed: string;
  ats: string;
} {
  const stem = basename(inputMdPath, ".md");
  const dir = dirname(inputMdPath);
  return {
    designed: join(dir, stem + "-resume.pdf"),
    ats: join(dir, stem + "-resume-ats.pdf"),
  };
}
```

**New `toCompanySlug` + updated `resolveOutputPaths`** — insert both in the "Output path helper" block (lines 8–25), replacing the existing `resolveOutputPaths`:
```typescript
/**
 * Pure helper: converts a company name string to a Title-Case-Hyphen directory slug.
 * D-01: spaces → hyphens, casing preserved. D-02: special chars stripped without replacement.
 * Examples: "Acme Corp" → "Acme-Corp", "AT&T" → "ATT", "Goldman Sachs & Partners" → "Goldman-Sachs-Partners"
 */
export function toCompanySlug(company: string): string {
  return company
    .replace(/[^a-zA-Z0-9 ]/g, "") // D-02: strip ampersands, dots, commas, etc.
    .trim()
    .replace(/\s+/g, "-");          // D-01: collapse space runs to hyphens, preserve case
}

/**
 * Pure helper: derives the two PDF output paths from an explicit output directory.
 * Stem is derived from the input .md basename; directory is caller-supplied.
 *   resolveOutputPaths("/path/my-resume.md", "/out/Acme-Corp")
 *   → { designed: "/out/Acme-Corp/my-resume-resume.pdf",
 *        ats:      "/out/Acme-Corp/my-resume-resume-ats.pdf" }
 */
export function resolveOutputPaths(
  inputMdPath: string,
  outputDir: string,
): { designed: string; ats: string } {
  const stem = basename(inputMdPath, ".md");
  return {
    designed: join(outputDir, stem + "-resume.pdf"),
    ats: join(outputDir, stem + "-resume-ats.pdf"),
  };
}
```

**Return shape is unchanged** — `{ designed: string; ats: string }`. `renderDesigned` and `renderAts` callers are unaffected.

---

### `src/lib/render.test.ts` (test — rewrite Tests 1–3, add slug describe block)

**Analog:** `src/lib/render.test.ts` (self)

**Existing test runner + import pattern** (`src/lib/render.test.ts` lines 1–18):
```typescript
// src/lib/render.test.ts
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
import { renderAts, resolveOutputPaths } from "./render.js";
```

**Add `toCompanySlug` to the render.js import** (line 17):
```typescript
import { renderAts, resolveOutputPaths, toCompanySlug } from "./render.js";
```

**Current Tests 1–3 to REPLACE** (`src/lib/render.test.ts` lines 26–73 — the entire `describe("resolveOutputPaths")` block):
```typescript
describe("resolveOutputPaths", () => {
  // Test 1: absolute path — same directory as input, correct suffix pattern (D-O01 + D-O02)
  it("Test 1: /tmp/foo/my-resume.md → my-resume-resume.pdf / my-resume-resume-ats.pdf in same dir", () => {
    const paths = resolveOutputPaths("/tmp/foo/my-resume.md");
    // ... assertions on dirname-based behavior ...
  });
  // Test 2 and Test 3 similarly use the old single-argument signature
});
```

**New `describe("resolveOutputPaths")` block to substitute** — follows the identical `describe` + `it` + `assert.equal` structure:
```typescript
describe("resolveOutputPaths", () => {
  // Test 1: explicit outputDir — both paths land inside it with correct suffixes
  it("Test 1: resolves designed and ats paths inside the given outputDir", () => {
    const paths = resolveOutputPaths("/tmp/foo/my-resume.md", "/some/output/dir");
    assert.equal(
      paths.designed,
      "/some/output/dir/my-resume-resume.pdf",
      "designed path must be inside outputDir with -resume.pdf suffix",
    );
    assert.equal(
      paths.ats,
      "/some/output/dir/my-resume-resume-ats.pdf",
      "ats path must be inside outputDir with -resume-ats.pdf suffix",
    );
  });

  // Test 2: stem derived from inputMdPath basename regardless of outputDir
  it("Test 2: stem derived from inputMdPath basename regardless of outputDir", () => {
    const paths = resolveOutputPaths("./notes/alex.md", "/out");
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
    assert.equal(
      dirname(paths.designed),
      dirname(paths.ats),
      "designed and ats must be in the same directory",
    );
  });

  // Test 3: stem with internal dots — only trailing .md stripped
  it("Test 3: stem with internal dots — only trailing .md stripped", () => {
    const paths = resolveOutputPaths("/x/2026.q3-resume.md", "/out");
    assert.equal(
      paths.designed,
      "/out/2026.q3-resume-resume.pdf",
      "only trailing .md must be stripped from stem",
    );
    assert.equal(
      paths.ats,
      "/out/2026.q3-resume-resume-ats.pdf",
      "ats path must use same stem",
    );
  });
});
```

**New `describe("toCompanySlug")` block to ADD** — insert immediately after the `resolveOutputPaths` describe block (after line 73), before the `renderAts pdf-parse extraction` describe (line 79). Follows the same `describe` + `it` + `assert.equal` pattern:
```typescript
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
```

**Tests A–H remain unchanged** (`src/lib/render.test.ts` lines 79–239 — the `renderAts pdf-parse extraction` describe block). Do not touch.

---

### `scripts/smoke-render.ts` (script — one-line fix)

**Analog:** `scripts/smoke-render.ts` (self)

**Current call site** (`scripts/smoke-render.ts` lines 26–27):
```typescript
const inputMdPath = join(tmp, "sample-resume.md");
const { designed, ats } = resolveOutputPaths(inputMdPath);
```

**Fix — pass `tmp` as the second argument** (no prompts, no mkdir needed; `tmp` already exists):
```typescript
const inputMdPath = join(tmp, "sample-resume.md");
const { designed, ats } = resolveOutputPaths(inputMdPath, tmp);
```

No other changes to `scripts/smoke-render.ts`. The comment on line 24–25 (`Build a synthetic input md path...`) should be updated to reflect that `tmp` now serves as both the temp dir and the explicit `outputDir`.

---

## Shared Patterns

### Error handling
**Source:** `src/cli/index.ts` lines 76–103
**Apply to:** All new error conditions in cli/index.ts (empty slug guard, any readline errors)
```typescript
program.error("Human-readable message.", { exitCode: 1 });
```
Never throw directly from the action handler — always route through `program.error`.

### try/finally for resource cleanup
**Source:** `src/cli/index.ts` lines 126–132; `src/lib/render.ts` lines 500–516
**Apply to:** The readline `createInterface` block in cli/index.ts Step D.5
```typescript
const rl = createInterface({ input: process.stdin, output: process.stdout });
try {
  // rl.question() calls here
} finally {
  rl.close(); // critical — prevents process hang
}
```

### Pure function export convention
**Source:** `src/lib/render.ts` lines 15–25 (`resolveOutputPaths`)
**Apply to:** `toCompanySlug` in render.ts
- Named export, no default exports
- Pure function (no I/O, no side effects)
- JSDoc comment above with D-ref citations
- Lives in the lib layer, not the CLI layer

### Test describe + it + assert.equal pattern
**Source:** `src/lib/render.test.ts` lines 26–73
**Apply to:** New `describe("resolveOutputPaths")` (rewritten) and new `describe("toCompanySlug")`
```typescript
describe("block name", () => {
  it("Test N: human-readable description", () => {
    assert.equal(actual, expected, "failure message quoting expected value");
    assert.ok(condition, `failure message with ${interpolated} context`);
  });
});
```

### spawnSync CLI subprocess test pattern
**Source:** `src/cli/index.test.ts` lines 25–41 (`runCli` helper)
**Apply to:** Any new CLI integration tests for the prompt behavior
```typescript
const result = spawnSync("npx", ["tsx", cliSrcPath, ...args], {
  cwd,
  env,
  encoding: "utf8",
  timeout: 15000,
  input: "n\n",  // <-- add this for tests that reach the prompt
});
```
The `input` option feeds stdin to the subprocess line-by-line; `"n\n"` answers the first prompt; `"y\nAcme Corp\n"` answers both.

---

## No Analog Found

None. All four files are self-analog (modifications to existing files with well-established patterns).

---

## Metadata

**Analog search scope:** `src/cli/`, `src/lib/`, `scripts/`
**Files scanned:** 4 source files read in full (`src/cli/index.ts`, `src/lib/render.ts`, `src/lib/render.test.ts`, `scripts/smoke-render.ts`) + 1 additional test file for pattern confirmation (`src/cli/index.test.ts`) + 1 lib file for context (`src/lib/extract.ts`)
**Pattern extraction date:** 2026-07-30
