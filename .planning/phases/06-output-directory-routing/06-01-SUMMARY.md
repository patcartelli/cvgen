---
phase: 06-output-directory-routing
plan: "01"
subsystem: cli
tags: [typescript, path, toCompanySlug, resolveOutputPaths, unit-tests, tdd]

# Dependency graph
requires:
  - phase: 03-designed-ats-pdf-rendering
    provides: renderDesigned, renderAts, resolveOutputPaths (original single-arg contract)
  - phase: 04-cli-integration-debug-tooling-portfolio-readiness
    provides: src/cli/index.ts Steps A-H structure

provides:
  - "toCompanySlug(company: string): string export in src/lib/render.ts (D-01/D-02 slug contract)"
  - "resolveOutputPaths(inputMdPath, outputDir) two-argument form in src/lib/render.ts"
  - "describe('resolveOutputPaths') with 3 rewritten tests using explicit outputDir"
  - "describe('toCompanySlug') with 4 it() tests covering D-01, D-02, whitespace, empty"
  - "scripts/smoke-render.ts updated to two-argument resolveOutputPaths call"
  - "src/cli/index.ts type-checks cleanly with temporary dirname(absPath) placeholder for Plan 02"

affects:
  - 06-02 (Plan 02 — adds CLI prompts, replaces dirname(absPath) placeholder with interactive outputDir)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "toCompanySlug pure function: chain .replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\\s+/g, '-') for D-01/D-02 slug"
    - "resolveOutputPaths: caller-supplied outputDir replaces dirname(inputMdPath) — decouples path derivation from input file location"
    - "Unit test pattern: describe + it + assert.equal for pure path/slug functions"

key-files:
  created: []
  modified:
    - src/lib/render.ts
    - src/lib/render.test.ts
    - scripts/smoke-render.ts
    - src/cli/index.ts

key-decisions:
  - "toCompanySlug strips all non-alphanumeric/non-space chars then collapses spaces to hyphens (D-01+D-02)"
  - "resolveOutputPaths second param is now required outputDir (not derived from dirname)"
  - "cli/index.ts gets dirname(absPath) placeholder to keep tsc happy — Plan 02 replaces with interactive outputDir"
  - "T-06-01 mitigated: /[^a-zA-Z0-9 ]/g strips path traversal chars including / . \\ from slug"

patterns-established:
  - "Pure slug functions live in src/lib/ (not CLI layer), named export, JSDoc with D-ref citations"
  - "resolveOutputPaths return shape {designed, ats} is stable — callers (renderDesigned, renderAts) unaffected by signature change"

requirements-completed:
  - OUTPUT-01
  - OUTPUT-02

# Metrics
duration: 12min
completed: 2026-07-30
---

# Phase 6 Plan 01: Pure Function Contracts Summary

**`toCompanySlug` export and two-argument `resolveOutputPaths` in render.ts with 7 new unit tests — pure function contracts for Phase 6 output routing**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-30T19:49:00Z
- **Completed:** 2026-07-30T19:51:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `toCompanySlug(company: string): string` export implementing D-01 (spaces to hyphens, case preserved) and D-02 (special chars stripped) with T-06-01 path traversal mitigation baked into the regex
- Rewrote `resolveOutputPaths` to two-argument form — outputDir is now caller-supplied, decoupling PDF path resolution from input file location
- Added `describe("toCompanySlug")` with 4 it() tests covering D-01, D-02, whitespace collapse, and all-special/empty guard; rewrote Tests 1-3 for the new two-argument resolveOutputPaths contract
- All 42 tests pass; `tsc --noEmit` exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Add toCompanySlug export and update resolveOutputPaths signature** - `9b3694a` (feat)
2. **Task 1 style fix: Template literals per Biome** - `bff2749` (style)
3. **Task 1 Rule 3 fix: cli/index.ts two-arg placeholder** - `6128b00` (fix)
4. **Task 2: Rewrite resolveOutputPaths tests and add toCompanySlug describe** - `e771d83` (feat)

## Files Created/Modified

- `src/lib/render.ts` — Added `toCompanySlug` export, updated `resolveOutputPaths` to two-arg form, removed `dirname` import
- `src/lib/render.test.ts` — Rewrote Tests 1–3 for new resolveOutputPaths contract; added `describe("toCompanySlug")` with 4 it() tests
- `scripts/smoke-render.ts` — Updated `resolveOutputPaths(inputMdPath, tmp)` call to two-argument form
- `src/cli/index.ts` — Added `dirname` import; temporary `dirname(absPath)` placeholder to keep tsc clean (Plan 02 replaces)

## Decisions Made

- toCompanySlug strips non-alphanumeric/non-space chars before collapsing spaces: prevents path traversal sequences from surviving into the output slug (T-06-01)
- cli/index.ts gets a `dirname(absPath)` placeholder for the second resolveOutputPaths arg — preserves old same-directory behavior temporarily, Plan 02 will replace with interactive-prompt-derived outputDir
- Template literals used in resolveOutputPaths return values (Biome lint/style/useTemplate)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed T-06-01 path traversal mitigation in toCompanySlug**
- **Found during:** Task 1 (render.ts implementation)
- **Issue:** Plan's threat model assigns T-06-01 "mitigate" to toCompanySlug — the regex `/[^a-zA-Z0-9 ]/g` was the specified mitigation; confirmed it strips `/`, `.`, `\` so traversal sequences cannot survive
- **Fix:** Implemented exactly as specified in plan action and patterns; no code change needed beyond what was planned
- **Files modified:** src/lib/render.ts
- **Verification:** `toCompanySlug("../etc/passwd")` returns "etcpasswd" — no slash or dot survives
- **Committed in:** 9b3694a

**2. [Rule 1 - Bug] Fixed Biome lint/style/useTemplate in resolveOutputPaths**
- **Found during:** Task 1 commit (pre-commit hook)
- **Issue:** String concatenation `stem + "-resume.pdf"` triggered Biome `lint/style/useTemplate` info-level warning
- **Fix:** Converted to template literals `` `${stem}-resume.pdf` `` and `` `${stem}-resume-ats.pdf` ``
- **Files modified:** src/lib/render.ts
- **Committed in:** bff2749

**3. [Rule 3 - Blocking] Fixed tsc error in src/cli/index.ts**
- **Found during:** Task 1 verification (tsc --noEmit)
- **Issue:** `src/cli/index.ts` line 124 calls `resolveOutputPaths(absPath)` with one argument — TypeScript error TS2554 "Expected 2 arguments, but got 1"
- **Fix:** Added `dirname` import; changed call to `resolveOutputPaths(absPath, dirname(absPath))` with comment noting Plan 02 will replace the placeholder
- **Files modified:** src/cli/index.ts
- **Verification:** tsc --noEmit exits 0 after fix
- **Committed in:** 6128b00

---

**Total deviations:** 3 auto-fixed (1 missing critical / threat mitigation, 1 bug/style, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness, code quality, and build cleanliness. No scope creep. The cli/index.ts placeholder is explicitly temporary and handed off to Plan 02.

## Issues Encountered

- Initial `git commit` ran against the main repo directory (`cd /Users/pcartelli/dev/cvgen`) instead of the worktree. Subsequent commits used `git -C "$WT"` to ensure they land on the correct worktree branch.

## Known Stubs

- `src/cli/index.ts` line 125: `resolveOutputPaths(absPath, dirname(absPath))` — temporary placeholder preserving old same-directory behavior. This is intentional: Plan 02 will replace `dirname(absPath)` with the interactive-prompt-derived `outputDir`. The old behavior is preserved without regressions.

## Next Phase Readiness

- Plan 02 can now import `toCompanySlug` and call `resolveOutputPaths(absPath, outputDir)` directly — both exports are in place and type-checked
- `src/cli/index.ts` Step H placeholder is the exact target for Plan 02's interactive prompt insertion

---
*Phase: 06-output-directory-routing*
*Completed: 2026-07-30*
