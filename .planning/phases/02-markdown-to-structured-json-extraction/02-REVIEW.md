---
phase: 02-markdown-to-structured-json-extraction
reviewed: 2026-07-28T10:29:54Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - fixtures/sample-resume.md
  - src/cli/index.test.ts
  - src/cli/index.ts
  - src/lib/extract.test.ts
  - src/lib/extract.ts
  - src/lib/preflight.test.ts
  - src/lib/preflight.ts
  - src/schema/validate.test.ts
  - src/schema/validate.ts
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-07-28T10:29:54Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 2 delivers the markdown-to-JSON extraction pipeline: CLI entry point, preflight validation, the Anthropic SDK extraction call, and schema validation. The overall structure is sound — the layering is correct, the API integration pattern matches the SDK's documented interface, and the Zod schema is coherent.

Two blockers require fixes before this ships: (1) the section heading check uses substring matching, meaning a heading like `## Skills List` silently satisfies the `## Skills` requirement, allowing malformed documents to reach the API call; (2) the CRLF line-ending handling in the frontmatter regex causes all frontmatter fields to be reported as missing when a Windows-style file is passed. Four warnings surface around test isolation, a whitespace-only API key edge case, a dead export, and missing field-level isolation in the frontmatter regex. Two info items round out the findings.

## Critical Issues

### CR-01: Section heading check uses substring match — `## Skills List` satisfies `## Skills`

**File:** `src/lib/preflight.ts:39`
**Issue:** The section presence check uses `markdown.includes('\n' + heading)`. Because `String.includes()` finds any substring, a document containing `## Skills List` (but not `## Skills`) will silently pass the `## Skills` check. The same false-pass occurs for `## Experience Report` vs `## Experience` and any variant heading that starts with the required heading text. Preflight's purpose is to catch malformed documents before burning API tokens; a false pass defeats that.

**Verified by:**
```
node -e "
const md = '...## Skills List\nContent.';
const found = md.includes('\n## Skills'); // true — false pass!
"
```

**Fix:** Require the heading to be followed by a newline or end-of-string so it matches a complete heading line:
```typescript
// Replace the existing section check with:
for (const heading of REQUIRED_SECTION_HEADINGS) {
  // Match heading followed by newline OR end-of-string; also allow document-start
  const pattern = new RegExp(`(?:^|\n)${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\n|$)`);
  if (!pattern.test(markdown)) {
    errors.push({
      type: "section",
      missing: heading,
      message: `Missing required section: ${heading}`,
    });
  }
}
```

---

### CR-02: CRLF line endings cause frontmatter regex to silently fail — all 6 fields reported missing

**File:** `src/lib/preflight.ts:25`
**Issue:** The frontmatter extraction regex is `/^---\n([\s\S]*?)\n---/`. On a file with Windows-style CRLF line endings (`\r\n`), the literal `\n` in the pattern does not match `\r\n`, so the regex returns `null`. This causes `frontmatter` to fall back to `""`, and all six required fields are then reported as missing — even in a perfectly valid resume that happens to have CRLF endings (e.g., a file edited on Windows, or exported from certain editors). The error messages point the user at their contact data when the real issue is line endings.

**Verified by:**
```
node -e "
const crlf = '---\r\nname: Test\r\n...\r\n---';
console.log(crlf.match(/^---\n([\s\S]*?)\n---/)); // null
"
```

**Fix:** Replace `\n` in the regex with `\r?\n` to accept both LF and CRLF:
```typescript
// preflight.ts line 25
const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
```
Also normalise line endings before field checking, or rewrite the per-field regex to accept `\r?\n`:
```typescript
const frontmatter = (frontmatterMatch?.[1] ?? "").replace(/\r\n/g, "\n");
```

---

## Warnings

### WR-01: Test 3 breaks if a `.env` file exists at project root — test isolation gap

**File:** `src/cli/index.test.ts:91-100`
**Issue:** Test 3 verifies that missing `ANTHROPIC_API_KEY` produces the correct error. It passes `envWithoutKey()` to the subprocess, which deletes the key from the inherited environment. However, the subprocess then runs `process.loadEnvFile(".env")` (relative to `cwd: projectRoot`). If a `.env` file exists at the project root containing `ANTHROPIC_API_KEY=...`, Node's `loadEnvFile` will inject the key into the subprocess's `process.env`, bypassing the guard that Test 3 is designed to assert. The test would then proceed past the key guard, call `readFile` on the fixture, pass preflight, and attempt a live Anthropic API call — producing an unexpected exit code and breaking CI for any developer who has their real key in `.env`.

Currently safe (no `.env` exists), but fragile: the first developer to add a `.env` breaks this test.

**Fix:** Pass a temp directory as `cwd` for Test 3 (a directory with no `.env`), or pass an env variable to suppress `.env` loading. The simplest approach:
```typescript
// In Test 3, use a cwd where no .env can exist:
const result = spawnSync("npx", ["tsx", cliSrcPath, fixturePath, "--validate-only"], {
  cwd: tmpdir(), // OS temp dir — no .env file present
  env: envWithoutKey(),
  encoding: "utf8",
  timeout: 15000,
});
```
Alternatively, the CLI could accept a `--no-env-file` flag (or check `process.env.CVGEN_NO_ENV_FILE`) to skip `loadEnvFile` in test contexts.

---

### WR-02: Whitespace-only `ANTHROPIC_API_KEY` bypasses the key guard

**File:** `src/cli/index.ts:31`
**Issue:** The guard `if (!process.env.ANTHROPIC_API_KEY)` catches `undefined` and `""` but not `"   "` (whitespace-only). A key set to spaces passes the guard and reaches `new Anthropic()` in `extract.ts`, which would attempt an API call with an invalid key. The SDK would then throw a generic auth error, not the helpful "ANTHROPIC_API_KEY is not set" message the guard is designed to provide.

**Fix:**
```typescript
// src/cli/index.ts line 31
if (!process.env.ANTHROPIC_API_KEY?.trim()) {
```

---

### WR-03: `validateResume` is exported but never called from production code — dead export

**File:** `src/schema/validate.ts:18`
**Issue:** `validateResume` is the sole export of `validate.ts`. It is imported and tested in `validate.test.ts` but never imported by `src/cli/index.ts` or `src/lib/extract.ts`. The extract pipeline trusts `zodOutputFormat` + `messages.parse` to enforce the schema at the API boundary, without ever calling `validateResume` on the returned data. If `extract.ts` returns data directly to the CLI (and eventually to a renderer), and `validateResume` is never in that chain, it exists only as dead infrastructure. This creates drift risk: the schema could change and `validate.ts` would go untested by the integration path.

**Fix:** Either call `validateResume` in `extractResume` as a defense-in-depth step after `messages.parse`:
```typescript
// src/lib/extract.ts
import { validateResume } from "../schema/validate.js";

// ...after the null guard:
return validateResume(response.parsed_output);
```
Or explicitly document why the secondary validation is intentionally omitted and mark the export `@internal`.

---

### WR-04: Frontmatter field regex constructed with unescaped field names inside a loop

**File:** `src/lib/preflight.ts:29`
**Issue:** `new RegExp('^${field}:', 'm')` constructs a regex from the `field` string. Current field names (`name`, `email`, `phone`, `location`, `linkedin`, `github`) are safe alphanumeric strings. However, if a future field were added that contains regex metacharacters (e.g., `"x-field"` with a hyphen, or `"field.name"`), the regex would be silently incorrect rather than failing. This is a latent maintenance trap.

**Fix:** Escape the field name before inserting into the regex:
```typescript
const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
if (!new RegExp(`^${escapedField}:`, "m").test(frontmatter)) {
```
Alternatively, use a simple string check instead of a regex for exact field matching:
```typescript
if (!frontmatter.split("\n").some((line) => line.startsWith(`${field}:`))) {
```

---

## Info

### IN-01: `tempFiles` array is populated but the `afterEach` cleanup is a no-op

**File:** `src/cli/index.test.ts:55-60`
**Issue:** `const tempFiles: string[] = []` is declared at module scope. It is populated in Test 5 (`tempFiles.push(badMdPath)`). The `afterEach` hook explicitly does nothing, with a comment that says cleanup is left for future use. The array exists but serves no purpose — OS tmpdir is relied upon for eventual cleanup. This is misleading: a reader following the pattern would expect `afterEach` to actually iterate `tempFiles` and delete them.

**Fix:** Either implement the cleanup or remove the array and comment:
```typescript
afterEach(() => {
  for (const f of tempFiles) {
    try { unlinkSync(f); } catch { /* ignore already-deleted */ }
  }
  tempFiles.length = 0;
});
```
Requires adding `unlinkSync` to the import from `"node:fs"`.

---

### IN-02: `extract.ts` Test 1 is missing — test file starts at Test 2

**File:** `src/lib/extract.test.ts:21`
**Issue:** The test file is titled "extract.ts structural assertions" and the first test is numbered `Test 2`. There is no Test 1 in this file. The numbering is unexplained (possibly the test suite was split and Test 1 moved elsewhere, or numbered relative to a cross-file sequence). This is confusing for anyone reading the file in isolation: a reader looks for Test 1 and finds it does not exist.

**Fix:** Either renumber starting at 1, or add a header comment explaining the numbering scheme (e.g., "Test 1 is in cli/index.test.ts — these tests continue from 2").

---

_Reviewed: 2026-07-28T10:29:54Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
