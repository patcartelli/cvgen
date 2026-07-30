---
phase: 05-typography-polish
plan: 01
subsystem: ui
tags: [typography, css, pdf, render, puppeteer]

# Dependency graph
requires:
  - phase: 03-designed-ats-pdf-rendering
    provides: designedHtmlTemplate() and atsHtmlTemplate() in src/lib/render.ts
  - phase: 04-cli-integration-debug-tooling-portfolio-readiness
    provides: smoke-render script and fixtures/sample-resume.json for visual verification
provides:
  - Designed PDF with complete visual hierarchy: summary at 12px, navy bullet markers, consistent 4px section header bottom spacing
  - li::marker CSS rule scoped to Experience bullets (disc colored #2d4a6b via --bullet variable)
  - .section-header + .experience-entry adjacent-sibling rule preventing 28px double-stack
  - atsHtmlTemplate() unchanged and confirmed byte-identical to pre-phase state
affects: [06-output-directory-routing, 07-quality-packaging-global-install]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS custom property (--bullet: #2d4a6b) centralizes accent color for li::marker rule"
    - "Adjacent-sibling combinator (.section-header + .experience-entry) prevents margin double-stack without breaking inter-entry spacing"
    - "li::marker pseudo-element scopes disc color independently from li text color (text stays var(--muted))"
    - "Option A (inherit body 21px line-height) accepted for summary paragraph — no explicit line-height on section > p"

key-files:
  created: []
  modified:
    - src/lib/render.ts

key-decisions:
  - "D-01: Summary paragraph font-size set to 12px (section > p rule), matching Core Competencies and bullet text tier"
  - "D-02: --bullet: #2d4a6b added to :root block as a named CSS custom property"
  - "D-03: li::marker { color: var(--bullet); } added after li rule — disc color only, li text color unchanged"
  - "D-04: .section-header margin-bottom changed from 0 to 4px for consistent breathing room under all headers"
  - "D-05: .section-header + .experience-entry { margin-top: 0; } adjacent-sibling override prevents header 4px + entry 24px = 28px double-stack"
  - "D-07: section > p margin-top and .competencies margin-top both changed from 4px to 0 — spacing now wholly owned by section-header margin-bottom"
  - "Option A accepted: summary paragraph inherits body 21px line-height — no explicit line-height set on section > p"

patterns-established:
  - "CSS variable pattern: accent colors live in :root and are referenced by pseudo-element rules (not hardcoded inline)"
  - "Adjacent-sibling override pattern: when a heading has margin-bottom, zero out the following element's margin-top to prevent additive stacking"
  - "li::marker scope: use pseudo-element to color disc markers independently from li text color"

requirements-completed: [TYPO-01, TYPO-02, TYPO-03]

# Metrics
duration: human-verify gate (Task 1 auto, Task 2 human-approved)
completed: 2026-07-30
---

# Phase 5 Plan 01: Typography Polish Summary

**Six CSS edits to designedHtmlTemplate() implement complete visual hierarchy — 12px summary, navy (#2d4a6b) bullet markers, and consistent 4px section header spacing — all human-verified against three ROADMAP success criteria**

## Performance

- **Duration:** Task 1 auto-executed; Task 2 paused at human-verify checkpoint, resolved with "approved"
- **Started:** 2026-07-30
- **Completed:** 2026-07-30
- **Tasks:** 2 of 2
- **Files modified:** 1 (src/lib/render.ts — designedHtmlTemplate() style block only)

## Accomplishments

- Applied all seven locked CSS decisions (D-01 through D-07) as exactly six edits inside the designedHtmlTemplate() inline `<style>` block — no other function, no other file touched
- Human operator visually confirmed all three ROADMAP Phase 5 success criteria in the rendered designed PDF via `npm run smoke-render`
- ATS PDF confirmed visually unchanged; atsHtmlTemplate() byte-identical to pre-phase state
- All existing automated tests (ATS text extraction Tests A-H, resolveOutputPaths Tests 1-3) continue to pass post-edit

## Decisions Applied

### D-01: Summary paragraph font-size

`section > p { font-size: 12px; }` added inside the existing `section > p` rule. Summary paragraph now renders at the same 12px small-tier as Core Competencies text and Experience bullet text. `margin-top` changed from `4px` to `0` (D-07 — spacing transferred to section-header margin-bottom).

### D-02: --bullet CSS variable

`:root` block extended with `--bullet: #2d4a6b;` as a fifth token after `--border: #e0e0e0;`. The hex value appears exactly once in the file; `li::marker` references it via `var(--bullet)`.

### D-03: li::marker rule

New rule `li::marker { color: var(--bullet); }` inserted immediately after the existing `li { ... }` block. Colors the disc marker only. The existing `li` rule's `color: var(--muted)` property is untouched — bullet text remains gray.

### D-04: section-header margin-bottom

`.section-header { margin-bottom: 4px; }` — changed from `0` to `4px`. Creates consistent 4px breathing room between every section header and its first content element. All other properties in the rule unchanged.

### D-05: Adjacent-sibling override

New rule `.section-header + .experience-entry { margin-top: 0; }` inserted immediately after the `.section-header { ... }` block. Prevents the 4px header margin-bottom from stacking additively with the 24px `.experience-entry { margin-top: 24px; }` to produce an unwanted 28px gap. The 24px inter-entry spacing between jobs is preserved because the `+` combinator fires only on the first entry after the heading.

### D-07: Competing margin-top values zeroed

Both `section > p { margin-top: 0; }` and `.competencies { margin-top: 0; }` changed from `4px` to `0`. Spacing responsibility transferred entirely to the section-header `margin-bottom: 4px` established in D-04.

### Line-height decision (Option A accepted)

The RESEARCH.md offered two options for summary paragraph line-height at 12px:
- Option A: Inherit body `line-height: 21px` (no change) — accepted
- Option B: Explicit `line-height: 18px` tighter match to 12px font — not requested

The operator responded "approved" (no qualifier) after viewing the designed PDF. Option B was NOT triggered. No `line-height` property was added to `section > p`.

## Human Verification Outcome

Task 2 ran `npm run smoke-render` to produce both PDFs from `fixtures/sample-resume.json` and presented them for visual inspection. The operator responded "approved".

| Success Criterion | ROADMAP ID | Outcome |
|------------------|-----------|---------|
| Summary paragraph text is visibly smaller than Experience body copy | TYPO-01 | Confirmed |
| Bullet disc markers render navy (#2d4a6b); bullet text remains gray | TYPO-02 | Confirmed |
| All section headers have consistent ~4px bottom spacing; inter-entry spacing unchanged | TYPO-03 | Confirmed |
| ATS PDF visually unchanged (plain black text, no styling regression) | (guard) | Confirmed |

## Task Commits

Each task committed atomically:

1. **Task 1: Apply typography decisions D-01 through D-07 to designedHtmlTemplate()** - `65ca65f` (feat)
2. **Task 2: Human-verify rendered designed PDF** - human-verify checkpoint, resolved "approved" — no code changes; SUMMARY and state update committed in final metadata commit

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/lib/render.ts` — designedHtmlTemplate() `<style>` block: six CSS edits applied (`:root` `--bullet` token, `section-header margin-bottom`, new `section-header + experience-entry` sibling rule, `section > p` font-size + margin-top, `.competencies` margin-top, new `li::marker` rule). atsHtmlTemplate() untouched.

## Deviations from Plan

None — plan executed exactly as written. All six edits landed in Task 1; human verify resolved "approved" without requiring Option B or any defect re-work.

## Issues Encountered

None. Task 1 applied all edits cleanly; typecheck, lint, and test all passed; smoke-render exited 0.

## User Setup Required

None — no external service configuration required.

## Known Stubs

None — all CSS values are hardcoded literals; no placeholder data or TODO markers introduced.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All new CSS values (`#2d4a6b`, `4px`, `12px`, `0`, `var(--bullet)`) are hardcoded string literals in the TypeScript template — no user input reaches the `<style>` block. Pre-existing `escapeHtml()` guard on all data interpolation points is unchanged.

## Next Phase Readiness

- Phase 5 complete — TYPO-01, TYPO-02, TYPO-03 all closed
- Phase 6 (Output Directory Routing) is unblocked: depends only on Phase 4 (v1.0 complete) and Phase 5 (now complete)
- Blocker noted in STATE.md for Phase 6: OUTPUT-01 interactive prompts — need to verify Commander/readline approach doesn't conflict with existing test harness

---
*Phase: 05-typography-polish*
*Completed: 2026-07-30*
