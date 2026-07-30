---
phase: 07-quality-packaging-global-install
verified: 2026-07-30T21:00:00Z
status: human_needed
score: 5/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open a NEW terminal session (not the executor's shell). Run `which cvgen` — expected: non-empty path under your global npm bin directory. Run `ls -la $(which cvgen)` — expected: symlink pointing into this repo's dist/cli/index.js with execute bit. cd to a directory OUTSIDE this repo. Run `cvgen --help` — expected: Commander help listing the positional `<path>` argument and at minimum `--verbose` / `--validate-only` flags; exits 0 with no ERR_MODULE_NOT_FOUND. Run `cvgen init /tmp/cvgen-verify-$(date +%s).md` — expected: file created with sample frontmatter and Experience/Education/Skills headings. Clean up: rm /tmp/cvgen-verify-*.md."
    expected: "All steps exit 0. `cvgen --help` prints usage text. `cvgen init` creates a valid sample note. No command-not-found, no permission denied, no ERR_MODULE_NOT_FOUND."
    why_human: "Global PATH resolution, shell symlink traversal, and interactive prompt behavior cannot be verified by grep. The automated steps (npm link, which cvgen, cvgen --help from temp dir) were run by the executor but Task 3 SUMMARY shows tasks_completed: 2 / tasks_total: 3 with no human 'approved' recorded and no 07-HUMAN-UAT.md file created. Human must confirm in a new terminal session."
---

# Phase 7: Quality, Packaging & Global Install — Verification Report

**Phase Goal:** cvgen is installable as a global command and the codebase has no type or test infrastructure debt
**Verified:** 2026-07-30
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `rawResponse` on `ExtractResult` is typed as `ParsedMessage<ResumeData>` | VERIFIED | `src/lib/extract.ts` line 11: `rawResponse: ParsedMessage<ResumeData>;` with import from `@anthropic-ai/sdk` |
| 2 | `npm test` runs exactly one test runner with no conflicting scripts | VERIFIED | `package.json` has single `"test": "tsx --test src/**/*.test.ts"`. No `vitest.config.ts` or `vitest.config.js` found. No `vitest` in package.json. |
| 3 | REQUIREMENTS.md marks QUAL-01 and QUAL-02 as complete | VERIFIED | Lines 22–23: both `[x]` with `— closed 2026-07-28`. Traceability table lines 54–55: `Complete — 2026-07-28`. QUAL-03 remains `[ ]`. |
| 4 | PROJECT.md Active (v1.1) contains only the QUAL-03 global-install entry | VERIFIED | Line 58 is the only Active (v1.1) bullet. All five migrated entries (TYPO-01/02/03, CR-01, WR-04) are in the Validated section with correct Phase/date suffixes. |
| 5 | `package.json` declares `prepack: npm run build` without disturbing `prepare` | VERIFIED | `package.json` line 16: `"prepack": "npm run build"`. Line 21: `"prepare": "simple-git-hooks \|\| true"` (guarded per review finding WR-01, commit 8eb8792). |
| 6 | Running `npm link` → `cvgen --help` works from any directory without `npx tsx` | UNCERTAIN — HUMAN NEEDED | Executor's SUMMARY (Task 3) reports all 6 automated pre-steps passed (npm link exit 0, which cvgen = /opt/homebrew/bin/cvgen, cvgen --help from temp dir exit 0). However `tasks_completed: 2, tasks_total: 3` and the task heading reads "CHECKPOINT — awaiting human". No 07-HUMAN-UAT.md file exists. Human confirmation in a new terminal has not been recorded. |

**Score:** 5/6 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/extract.ts` | `rawResponse: ParsedMessage<ResumeData>` type | VERIFIED | Line 11 matches exactly. Import on line 3 brings in `ParsedMessage` from `@anthropic-ai/sdk`. |
| `package.json` | `prepack: npm run build`; `bin.cvgen: dist/cli/index.js`; `files: ["dist"]` | VERIFIED | Lines 8–17 confirmed. `prepack` inserted between `build` and `typecheck` as planned. `bin` and `files` were already correct pre-phase. |
| `README.md` | Phase 06 output routing prose; stale "alongside the input file" removed | VERIFIED | Lines 37–42: new prose with `output/<Company-Slug>/`. "alongside the input file" absent. `resume-resume.pdf` and `resume-resume-ats.pdf` absent. |
| `.planning/REQUIREMENTS.md` | QUAL-01/QUAL-02 `[x]` + traceability `Complete — 2026-07-28`; QUAL-03 `[ ]` | VERIFIED | All four states confirmed. |
| `.planning/PROJECT.md` | Active (v1.1) = QUAL-03 only; Validated = 7 entries including 5 migrated | VERIFIED | Active section has exactly 1 bullet. Validated section has TYPO-01/02/03 Phase 05 entries and CR-01/WR-04 Phase 7 entries. |
| `dist/cli/index.js` | Exists after build, line 1 is `#!/usr/bin/env node` | VERIFIED | File exists. Shebang confirmed by executor and independently by shell check. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `package.json scripts.prepack` | `package.json scripts.build (tsc)` | `npm run build` invocation | VERIFIED | `"prepack": "npm run build"` present; `"build": "tsc"` present; no circular reference. |
| `README.md Usage section` | Phase 06 CLI behavior | Prose matches `output/<Company-Slug>/` routing | VERIFIED | README line 40 contains `output/<Company-Slug>/`. |
| `package.json bin.cvgen` | `dist/cli/index.js` | Global symlink after `npm link` | VERIFIED (automated) / UNCERTAIN (human) | `dist/cli/index.js` exists with shebang. Automated `npm link` reported success. Human verification in new terminal not confirmed. |

---

### Data-Flow Trace (Level 4)

Not applicable — this phase modifies planning docs, package.json, and README.md. No dynamic data rendering involved.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `dist/cli/index.js` has shebang | `head -n 1 dist/cli/index.js` | `#!/usr/bin/env node` | PASS |
| No vitest conflict in package.json | `grep -c 'vitest' package.json` | `0` | PASS |
| No vitest config file present | `ls vitest.config.ts vitest.config.js` | Both absent | PASS |
| `output/<Company-Slug>/` in README | `grep -F 'output/<Company-Slug>/' README.md` | Match found | PASS |
| Stale README text gone | `grep -F 'alongside the input file' README.md` | No match | PASS |
| `prepack` script present | `grep -n 'prepack' package.json` | Line 16: `"prepack": "npm run build"` | PASS |
| `prepare` not overwritten | `grep -n 'prepare' package.json` | `"prepare": "simple-git-hooks \|\| true"` (guarded) | PASS |

---

### Probe Execution

No probe scripts declared or applicable to this phase (documentation and packaging only, no `scripts/tests/probe-*.sh`).

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| QUAL-01 | 07-01-PLAN.md | `rawResponse` typed as `ParsedMessage<ResumeData>` | SATISFIED | `src/lib/extract.ts` line 11 confirms the type. REQUIREMENTS.md line 22 marks `[x] closed 2026-07-28`. |
| QUAL-02 | 07-01-PLAN.md | Single test runner, no conflicting scripts | SATISFIED | `package.json` has exactly one `test` script (`tsx --test`); no vitest in package.json; no vitest.config.ts. |
| QUAL-03 | 07-02-PLAN.md | `cvgen` installable and runnable as global command | PARTIAL — NEEDS HUMAN | Infrastructure in place (bin, files, prepack, shebang all correct). Executor's automated pre-steps passed. Human confirmation in new terminal not recorded. `07-02-SUMMARY.md` shows `tasks_completed: 2 / tasks_total: 3`. |

**Orphaned requirements check:** REQUIREMENTS.md lists OUTPUT-01 and OUTPUT-02 as Phase 6 / Pending. These are not claimed by any Phase 7 plan — correctly scoped to Phase 6, not orphaned for this phase.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found in phase-modified files | — | — | — | — |

Scan of `package.json`, `README.md`, `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md`, `src/lib/extract.ts`: no `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, or `PLACEHOLDER` markers found. No `return null` / empty stubs in source files modified.

**Review finding already resolved:** Code review WR-01 (`prepare` script failing on clean installs) was fixed in commit 8eb8792: `"prepare": "simple-git-hooks || true"`. This finding is closed.

---

### Human Verification Required

#### 1. Global install end-to-end — new terminal session

**Test:** Open a NEW terminal (do not reuse the executor's shell). Run the following in sequence:
1. `which cvgen` — confirm non-empty path under global npm bin (e.g., `/opt/homebrew/bin/cvgen`)
2. `ls -la $(which cvgen)` — confirm symlink points into this repo's `dist/cli/index.js` and the target has execute bit (`-rwxr-xr-x`)
3. `cd $(mktemp -d)` — move to a directory outside this repo
4. `cvgen --help` — exits 0, Commander prints usage with `<file>` positional and `--verbose` / `--validate-only` flags listed; no `ERR_MODULE_NOT_FOUND`
5. `cvgen init /tmp/cvgen-verify-$(date +%s).md` — file created; open it; confirm sample frontmatter (name, email, phone, location, linkedin, github) and section headings (Experience, Education, Skills)
6. Clean up: `rm /tmp/cvgen-verify-*.md`

**Expected:** All six steps succeed. QUAL-03 success criterion is met.

**Why human:** Global PATH resolution and shell symlink traversal cannot be verified by grep. The executor ran automated pre-steps but the plan's `checkpoint:human-verify` gate (Task 3, `gate: blocking`) requires a human "approved" signal in a new terminal. This signal was never recorded — `07-02-SUMMARY.md` says `tasks_completed: 2 / tasks_total: 3` and no `07-HUMAN-UAT.md` file exists.

**Note on automated evidence (executor-reported, not independently confirmed):**
- `npm link` — exit 0, `/opt/homebrew/bin/cvgen -> ../lib/node_modules/cvgen/dist/cli/index.js`
- `cvgen --help` from temp dir — exit 0, Commander output showed `<file>`, `--verbose`, `--validate-only`

If the npm link is still in place from the executor's session, the human can skip steps 1–2 and proceed directly to steps 3–6.

---

### Gaps Summary

No hard gaps. All infrastructure is in place and all automated checks pass. The sole blocking item is the unrecorded human checkpoint for QUAL-03:

- The plan declared Task 3 as `type="checkpoint:human-verify" gate="blocking"` — meaning the phase is not complete until a human confirms the global install works in a new terminal.
- The executor's SUMMARY records automated pre-steps as passing but documents `tasks_completed: 2 / tasks_total: 3` and labels Task 3 "CHECKPOINT — awaiting human."
- No `07-HUMAN-UAT.md` was created, unlike Phase 6 which produced `06-HUMAN-UAT.md` for a similar checkpoint.

**QUAL-03 success criterion** from ROADMAP.md: "Running `npm install -g .` (or `npm link`) and then `cvgen <path>` in any directory works without `npx tsx`" — this requires human execution to be satisfied.

---

_Verified: 2026-07-30_
_Verifier: Claude (gsd-verifier)_
