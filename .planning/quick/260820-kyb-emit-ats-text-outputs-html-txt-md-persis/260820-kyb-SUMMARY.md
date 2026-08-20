---
phase: quick-260820-kyb
plan: 01
subsystem: rendering
tags: [ats, html, txt, md, cli, puppeteer]

requires:
  - phase: quick-260819-ky9
    provides: ResumeSchema with headline, industry, via, location, nested engagements, selectedWork
provides:
  - serializeAtsTxt and serializeAtsMd pure serializers
  - exported atsHtmlTemplate
  - five-key resolveOutputPaths (designed, ats, atsHtml, atsTxt, atsMd)
  - CLI Step H and smoke-render write five files
affects: [cli-output, ats-export]

tech-stack:
  added: []
  patterns: [pure-text-serializers-separate-from-render-ts]

key-files:
  created:
    - src/lib/ats-text.ts
    - src/lib/ats-text.test.ts
  modified:
    - src/lib/render.ts
    - src/lib/render.test.ts
    - src/cli/index.ts
    - src/cli/index.test.ts
    - scripts/smoke-render.ts

key-decisions:
  - "ATS text formats skip empty optional sections and empty-string Parental Leave roles; additionalExperience is its own section after Experience"
  - "Empty-bold test scans per line so consecutive **heading** blocks are not false positives"
  - "Studio Cartelli / Bluefish AI nesting is asserted inside the Experience section because the summary also mentions Bluefish AI"

patterns-established:
  - "ATS text serializers live in src/lib/ats-text.ts; render.ts stays PDF/HTML-only aside from exporting atsHtmlTemplate"
  - "resolveOutputPaths owns the {nameSlug}-resume{suffix}-ats.{pdf,html,txt,md} filename family"

requirements-completed: [STC-144]

duration: 34min
completed: 2026-08-20
---

# Phase quick-260820-kyb Plan 01: Emit ATS text outputs Summary

**CLI write now persists five files: designed PDF, ATS PDF, and ATS HTML/TXT/MD from atsHtmlTemplate plus serializeAtsTxt/serializeAtsMd**

## Performance

- **Duration:** 34 min
- **Started:** 2026-08-20T19:09:06Z
- **Completed:** 2026-08-20T19:43:17Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Pure `serializeAtsTxt` / `serializeAtsMd` cover every optional ResumeData field, skip empty sections, and omit empty Parental Leave role/list fragments
- `atsHtmlTemplate` is exported without markup changes; `renderAts` still writes the ATS PDF
- `resolveOutputPaths` returns `designed`, `ats`, `atsHtml`, `atsTxt`, `atsMd` with the locked ATS filename family
- CLI Step H and smoke-render write the three text files and log/stat all five paths; no .docx

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: serializeAtsTxt and serializeAtsMd tests** - `da94404` (test)
2. **Task 1 GREEN: serializeAtsTxt and serializeAtsMd** - `e54f19e` (feat)
3. **Task 2: Export atsHtmlTemplate and extend resolveOutputPaths** - `c6e2954` (feat)
4. **Task 3: CLI and smoke-render write the three text files** - `489dac8` (feat)

## Files Created/Modified

- `src/lib/ats-text.ts` - `serializeAtsTxt` and `serializeAtsMd` (no Puppeteer, no escapeHtml)
- `src/lib/ats-text.test.ts` - node:test coverage for three fixtures plus empty-section/Parental Leave cases
- `src/lib/render.ts` - export `atsHtmlTemplate`; five-key `resolveOutputPaths`
- `src/lib/render.test.ts` - ATS-family path assertions and HTML persist-shape tests (no new Puppeteer)
- `src/cli/index.ts` - Step H writes HTML/TXT/MD and logs five `Written:` lines
- `src/cli/index.test.ts` - source-level assertion that Step H writes and logs the three text paths
- `scripts/smoke-render.ts` - resolve by candidate name; write and stat all five files

## Decisions Made

- TXT/MD date ranges use ASCII hyphen-minus `" - "` (not the HTML template's en dash)
- Nested engagements do not invent a synthetic "Client engagement" label when `via` is absent
- `additionalExperience` is a sibling section after Experience in text formats (HTML template still nests it as h3)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tightened empty-bold and nesting assertions**

- **Found during:** Task 1 GREEN
- **Issue:** Plan's `/\*\*\s*\*\*/` matched consecutive markdown headings (`**...\n\n**`). `indexOf("Bluefish AI")` hit the summary before Studio Cartelli in experience.
- **Fix:** Per-line empty-bold check `/\*\*[ \t]*\*\*/`; nesting asserted from the Experience section onward.
- **Files modified:** `src/lib/ats-text.test.ts`
- **Verification:** `npx tsx --test src/lib/ats-text.test.ts` — 9/9 pass
- **Committed in:** `e54f19e` (Task 1 GREEN)

---

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** Test assertions match intent without changing serializer behavior. No scope creep.

## Issues Encountered

None beyond the assertion false positives above. Puppeteer PDF tests require `PUPPETEER_CACHE_DIR` pointed at `~/.cache/puppeteer` in this environment (sandbox cache is empty); not a code change.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

STC-144 output surface is closed: a normal CLI run writes five files. Designed and ATS PDF templates are unchanged aside from exporting `atsHtmlTemplate`.

## Self-Check: PASSED
