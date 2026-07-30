---
phase: 05-typography-polish
reviewed: 2026-07-30T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - src/lib/render.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-07-30
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Phase 5 made six CSS-only edits inside `designedHtmlTemplate()` in `src/lib/render.ts`. The `atsHtmlTemplate()` function is cleanly untouched. No template interpolation was introduced into the `<style>` block — all values are hardcoded literals, so there is no XSS vector. No TypeScript logic changed.

Three correctness/quality issues were found in the Phase 5 CSS changes. Two informational items flag a pre-existing bug (outside Phase 5 scope) and a minor redundancy introduced by the new rules.

---

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: `section > p` selector is unintentionally broad — captures competencies paragraph

**File:** `src/lib/render.ts:181-185`

**Issue:** The new `section > p` rule was intended to style only the Summary paragraph (per the comment "Summary paragraph — body-small size"). However, it also matches the Core Competencies `<p class="competencies">` at line 314, which is also a `<p>` direct child of a `<section>`. Today the values are identical (`font-size: 12px`, `color: var(--muted)`, `margin-top: 0`), so there is no visible rendering difference. But the specificity of `section > p` (0,0,1,1) is lower than `.competencies` (0,0,1,0) — actually they are equal at one class vs one element+one tag — so cascade order determines which wins. More importantly, any future `<p>` added directly inside a `<section>` (e.g., a certifications blurb, a projects description) will silently inherit the 12px summary sizing and muted color without the author realizing the rule fires. The selector is a latent correctness trap.

**Fix:** Scope the rule to the summary section specifically. The cleanest approach is to add a class to the summary paragraph and target that, matching the pattern used everywhere else in this template:

```css
/* In the template HTML, change: */
<p>${escapeHtml(summary)}</p>
/* to: */
<p class="summary-text">${escapeHtml(summary)}</p>

/* In the CSS, change: */
section > p {
  margin-top: 0;
  font-size: 12px;
  color: var(--muted);
}
/* to: */
.summary-text {
  margin-top: 0;
  font-size: 12px;
  color: var(--muted);
}
```

---

### WR-02: `.section-header + .experience-entry` adjacent-sibling rule does not generalize — comment claims "uniform gap" but the mechanism is section-specific

**File:** `src/lib/render.ts:164,176-178`

**Issue:** The comment at line 164 reads "48px above, 4px below (uniform gap to first content element)". The 4px gap is delivered by `margin-bottom: 4px` on `.section-header`. For the Experience section, the first `.experience-entry` carries `margin-top: 24px` (line 201), which would stack with the 4px from the header to produce 28px — more than intended. The adjacent-sibling rule at line 176-178 corrects this for experience entries. However, the other sections (Education, Skills) use `.edu-entry` and `.skill-group`, whose `margin-top` is `0` (inherited from `* { margin: 0 }`), so the gap is already just the 4px from the header. The comment says "uniform" but the mechanism is non-uniform: two different CSS paths produce the same visual result. This is not a bug today, but if `.edu-entry` or `.skill-group` ever gains a `margin-top`, the gap will silently grow for those sections while the experience gap stays at 4px.

**Fix:** Either extend the adjacent-sibling pattern to all first-child content types for defensive uniformity, or update the comment to accurately describe the mechanism:

```css
/* Option A: explicit comment clarification */
/* Section headers — 48px above, 4px below.
   Experience entries override their own 24px margin-top via the
   adjacent-sibling rule below; Education and Skills entries start at 0. */

/* Option B: defensive selectors that future-proof other sections */
.section-header + .experience-entry,
.section-header + .edu-entry,
.section-header + .skill-group {
  margin-top: 0;
}
```

---

### WR-03: `li::marker` color rule may not render in Puppeteer's print pipeline without `print-color-adjust`

**File:** `src/lib/render.ts:242-244`

**Issue:** The new `li::marker { color: var(--bullet); }` rule applies color to list markers. The `*` reset block (lines 117-119) correctly sets `print-color-adjust: exact` and `-webkit-print-color-adjust: exact` on all elements. However, `::marker` is a pseudo-element, not an element — it is not covered by the `*` selector. Chromium's print pipeline may suppress the marker color during PDF generation if `print-color-adjust` is not also applied to the `::marker` pseudo-element or to the `li` itself. Whether Chromium 125 (bundled with Puppeteer 25.4.0) actually suppresses `::marker` color without this flag is version-dependent, but the omission is a latent rendering defect that could silently produce black bullets instead of the intended `#2d4a6b` in the output PDF.

**Fix:** Add `print-color-adjust: exact` to the `li` rule (which the `::marker` pseudo-element inherits from its originating element) or to the `::marker` rule directly:

```css
/* Option A: add to the existing li rule (inheritable, covers ::marker) */
li {
  font-size: 12px;
  line-height: 18px;
  color: var(--muted);
  margin-bottom: 0.1em;
  orphans: 3;
  widows: 3;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* Option B: add directly to the marker rule */
li::marker {
  color: var(--bullet);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
```

---

## Info

### IN-01: `.competencies { margin-top: 0 }` is now redundant with `section > p { margin-top: 0 }`

**File:** `src/lib/render.ts:188-193`

**Issue:** Phase 5 added `margin-top: 0` to both `section > p` (line 182) and `.competencies` (line 193). Since `.competencies` is a `<p>` inside a `<section>`, both rules apply `margin-top: 0` to the same element. The `.competencies` declaration is now redundant for `margin-top`. This is harmless but adds noise; if WR-01 is fixed by scoping the `section > p` selector to `.summary-text`, this redundancy disappears naturally.

**Fix:** If WR-01 is resolved by adding a `.summary-text` class, no further action needed here — the `.competencies` `margin-top: 0` becomes the sole and correct source. If `section > p` is kept as-is, consider removing `margin-top: 0` from the `.competencies` block to avoid the redundancy.

---

### IN-02: Pre-existing bug (outside Phase 5 scope) — ATS template renders `undefined` for optional contact fields

**File:** `src/lib/render.ts:457`

**Issue:** The ATS template concatenates contact fields directly: `${escapeHtml(contact.linkedin)} | ${escapeHtml(contact.github)}`. If `linkedin` or `github` are absent (undefined), `escapeHtml(undefined)` receives `undefined`, which `String.prototype.replace` coerces to the string `"undefined"`, and that literal appears in the PDF. The designed template (line 306) correctly uses `.filter(Boolean)` before mapping. This bug predates Phase 5 but was not introduced or worsened by these changes.

**Fix:** Apply the same `.filter(Boolean)` pattern used in the designed template:

```typescript
// line 456-458, atsHtmlTemplate
<div class="contact-details">
  ${[contact.email, contact.phone, contact.location, contact.linkedin, contact.github]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" | ")}
</div>
```

---

_Reviewed: 2026-07-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
