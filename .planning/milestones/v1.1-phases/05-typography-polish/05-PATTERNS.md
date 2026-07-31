# Phase 5: Typography Polish - Pattern Map

**Mapped:** 2026-07-30
**Files analyzed:** 1 (modified only — no new files)
**Analogs found:** 1 / 1 (self-analog — all patterns extracted from the file being modified)

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `src/lib/render.ts` | template / utility | transform (data → HTML string → PDF) | `src/lib/render.ts` itself (existing CSS patterns within `designedHtmlTemplate()`) | exact — same file, same `<style>` block |

**Note:** This phase has no new files. It is a pure CSS edit to one function's inline `<style>` block. All patterns are sourced from the file under modification itself.

---

## Pattern Assignments

### `src/lib/render.ts` — `designedHtmlTemplate()` CSS block (template, transform)

**Analog:** Same file — existing CSS rules in the `<style>` block at lines 110–290.

---

#### Pattern 1: CSS Custom Property Addition (TYPO-02 D-02)

**Source:** `src/lib/render.ts` lines 121–126

The existing `:root` block establishes all design tokens. New tokens follow the same format — one variable per line, hex value, no shorthand.

```css
/* EXISTING — lines 121–126 */
:root {
  --accent: #FEAC03;
  --text: #232323;
  --muted: #555555;
  --border: #e0e0e0;
}

/* TARGET — add --bullet as the fifth token, after --border */
:root {
  --accent: #FEAC03;
  --text: #232323;
  --muted: #555555;
  --border: #e0e0e0;
  --bullet: #2d4a6b;
}
```

**Rule:** One token per line. No shorthand. New token appended at end of block.

---

#### Pattern 2: Element-Rule Structure (core CSS pattern)

**Source:** `src/lib/render.ts` lines 164–173, 176–179, 182–187

All existing CSS rules use the same structure: selector, opening brace, one property per line, closing brace. No inline shorthand. Rules are grouped by section with a comment header.

```css
/* EXISTING — .section-header (lines 164–173) */
.section-header {
  font-size: 14px;
  line-height: 21px;
  font-weight: 400;
  color: var(--text);
  margin-top: 48px;
  margin-bottom: 0;
  break-after: avoid;
  break-inside: avoid;
}

/* EXISTING — section > p (lines 176–179) */
section > p {
  margin-top: 4px;
  color: var(--muted);
}

/* EXISTING — .competencies (lines 182–187) */
.competencies {
  font-size: 12px;
  line-height: 21px;
  color: var(--muted);
  margin-top: 4px;
}
```

**Rule:** Modify individual properties in-place. Do not restructure the rule or reorder properties unless necessary. Comments above rule groups use `/* Section name — description */` style.

---

#### Pattern 3: Size Convention — 12px "small" tier (TYPO-01 D-01)

**Source:** `src/lib/render.ts` — multiple rules

The designed PDF has a strict two-tier size system. Every existing "small" element uses exactly `12px` / `font-size: 12px`. No rounding, no em units, no calc().

```css
/* EXISTING — all small-tier rules (representative) */
.contact-details { font-size: 12px; line-height: 21px; }  /* line 153 */
.competencies    { font-size: 12px; line-height: 21px; }  /* line 183 */
.exp-date        { font-size: 12px; line-height: 21px; }  /* line 201 */
.type-badge      { font-size: 12px; line-height: 21px; }  /* line 217 */
li               { font-size: 12px; line-height: 18px; }  /* line 228 */
.edu-year        { font-size: 12px; line-height: 21px; }  /* line 252 */
.institution     { font-size: 12px; line-height: 21px; }  /* line 265 */
.skill-group     { font-size: 12px; line-height: 21px; }  /* line 277 */
.skill-category  { font-size: 12px; line-height: 21px; }  /* line 281 */
```

**Rule for TYPO-01:** Add `font-size: 12px` to `section > p`. Line-height: inherit body's `21px` (no override needed — start with Option A per RESEARCH.md recommendation). Override to `18px` only after visual inspection shows the paragraph is too airy.

---

#### Pattern 4: CSS Variable Reference (color application)

**Source:** `src/lib/render.ts` lines 132, 148, 155, 178, 184, 203, 218, 229, etc.

All color values use `var(--token)` references — never hardcoded hex inside rules (except within `:root` itself).

```css
/* EXISTING — color via CSS variable (representative) */
body           { color: var(--text); }           /* line 132 */
.candidate-name { color: var(--text); }          /* line 148 */
.contact-details { color: var(--muted); }        /* line 155 */
section > p    { color: var(--muted); }          /* line 178 */
li             { color: var(--muted); }          /* line 229 */
```

**Rule for TYPO-02 D-03:** Apply bullet color as `li::marker { color: var(--bullet); }` — reference the token, not the raw hex `#2d4a6b`. Placement: after the `li { ... }` rule block (lines 227–234) to keep marker and item rules adjacent.

---

#### Pattern 5: Adjacent Sibling Selector for Spacing Override (TYPO-03 D-05)

**Source:** `src/lib/render.ts` — HTML structure at lines 310–313

The HTML structure places `<h2 class="section-header">` as the direct preceding sibling of the first `.experience-entry` div inside the Experience `<section>`. This is deterministic — the template always outputs them adjacent.

```html
<!-- EXISTING HTML structure (lines 310–313) -->
<section>
  <h2 class="section-header">Experience</h2>
  <!-- first .experience-entry immediately follows -->
  <div class="experience-entry">...</div>
  <div class="experience-entry">...</div>
</section>
```

The CSS adjacent sibling combinator (`+`) targets only the first `.experience-entry` after the header:

```css
/* NEW rule — placement: immediately after .section-header { ... } block */
.section-header + .experience-entry {
  margin-top: 0;
}
```

**Rule:** New rule goes immediately after `.section-header { ... }` in the `<style>` block, maintaining the top-to-bottom section grouping that mirrors the visual document order.

---

#### Pattern 6: Margin Property Modification (TYPO-03 D-04, D-07)

**Source:** `src/lib/render.ts` lines 169–170, 177, 186

Margin changes are in-place property value replacements within existing rule blocks. No new rules are needed for D-04 and D-07 — only property values change.

```css
/* EXISTING → TARGET changes */

/* .section-header — line 170 */
margin-bottom: 0;      /* EXISTING */
margin-bottom: 4px;    /* TARGET (D-04) */

/* section > p — line 177 */
margin-top: 4px;       /* EXISTING */
margin-top: 0;         /* TARGET (D-07) */

/* .competencies — line 186 */
margin-top: 4px;       /* EXISTING */
margin-top: 0;         /* TARGET (D-07) */
```

**Rule:** Edit property values in-place. Do not add new rules for D-04/D-07 — the existing rule blocks for `.section-header`, `section > p`, and `.competencies` are the correct location.

---

## Shared Patterns

### `escapeHtml()` — HTML safety (cross-cutting)

**Source:** `src/lib/render.ts` lines 32–39

All user data interpolated into the HTML template string passes through `escapeHtml()`. This phase adds no new template interpolation points — the existing call sites are unchanged. No new data is interpolated into the `<style>` block; all new values (`#2d4a6b`, `4px`, `12px`) are hardcoded literals.

```typescript
/* EXISTING — lines 32–39 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

**Apply to:** All `data.*` interpolation points in the template — unchanged by this phase.

### Comment Header Style

**Source:** `src/lib/render.ts` — throughout `<style>` block

Section groups within the `<style>` block use `/* Description — detail */` comments above the first rule in each group. New rules (`li::marker`, `.section-header + .experience-entry`) should be placed adjacent to their related existing rules without adding new section comment headers unless there is a clear grouping reason.

---

## No Analog Found

None. This phase modifies one existing file. All patterns are present in the codebase.

---

## Change Summary for Planner

All seven decision points (D-01 through D-07) map to exactly two types of operations:

| Operation | Decisions | Rules Affected |
|-----------|-----------|----------------|
| Property value change (in-place) | D-01, D-04, D-07 | `section > p { font-size }`, `.section-header { margin-bottom }`, `section > p { margin-top }`, `.competencies { margin-top }` |
| New rule addition | D-02, D-03, D-05 | `--bullet` in `:root`, `li::marker { color }`, `.section-header + .experience-entry { margin-top }` |

**Recommended edit order:** Apply all changes in a single pass through the `<style>` block top-to-bottom:
1. `:root` block — add `--bullet: #2d4a6b` after `--border` (line 125)
2. `.section-header` block — change `margin-bottom: 0` to `margin-bottom: 4px` (line 170)
3. After `.section-header` block — insert new `.section-header + .experience-entry { margin-top: 0; }` rule
4. `section > p` block — add `font-size: 12px`, change `margin-top: 4px` to `margin-top: 0` (lines 176–179)
5. `.competencies` block — change `margin-top: 4px` to `margin-top: 0` (line 186)
6. After `li { ... }` block — insert new `li::marker { color: var(--bullet); }` rule (after line 234)

---

## Metadata

**Analog search scope:** `src/lib/render.ts` (single file — scope confirmed by CONTEXT.md and RESEARCH.md)
**Files scanned:** 1
**Pattern extraction date:** 2026-07-30
