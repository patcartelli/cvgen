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

requirements-completed: []  # STC-230 pending Task 3 human-verify

# Metrics
duration: 5min
completed: 2026-08-20  # paused at Task 3 checkpoint — not marked complete
---

# Phase quick-260820-mct Plan 01: Add --company / --no-company flags Summary

**`--company` and `--no-company` bypass the v1.1 routing prompts; non-TTY stdin without either flag fails fast instead of hanging**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-20T20:12:31Z
- **Completed:** 2026-08-20T20:17:11Z (Tasks 1–2 only; Task 3 waiting on human)
- **Tasks:** 2 of 3 auto tasks complete; Task 3 checkpoint:human-verify pending
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
3. **Task 3: Confirm the interactive TTY path is unchanged** — not committed; waiting on human verification

**Plan metadata:** not committed by this executor (orchestrator owns the docs commit)

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

**Not ready to close.** Task 3 is `checkpoint:human-verify` and blocking. Automated coverage cannot allocate a TTY, so the v1.1 interactive prompt, empty-slug `!!!` guard, and live flag paths need a human pass.

### Task 3 waiting — how to verify

From the repo root in a normal interactive terminal, with `ANTHROPIC_API_KEY` exported:

1. `npx tsx src/cli/index.ts <your-resume.md>` — both questions must appear as they did in v1.1. Answer `y`, then `Acme Corp`. Expect both PDFs in `output/Acme-Corp/`.
2. Run it again and answer `n`. Expect both PDFs in bare `output/`.
3. Run it again, answer `y`, then enter `!!!`. Expect exit 1 with "Company name must contain at least one letter or digit."
4. `npx tsx src/cli/index.ts <your-resume.md> --company "Acme Corp"` — no questions, PDFs land in `output/Acme-Corp/`.
5. `npx tsx src/cli/index.ts <your-resume.md> --no-company` — no questions, PDFs land in `output/`.
6. `npx tsx src/cli/index.ts <your-resume.md> < /dev/null` — must exit 1 immediately naming both flags, with no hang and no `output/` directory created.

Step 1 and step 3 are the ones that matter most: they prove the pre-buffered readline queue still works where it is actually used.

**Resume signal:** Type "approved", or describe which step misbehaved.

---
*Phase: quick-260820-mct*
*Paused: 2026-08-20 (Task 3 human-verify)*

## Self-Check: PASSED
