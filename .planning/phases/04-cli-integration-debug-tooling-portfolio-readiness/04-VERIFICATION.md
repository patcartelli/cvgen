---
phase: 04-cli-integration-debug-tooling-portfolio-readiness
verified: 2026-07-28T21:00:00Z
status: passed
score: 5/5
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "All 8 CLI tests in index.test.ts pass (including rewritten Test 8 asserting Commander is present)"
  gaps_remaining: []
  regressions: []
---

# Phase 4: CLI Integration, Debug Tooling & Portfolio Readiness — Verification Report

**Phase Goal:** A user runs one command against a real markdown resume note and reliably gets both PDFs, with clear errors, help text, debug visibility, and an onboarding path.
**Verified:** 2026-07-28T21:00:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running `cvgen <path-to-markdown-file>` end-to-end writes both the designed and ATS PDFs to disk | VERIFIED | `src/cli/index.ts` wires extractResume → renderDesigned + renderAts → both Written lines; UAT Task 3 check 6 confirmed by human |
| 2 | Running cvgen against a nonexistent or unreadable path fails with human-readable message (not stack trace), exits non-zero | VERIFIED | Lines 86–94 of `src/cli/index.ts`: readFile failure calls `program.error()` with human message; Test 4 passes |
| 3 | Running `cvgen --help` prints usage and an example invocation | VERIFIED | `.addHelpText('after', ...)` block at line 56–64 includes "Examples:"; Test 1 passes confirming Usage in stderr |
| 4 | Running with `--verbose` shows the raw Claude API response alongside the validated JSON | VERIFIED | Lines 109–114 of `src/cli/index.ts`: verbose branch prints `--- raw Claude response ---` + rawResponse + `--- validated JSON ---` + data to stderr; UAT check 5 confirmed by human |
| 5 | Running `cvgen init` generates an example Obsidian note with required frontmatter/heading convention | VERIFIED | Lines 139–154: `cvgen init` subcommand writes INIT_TEMPLATE with all 6 frontmatter fields and all 3 required sections; UAT check 7 confirmed |

**Score:** 5/5 truths verified

---

### Must-Have Truths (from PLAN frontmatter)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| P01-1 | `commander` in package.json dependencies and node_modules | VERIFIED | `"commander": "^15.0.0"` in dependencies; `node_modules/commander` v15.0.0 installed |
| P01-2 | `extractResume` returns `{ data: ResumeData; rawResponse: Message }` (ExtractResult) | VERIFIED | `src/lib/extract.ts` line 8–11: `export interface ExtractResult { data: ResumeData; rawResponse: Message }`, return at line 31 confirmed |
| P01-3 | All existing extract.ts tests still pass after return type change | VERIFIED | All 8 extract.test.ts tests pass (38/38 total) |
| P02-1 | Running `cvgen fixtures/sample-resume.md` writes both PDFs to disk and exits 0 | VERIFIED | End-to-end pipeline wired; UAT human-verified |
| P02-2 | Running against nonexistent path prints human-readable error and exits 1 | VERIFIED | Test 4 passes; `program.error()` used — no stack trace |
| P02-3 | Running `cvgen --help` prints 'Usage:', all defined options, and an example invocation | VERIFIED | Tests 1–2 pass; `addHelpText` with Examples block confirmed in source |
| P02-4 | Running `cvgen fixtures/sample-resume.md --verbose` prints raw Claude response and validated JSON to stderr | VERIFIED | Source confirmed; UAT human-verified |
| P02-5 | Running `cvgen init` writes a markdown file with required frontmatter fields and section headings | VERIFIED | INIT_TEMPLATE contains name/email/phone/location/linkedin/github and ## Experience/## Education/## Skills |
| P02-6 | All 8 CLI tests in index.test.ts pass (including rewritten Test 8 asserting Commander is present) | VERIFIED | `npm test` exits 0: 38/38 pass. Test 3 fixed by adding optional `cwd` parameter to `runCli` and passing a `mkdtempSync` temp dir with no `.env` file, preventing `process.loadEnvFile(".env")` from repopulating the key |

**Score (plan must-haves):** 9/9 verified

---

### Gap Closure Detail

**Previously failing:** Test 3 — file path but no ANTHROPIC_API_KEY → exits 1.

**Root cause (confirmed):** `process.loadEnvFile(".env")` resolves relative to the subprocess's CWD. When CWD was `projectRoot`, it loaded the real `.env` and repopulated `ANTHROPIC_API_KEY`, causing the key guard to silently pass and the CLI to exit 0.

**Fix applied:** `runCli` now accepts an optional third parameter `cwd: string = projectRoot`. Test 3 creates a `mkdtempSync` temp directory (no `.env` present) and passes it as `cwd`. With no `.env` in that directory, `process.loadEnvFile(".env")` throws, the catch block absorbs it, `ANTHROPIC_API_KEY` stays unset, the key guard fires, and the CLI exits 1 as expected.

**Verification:** `npm test` — 38/38 pass, exit 0. Test 3 output: `✔ Test 3: file path but no ANTHROPIC_API_KEY → error mentions 'ANTHROPIC_API_KEY' and 'not set', exits 1 (855.677834ms)`.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | commander dependency declaration | VERIFIED | `"commander": "^15.0.0"` in dependencies |
| `node_modules/commander` | commander 15 installed | VERIFIED | v15.0.0 present |
| `src/lib/extract.ts` | ExtractResult interface + updated return type | VERIFIED | Lines 8–31 confirmed — exports ExtractResult, returns `{ data, rawResponse }` |
| `src/lib/extract.test.ts` | Test 8 asserting ExtractResult interface | VERIFIED | Lines 101–109 — asserts ExtractResult, rawResponse, data: response.parsed_output |
| `src/cli/index.ts` | Commander 15 program with main action, init subcommand, --verbose, --validate-only/--dry-run | VERIFIED | 159-line file, full pipeline wired — confirmed by source read |
| `src/cli/index.test.ts` | Updated test suite with rewritten Test 8 asserting Commander is imported; `runCli` accepts optional `cwd` | VERIFIED | Lines 25–41 — `runCli` signature accepts `cwd: string = projectRoot`; lines 93–107 — Test 3 passes `noDotEnvDir` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/cli/index.ts` | `src/lib/extract.ts` | `const { data, rawResponse } = await extractResume(markdown)` | VERIFIED | Line 106 confirmed — ExtractResult destructuring |
| `src/cli/index.ts` | `src/lib/render.ts` | `browser lifecycle: puppeteer.launch → renderDesigned + renderAts → browser.close` | VERIFIED | Lines 126–131 confirmed — try/finally, browser.close() |
| `src/cli/index.ts` | `resolveOutputPaths` | `const paths = resolveOutputPaths(absPath)` | VERIFIED | Line 124 confirmed |
| `src/cli/index.ts` | `src/lib/preflight.ts` | `preflightCheck(markdown)` | VERIFIED | Line 97 confirmed |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `src/cli/index.ts` | `data, rawResponse` | `extractResume(markdown)` → Claude API | Yes — live API call with real markdown | FLOWING |
| `src/cli/index.ts` | `markdown` | `readFile(absPath, "utf8")` | Yes — reads from disk | FLOWING |
| `src/cli/index.ts` | `paths.designed, paths.ats` | `resolveOutputPaths(absPath)` | Yes — deterministic path derivation | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Commander importable | `ls node_modules/commander/index.js` | exists | PASS |
| CLI shebang on line 1 | source read — line 1 | `#!/usr/bin/env node` | PASS |
| ExtractResult interface exported | source grep | found at line 8–11 | PASS |
| All extract tests pass | `npx tsx --test src/lib/extract.test.ts` | 8/8 pass, exit 0 | PASS |
| CLI tests | `npx tsx --test src/cli/index.test.ts` | 8/8 pass | PASS |
| Full test suite | `npm test` | 38/38 pass, exit 0 | PASS |

---

### Probe Execution

No probe scripts declared or conventionally present for this phase. Step 7c: SKIPPED (no probe-*.sh files).

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CLI-01 | 04-02 | `cvgen <path>` writes both PDFs to disk | SATISFIED | Lines 126–135 of cli/index.ts wire the full render pipeline; UAT human-verified |
| CLI-02 | 04-02 | CLI validates input path exists, fails with human-readable message | SATISFIED | Lines 86–94: try/catch readFile → program.error() with human message |
| CLI-03 | 04-02 | CLI exits 0 on success and non-zero on failure | SATISFIED | program.error() exits 1; process.exit(0) on validate-only; render pipeline exits 0 on success |
| CLI-04 | 04-02 | `cvgen --help` prints usage and example invocation | SATISFIED | addHelpText with Examples block; Tests 1–2 confirm Usage in stderr |
| DEVX-02 | 04-01, 04-02 | `--verbose`/`--debug` dumps raw Claude response + validated JSON | SATISFIED | ExtractResult.rawResponse exposed; --verbose branch at lines 109–114; UAT confirmed |
| DEVX-03 | 04-02 | `cvgen init` generates example Obsidian note | SATISFIED | init subcommand at lines 139–154; INIT_TEMPLATE has all required fields and sections |

**Note on DEVX-02 wording:** REQUIREMENTS.md says `--verbose`/`--debug`. The CLI implements `--verbose` only. PLAN notes that `--debug` is intentionally excluded (RESEARCH.md Pitfall 6: Node runtime may intercept `--debug` before Commander). This is a documented deliberate deviation, not an omission. The requirement intent is satisfied by `--verbose`.

**ORPHANED requirements check:** REQUIREMENTS.md Phase 4 row lists CLI-01, CLI-02, CLI-03, CLI-04, DEVX-02, DEVX-03. All 6 are claimed by PLAN frontmatter. No orphans.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/cli/index.ts` | 121 | `process.exit(0)` in validate-only branch | Info | Intentional — validate-only exits before rendering. Commander pattern suggests `program.error()` for errors only; process.exit(0) on success paths is correct. Not a stub. |

No `TBD`, `FIXME`, `XXX` markers found in phase-modified files.
No stubs or placeholder returns found in `src/cli/index.ts` or `src/lib/extract.ts`.

---

### Human Verification Required

None. The human UAT checkpoint (Task 3 in Plan 02) was completed and approved prior to initial verification. All automated checks now pass. No additional human verification is needed.

---

## Gaps Summary

None. All must-haves verified. The one gap identified in initial verification (Test 3 failure due to `.env` isolation) has been resolved. `npm test` exits 0 with 38/38 passing.

---

_Verified: 2026-07-28T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
