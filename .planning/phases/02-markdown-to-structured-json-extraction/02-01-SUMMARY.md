---
phase: 02-markdown-to-structured-json-extraction
plan: "01"
subsystem: extraction-library
tags: [claude-api, zod, validation, preflight, markdown-fixture]
dependency_graph:
  requires: [src/schema/resume.ts, fixtures/sample-resume.json, "@anthropic-ai/sdk@0.115.0", "zod@4.4.3"]
  provides: [src/lib/extract.ts, src/lib/preflight.ts, src/schema/validate.ts, fixtures/sample-resume.md]
  affects: [Phase 02 Plan 02 (CLI wiring), Phase 04 (Commander CLI)]
tech_stack:
  added: [tsconfig.test.json]
  patterns: [TDD RED/GREEN, node:test native test runner, source-level structural assertions]
key_files:
  created:
    - src/lib/extract.ts
    - src/lib/preflight.ts
    - src/lib/extract.test.ts
    - src/lib/preflight.test.ts
    - src/schema/validate.test.ts
    - fixtures/sample-resume.md
    - tsconfig.test.json
  modified:
    - src/schema/validate.ts
    - tsconfig.json
    - package.json
decisions:
  - "Excluded *.test.ts from main tsconfig.json and added tsconfig.test.json with types:[node] to keep type-checking clean across test files"
  - "Used ReadonlyArray<PropertyKey> in formatZodErrors signature to satisfy Zod v4 $ZodIssue.path type"
  - "Test file for extract.ts uses source-level string assertions (no live API call) to lock contract shape without requiring ANTHROPIC_API_KEY"
metrics:
  duration: "5m 13s"
  completed: "2026-07-28"
  tasks_completed: 3
  tests_total: 18
  files_created: 7
  files_modified: 3
---

# Phase 02 Plan 01: Library Layer (validateResume, preflightCheck, extractResume) Summary

One-liner: Pure extraction library with path-based Zod error formatting, markdown pre-flight checking, and Claude API wrapper using messages.parse + zodOutputFormat(ResumeSchema).

## What Was Built

Three importable TypeScript library functions and one markdown fixture — the complete Phase 2 library layer that Plan 02 (CLI wiring) and Phase 4 (Commander CLI) will import.

### Exported Signatures

```typescript
// src/schema/validate.ts
export function validateResume(data: unknown): ResumeData

// src/lib/preflight.ts
export interface PreflightError { type: "frontmatter" | "section"; missing: string; message: string; }
export function preflightCheck(markdown: string): PreflightError[]

// src/lib/extract.ts
export async function extractResume(markdown: string): Promise<ResumeData>
```

### Task 1: validateResume upgrade (src/schema/validate.ts)

Replaced the Phase 1 stub's generic `result.error.message` throw with a `formatZodErrors` helper that maps each Zod issue to `  {path}: {message}` format. Path join rules: numeric segments render as `[N]`, string segments after the first get a leading `.`, empty path renders as `(root)`. Error header is `Resume validation failed:\n`.

5 tests lock: valid fixture passes, malformed fixture produces path-shaped lines, specific field paths (e.g. `contact.phone`) appear, root-level required fields mention `contact`, and numeric indices render as `[0]`.

### Task 2: preflightCheck (src/lib/preflight.ts)

Pure function, zero imports. Extracts frontmatter block with `^---\n([\s\S]*?)\n---` (non-greedy, anchored at start — handles `---` dividers in body correctly). Checks 6 required frontmatter fields via per-field regex `^{field}:` (multiline). Checks 3 required section headings via `\n{heading}` or `startsWith`. Accumulates all errors in one pass.

7 tests lock: valid doc returns [], empty string returns 9 errors, specific error shapes for frontmatter and section, optional sections not flagged, heading at doc start detected, body `---` dividers don't truncate frontmatter.

### Task 3: extractResume + fixture (src/lib/extract.ts, fixtures/sample-resume.md)

`extractResume` wraps `client.messages.parse` with `zodOutputFormat(ResumeSchema)`, model `claude-haiku-4-5`, `max_tokens: 2048`, and a minimal schema-only system prompt. Guards `parsed_output === null` and throws — never calls `process.exit`. The `@anthropic-ai/sdk/helpers/zod.js` import uses the mandatory `.js` extension per NodeNext module resolution.

`fixtures/sample-resume.md` follows D-01..D-08 exactly: YAML frontmatter with all 6 contact fields, section order Summary → Core Competencies → Experience → Education → Skills, Alex Rivera persona matching `sample-resume.json`.

6 structural tests lock the extract.ts source shape (no live API call needed) and verify the fixture passes preflightCheck.

## Test Results

| Suite | Tests | Pass | Fail |
|-------|-------|------|------|
| src/schema/validate.test.ts | 5 | 5 | 0 |
| src/lib/preflight.test.ts | 7 | 7 | 0 |
| src/lib/extract.test.ts | 6 | 6 | 0 |
| **Total** | **18** | **18** | **0** |

## Verification

- `npm run typecheck`: clean (all 3 tsconfig targets pass)
- `npm run lint`: 0 errors (Biome)
- `grep -c "process.exit" src/lib/extract.ts src/lib/preflight.ts src/schema/validate.ts`: 0 0 0
- PARSE-01 (`messages.parse`): 1 match in extract.ts
- PARSE-02 (`safeParse`): 1 match in validate.ts
- PARSE-03 (`Missing required`): 2 matches in preflight.ts; `issue.path`: 1 match in validate.ts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added tsconfig.test.json for test file type-checking**
- **Found during:** Task 1
- **Issue:** Main `tsconfig.json` doesn't have `types: ["node"]`, so test files importing `node:assert`, `node:test`, etc. failed typecheck with `TS2591: Cannot find name 'node:assert/strict'`. Test files were included in `src/` but needed separate compiler settings.
- **Fix:** Created `tsconfig.test.json` extending main config with `types: ["node"]` and `include: ["src/**/*.test.ts"]`. Excluded `*.test.ts` from main `tsconfig.json`. Added `tsconfig.test.json` to `typecheck` script. This mirrors the existing `tsconfig.scripts.json` pattern.
- **Files modified:** `tsconfig.json`, `tsconfig.test.json` (new), `package.json`
- **Commit:** f4d85d0

**2. [Rule 1 - Bug] Fixed Zod v4 type compatibility in formatZodErrors**
- **Found during:** Task 1
- **Issue:** `$ZodIssue.path` is typed as `PropertyKey[]` (which includes `symbol`), not `(string | number)[]`. Passing it to a function typed as `(string | number)[]` produced TS2345.
- **Fix:** Changed `formatZodErrors` parameter type to `ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>` and used `String(p)` for string segments to safely handle any PropertyKey value.
- **Files modified:** `src/schema/validate.ts`
- **Commit:** f4d85d0

## Known Stubs

None — all exported functions have full implementations. No placeholder text, hardcoded empty arrays, or TODO comments in any created/modified file.

## Threat Flags

No new threat surface introduced. All three threat mitigations from the plan's threat register are implemented:
- T-02-01: `zodOutputFormat(ResumeSchema)` validates response; `parsed_output === null` guard throws before returning malformed data
- T-02-02: `new Anthropic()` with no explicit key argument; no logging of key value; `console.log` absent from extract.ts
- T-02-04: Fixture uses fictional Alex Rivera persona, example.com email, (555) 000-0000 phone — no real PII

## Self-Check: PASSED
