---
phase: 04-cli-integration-debug-tooling-portfolio-readiness
verified: 2026-07-28T20:30:00Z
status: gaps_found
score: 4/5
overrides_applied: 0
gaps:
  - truth: "All 8 CLI tests in index.test.ts pass (including rewritten Test 8 asserting Commander is present)"
    status: failed
    reason: >
      Test 3 exits 0 instead of 1. The test spawns the CLI as a subprocess with ANTHROPIC_API_KEY
      deleted from the environment, but the CLI calls process.loadEnvFile(".env") inside the action
      handler — this loads the real project .env file (which contains a valid key) into the
      subprocess's process.env, bypassing the key guard. The CLI then succeeds, exits 0, and the
      assertion `status === 1` fails. npm test exits 1 (37/38 pass, 1 fail).
    artifacts:
      - path: "src/cli/index.test.ts"
        issue: "Test 3 does not account for .env auto-load in the CLI subprocess"
      - path: "src/cli/index.ts"
        issue: >
          process.loadEnvFile('.env') runs relative to the subprocess's CWD (project root),
          which always has a .env. The test has no mechanism to prevent this load.
    missing:
      - >
        Fix Test 3 so the subprocess cannot access the .env file. Options:
        (a) run the subprocess with cwd set to a temp directory that has no .env,
        (b) pass HOME=/nonexistent or a temp HOME so .env is not found relative to cwd,
        (c) pass an additional env var that the CLI checks to skip .env loading in test mode,
        (d) copy the fixture to a temp dir and invoke with cwd=tempDir where no .env exists.
        The simplest fix is to set the subprocess's CWD to a temp dir with just the fixture
        so process.loadEnvFile(".env") throws (caught by the try/catch), leaving
        ANTHROPIC_API_KEY unset and triggering the key guard as expected.
---

# Phase 4: CLI Integration, Debug Tooling & Portfolio Readiness — Verification Report

**Phase Goal:** A user runs one command against a real markdown resume note and reliably gets both PDFs, with clear errors, help text, debug visibility, and an onboarding path.
**Verified:** 2026-07-28T20:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

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

**Score:** 4/5 truths verified (all 5 goal truths are VERIFIED; 1 BLOCKER gap blocks npm test)

---

### Must-Have Truths (from PLAN frontmatter)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| P01-1 | `commander` in package.json dependencies and node_modules | VERIFIED | `"commander": "^15.0.0"` in dependencies; `node_modules/commander` v15.0.0 installed |
| P01-2 | `extractResume` returns `{ data: ResumeData; rawResponse: Message }` (ExtractResult) | VERIFIED | `src/lib/extract.ts` line 8–11: `export interface ExtractResult { data: ResumeData; rawResponse: Message }`, return at line 31 confirmed |
| P01-3 | All existing extract.ts tests still pass after return type change | VERIFIED | `npx tsx --test src/lib/extract.test.ts` exits 0 — 7/7 pass |
| P02-1 | Running `cvgen fixtures/sample-resume.md` writes both PDFs to disk and exits 0 | VERIFIED | End-to-end pipeline wired; UAT human-verified |
| P02-2 | Running against nonexistent path prints human-readable error and exits 1 | VERIFIED | Test 4 passes; `program.error()` used — no stack trace |
| P02-3 | Running `cvgen --help` prints 'Usage:', all defined options, and an example invocation | VERIFIED | Tests 1–2 pass; `addHelpText` with Examples block confirmed in source |
| P02-4 | Running `cvgen fixtures/sample-resume.md --verbose` prints raw Claude response and validated JSON to stderr | VERIFIED | Source confirmed; UAT human-verified |
| P02-5 | Running `cvgen init` writes a markdown file with required frontmatter fields and section headings | VERIFIED | INIT_TEMPLATE contains name/email/phone/location/linkedin/github and ## Experience/## Education/## Skills |
| P02-6 | All 8 CLI tests in index.test.ts pass (including rewritten Test 8 asserting Commander is present) | FAILED | `npm test` exits 1: Test 3 fails — exits 0 instead of 1 because `.env` loaded by subprocess overrides deleted ANTHROPIC_API_KEY |

**Score (plan must-haves):** 8/9 verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | commander dependency declaration | VERIFIED | `"commander": "^15.0.0"` in dependencies |
| `node_modules/commander` | commander 15 installed | VERIFIED | v15.0.0 present |
| `src/lib/extract.ts` | ExtractResult interface + updated return type | VERIFIED | Lines 8–31 confirmed — exports ExtractResult, returns `{ data, rawResponse }` |
| `src/lib/extract.test.ts` | Test 8 asserting ExtractResult interface | VERIFIED | Lines 101–109 — asserts ExtractResult, rawResponse, data: response.parsed_output |
| `src/cli/index.ts` | Commander 15 program with main action, init subcommand, --verbose, --validate-only/--dry-run | VERIFIED | 159-line file, full pipeline wired — confirmed by source read |
| `src/cli/index.test.ts` | Updated test suite with rewritten Test 8 asserting Commander is imported | VERIFIED | Lines 171–179 — asserts commander, new Command(), parseAsync, no require/inquirer/yargs |

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
| All extract tests pass | `npx tsx --test src/lib/extract.test.ts` | 7/7 pass, exit 0 | PASS |
| CLI tests | `npx tsx --test src/cli/index.test.ts` | 7/8 pass — Test 3 FAILS | FAIL |
| Full test suite | `npm test` | 37/38 pass, exit 1 | FAIL |

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

The human UAT checkpoint (Task 3 in Plan 02) was completed and approved. The SUMMARY.md records "all 8 checks approved." No additional human verification is needed for functional behavior — the one remaining gap is programmatically identified (Test 3 failure).

---

## Gaps Summary

### BLOCKER: Test 3 failure — `npm test` exits non-zero

**Truth failed:** "All 8 CLI tests in index.test.ts pass"

**Root cause:** `src/cli/index.ts` calls `process.loadEnvFile(".env")` unconditionally inside the action handler. When `index.test.ts` Test 3 spawns the CLI as a subprocess with `ANTHROPIC_API_KEY` deleted from the environment, the subprocess inherits the project root as its CWD. The `process.loadEnvFile(".env")` call finds and loads the `.env` file located at the project root, which contains a valid `ANTHROPIC_API_KEY`. This repopulates the key into the subprocess's `process.env`, causing the `if (!process.env.ANTHROPIC_API_KEY)` guard to not fire. The CLI proceeds with extraction, exits 0, and the test's `assert.equal(status, 1)` fails.

**Fix required:** Update `index.test.ts` Test 3 so the CLI subprocess cannot load the `.env` file. The simplest approach is to set `cwd` in the `spawnSync` options to a temp directory (e.g., a `mkdtempSync` directory) that does not contain a `.env` file. The CLI's `process.loadEnvFile(".env")` will then throw (because no `.env` exists relative to the temp CWD), the catch block will absorb the error, `ANTHROPIC_API_KEY` will remain unset, and the key guard will fire correctly, exiting 1.

Alternative: create a helper in the test file that runs the CLI with `cwd` pointing to a temp dir for key-guard tests only.

**Impact:** `npm test` exits 1 today. The phase goal's must-have that all 8 tests pass is not met.

---

_Verified: 2026-07-28T20:30:00Z_
_Verifier: Claude (gsd-verifier)_
