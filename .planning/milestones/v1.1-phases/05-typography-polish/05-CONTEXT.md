# Phase 5: Typography Polish - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Three targeted CSS changes to `designedHtmlTemplate()` in `src/lib/render.ts` — designed PDF only. ATS PDF is untouched. Each change corresponds to one requirement (TYPO-01, TYPO-02, TYPO-03) and maps to a specific CSS property change in the inline `<style>` block of the HTML template string.

</domain>

<decisions>
## Implementation Decisions

### TYPO-01: Summary Font Size
- **D-01:** Summary paragraph (`section > p`) gets `font-size: 12px` — matching all other "small" elements in the design system (bullets, dates, contact info, competencies). Body is 14px; 12px is the unified small size.

### TYPO-02: Bullet Color
- **D-02:** Add `--bullet: #2d4a6b` to the `:root` CSS variables block alongside `--accent`, `--text`, `--muted`, `--border`.
- **D-03:** Apply color via `li::marker { color: var(--bullet) }` — the disc marker only gets the navy accent. List item text stays muted gray (`var(--muted)`). This is more subtle than coloring the full li text.

### TYPO-03: Section Header Bottom Spacing
- **D-04:** Every section header gets `margin-bottom: 4px` (currently `margin-bottom: 0`). This is the uniform gap between ALL section headers and their first content item — Summary, Core Competencies, Experience, Education, Skills all get 4px.
- **D-05:** The first `.experience-entry` immediately following a `.section-header` must have its `margin-top` overridden to 0 — use the adjacent sibling selector `.section-header + .experience-entry { margin-top: 0 }`. This prevents double-spacing (header's 4px + entry's existing 24px would otherwise stack to 28px).
- **D-06:** Experience inter-entry spacing (24px between jobs) is unchanged. Only the header-to-first-entry gap changes.
- **D-07:** `section > p { margin-top: 4px }` and `.competencies { margin-top: 4px }` should be reduced to `margin-top: 0` — the section-header's new `margin-bottom: 4px` provides this spacing, so both values together would double it.

### Claude's Discretion
- Line-height for the summary paragraph at 12px: use the existing `21px` inherited from body (matching `.competencies` at the same size), or reduce to `18px` (matching `li`). Either is acceptable — planner decides based on visual output.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

### Source Files
- `src/lib/render.ts` — designed PDF HTML template (`designedHtmlTemplate()` function, lines ~46–327). All three CSS changes are inline in the `<style>` block of the HTML template string.

### Requirements
- `.planning/REQUIREMENTS.md` — TYPO-01, TYPO-02, TYPO-03 (the three requirements this phase delivers)
- `.planning/ROADMAP.md` §"Phase 5" — success criteria (ground truth for done)

</canonical_refs>

<code_context>
## Existing Code Insights

### Established Patterns
- `:root` CSS variables: `--accent: #FEAC03`, `--text: #232323`, `--muted: #555555`, `--border: #e0e0e0`. New `--bullet: #2d4a6b` follows this pattern.
- "Small" size throughout the designed PDF is consistently 12px: `li`, `.competencies`, `.contact-details`, `.exp-date`, `.edu-year`, `.skill-group`, etc.
- Body size is consistently 14px: `.section-header`, `.exp-title`, `.degree`.
- `li` is only used in the Experience section (bullets per job). No other section uses `ul`/`li`, so `li::marker` is scoped naturally to Experience bullets.

### Integration Points
- Single file change: all three fixes are in the inline `<style>` block inside `designedHtmlTemplate()` in `src/lib/render.ts`.
- `renderDesigned()` (which calls `designedHtmlTemplate()`) is tested in `src/lib/render.test.ts` — review after changes.
- No schema changes, no CLI changes, no ATS template changes.

### Current Section Header Spacing State (before fix)
| Section | Effective gap after header |
|---------|--------------------------|
| Summary | 4px (`section > p { margin-top: 4px }`) |
| Core Competencies | 4px (`.competencies { margin-top: 4px }`) |
| Experience | 24px (`.experience-entry { margin-top: 24px }`) |
| Education | ~0px (`.edu-entry` has no margin-top) |
| Skills | ~0px (`.skill-group` has no margin-top) |

After fix: all → 4px (via `.section-header { margin-bottom: 4px }` + targeted overrides).

</code_context>

<specifics>
## Specific Ideas

- Color `#2d4a6b` is specified in REQUIREMENTS.md as the "muted navy accent" — it is non-negotiable.
- The bullet color applies via `li::marker`, NOT `li` — user explicitly chose marker-only (disc gets navy, text stays gray).
- 4px is the target gap after section headers — not 24px (which was the existing Experience gap). The fix tightens Experience AND adds missing gaps to Education/Skills.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 5-Typography-Polish*
*Context gathered: 2026-07-30*
