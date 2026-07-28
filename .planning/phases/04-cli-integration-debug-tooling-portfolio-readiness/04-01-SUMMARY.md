---
phase: 04-cli-integration-debug-tooling-portfolio-readiness
plan: "01"
subsystem: api
tags: [commander, anthropic-sdk, typescript, extract, cli]

# Dependency graph
requires:
  - phase: 02-markdown-to-structured-json-extraction
    provides: extractResume function and extract.ts test pattern
provides:
  - commander@^15.0.0 installed and importable as ESM module
  - ExtractResult interface exported from src/lib/extract.ts with data and rawResponse fields
  - extractResume returns ExtractResult instead of bare ResumeData
affects:
  - 04-02 (CLI replacement uses ExtractResult.rawResponse for --verbose output)

# Tech tracking
tech-stack:
  added: [commander@^15.0.0]
  patterns:
    - extractResume returns structured result object (ExtractResult) instead of bare parsed data, enabling callers to access both the parsed resume and the raw SDK response

key-files:
  created: []
  modified:
    - package.json (added commander dependency)
    - package-lock.json (updated lockfile)
    - src/lib/extract.ts (ExtractResult interface + updated return type and signature)
    - src/lib/extract.test.ts (added Test 8 asserting ExtractResult interface)

key-decisions:
  - "Import Message type from @anthropic-ai/sdk/resources/messages.js subpath (verified resolves correctly via runtime import check)"
  - "ExtractResult.rawResponse typed as Message (base type), not ParsedMessage<T> — keeps the interface stable and avoids coupling callers to the SDK's internal generic type"

patterns-established:
  - "Result-object pattern: library functions return { data, rawResponse } instead of bare data so callers can access metadata without a separate call"

requirements-completed: [DEVX-02]

# Metrics
duration: 2min
completed: 2026-07-28
---

# Phase 04 Plan 01: Commander Install + ExtractResult Interface Summary

**Commander 15 installed as ESM dependency and extractResume updated to return ExtractResult { data: ResumeData; rawResponse: Message } enabling CLI verbose output in Plan 02**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-28T19:50:46Z
- **Completed:** 2026-07-28T19:52:59Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Installed commander@^15.0.0 into dependencies; verified ESM import works (`typeof Command === 'function'`)
- Added exported `ExtractResult` interface to `src/lib/extract.ts` with `data: ResumeData` and `rawResponse: Message` fields
- Changed `extractResume` return type from `Promise<ResumeData>` to `Promise<ExtractResult>`
- Added Test 8 to extract.test.ts confirming new interface via source-level assertion (no live API call)
- All 38 tests pass; `tsc --noEmit` exits clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Commander 15** - `5a02c23` (chore)
2. **Task 2 RED: Add failing Test 8** - `e29e66e` (test)
3. **Task 2 GREEN: ExtractResult interface + return type** - `95cb252` (feat)

_Note: Task 2 is TDD — separate test (RED) and implementation (GREEN) commits_

## TDD Gate Compliance

- RED gate commit: `e29e66e` — `test(04-01): add failing Test 8 asserting ExtractResult interface in extract.ts`
- GREEN gate commit: `95cb252` — `feat(04-01): add ExtractResult interface and update extractResume return type`
- REFACTOR: Not needed — implementation was minimal and clean

## Files Created/Modified
- `package.json` - Added `"commander": "^15.0.0"` to dependencies
- `package-lock.json` - Updated lockfile for commander install
- `src/lib/extract.ts` - Added Message import, ExtractResult interface, updated function signature and return statement
- `src/lib/extract.test.ts` - Added Test 8 asserting ExtractResult fields via source-level assertion

## Decisions Made
- Import `Message` type from `@anthropic-ai/sdk/resources/messages.js` subpath (runtime verified: `node -e "import('@anthropic-ai/sdk/resources/messages.js').then(...)"` resolved successfully)
- Type `rawResponse` as `Message` (not `ParsedMessage<ResumeData>`) — the base `Message` type is the stable public API; `ParsedMessage<T>` is an SDK-internal generic that shouldn't leak into our interface contract

## Deviations from Plan

None - plan executed exactly as written. The Message import subpath `@anthropic-ai/sdk/resources/messages.js` resolved correctly on the first check, so no fallback to `@anthropic-ai/sdk` root was needed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Commander is installed and importable — Plan 02 CLI replacement can `import { Command } from 'commander'` immediately
- `ExtractResult` is exported from `src/lib/extract.ts` — Plan 02 can destructure `{ data, rawResponse }` from `extractResume()` for `--verbose` output
- No blockers for Plan 02

---
*Phase: 04-cli-integration-debug-tooling-portfolio-readiness*
*Completed: 2026-07-28*
