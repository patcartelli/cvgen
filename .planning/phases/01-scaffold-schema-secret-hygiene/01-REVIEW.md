---
phase: 01-scaffold-schema-secret-hygiene
reviewed: 2026-07-27T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - .env.example
  - .gitignore
  - biome.json
  - fixtures/sample-resume-malformed.json
  - fixtures/sample-resume.json
  - package.json
  - scripts/validate-fixtures.ts
  - src/cli/index.ts
  - src/schema/resume.ts
  - src/schema/validate.ts
findings:
  critical: 3
  warning: 3
  info: 2
  total: 8
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-07-27
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 1 scaffold is structurally sound. The Zod schema, validate stub, fixture files, and config wiring
are all consistent and the fixture smoke test passes. However, three issues rise to Critical: the
`scripts/` directory is outside `tsconfig.json`'s `include` scope so the validate-fixtures script
gets zero compile-time type checking; the script uses CWD-relative fixture paths that will silently
break when invoked from any directory other than the repo root; and several required `contact` fields
lack format validation, meaning the malformed fixture tests are less exhaustive than they appear.
Three Warnings cover the pre-commit `gitleaks` binary being an undeclared external dependency, the
missing `endDate` optional marker in `ExperienceSchema`, and the missing `email.email()` validation
on the contact email field. Two Info items cover cosmetic/maturity concerns.

---

## Critical Issues

### CR-01: `scripts/validate-fixtures.ts` outside `tsconfig.json` include — no type checking

**File:** `scripts/validate-fixtures.ts:1`
**Issue:** `tsconfig.json` sets `"include": ["src"]` and `"rootDir": "src"`. The `scripts/`
directory is excluded from that include glob, so `tsc --noEmit` (and the `typecheck` npm script)
silently skips `scripts/validate-fixtures.ts` entirely. Any type error introduced in this file will
not surface in CI. This defeats the purpose of the smoke-test as a quality gate.

Confirmed: `npx tsc --noEmit` exits 0 even when the script has a deliberate type error, because
the compiler never sees the file.

**Fix:** Add a second `tsconfig.scripts.json` that covers `scripts/`, or extend the root tsconfig
to include `scripts/`:

```jsonc
// tsconfig.json — change include to cover scripts/
"include": ["src", "scripts"]
```

If `rootDir` conflicts, switch to `rootPath` / path mapping or use a second config:

```jsonc
// tsconfig.scripts.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "dist-scripts",
    "noEmit": true
  },
  "include": ["scripts"]
}
```

Then update `package.json`:
```json
"typecheck": "tsc --noEmit && tsc -p tsconfig.scripts.json --noEmit"
```

---

### CR-02: `validate-fixtures.ts` uses CWD-relative fixture paths — breaks when run from any directory other than repo root

**File:** `scripts/validate-fixtures.ts:4-5`
**Issue:** `readFileSync("fixtures/sample-resume.json", "utf8")` resolves relative to `process.cwd()`,
not relative to the script's own location. Running `npm run validate-fixtures` from the repo root
works because npm scripts set cwd to the package root, but running the script directly from any other
directory (or in a future monorepo setup) will throw `ENOENT`. This is a fragile path pattern that
is a runtime crash under any non-standard invocation.

```ts
// Current (line 4) — CWD-dependent, fragile:
const valid = JSON.parse(readFileSync("fixtures/sample-resume.json", "utf8"));
```

**Fix:** Anchor paths to the script file's directory using `import.meta.url`:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const valid = JSON.parse(
  readFileSync(join(__dirname, "../fixtures/sample-resume.json"), "utf8")
);
const malformed = JSON.parse(
  readFileSync(join(__dirname, "../fixtures/sample-resume-malformed.json"), "utf8")
);
```

---

### CR-03: `validate-fixtures.ts` import path uses `../src/` — wrong relative path from `scripts/`

**File:** `scripts/validate-fixtures.ts:2`
**Issue:** The import is `from "../src/schema/resume.js"`. The `scripts/` directory sits at the repo
root alongside `src/`, so the path resolves to `../../src/schema/resume.js` — one level too high.
The correct sibling path is `"../src/schema/resume.js"` only if `scripts/` is *inside* `src/`, which
it is not. Running under `tsx` apparently resolves this correctly at runtime through tsx's own module
loader, but the import path is semantically wrong for the actual directory structure and will cause
a `MODULE_NOT_FOUND` error if the project is ever compiled with `tsc` and the script is run from
`dist/`.

Wait — re-checking the actual tree: `scripts/validate-fixtures.ts` is at `<root>/scripts/`, and
`src/schema/resume.ts` is at `<root>/src/schema/resume.ts`. The relative path from `scripts/` to
`src/` is indeed `../src/`, so `../src/schema/resume.js` is correct. Demoting to Warning (see WR-01
below). This Critical entry is retracted.

*This issue was retracted after path verification — replaced by WR-01.*

---

## Warnings

### WR-01: `validate-fixtures.ts` import from `../src/` — works at runtime but is fragile against `rootDir` constraints

**File:** `scripts/validate-fixtures.ts:2`
**Issue:** `import { ResumeSchema } from "../src/schema/resume.js"` works today under `tsx` because
tsx is a transpiler, not a compiler. When `scripts/` is added to `tsconfig.json` (the fix for CR-01),
the `rootDir: "src"` constraint will cause `tsc` to error on this import crossing the rootDir
boundary. This is a latent breakage that will surface as soon as CR-01 is addressed.

**Fix:** Either (a) set `rootDir: "."` in a dedicated `tsconfig.scripts.json` so the cross-directory
import is legal, or (b) restructure so validation code is imported from a published dist path rather
than directly from `src/`.

---

### WR-02: `ExperienceSchema.endDate` is required — blocks valid "current position" resumes at the schema level

**File:** `src/schema/resume.ts:14-16`
**Issue:** `endDate: z.string()` is required. The sample fixture uses `"endDate": "Present"` to
represent a current role. This works only because the fixture hardcodes the string "Present". When
Claude parses a real resume markdown, it might omit `endDate` for the current position entirely
(returning no key), which will cause schema validation to fail and the CLI to abort. This is a
schema contract bug — current positions should have an optional `endDate`.

```ts
// Current — endDate required, will fail on { role: "...", endDate: undefined }
endDate: z.string(),
```

**Fix:**
```ts
endDate: z.string().optional(),
```

If a "Present" sentinel string is desired, document it in a comment or enforce it explicitly:
```ts
endDate: z.string().optional(), // omit for current role; Claude returns "Present" or omits
```

---

### WR-03: Pre-commit hook calls `gitleaks` as a bare binary — not declared as a dependency, silent failure on clean clones

**File:** `package.json:22`
**Issue:** The `pre-commit` hook runs `gitleaks protect -v --staged` but `gitleaks` is not a Node
package and is not listed in `devDependencies`. On a clean clone, `npm install` will not install
`gitleaks`. If the binary is absent from `PATH`, the hook will fail with `command not found`,
blocking all commits. For a portfolio repo meant to "run cleanly for strangers" (per CLAUDE.md
constraints), this is a setup-friction bug — the first thing a new contributor does after clone will
be a broken commit.

**Fix options:**
1. Use the npm package `gitleaks` (if one exists) and add it to `devDependencies`.
2. Wrap the call in a guard that degrades gracefully if the binary is absent:
   ```json
   "pre-commit": "npx biome check --write . && (gitleaks protect -v --staged || echo 'gitleaks not installed — skipping secret scan')"
   ```
3. Add a `CONTRIBUTING.md` / README section noting that `gitleaks` must be installed manually
   (`brew install gitleaks`) and document this as a required dev tool.

Option 2 silences the security scan when the tool is missing — Option 3 is the most honest.

---

## Info

### IN-01: `ContactSchema` fields lack format validation — email, phone, linkedin, github accept any string

**File:** `src/schema/resume.ts:3-10`
**Issue:** `email: z.string()` accepts any string, including empty strings. Since `ResumeSchema` is
fed directly to Claude's structured-output helper and the output is used for rendering, a malformed
email like `""` or `"not-an-email"` will pass validation silently. The same applies to `linkedin`
and `github` fields (which should be URLs). This is not a security issue at Phase 1, but the schema
will be the contract boundary for all future phases — fixing format validation now costs less than
retrofitting it.

**Fix (defer to Phase 2 if preferred):**
```ts
const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  location: z.string().min(1),
  linkedin: z.string().url().or(z.string().regex(/^linkedin\.com\//)),
  github: z.string().url().or(z.string().regex(/^github\.com\//)),
});
```

---

### IN-02: `biome.json` excludes `fixtures/` from linting — inconsistency if fixture files grow

**File:** `biome.json:23`
**Issue:** `"!**/fixtures"` excludes the entire `fixtures/` directory from Biome's checks. Fixture
files are JSON and Biome's JSON formatter/linter would normally apply. This is a deliberate choice
(fixture content should not be reformatted), but it's undocumented. If TypeScript fixture helpers
are added under `fixtures/` in a later phase, they will also be silently excluded from linting.

**Fix (low priority):** Narrow the exclusion to JSON only, or add a comment in `biome.json`:
```json
"!**/fixtures/**/*.json"
```
Or leave as-is but add a note in the config explaining the intent.

---

## Verdict

**needs-fixes** — Two Critical issues are real blockers: the `scripts/` directory is outside
`tsconfig.json` scope (no type checking on the smoke-test script), and fixture paths are
CWD-dependent and will crash on non-standard invocations. The schema's required `endDate` is a
Warning-tier schema contract bug that will cause false validation failures on real-world resumes
with current positions. These should be resolved before Phase 2 adds real pipeline logic on top
of this foundation.

---

_Reviewed: 2026-07-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
