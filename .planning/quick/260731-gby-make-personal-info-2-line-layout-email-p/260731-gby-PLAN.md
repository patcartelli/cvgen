---
phase: quick-260731-gby
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/render.ts
autonomous: true
requirements:
  - LAYOUT-01
must_haves:
  truths:
    - "Designed PDF contact header shows email, phone, location on one line"
    - "Designed PDF contact header shows linkedin and github on a second line below"
    - "No contact field is missing or reordered"
  artifacts:
    - path: src/lib/render.ts
      provides: "Updated designedHtmlTemplate with two-row contact layout"
      contains: "contact-details-row"
  key_links:
    - from: "designedHtmlTemplate"
      to: ".contact-block div"
      via: "two sibling .contact-details-row divs"
      pattern: "contact-details-row"
---

<objective>
Split the designed PDF contact header from a single-line layout into two lines:
line 1 — email · phone · location; line 2 — linkedin · github.

Purpose: LinkedIn URL currently wraps on narrower render widths because all five fields share one line. Two rows eliminates the wrap without sacrificing any field.
Output: Updated src/lib/render.ts with revised HTML and CSS for .contact-block.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/pcartelli/dev/cvgen/.planning/STATE.md
@/Users/pcartelli/dev/cvgen/src/lib/render.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Split designed contact header into two rows</name>
  <files>src/lib/render.ts</files>
  <action>
In `designedHtmlTemplate` (around line 318), replace the single `<div class="contact-details">` that joins all five contact fields with two sibling divs:

Row 1 — email, phone, location (fields that are stable width).
Row 2 — linkedin, github (URLs that can be long).

Each row uses the same separator character already in use (the `|` pipe rendered via `<span class="sep">|</span>`). Each row div uses the class `contact-details-row` (or keep `contact-details` on the wrapper and add `contact-details-row` on inner divs — either is fine, but the wrapper approach is cleaner).

Recommended HTML shape (replace the current single-div block at line 318):

```
<div class="contact-details">
  <div class="contact-details-row">{email} <span class="sep">|</span> {phone} <span class="sep">|</span> {location}</div>
  <div class="contact-details-row">{linkedin} <span class="sep">|</span> {github}</div>
</div>
```

Each field still passes through `escapeHtml` and must be wrapped in `Boolean` guard (skip the field entirely from the row if falsy, same as the current `.filter(Boolean)` logic). If a row has zero visible fields (e.g., no linkedin AND no github), omit the row div entirely rather than rendering an empty line.

CSS: the `.contact-details` rule (font-size 12px, line-height 21px, color var(--muted)) already styles the wrapper — no new CSS rules are needed. `.contact-details-row` needs no extra CSS; it inherits from the wrapper. Do NOT add `display: flex`, `white-space: nowrap`, or any layout property that could cause its own wrapping issues.

ATS template (line 470): leave untouched. The ATS template already uses a flat string interpolation on a single line, and ATS layout is not the subject of this task.
  </action>
  <verify>
    <automated>cd /Users/pcartelli/dev/cvgen && grep -c "contact-details-row" src/lib/render.ts</automated>
  </verify>
  <done>
    src/lib/render.ts contains at least two occurrences of "contact-details-row" (one per row div). The ATS template block is unchanged. Running `npx tsx --test src/lib/render.test.ts` passes all existing tests.
  </done>
</task>

<task type="auto">
  <name>Task 2: Run existing test suite to confirm no regressions</name>
  <files></files>
  <action>
Run the render test suite to confirm the ATS and pure-function tests still pass after the template change. The test suite does not render the designed PDF (it only renders ATS), so this is a regression guard on the shared `escapeHtml` and helper functions, not a visual test of the new layout.

Command: `cd /Users/pcartelli/dev/cvgen && npx tsx --test src/lib/render.test.ts`

If tests fail, diagnose and fix before completing this task. Do not mark done if any test is failing.
  </action>
  <verify>
    <automated>cd /Users/pcartelli/dev/cvgen && npx tsx --test src/lib/render.test.ts 2>&1 | tail -20</automated>
  </verify>
  <done>
    All tests pass (exit code 0). No test output shows "fail" or "not ok".
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| resume data → HTML template | User-supplied contact strings (email, phone, location, linkedin, github) are interpolated into HTML |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-gby-01 | Tampering | escapeHtml in designedHtmlTemplate | accept | escapeHtml already applied to all contact fields; two-row split does not change the escaping path — same filter(Boolean) + escapeHtml per field |
</threat_model>

<verification>
After both tasks complete:
- `grep -c "contact-details-row" src/lib/render.ts` returns >= 2
- `npx tsx --test src/lib/render.test.ts` exits 0
- (Optional visual check) render a PDF locally and confirm contact header shows two lines
</verification>

<success_criteria>
Designed PDF contact header renders email · phone · location on line 1 and linkedin · github on line 2. No field is dropped or reordered. All existing automated tests pass.
</success_criteria>

<output>
Create `.planning/quick/260731-gby-make-personal-info-2-line-layout-email-p/260731-gby-SUMMARY.md` when done.
</output>
