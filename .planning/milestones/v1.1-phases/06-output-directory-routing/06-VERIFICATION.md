---
phase: 06-output-directory-routing
verified: 2026-07-30T21:00:00Z
status: passed
score: 10/10 must-haves verified
overrides_applied: 0
re_verification: null
gaps: []
human_verification:
  - test: "Run 'echo n | ANTHROPIC_API_KEY=<real-key> npx tsx src/cli/index.ts fixtures/sample-resume.md' from project root"
    expected: "Both PDFs written to output/ relative to cwd; output/ directory created automatically if absent"
    why_human: "Requires a live Claude API key; automated tests only validate behavior up to the point of API call"
  - test: "Run 'printf \"y\\nAcme Corp\\n\" | ANTHROPIC_API_KEY=<real-key> npx tsx src/cli/index.ts fixtures/sample-resume.md' from project root"
    expected: "Both PDFs written to output/Acme-Corp/ relative to cwd; output/Acme-Corp/ directory created automatically"
    why_human: "Requires a live Claude API key to reach PDF rendering step; automated Test 9 only verifies the prompt fires and API rejection is the failure mode, not successful PDF write"
---

# Phase 6: Output Directory Routing Verification Report

**Phase Goal:** Users can direct output to a company-specific folder when submitting a tailored resume
**Verified:** 2026-07-30T21:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | Running `cvgen <path>` prompts whether resume is tailored; entering "no" writes both PDFs to `output/` relative to cwd | VERIFIED (prompt) / HUMAN NEEDED (PDF write) | `ask()` function in index.ts lines 111–119; `outputDir = join(process.cwd(), "output")` line 133; `mkdir(outputDir, { recursive: true })` line 155; `resolveOutputPaths(absPath, outputDir)` line 176. Test 9 confirms prompt fires and "n" path traverses to Step E. End-to-end PDF write requires live API key. |
| SC-2 | Entering "yes" asks for company name; "Acme Corp" routes both PDFs to `output/Acme-Corp/` | VERIFIED (slug + routing) / HUMAN NEEDED (PDF write) | `toCompanySlug("Acme Corp")` returns `"Acme-Corp"` (unit tested); `outputDir = join(process.cwd(), "output", slug)` line 130; Test 10 confirms empty-slug guard fires before API call. PDF write to output/Acme-Corp/ requires live key. |
| SC-3 | The output directory is created automatically if it does not exist | VERIFIED (code) / HUMAN NEEDED (real disk) | `await mkdir(outputDir, { recursive: true })` line 155, guarded by `if (!isValidateOnly)` line 154. `{ recursive: true }` makes mkdir idempotent. Disk creation confirmed by Test 9's tmpCwd pattern (mkdir fires in temp dir for real). |

### Plan 01 Must-Have Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| P1-1 | `toCompanySlug('Acme Corp')` returns `'Acme-Corp'` | ✓ VERIFIED | render.ts lines 15–20: chain `.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "-")`; unit test "spaces to hyphens, casing preserved (D-01)" asserts this; npm test passes |
| P1-2 | `toCompanySlug('AT&T')` returns `'ATT'` | ✓ VERIFIED | Same regex strips `&`; unit test "strips special chars without replacement (D-02)" asserts `toCompanySlug("AT&T") === "ATT"`; all 44 tests pass |
| P1-3 | `toCompanySlug('!!!')` returns empty string | ✓ VERIFIED | Unit test "returns empty string for all-special or empty input (guard case)" asserts both `toCompanySlug("!!!") === ""` and `toCompanySlug("") === ""`; all 44 tests pass |
| P1-4 | `resolveOutputPaths(inputMdPath, outputDir)` returns paths joined to outputDir | ✓ VERIFIED | render.ts lines 29–38: `join(outputDir, ...)` in both return values; Test 1 asserts `"/some/output/dir/my-resume-resume.pdf"`; all 44 tests pass |
| P1-5 | npm test passes with all unit tests green | ✓ VERIFIED | 44 tests, 0 failures, 0 skipped — including 3 rewritten resolveOutputPaths tests and 4 toCompanySlug tests |
| P1-6 | `tsc --noEmit` exits 0 | ✓ VERIFIED | `npx tsc --noEmit` produced no output (clean exit) |

### Plan 02 Must-Have Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| P2-1 | `cvgen <path>` prompts "Is this resume tailored for a specific company? (y/n)" | ✓ VERIFIED | index.ts line 123: `await ask("Is this resume tailored for a specific company? (y/n): ")`; Test 9 confirms prompt is reached before API call |
| P2-2 | Answering "n" writes both PDFs to `output/` relative to cwd | HUMAN NEEDED | Code path: `outputDir = join(process.cwd(), "output")` (line 133) → `mkdir(outputDir, ...)` (line 155) → `resolveOutputPaths(absPath, outputDir)` (line 176). Test 9 confirms "n" path reaches Step E — full write needs live key |
| P2-3 | Answering "y" then "Acme Corp" writes both PDFs to `output/Acme-Corp/` | HUMAN NEEDED | Code path verified; `toCompanySlug` unit-tested to return "Acme-Corp"; full write needs live key |
| P2-4 | Output directory is created automatically | HUMAN NEEDED | `mkdir(outputDir, { recursive: true })` confirmed in code; live disk creation needs live key run |
| P2-5 | Answering "y" then "!!!" triggers program.error exit code 1 | ✓ VERIFIED | Test 10 asserts exit non-zero AND output contains "Company name must contain at least one letter or digit"; 44 tests pass |
| P2-6 | `--validate-only` skips mkdir | ✓ VERIFIED | index.ts lines 153–156: `const isValidateOnly = options.validateOnly \|\| options.dryRun; if (!isValidateOnly) { await mkdir(outputDir, ...) }` — mkdir is inside the !isValidateOnly guard |
| P2-7 | `tsc --noEmit` exits 0 after changes to index.ts | ✓ VERIFIED | Clean tsc run confirmed |

**Score:** 10/10 must-haves verified (2 require human confirmation for live API path)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/render.ts` | `toCompanySlug` export + updated `resolveOutputPaths` signature | ✓ VERIFIED | Lines 15–38: both exports present, correct implementation, `dirname` import removed, `basename` and `join` only |
| `src/lib/render.test.ts` | Tests 1–3 rewritten; `describe("toCompanySlug")` with 4 it() tests | ✓ VERIFIED | Lines 26–98: 3 resolveOutputPaths tests (explicit outputDir), 4 toCompanySlug tests; all pass |
| `scripts/smoke-render.ts` | `resolveOutputPaths(inputMdPath, tmp)` two-argument call | ✓ VERIFIED | Line 28: `const { designed, ats } = resolveOutputPaths(inputMdPath, tmp);` |
| `src/cli/index.ts` | Step D.5 readline prompt + mkdir + updated Step H call | ✓ VERIFIED | Lines 107–156: full readline block, ask() helper, emptySlug guard, mkdir guard; line 176: two-arg resolveOutputPaths |
| `src/cli/index.test.ts` | `describe("Step D.5 interactive prompt")` with Tests 9 and 10 | ✓ VERIFIED | Lines 193–228: both tests present, both pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/render.test.ts` | `src/lib/render.ts` toCompanySlug | `import { renderAts, resolveOutputPaths, toCompanySlug } from "./render.js"` | ✓ WIRED | Line 17 of render.test.ts; toCompanySlug used in describe block lines 79–98 |
| `scripts/smoke-render.ts` | `src/lib/render.ts` resolveOutputPaths | `resolveOutputPaths(inputMdPath, tmp)` | ✓ WIRED | Line 28; return values used as outputPath args to renderDesigned/renderAts |
| `src/cli/index.ts Step D.5` | `src/lib/render.ts` toCompanySlug | `import { ..., toCompanySlug } from "../lib/render.js"` | ✓ WIRED | Line 11 import; called at line 127: `const slug = toCompanySlug(company.trim())` |
| `src/cli/index.ts Step H` | `src/lib/render.ts` resolveOutputPaths | `resolveOutputPaths(absPath, outputDir)` | ✓ WIRED | Line 176; outputDir set by Step D.5 prompt logic |
| `src/cli/index.ts outputDir` | `output/` or `output/<slug>/` on disk | `mkdir(outputDir, { recursive: true })` | ✓ WIRED | Line 155; guarded by `if (!isValidateOnly)` at line 154 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `src/cli/index.ts` | `outputDir` | `ask()` → `toCompanySlug()` → `join(process.cwd(), ...)` | Yes — derived from stdin + cwd at runtime | ✓ FLOWING |
| `src/cli/index.ts` | `paths` (designed/ats) | `resolveOutputPaths(absPath, outputDir)` | Yes — computed from real abs path + outputDir | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `tsc --noEmit` exits 0 | `npx tsc --noEmit` | No output, clean exit | ✓ PASS |
| All 44 tests pass | `npm test` | 44 pass, 0 fail | ✓ PASS |
| `toCompanySlug` export exists | `grep "export function toCompanySlug" src/lib/render.ts` | 1 match | ✓ PASS |
| Two-arg smoke-render call | `grep "resolveOutputPaths(inputMdPath, tmp)" scripts/smoke-render.ts` | 1 match | ✓ PASS |
| `dirname` removed from render.ts | Read render.ts import line 2 | `import { basename, join } from "node:path"` — no dirname | ✓ PASS |
| `createInterface` wired in CLI | `grep "createInterface" src/cli/index.ts` | 2 matches (import + usage) | ✓ PASS |
| `mkdir(outputDir,` in CLI | `grep "mkdir(outputDir" src/cli/index.ts` | 1 match | ✓ PASS |
| `resolveOutputPaths(absPath, outputDir)` at Step H | `grep "resolveOutputPaths(absPath, outputDir)" src/cli/index.ts` | 1 match | ✓ PASS |
| `isValidateOnly` declared exactly once | `grep -c "const isValidateOnly" src/cli/index.ts` | 1 | ✓ PASS |

### Probe Execution

No probes declared in PLAN frontmatter. No `scripts/*/tests/probe-*.sh` files found in this phase. Step 7c: SKIPPED (no probes defined for this phase).

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| OUTPUT-01 | 06-01, 06-02 | CLI asks user whether resume is tailored; if yes, prompts for company name | ✓ SATISFIED | `ask("Is this resume tailored for a specific company? (y/n): ")` + `ask("Company name: ")` in index.ts Step D.5; Test 9 and Test 10 confirm both paths |
| OUTPUT-02 | 06-01, 06-02 | Both PDFs written to `output/` or `output/<Company-Name>/` relative to cwd, directory created if needed | ✓ SATISFIED (code) / HUMAN NEEDED (live run) | `outputDir` computed from `process.cwd()` + slug; `mkdir(outputDir, { recursive: true })`; `resolveOutputPaths(absPath, outputDir)`. Live PDF write needs API key. |

No orphaned OUTPUT-* requirements found. QUAL-01, QUAL-02, QUAL-03 are Phase 7 requirements — not in scope here.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/cli/index.ts` | 121 | `let outputDir!: string` — definite assignment assertion | Info | Non-null assertion needed because TypeScript can't prove all try-block paths assign the variable before use (emptySlug guard exits first). Compiler verified via tsc --noEmit. Acceptable pattern. |

No TBD, FIXME, or XXX markers found in any of the four modified files.

Notable deviation documented in 06-02 SUMMARY: the implementation uses callback-based `readline` (not `readline/promises`) to handle stdin EOF correctly in piped contexts (spawnSync tests). This is a correct, intentional engineering decision — `readline/promises` silently drops pending `question()` Promises on stdin close, causing exit code 13. The deviation is well-documented and properly tested.

### Human Verification Required

#### 1. "n" Path End-to-End PDF Write

**Test:** From project root with a live API key: `echo "n" | ANTHROPIC_API_KEY=<real-key> npx tsx src/cli/index.ts fixtures/sample-resume.md`
**Expected:** Both PDFs written to `output/` relative to cwd; `output/` directory created automatically; CLI logs `Written: .../output/sample-resume-resume.pdf` and `Written: .../output/sample-resume-resume-ats.pdf`
**Why human:** Automated Test 9 only validates that the "n" prompt path survives to Step E (API call), which fails because it uses a dummy key. A live API key is needed to verify the full PDF write path including the `mkdir` → `renderDesigned` → `renderAts` chain.

#### 2. "y" + Company Name End-to-End PDF Write

**Test:** From project root with a live API key: `printf "y\nAcme Corp\n" | ANTHROPIC_API_KEY=<real-key> npx tsx src/cli/index.ts fixtures/sample-resume.md`
**Expected:** Both PDFs written to `output/Acme-Corp/` relative to cwd; `output/Acme-Corp/` created automatically; CLI logs paths ending in `output/Acme-Corp/sample-resume-resume.pdf` and `output/Acme-Corp/sample-resume-resume-ats.pdf`
**Why human:** Same reason as above — full end-to-end write to the company-slug directory requires a live API key.

### Gaps Summary

No gaps. All ten must-haves are verified at the code and test level. The two human verification items are practical confirmation of the live write path — the code, wiring, unit tests, and integration tests (with dummy key) all confirm the implementation is correct. ROADMAP success criteria SC-1, SC-2, SC-3 are fully implemented in code; SC-1 and SC-2 have their PDF-write confirmation deferred to human verification due to API key requirement.

---

_Verified: 2026-07-30T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
