# Phase 05: Typography Polish - Research

**Researched:** 2026-07-30
**Domain:** CSS inline styles inside an HTML template string (Puppeteer-rendered PDF)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**TYPO-01: Summary Font Size**
- D-01: Summary paragraph (`section > p`) gets `font-size: 12px` — matching all other "small" elements in the design system (bullets, dates, contact info, competencies). Body is 14px; 12px is the unified small size.

**TYPO-02: Bullet Color**
- D-02: Add `--bullet: #2d4a6b` to the `:root` CSS variables block alongside `--accent`, `--text`, `--muted`, `--border`.
- D-03: Apply color via `li::marker { color: var(--bullet) }` — the disc marker only gets the navy accent. List item text stays muted gray (`var(--muted)`). This is more subtle than coloring the full `li` text.

**TYPO-03: Section Header Bottom Spacing**
- D-04: Every section header gets `margin-bottom: 4px` (currently `margin-bottom: 0`). Uniform gap between ALL section headers and their first content item.
- D-05: `.section-header + .experience-entry { margin-top: 0 }` — prevents double-spacing (header's 4px + entry's existing 24px would otherwise stack to 28px).
- D-06: Experience inter-entry spacing (24px between jobs) is unchanged. Only the header-to-first-entry gap changes.
- D-07: `section > p { margin-top: 4px }` and `.competencies { margin-top: 4px }` must be reduced to `margin-top: 0` — the section-header's new `margin-bottom: 4px` provides this spacing; both values together would double it.

### Claude's Discretion

- Line-height for the summary paragraph at 12px: use the existing `21px` inherited from body (matching `.competencies` at the same size), or reduce to `18px` (matching `li`). Either is acceptable — planner decides based on visual output.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TYPO-01 | Designed PDF summary text renders at body-small size (visibly smaller than body copy) | D-01: `section > p { font-size: 12px }` in the `<style>` block of `designedHtmlTemplate()` |
| TYPO-02 | Designed PDF bullet points are styled with subtle accent color (#2d4a6b) | D-02 + D-03: Add `--bullet` CSS variable, apply via `li::marker { color: var(--bullet) }` |
| TYPO-03 | All section headers in the designed PDF have consistent bottom margin | D-04 through D-07: `margin-bottom: 4px` on `.section-header`, adjacent-sibling override, clear conflicting `margin-top` values |
</phase_requirements>

---

## Summary

Phase 5 is a targeted CSS surgery phase — three isolated changes to the inline `<style>` block inside `designedHtmlTemplate()` in `src/lib/render.ts`. No schema changes, no new packages, no ATS template changes, no CLI changes. The entire scope is contained within lines 110–290 of a single file.

The designed PDF's visual design system uses a consistent 12px "small" size throughout (bullets, dates, contact info, competencies) against a 14px body baseline. TYPO-01 brings the summary paragraph in line with this established pattern. TYPO-02 adds a CSS custom property `--bullet: #2d4a6b` and targets the disc marker specifically via `li::marker`, leaving bullet text gray. TYPO-03 normalizes section header bottom spacing — currently Experience has a de facto 24px gap (from `.experience-entry { margin-top: 24px }`), Summary has 4px, and Education/Skills have ~0px. The fix sets `margin-bottom: 4px` on `.section-header` universally, then eliminates the `margin-top` values on elements that would double-stack with it.

The one discretionary decision remaining for the planner is line-height for the summary paragraph when shrunk to 12px: keep the inherited body `21px` (same as `.competencies`) or reduce to `18px` (same as `li`). Both are visually valid; the planner should look at the rendered output and pick the one that feels right for the paragraph-density context.

**Primary recommendation:** Make all three CSS changes in a single commit touching only `designedHtmlTemplate()`'s `<style>` block. Run `npm run smoke-render` to produce a visual PDF and human-verify all three success criteria before closing the phase.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Summary font size (TYPO-01) | Frontend Server (SSR equivalent: HTML template) | — | Font-size is rendered server-side as static CSS inside the HTML template string that Puppeteer consumes |
| Bullet marker color (TYPO-02) | Frontend Server (HTML template) | — | `li::marker` pseudo-element color is a CSS rule in the static template; no client-side JS involved |
| Section header spacing (TYPO-03) | Frontend Server (HTML template) | — | Margin properties in the inline `<style>` block; entirely resolved at Puppeteer render time |

All three capabilities live in a single function (`designedHtmlTemplate()`) in `src/lib/render.ts`. There is no client tier, no CDN tier, and no database tier involved.

---

## Standard Stack

### Core

No new packages. All work is done with the existing stack:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Puppeteer | `^25.4.0` | Headless Chromium PDF rendering | Already in production; renders the `<style>` block faithfully with `print-color-adjust: exact` |
| TypeScript | `^6.0.3` | Template string authoring | Existing language; `designedHtmlTemplate()` is a typed function returning a plain string |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `smoke-render` script (`tsx scripts/smoke-render.ts`) | — | Visual PDF verification | Run after CSS changes to inspect rendered output before committing |

### Alternatives Considered

None. This phase has no library choices — it is pure CSS authored inside an existing TypeScript template string.

**Installation:** None required. `[VERIFIED: codebase]` — no new packages.

---

## Package Legitimacy Audit

> No packages are installed in this phase. This section is intentionally empty.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
cvgen CLI
    │
    ▼
src/cli/index.ts  ──── parses args, reads .md file
    │
    ▼
src/lib/extract.ts ─── Claude API → ResumeData (JSON)
    │
    ▼
src/lib/render.ts
    ├── designedHtmlTemplate(data)   ◄── ALL THREE CHANGES LIVE HERE
    │       │
    │       └── inline <style> block
    │               ├── :root { --bullet: #2d4a6b }        [TYPO-02 D-02]
    │               ├── section > p { font-size: 12px }    [TYPO-01 D-01]
    │               ├── .section-header { margin-bottom: 4px } [TYPO-03 D-04]
    │               ├── .section-header + .experience-entry { margin-top: 0 } [TYPO-03 D-05]
    │               ├── section > p { margin-top: 0 }      [TYPO-03 D-07]
    │               ├── .competencies { margin-top: 0 }    [TYPO-03 D-07]
    │               └── li::marker { color: var(--bullet) } [TYPO-02 D-03]
    │
    ├── renderDesigned(data, path, browser) → designed PDF
    └── renderAts(data, path, browser)      → unchanged
```

### Recommended Project Structure

No structural changes. All work is inside the existing `src/lib/render.ts`.

```
src/
├── cli/             # unchanged
├── lib/
│   ├── render.ts    # ONLY FILE CHANGED — three CSS property edits
│   ├── render.test.ts   # review after changes; no new tests needed (nyquist disabled)
│   └── ...          # unchanged
└── schema/          # unchanged
```

### Pattern 1: CSS Custom Property Addition

**What:** New custom property added to `:root` block inside the `<style>` string.
**When to use:** When a color value is used in more than one rule, or when it represents a semantic design token.
**Example:**

```css
/* Source: existing codebase pattern — src/lib/render.ts lines 121–126 */
:root {
  --accent: #FEAC03;
  --text: #232323;
  --muted: #555555;
  --border: #e0e0e0;
  --bullet: #2d4a6b;   /* ADD THIS — TYPO-02 D-02 */
}
```

[VERIFIED: codebase] — pattern follows exactly the existing `:root` block at line 121.

### Pattern 2: `li::marker` Pseudo-Element Coloring

**What:** Color the list disc marker independently of the list item text.
**When to use:** When marker color should differ from list item text color — here, navy disc on gray text.
**Example:**

```css
/* Source: CSS spec — ::marker pseudo-element, supported in all modern browsers and Chromium */
li::marker {
  color: var(--bullet);
}
```

[ASSUMED] — `::marker` pseudo-element is widely supported in Chromium (including the Puppeteer-bundled version). Chromium 120+ has full `::marker` color support. The bundled Chromium in Puppeteer 25.x is well above this floor.

**Important:** `li::marker` targets the disc symbol only. The `li` text is colored by the existing `li { color: var(--muted) }` rule at line 232. No change to `li` text color is needed or desired.

### Pattern 3: Adjacent Sibling Selector for Spacing Overrides

**What:** CSS adjacent sibling combinator (`+`) to target only the first element after a `.section-header`.
**When to use:** When a universal rule (e.g., `margin-bottom: 4px` on header) would compound with an existing rule on the next sibling.
**Example:**

```css
/* Source: existing codebase structure — section headers always immediately precede
   .experience-entry divs in the Experience section HTML */
.section-header + .experience-entry {
  margin-top: 0;
}
```

[VERIFIED: codebase] — the HTML structure in `designedHtmlTemplate()` places `<h2 class="section-header">` directly before the first `.experience-entry` div (lines 310–313). Adjacent sibling selector fires correctly.

### Pattern 4: Double-Spacing Prevention

**What:** When adding `margin-bottom` to an element, audit the `margin-top` of its siblings that already provide spacing.
**When to use:** Whenever normalizing spacing across section headers where existing rules provide margin-top on child elements.
**Audit results from existing code:**

```
section > p { margin-top: 4px }        → set to 0  (D-07)
.competencies { margin-top: 4px }      → set to 0  (D-07)
.experience-entry { margin-top: 24px } → keep for inter-entry spacing; override via .section-header + .experience-entry { margin-top: 0 } (D-05)
.edu-entry (no margin-top)             → no change needed
.skill-group (no margin-top)           → no change needed
```

[VERIFIED: codebase] — confirmed by reading `src/lib/render.ts` lines 176–196.

### Anti-Patterns to Avoid

- **Coloring `li` text instead of `li::marker`:** Changing `li { color: ... }` would also change bullet text from gray to navy — user explicitly rejected this. Use `li::marker` only.
- **Setting `margin-bottom: 4px` without clearing conflicting `margin-top` values:** Summary and competencies would get 8px gap instead of 4px. Must clear D-07 targets in the same commit.
- **Forgetting the `.section-header + .experience-entry` override:** Without it, the first experience entry would have 4px (from header) + 24px (from entry) = 28px gap, diverging from the 4px target.
- **Touching `atsHtmlTemplate()`:** ATS PDF is intentionally unstyled. All three requirements scope to the designed PDF only.

---

## Don't Hand-Roll

This phase has no algorithmic complexity. All solutions are single CSS property assignments. No custom logic should be written.

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bullet color | JavaScript to inject inline styles on each `<li>` | `li::marker { color: var(--bullet) }` in the `<style>` block | CSS pseudo-element handles it declaratively; no template logic needed |
| Spacing normalization | Per-section conditional margin logic in template JS | CSS adjacent sibling selector + property overrides | Pure CSS is the right tool; template string already outputs deterministic HTML structure |

---

## Runtime State Inventory

> Omitted — this is a greenfield CSS edit phase, not a rename/refactor/migration.

---

## Common Pitfalls

### Pitfall 1: Double-Spacing After Section Headers

**What goes wrong:** Adding `margin-bottom: 4px` to `.section-header` without clearing the `margin-top` on `section > p` and `.competencies` produces 8px gaps under Summary and Core Competencies instead of 4px. The Experience section gets a 28px gap (4px header + 24px entry).
**Why it happens:** CSS margin collapsing does NOT apply between a block parent's `margin-bottom` and a child's `margin-top` in a grid or flow context when the elements are siblings, not parent-child. Both margins stack additively.
**How to avoid:** Apply D-04, D-05, D-07 together in the same change. Never apply D-04 alone.
**Warning signs:** Visual PDF shows Summary section header has noticeably more space below it than before. Experience first entry is far below its header.

### Pitfall 2: `li::marker` Browser Support in Older Chromium

**What goes wrong:** `li::marker` color support requires Chromium 86+. If using `puppeteer-core` pointed at a system Chrome older than 86, bullets would remain black.
**Why it happens:** `::marker` was not fully supported until Chromium 86 (released October 2020).
**How to avoid:** This project uses `puppeteer` (full, with bundled Chromium), not `puppeteer-core`. The bundled Chromium in Puppeteer 25.x is far above Chromium 86. Not a real risk here — documented for completeness.
**Warning signs:** Bullets render black in the PDF despite the CSS rule being present.

### Pitfall 3: Selector Specificity Conflict

**What goes wrong:** A new `li::marker` rule is overridden by an existing more-specific rule elsewhere in the `<style>` block.
**Why it happens:** The existing `<style>` block has `ul` and `li` rules. If a more specific selector like `ul li::marker` existed elsewhere, it would win.
**How to avoid:** Verify there are no existing `::marker` rules in the template before adding the new one. (Confirmed: none exist in the current `render.ts` at lines 110–290.)
**Warning signs:** Bullet markers remain black despite the CSS rule. Inspect `li::marker` in DevTools to see which rule is winning.

### Pitfall 4: `section > p` Selector Scope

**What goes wrong:** `section > p` matches ALL `<p>` elements that are direct children of any `<section>` — including future sections added later. If a new section adds a `<p>` that should be body size, the selector will downsize it unexpectedly.
**Why it happens:** The selector is intentionally broad. Currently correct because the only `section > p` in the designed template is the summary paragraph.
**How to avoid:** Accept this scope now (it's intentional per D-01). If future phases add body-size paragraphs in sections, a more specific selector (e.g., `.summary-section > p`) would be needed then. Not a concern for this phase.
**Warning signs:** A future section's paragraph text appears too small.

---

## Code Examples

Verified patterns from the current codebase and CSS spec:

### Complete Diff — All Three Changes

```css
/* =====================================================================
   TYPO-02 D-02: Add --bullet to :root block (after --border)
   ===================================================================== */

:root {
  --accent: #FEAC03;
  --text: #232323;
  --muted: #555555;
  --border: #e0e0e0;
  --bullet: #2d4a6b;   /* ADD — navy accent for disc markers */
}

/* =====================================================================
   TYPO-01 D-01: Summary paragraph font size
   TYPO-03 D-07 (partial): Clear margin-top to prevent double-spacing
   ===================================================================== */

/* Summary + competencies paragraphs */
section > p {
  margin-top: 0;          /* CHANGE: was 4px — header's margin-bottom now provides this */
  font-size: 12px;        /* ADD — body-small, matches li / .competencies / .contact-details */
  color: var(--muted);
}

/* =====================================================================
   TYPO-03 D-07 (partial): Clear .competencies margin-top
   ===================================================================== */

.competencies {
  font-size: 12px;
  line-height: 21px;
  color: var(--muted);
  margin-top: 0;          /* CHANGE: was 4px — header's margin-bottom now provides this */
}

/* =====================================================================
   TYPO-03 D-04: Normalize section header bottom spacing
   ===================================================================== */

.section-header {
  font-size: 14px;
  line-height: 21px;
  font-weight: 400;
  color: var(--text);
  margin-top: 48px;
  margin-bottom: 4px;     /* CHANGE: was 0 — uniform 4px gap for all sections */
  break-after: avoid;
  break-inside: avoid;
}

/* =====================================================================
   TYPO-03 D-05: Prevent double-spacing before first experience entry
   ===================================================================== */

/* ADD this new rule after .section-header */
.section-header + .experience-entry {
  margin-top: 0;          /* Override the 24px from .experience-entry for first-entry only */
}

/* =====================================================================
   TYPO-02 D-03: Bullet marker color
   ===================================================================== */

/* ADD this new rule — color disc marker only, not li text */
li::marker {
  color: var(--bullet);
}
```

Source: [VERIFIED: codebase] — current `src/lib/render.ts` lines 110–290 read in this session.

### Line-Height Decision for Summary at 12px (Claude's Discretion)

The planner must choose between two valid options:

```css
/* Option A: Keep inherited 21px (same as .competencies at 12px) */
section > p {
  font-size: 12px;
  /* line-height inherits 21px from body — no override needed */
}

/* Option B: Reduce to 18px (matches li at 12px, tighter for multi-line paragraph) */
section > p {
  font-size: 12px;
  line-height: 18px;
}
```

**Recommendation:** Start with Option A (no line-height override, inherit body's 21px). The summary is a paragraph, not a list — the looser 21px line-height is more readable for multi-sentence prose. Only override to 18px if the rendered PDF shows the summary feels too airy compared to surrounding content. Visual inspection with `npm run smoke-render` is the deciding tool.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `::marker` not widely supported | Full `::marker` color support in Chromium 86+ | October 2020 | Safe to use in Puppeteer 25.x unconditionally |
| Separate `border-color` on marker | `li::marker { color }` | CSS Pseudo-Elements Level 4 | Cleaner than wrapping markers in `<span>` |

**Deprecated/outdated:**
- Wrapping `<span>` around list markers to colorize them: replaced by `li::marker` in modern Chromium.
- Using `list-style-color` (non-standard): `li::marker { color }` is the standard approach.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `::marker` pseudo-element color is fully supported in the Chromium version bundled with Puppeteer 25.x | Common Pitfalls, Code Examples | Bullets would remain black — low risk, Puppeteer 25.x bundles Chromium 132+ which is far above the Chromium 86 floor |
| A2 | CSS margin collapsing does NOT collapse sibling margins between `.section-header`'s `margin-bottom` and `.experience-entry`'s `margin-top` | Common Pitfalls, Code Examples | Double-spacing pitfall description would be wrong — but the fix (D-05 adjacent sibling override) is correct regardless |

**Risk assessment:** Both assumptions are LOW risk. A1 is a baseline browser support fact for Chromium 86+ (confirmed 2020). A2 is standard CSS margin collapsing behavior (sibling margins on block elements in normal flow DO collapse, but grid children do not — the experience entry is rendered in a grid context which prevents collapse; the fix handles both cases correctly).

---

## Open Questions

1. **Summary paragraph line-height**
   - What we know: 12px body-small size is locked. `.competencies` uses 21px at 12px. `li` uses 18px at 12px.
   - What's unclear: Whether 21px feels too loose for a summary paragraph in the rendered PDF.
   - Recommendation: Plan with Option A (inherit 21px, no override). Run `smoke-render` and visually confirm. If too loose, add `line-height: 18px` as a single-property follow-on change.

---

## Environment Availability

> Step 2.6: No new external dependencies. All tooling already present in the project.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v26.4.0 | — |
| Puppeteer (bundled Chromium) | smoke-render visual verification | Yes | `^25.4.0` in package.json | — |
| `tsx` | `npm run smoke-render` dev script | No (not in PATH) | — | `npx tsx` or install: `npm install -g tsx` |
| `smoke-render` script | Visual PDF inspection | Yes | `scripts/smoke-render.ts` exists | — |

**Missing dependencies with no fallback:**
- None that block phase execution. All three CSS changes are text edits.

**Missing dependencies with fallback:**
- `tsx` not in PATH but available via `npx tsx` — `smoke-render` may need `npx tsx scripts/smoke-render.ts` if `npm run smoke-render` fails.

---

## Validation Architecture

> `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`. This section is omitted per configuration.

---

## Security Domain

> `security_enforcement` key absent from `.planning/config.json` — treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | No — no new user input surfaces | All user data already HTML-escaped via `escapeHtml()` before template interpolation; no new injection surface added |
| V6 Cryptography | No | — |

**Security impact:** Zero. This phase adds CSS properties to a static `<style>` block. No new user input is accepted, no new data paths are opened, and no network behavior changes. The existing `escapeHtml()` guard on all template interpolation points remains unchanged and fully covers the designed PDF.

### Known Threat Patterns for CSS Template Strings

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CSS injection via user data in `<style>` content | Tampering | Not applicable — `#2d4a6b` and `4px` are hardcoded literals, not user-controlled values |
| XSS via unsanitized template interpolation | Tampering | Existing `escapeHtml()` applied to all `data.*` interpolations; no change to those call sites |

---

## Sources

### Primary (HIGH confidence)
- `src/lib/render.ts` (codebase) — read in full in this session; all existing CSS rules, `:root` variables, selectors, and HTML structure verified directly
- `src/lib/render.test.ts` (codebase) — test infrastructure confirmed; existing tests cover `renderAts` and `resolveOutputPaths`; no designed PDF CSS tests present
- `package.json` (codebase) — confirmed test runner (`tsx --test`), confirmed no `nyquist_validation` needed (config.json explicitly false)
- `.planning/phases/05-typography-polish/05-CONTEXT.md` (codebase) — all decisions locked by user session, copied verbatim above

### Secondary (MEDIUM confidence)
- CSS Pseudo-Elements Level 4 — `::marker` color property support, Chromium 86+ floor [ASSUMED based on well-established browser support data, not verified via live lookup]

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing stack read from codebase
- Architecture: HIGH — single file, fully read, all selectors and rules verified in this session
- Pitfalls: HIGH — derived from direct reading of the existing CSS and HTML structure; not from training data
- Decisions: HIGH — locked by CONTEXT.md gathered 2026-07-30

**Research date:** 2026-07-30
**Valid until:** Indefinite — pure CSS change to a static template; no external dependencies to go stale
