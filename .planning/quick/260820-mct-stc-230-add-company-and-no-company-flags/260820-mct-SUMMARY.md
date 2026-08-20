---
phase: quick-260820-mct
plan: 01
subsystem: cli
tags: [commander, company-routing, non-interactive, tdd]

requires:
  - phase: 06-output-routing
    provides: interactive company prompt and toCompanySlug / resolveOutputPaths helpers
provides:
  - resolveCompanyRouting pure decision helper
  - --company and --no-company flags for non-interactive CLI runs
  - fail-fast error when stdin is not a TTY and neither flag is passed
affects: [cli, output-routing]

tech-stack:
  added: []
  patterns:
    - Commander option:company / option:no-company listeners to detect negated-option conflict
    - writeSync + exitCode + stdin.destroy for early exit inside the async action handler

key-files:
  created: []
  modified:
    - src/lib/render.ts
    - src/lib/render.test.ts
    - src/cli/index.ts
    - src/cli/index.test.ts
    - README.md

key-decisions:
  - "Detect --company / --no-company via option: listeners because both flags write to options.company"
  - "Keep routing at Step D.5 after the API key guard so existing Test 3 still asserts the key-guard error"
  - "Move createInterface + lineBuffer/waitingResolver inside the prompt branch so flag runs never attach a stdin reader"

patterns-established:
  - "Pure routing helper with no process/fs/console; CLI owns error: prefix and trailing newline"
  - "TTY-only readline: flags bypass prompts; non-TTY without flags fails fast"

requirements-completed: [STC-230]

# Metrics
duration: 5min
completed: 2026-08-20
---

# Phase quick-260820-mct Plan 01: Add --company / --no-company flags Summary

**`--company` and `--no-company` bypass the v1.1 routing prompts; non-TTY stdin without either flag fails fast instead of hanging**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-20T20:12:31Z
- **Completed:** 2026-08-20T20:30:00Z
- **Tasks:** 3 of 3 complete (Task 3 human-verify approved)
- **Files modified:** 5

## Accomplishments

- Exported `resolveCompanyRouting()` with ordered rules: conflict → slug/empty-name → bare → TTY prompt → non-TTY fail-fast
- Wired `--company <name>` and `--no-company` through Commander `option:` listeners so both flags can be detected despite sharing `options.company`
- Moved `createInterface` + the v1.1 `lineBuffer`/`waitingResolver` queue inside the prompt branch byte-for-byte
- Replaced piped-prompt Tests 9–10 with flag, conflict, empty-name, non-TTY, and source-level pre-buffer guards
- Documented both flags and the non-interactive failure in the README

## Task Commits

Each task was committed atomically (TDD: RED then GREEN):

1. **Task 1: Add resolveCompanyRouting pure helper with unit tests**
   - `6d702cd` test(quick-260820-mct-01): add failing tests for resolveCompanyRouting
   - `3cd3979` feat(quick-260820-mct-01): implement resolveCompanyRouting helper
2. **Task 2: Wire --company / --no-company into the CLI and replace the piped-prompt tests**
   - `b78d2e1` test(quick-260820-mct-01): replace piped-prompt tests with flag coverage
   - `1ad07f2` feat(quick-260820-mct-01): add --company and --no-company CLI flags
3. **Task 3: Confirm the interactive TTY path is unchanged** — human approved 2026-08-20 (all six verification steps)

**Plan metadata:** `f2298a9` (docs: plan); summary/STATE committed by orchestrator

## Files Created/Modified

- `src/lib/render.ts` — `CompanyRouting` union and `resolveCompanyRouting()` after `toCompanySlug`
- `src/lib/render.test.ts` — ten unit tests covering every routing branch
- `src/cli/index.ts` — flags, option: listeners, Step D.5 rewrite, help examples
- `src/cli/index.test.ts` — Tests 9–14 for flags, errors, non-TTY guard, and pre-buffer source guard
- `README.md` — usage examples and non-interactive behavior

## Decisions Made

- Used Commander `option:company` / `option:no-company` listeners rather than `options.company`, because both flags write to the same attribute and `.conflicts()` cannot separate them
- Left routing at Step D.5 (after the API key guard) so Test 3 still asserts the missing-key error on a non-TTY spawn
- Early-exit on routing errors uses `writeSync` + `process.exitCode = 1` + `process.stdin.destroy()` + `return` — never `process.exit()` inside the action handler

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed
**Impact on plan:** None

## Issues Encountered

None. `npm test` reported 80/80 passing (the plan's "44 pre-existing" count was stale relative to later phases; no tests were dropped except the two piped-prompt cases the plan replaced).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready. Operator approved all six Task 3 TTY checks on 2026-08-20: interactive y/Acme Corp, interactive n, empty-slug `!!!` guard, `--company`, `--no-company`, and non-TTY fail-fast via `/dev/null`.

---
*Phase: quick-260820-mct*
*Completed: 2026-08-20*

## Self-Check: PASSED
