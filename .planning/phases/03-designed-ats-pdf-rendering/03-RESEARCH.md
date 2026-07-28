# Phase 3: Designed & ATS PDF Rendering - Research

**Researched:** 2026-07-28
**Domain:** Puppeteer PDF rendering, print-media CSS, Google Fonts in headless Chrome, pdf-parse text extraction
**Confidence:** HIGH (core Puppeteer API verified via official pptr.dev docs; pdf-parse verified via npm registry + GitHub)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Designed PDF Visual Style**
- D-D01: Aesthetic direction is minimal / modern — clean whitespace, geometric sans-serif, one subtle accent color.
- D-D02: Font is Inter, loaded via Google Fonts `@import` in the HTML template's `<head>`. Puppeteer fetches it at render time (network access required).
- D-D03: One subtle accent color — Claude picks a tasteful muted color. Applied to candidate name and/or section headers only.

**ATS-clean PDF Character**
- D-A01: Austerity level is clean but structured — black only, bold section headers, generous line spacing. No decorative elements, no color.
- D-A02: Font is Arial — specified as `Arial, Helvetica, sans-serif`.
- D-A03: The ATS PDF must be clearly visually distinct from the designed PDF at a glance.

**Output File Naming & Placement**
- D-O01: PDFs land in the same directory as the input `.md` file.
- D-O02: Slug derived from input filename stem — `my-resume.md` → `my-resume-resume.pdf` / `my-resume-resume-ats.pdf`.

**Test Strategy**
- D-T01: ATS text-extraction correctness verified via an automated test using `pdf-parse` (dev dependency).
- D-T02: Designed PDF visual correctness verified manually — no automated appearance test in Phase 3.

### Claude's Discretion
- Specific accent color hex for the designed PDF (tasteful, muted — e.g., `#2d4a6b`, `#1a4a3a`)
- Page margins, line heights, section spacing for both PDFs
- HTML template structure (template literal function preferred for co-location with render logic)
- Puppeteer launch options and PDF print settings (paper format, `printBackground`, margins)
- Module file structure — `src/lib/render.ts` exporting `renderDesigned(data, outputPath)` and `renderAts(data, outputPath)`

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RENDER-01 | CLI renders a designed single-column typographic PDF from the validated JSON (no images, no multi-column layout) | Puppeteer `page.pdf()` API verified; `printBackground`, `format: 'Letter'`, print-media CSS patterns documented below |
| RENDER-02 | CLI renders a simplified single-column ATS-clean PDF — system-safe fonts, no layout tables, no hidden/near-invisible text, real selectable text | Arial system font stack verified; `break-inside: avoid` for layout; no-table constraint from REQUIREMENTS.md |
| RENDER-03 | Output files use predictable, non-destructive names (`<slug>-resume.pdf` / `<slug>-resume-ats.pdf`) | Slug derivation from `path.basename(inputPath, '.md')` + suffix; `path.join(inputDir, slug + '-resume.pdf')` pattern |
</phase_requirements>

---

## Summary

Phase 3 builds `src/lib/render.ts` — two pure async functions that accept `ResumeData` and an output path, spin up Puppeteer, generate a styled PDF, write it to disk, and return. Neither function touches the CLI, Commander, or any I/O beyond the output file. They are tested against `fixtures/sample-resume.json` directly.

The core technical challenge is Puppeteer lifecycle and font loading: the designed PDF requires Inter from Google Fonts, which means Puppeteer must make a live network request after `page.setContent()`. Puppeteer 25.4.0 defaults `waitForFonts: true` (waits for `document.fonts.ready`) but Google Fonts are loaded via CSS `@import`, which initiates a two-hop network request (fetch CSS, then fetch font file). The safe pattern is `setContent(html, { waitUntil: 'networkidle0' })` followed by explicit `await page.waitForNetworkIdle()` before calling `page.pdf()`. The ATS renderer has no network dependency (system fonts resolve instantly) and can skip the network idle wait.

The test framework is an important finding: the existing codebase uses the **Node.js built-in test runner** (`node:test` / `describe` / `it` from `"node:test"`) run via `npx tsx --test <file>`, not Vitest. CONTEXT.md references "Vitest" but this appears to be an error — no `vitest` package is installed, no `vitest.config.*` file exists, and all four existing test files import from `"node:test"`. The ATS extraction test must follow the established `node:test` pattern.

**Primary recommendation:** Use `page.setContent(html, { waitUntil: 'networkidle0' })` for the designed PDF renderer to ensure Inter loads, and `page.setContent(html)` for ATS. Share a single `Browser` instance across both render calls. The caller (Wave 2 or Phase 4) manages browser lifecycle.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| HTML template generation | Library (render.ts) | — | Template literals produce HTML string; no browser involvement until `setContent` |
| PDF rendering | Puppeteer (headless Chrome) | — | Chrome's print pipeline handles CSS, fonts, pagination |
| Font fetching | External (Google Fonts CDN) | Browser cache | Network request during `setContent`; `waitForNetworkIdle` gates completion |
| Text extraction (test) | pdf-parse (dev-only) | — | Reads rendered PDF bytes; used only in ATS test |
| Output path construction | Library (render.ts) | Node path module | `path.join(dir, slug + '-resume.pdf')` — pure string logic |
| Data input | Caller | — | `ResumeData` object passed in; render.ts does not touch the filesystem for input |

---

## Standard Stack

### Core (new installs for this phase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `puppeteer` | `25.4.0` [VERIFIED: npm registry] | Headless Chrome PDF rendering | Full package (not `puppeteer-core`) bundles a matched Chromium build; `engines.node >=22.12.0` matches project floor; 11.4M weekly downloads |
| `pdf-parse` | `2.4.5` [VERIFIED: npm registry] | PDF text extraction in ATS test | 6.7M weekly downloads; Node 22/24 support confirmed; accepts `{ data: buffer }` constructor for in-memory PDFs |

### Already Present

| Library | Version | Purpose |
|---------|---------|---------|
| TypeScript | `6.0.3` | Type-checked implementation |
| `tsx` | `4.23.1` | Dev-run without build step |
| `node:test` | Node 26 built-in | Test runner (established convention — do NOT introduce Vitest) |
| `node:path` | built-in | Output path construction |
| `node:fs/promises` | built-in | Write/read PDF bytes in test |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pdf-parse` 2.x class API | `pdf-parse` 1.x legacy API | 1.x is still on npm (minor tag `1.1.4`) but from a different maintainer codebase and no longer updated; 2.x has clean ESM support |
| `node:test` | Vitest | CONTEXT.md mentions "Vitest" but no vitest package or config exists in the repo; all existing tests use `node:test`. Introducing Vitest mid-project adds a second test runner. Planner should flag this conflict for human decision. |
| Google Fonts `@import` | Self-hosted Inter woff2 | Self-hosting avoids network dependency at render time (offline-safe) but adds font file management; locked as D-D02 |

**Installation:**
```bash
npm install puppeteer@25.4.0
npm install --save-dev pdf-parse@2.4.5
```

**Version verification (run before installing):**
```bash
npm view puppeteer version    # → 25.4.0  [VERIFIED: 2026-07-28]
npm view pdf-parse version    # → 2.4.5   [VERIFIED: 2026-07-28]
```

---

## Package Legitimacy Audit

> slopcheck was unavailable at research time. All packages are tagged `[ASSUMED]` from registry metadata and therefore the planner must gate each install behind a `checkpoint:human-verify` task — OR the installer can treat the download stats and repository age as sufficient signal for these well-known packages.

| Package | Registry | Age | Downloads/wk | Source Repo | slopcheck | Disposition |
|---------|----------|-----|--------------|-------------|-----------|-------------|
| `puppeteer` | npm | 13 yrs (2013) | 11.4M [VERIFIED: api.npmjs.org] | github.com/puppeteer/puppeteer | unavailable | [ASSUMED] — approved on age + volume |
| `pdf-parse` | npm | 8 yrs (2018) | 6.7M [VERIFIED: api.npmjs.org] | github.com/mehmet-kozan/pdf-parse | unavailable | [ASSUMED] — approved on age + volume |

**Note on `puppeteer` postinstall script:** `puppeteer` runs `node install.mjs` as a postinstall hook. This is expected and documented — it downloads the matching Chromium binary to `~/.cache/puppeteer/`. It does not write outside the home directory cache and is widely confirmed as the official Puppeteer install mechanism. [ASSUMED — slopcheck not run, but this behavior is publicly documented behavior of the official package.]

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none — both packages have 6+ years of history and millions of weekly downloads.

*slopcheck was unavailable at research time; packages tagged [ASSUMED]. Planner may add a `checkpoint:human-verify` before each install if strict mode is required.*

---

## Architecture Patterns

### System Architecture Diagram

```
ResumeData (from fixtures/sample-resume.json in test, from extract.ts in Phase 4)
    │
    ▼
renderDesigned(data, outputPath)         renderAts(data, outputPath)
    │                                        │
    ▼                                        ▼
designedHtmlTemplate(data)              atsHtmlTemplate(data)
  [Inter via Google Fonts @import]        [Arial, Helvetica, sans-serif]
  [accent color, generous whitespace]     [black only, bold headers]
    │                                        │
    ▼                                        ▼
Browser (shared instance, passed in)    Browser (shared instance, passed in)
  └─ page.setContent(html,              └─ page.setContent(html)
       { waitUntil: 'networkidle0' })        │
  └─ page.waitForNetworkIdle()          └─ page.pdf({ format: 'Letter',
  └─ page.pdf({ format: 'Letter',            printBackground: false,
       printBackground: true,                 margin: { ... },
       margin: { ... },                       path: outputPath })
       path: outputPath })                    │
    │                                    PDF bytes → disk
    ▼
 PDF bytes → disk
    │
    ▼ (ATS test only)
readFile(atsOutputPath) → Uint8Array
    │
    ▼
new PDFParse({ data: buffer })
    └─ await parser.getText() → { text: string }
    └─ assert text.includes('Alex Rivera') etc.
    └─ await parser.destroy()
```

### Recommended Project Structure

```
src/
├── lib/
│   ├── render.ts          # NEW: renderDesigned() + renderAts() + template functions
│   ├── extract.ts         # existing
│   ├── preflight.ts       # existing
│   └── render.test.ts     # NEW: ATS text-extraction test (node:test)
fixtures/
│   └── sample-resume.json # existing — used directly by render.test.ts
```

### Pattern 1: Puppeteer Browser Lifecycle (CLI Shared Browser)

**What:** The caller creates one `Browser` and passes it to both render functions. This avoids launching Chrome twice for a typical run. Both functions close their own `Page` after use; the caller closes the `Browser`.

**When to use:** Any time two or more render calls happen in the same process.

**Example:**
```typescript
// Source: pptr.dev/api/puppeteer.browser (verified 2026-07-28)
import puppeteer from 'puppeteer';
import type { Browser } from 'puppeteer';
import type { ResumeData } from '../schema/resume.js';

export async function renderDesigned(
  data: ResumeData,
  outputPath: string,
  browser: Browser,
): Promise<void> {
  const page = await browser.newPage();
  try {
    const html = designedHtmlTemplate(data);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.waitForNetworkIdle();          // belt-and-suspenders for font CDN
    await page.pdf({
      path: outputPath,
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.75in', right: '0.75in', bottom: '0.75in', left: '0.75in' },
    });
  } finally {
    await page.close();
  }
}

export async function renderAts(
  data: ResumeData,
  outputPath: string,
  browser: Browser,
): Promise<void> {
  const page = await browser.newPage();
  try {
    const html = atsHtmlTemplate(data);
    await page.setContent(html, { waitUntil: 'load' });
    await page.pdf({
      path: outputPath,
      format: 'Letter',
      printBackground: false,
      margin: { top: '0.75in', right: '0.75in', bottom: '0.75in', left: '0.75in' },
    });
  } finally {
    await page.close();
  }
}

// Usage in test or Phase 4 CLI:
const browser = await puppeteer.launch({ headless: true });
try {
  await renderDesigned(data, designedPath, browser);
  await renderAts(data, atsPath, browser);
} finally {
  await browser.close();
}
```

**Why `browser` as parameter (not constructed inside):** Keeps render functions pure library functions; the caller controls lifecycle. Mirrors the `extractResume` pattern where the Anthropic client is constructed inside — but for Puppeteer, launching Chrome is significantly more expensive (~500ms) and should not happen twice. [ASSUMED — standard pattern, not an official doc reference.]

**Alternative (simpler for phase 3 tests):** Each render function creates and closes its own browser. Simpler but slower. Acceptable if Phase 3 never calls both functions in the same process (the ATS test only calls `renderAts`).

### Pattern 2: Google Fonts Loading in Puppeteer

**What:** `page.setContent()` with `waitUntil: 'networkidle0'` ensures the Google Fonts CSS and font binary both download before `page.pdf()` is called. `waitForFonts: true` (the `page.pdf()` default) additionally waits for `document.fonts.ready`, providing a second gate.

**Why `networkidle0` and not `load`:** A CSS `@import` initiates a secondary HTTP request (Google Fonts CSS) which then triggers a tertiary request (the actual font .ttf files from fonts.gstatic.com). The `load` event fires when the HTML document and its direct resources load — but CSS `@import` inside a `<style>` tag counts as a sub-resource that may race. `networkidle0` (zero open connections for 500ms) guarantees the font binary has arrived. [ASSUMED — derived from Puppeteer lifecycle documentation; confirmed by community best practice]

**Example:**
```html
<!-- In the designedHtmlTemplate() return value -->
<head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    /* ... rest of styles */
  </style>
</head>
```

**Verified:** `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap` returns 5 `@font-face` rules for weights 300–700, each pointing to a TrueType file on fonts.gstatic.com. [VERIFIED: fetched the URL directly, 2026-07-28]

**Inter weight selection:** For a resume, the minimum useful weights are:
- 400 — body text / contact info / bullet points
- 600 — section headers, role titles
- 700 — candidate name (bold emphasis)

Weights 300 and 500 are optional refinements. Loading all 5 (300–700) costs ~5 additional HTTP bytes in the URL but the font files themselves (~15KB each compressed) are cached by Chrome after the first render. For a personal CLI tool run locally, loading all 5 is acceptable. [ASSUMED]

### Pattern 3: Print-Media CSS for Clean PDF Output

**What:** `page.pdf()` automatically applies `print` CSS media type — no need to call `page.emulateMediaType('print')`. Background colors and images require both `printBackground: true` in `PDFOptions` AND `print-color-adjust: exact` in CSS.

**Key CSS rules for resume PDFs:** [CITED: developer.mozilla.org/en-US/docs/Web/CSS/page-break-inside, 2026-07-28]

```css
/* Force exact color rendering for accent color and backgrounds */
* {
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact; /* Chromium also accepts the prefixed form */
}

/* Prevent section headers from being stranded at page bottom */
.section-header {
  break-inside: avoid;
  break-after: avoid;  /* keep header with first bullet */
}

/* Prevent job entry blocks from splitting mid-entry if possible */
.experience-entry {
  break-inside: avoid;
}

/* Avoid orphaned single lines */
p, li {
  orphans: 3;
  widows: 3;
}
```

**Note:** `break-inside: avoid` is the modern standard; `page-break-inside: avoid` is deprecated but treated as an alias by Chromium. Use `break-inside` for new code. [CITED: developer.mozilla.org, 2026-07-28]

### Pattern 4: pdf-parse v2.x Text Extraction (ATS Test)

**What:** Accept a `Buffer` or `Uint8Array` of PDF bytes, extract text, assert resume fields appear in order.

```typescript
// Source: github.com/mehmet-kozan/pdf-parse README (verified 2026-07-28)
import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';  // ESM named export

const buffer = await readFile(atsOutputPath);
const parser = new PDFParse({ data: buffer });
const result = await parser.getText();
await parser.destroy();
const text = result.text;

// Assert fields appear in text
assert.ok(text.includes('Alex Rivera'), 'name must appear in ATS PDF text');
assert.ok(text.includes('alex@example.com'), 'email must appear');
```

**Import note:** `pdf-parse` 2.x has an ESM export. In an ESM project (`"type": "module"`), `import { PDFParse } from 'pdf-parse'` works. The `NodeNext` module resolution in this project requires the `.js` extension on relative imports but NOT on bare specifiers like `'pdf-parse'`. [ASSUMED — consistent with NodeNext ESM behavior]

**Linear order assertion strategy:** Rather than asserting exact positions, assert that the name appears before the email (index comparison), and that experience appears before education:
```typescript
const nameIdx = text.indexOf('Alex Rivera');
const emailIdx = text.indexOf('alex@example.com');
assert.ok(nameIdx < emailIdx, 'name must appear before email in ATS PDF');
```

### Pattern 5: HTML Template Safety (JSON Embedding)

**What:** Resume data (name, bullets, etc.) is embedded in the HTML template. Special characters in resume content (`<`, `>`, `&`, `"`, `'`) must be escaped to prevent HTML injection.

```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

**Why it matters:** A bullet point like "increased revenue >40%" would break the HTML template without escaping. This is not an XSS risk (no user interaction, no browser, no server), but it would corrupt the PDF output. [ASSUMED — fundamental HTML generation hygiene]

**Alternative:** Pass data via `page.evaluate()` after `setContent()`, injecting a global variable that JavaScript in the page reads to populate content. This avoids escaping entirely but adds complexity. Not recommended for this use case.

### Anti-Patterns to Avoid

- **Using `page.goto('data:text/html,...')`** for the designed PDF: `data:` URLs are treated as opaque origins and Chrome blocks cross-origin requests from them, including Google Fonts CDN requests. Use `page.setContent()` instead. [ASSUMED — known Puppeteer behavior for data: URLs and CORS]
- **Calling `page.pdf()` without waiting for fonts:** `waitForFonts: true` is the default but only waits for `document.fonts.ready`. If the font CSS itself hasn't loaded yet, `document.fonts.ready` resolves with no fonts and the PDF will use fallback fonts. Always use `waitUntil: 'networkidle0'` in `setContent()` for the designed renderer.
- **Setting `printBackground: false` for the designed PDF:** If the accent color is on a background element (e.g., a colored left border or subtle header background), it will not render. Use `printBackground: true` for the designed PDF. The ATS PDF should use `printBackground: false` to reinforce the no-color constraint.
- **Tables in the ATS HTML layout:** Locked out-of-scope in REQUIREMENTS.md. ATS parsers may read table cells in column order rather than row order, reordering resume content. Use `<div>` or `<ul>` structure for ATS.
- **Multi-column CSS layouts:** Locked out-of-scope in REQUIREMENTS.md. Use single-column block layout for both renderers.
- **Calling `browser.close()` inside the render function:** The render function receives a shared browser and must not close it. Only the caller closes the browser.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Canvas/SVG to PDF conversion | `puppeteer` `page.pdf()` | Handles pagination, print CSS, fonts, text encoding automatically |
| Text extraction from PDF | PDF binary parsing | `pdf-parse` `PDFParse.getText()` | PDF format is a complex binary format with compression and encoding tables |
| HTML escaping | Custom regex | The 5-line `escapeHtml()` function above | This specific case is simple enough to hand-roll correctly; importing a sanitization library (DOMPurify, etc.) would be overkill |
| Font loading wait | `setTimeout(2000)` | `page.setContent({ waitUntil: 'networkidle0' })` + `waitForNetworkIdle()` | Fixed sleeps are brittle; network idle is deterministic |

**Key insight:** The most error-prone areas in Puppeteer PDF generation are timing (font loading, network idle) and color rendering (`printBackground` + `print-color-adjust`). Both are solved by configuration, not custom code.

---

## Common Pitfalls

### Pitfall 1: Inter Font Falls Back to System Font

**What goes wrong:** The designed PDF renders with a generic sans-serif (Helvetica or Arial) instead of Inter.

**Why it happens:** `page.pdf()` was called before `document.fonts.ready` resolved, OR the Google Fonts CSS `@import` hadn't finished loading when `waitForFonts` ran (because `@import` is a sub-resource, not a direct document resource).

**How to avoid:**
1. Use `setContent(html, { waitUntil: 'networkidle0' })` — waits until no network connections for 500ms
2. Also call `await page.waitForNetworkIdle()` after setContent for belt-and-suspenders
3. Keep `waitForFonts: true` (default) in `page.pdf()` options

**Warning signs:** PDF looks correct structure but text appears in different weight/letterform than Inter (compare PDF with an Inter-rendered preview in browser).

### Pitfall 2: Accent Color Renders as Black or Disappears

**What goes wrong:** The designed PDF shows black text where the accent color should be, or the background element disappears.

**Why it happens:** Two separate issues that both need to be fixed:
1. `printBackground: false` (default) strips background colors/images
2. `print-color-adjust: economy` (browser default) allows Chrome to optimize colors for print

**How to avoid:**
- Set `printBackground: true` in `page.pdf()` options for designed PDF
- Add `* { print-color-adjust: exact; -webkit-print-color-adjust: exact; }` to the CSS

### Pitfall 3: Section Header Orphaned at Page Bottom

**What goes wrong:** A section heading (e.g., "Education") appears at the very bottom of a page with all content on the next page.

**Why it happens:** No page-break control CSS applied to heading elements.

**How to avoid:**
```css
h2 { break-after: avoid; }
.section { break-inside: avoid; }
```

**Warning signs:** Visible on manual inspection of the designed PDF when content spans more than one page. Check by using a fixture with enough experience entries to overflow page 1.

### Pitfall 4: pdf-parse Import Fails in ESM Project

**What goes wrong:** `import { PDFParse } from 'pdf-parse'` throws a "named export not found" error, or `import pdfParse from 'pdf-parse'` is undefined.

**Why it happens:** pdf-parse 2.x uses a named export `PDFParse` (class), not a default export. The `exports` map in the package resolves the ESM entry to `./dist/pdf-parse/esm/index.js`. In a `NodeNext` project, this should work with the named import.

**How to avoid:** Use `import { PDFParse } from 'pdf-parse'` (named import). If the TypeScript compiler complains, check that `skipLibCheck: true` is set in tsconfig.json (it is, per the existing tsconfig).

**Warning signs:** TypeScript error "Module 'pdf-parse' has no exported member 'PDFParse'" — this would indicate the types don't match; verify `@types/pdf-parse` is not needed (it likely ships its own types).

### Pitfall 5: `data:` URL Blocks Google Fonts

**What goes wrong:** Google Fonts doesn't load when HTML content is set via `page.goto('data:text/html,...')`.

**Why it happens:** Chrome treats `data:` URIs as opaque origins. Network requests from opaque origins to external domains are blocked by CORS policy.

**How to avoid:** Use `page.setContent(htmlString, { waitUntil: 'networkidle0' })` instead of `page.goto('data:...')`. `setContent()` uses the `about:blank` page origin which is allowed to make external requests.

### Pitfall 6: Test Framework Mismatch

**What goes wrong:** A new test file imports from `'vitest'` and the test runner can't find it.

**Why it happens:** CONTEXT.md mentions "Vitest" for D-T01, but the project uses the Node.js built-in `node:test` runner throughout (all 4 existing test files). Vitest is not installed, and no `vitest.config.*` file exists.

**How to avoid:** Write `render.test.ts` following the exact pattern of `src/lib/extract.test.ts` and `src/lib/preflight.test.ts`:
```typescript
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
```
Run with: `npx tsx --test src/lib/render.test.ts`

**NOTE FOR PLANNER:** The CONTEXT.md D-T01 decision says "Vitest test" but this contradicts the established codebase convention. Recommend using `node:test` to stay consistent. If the user wants to switch to Vitest, that is a separate decision requiring a new install. Flag this conflict for human decision before plan execution.

---

## Code Examples

### Verified: `page.pdf()` PDFOptions Reference

```typescript
// Source: pptr.dev/api/puppeteer.pdfoptions (verified 2026-07-28)
await page.pdf({
  path: outputPath,          // string: file path to write; relative resolves from cwd
  format: 'Letter',          // PaperFormat default: 'letter'; overrides width/height
  printBackground: true,     // boolean default: false; must be true for accent colors
  margin: {                  // PDFMargin: default undefined (no margins)
    top: '0.75in',
    right: '0.75in',
    bottom: '0.75in',
    left: '0.75in',
  },
  waitForFonts: true,        // boolean default: true; waits for document.fonts.ready
  landscape: false,          // boolean default: false
  tagged: true,              // boolean default: true (accessibility tags — keep for portfolio)
});
```

### Verified: Browser Launch for CLI

```typescript
// Source: pptr.dev/api/puppeteer.launchoptions (verified 2026-07-28)
// headless: true = new headless mode (Chromium without UI)
// headless: 'shell' = old headless (faster but fewer features)
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
// ... render calls ...
await browser.close();
```

### Verified: setContent with Network Idle Wait

```typescript
// Source: pptr.dev/api/puppeteer.puppeteerlifecycleevent + waitForNetworkIdle (2026-07-28)
// networkidle0 = no network connections for 500ms
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.waitForNetworkIdle();  // explicit second gate for font CDN
```

### Verified: Google Fonts URL for Inter 300–700

```typescript
// Confirmed by direct HTTP fetch of the URL (2026-07-28)
// Returns 5 @font-face rules for Inter weights 300, 400, 500, 600, 700
const INTER_FONT_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';

// In the HTML template:
const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('${INTER_FONT_URL}');
    * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    body { font-family: 'Inter', sans-serif; margin: 0; }
    /* ... resume styles ... */
  </style>
</head>
<body>
  <!-- resume content -->
</body>
</html>`;
```

### Verified: pdf-parse v2.x Basic Usage

```typescript
// Source: github.com/mehmet-kozan/pdf-parse README (verified 2026-07-28)
import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';

const buffer = await readFile(outputPath);
const parser = new PDFParse({ data: buffer });
const result = await parser.getText();
await parser.destroy();
const text: string = result.text;
```

### Verified: ATS Test Structure (node:test pattern)

```typescript
// Mirrors src/lib/extract.test.ts and src/lib/preflight.test.ts conventions
// Run with: npx tsx --test src/lib/render.test.ts
import assert from 'node:assert/strict';
import { readFile, unlink, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, before, after } from 'node:test';
import puppeteer from 'puppeteer';
import { PDFParse } from 'pdf-parse';
import type { Browser } from 'puppeteer';
import { renderAts } from './render.js';
import fixtureData from '../../fixtures/sample-resume.json' assert { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('renderAts ATS text extraction', () => {
  let browser: Browser;
  let tmpDir: string;
  let atsOutputPath: string;

  before(async () => {
    browser = await puppeteer.launch({ headless: true });
    tmpDir = await mkdtemp(join(tmpdir(), 'cvgen-test-'));
    atsOutputPath = join(tmpDir, 'test-resume-ats.pdf');
    await renderAts(fixtureData, atsOutputPath, browser);
  });

  after(async () => {
    await browser.close();
  });

  it('ATS PDF contains candidate name', async () => {
    const buffer = await readFile(atsOutputPath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    assert.ok(result.text.includes('Alex Rivera'), 'name must appear in ATS PDF');
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `headless: 'new'` string | `headless: true` boolean | Puppeteer 22+ | `true` now launches new headless (not shell); `'new'` string is a historical artifact from the transition period |
| `page-break-inside: avoid` | `break-inside: avoid` | CSS Fragmentation Level 3 | Old property is a deprecated alias; both work in Chromium for now |
| `waitUntil: 'networkidle2'` for fonts | `waitUntil: 'networkidle0'` | — | 2 connections still counts Google Fonts CDN; 0 guarantees completion |

**Deprecated/outdated:**
- `page.goto('data:text/html,...')`: Works for simple HTML but blocks external resources like Google Fonts CDN due to opaque origin. Use `page.setContent()` instead.
- `-webkit-print-color-adjust`: Still accepted by Chromium but the standard property is `print-color-adjust`. Include both for maximum compatibility.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `data: URL` blocks Google Fonts CDN due to opaque origin | Architecture Patterns, Pitfall 5 | If wrong, `page.goto('data:...')` would work for fonts — but `setContent()` is still safer and has no downside |
| A2 | `browser` should be passed as a parameter (not constructed inside render functions) | Pattern 1 | If wrong (each render creates its own browser), two Chrome processes launch — wasteful but not broken |
| A3 | Inter weights 300 and 500 are optional for a resume template | Standard Stack | If wrong, some typographic refinements are missing — easily fixed by adding weights to the URL |
| A4 | `pdf-parse` 2.x named import `{ PDFParse }` works in this project's NodeNext ESM config | Code Examples | If wrong, need to adjust import or check the package's exports map more carefully |
| A5 | `escapeHtml()` must be hand-rolled (no import needed) | Pattern 5 | If wrong, an edge case in escaping could corrupt HTML — extremely unlikely for the 5 characters covered |
| A6 | CONTEXT.md "Vitest" in D-T01 is an error; `node:test` should be used | Common Pitfalls (Pitfall 6) | If wrong (user actually wants Vitest), Vitest must be installed first — this is a human decision |

---

## Open Questions

1. **Vitest vs node:test for the ATS extraction test**
   - What we know: All 4 existing tests use `node:test`; CONTEXT.md D-T01 says "Vitest test"; Vitest is not installed
   - What's unclear: Whether the user actively wants to introduce Vitest in Phase 3 or this was a loose reference
   - Recommendation: **Flag for human decision before plan execution.** Default plan should use `node:test`. Add an optional Wave 0 task to install Vitest if the user confirms that choice.

2. **Browser passed in vs constructed inside render functions**
   - What we know: Phase 3 tests only call `renderAts` (one call); Phase 4 will call both functions
   - What's unclear: Whether Phase 3 plans should optimize for the Phase 4 usage pattern now
   - Recommendation: Accept `browser: Browser` as a third parameter. Phase 3 test creates the browser in `before()`. Phase 4 creates once and passes to both. This keeps the function signature stable from Phase 3 onward.

3. **Paper format: Letter vs A4**
   - What we know: PDFOptions `format` defaults to `'letter'`; the user is in the US (San Francisco fixture)
   - What's unclear: Whether the user wants A4 international compatibility
   - Recommendation: Use `'Letter'` (US standard). CONTEXT.md does not specify — this is Claude's discretion.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime floor | ✓ | v26.4.0 (exceeds >=22.12.0) | — |
| npm | Package install | ✓ | 11.17.0 | — |
| `puppeteer` | renderDesigned, renderAts | ✗ (not yet installed) | — | Install: `npm install puppeteer@25.4.0` |
| `pdf-parse` | ATS test | ✗ (not yet installed) | — | Install: `npm install --save-dev pdf-parse@2.4.5` |
| Google Fonts CDN | Inter loading at render time | ✓ (network access confirmed) | — | Self-host Inter woff2 files (deferred) |
| Chromium | Downloaded by puppeteer postinstall | ✗ (puppeteer not installed) | Chrome 151 (bundled) | Installs automatically via puppeteer postinstall |

**Missing dependencies with no fallback:**
- `puppeteer` — blocking. Must be installed before any render function can run.
- `pdf-parse` — blocking for the ATS test. Must be installed before `render.test.ts` can run.

**Missing dependencies with fallback:**
- Google Fonts CDN — if offline, Inter will not load. Fallback is system sans-serif in the PDF. This is a development-environment concern, not a production concern. No action needed for Phase 3.

---

## Project Constraints (from CLAUDE.md)

These directives MUST be honored by the planner:

| Directive | Source | Impact on Phase 3 |
|-----------|--------|-------------------|
| No images in either PDF output | CLAUDE.md Constraints | HTML templates must not include `<img>` tags |
| No multi-column layouts | CLAUDE.md Constraints | Use single `<div>` column flow; no CSS Grid columns or Flex rows that create side-by-side content |
| Claude API key from env var only | CLAUDE.md Constraints | render.ts has no Claude API calls; not applicable |
| Use `puppeteer` (full), not `puppeteer-core` | CLAUDE.md What NOT to Use | Locked — full package with bundled Chromium |
| ESM only (`"type": "module"`) | CLAUDE.md + package.json | All imports use `.js` extensions in TypeScript source; no CJS patterns |
| No Next.js / web framework | CLAUDE.md Constraints | render.ts is a plain library module; no framework wiring |
| Use `tsx` for dev execution | CLAUDE.md Stack | Run render.test.ts with `npx tsx --test src/lib/render.test.ts` |
| TypeScript 6.0.3, not 7.x | CLAUDE.md Stack | Existing tsconfig.json is set up for TS6; no changes needed |
| `node:` prefix on built-in imports | CLAUDE.md / existing patterns | All Node built-in imports (fs, path, os) must use `node:` prefix |
| Import type keyword for type-only imports | tsconfig verbatimModuleSyntax | `import type { ResumeData }` in render.ts |

---

## Sources

### Primary (HIGH confidence)
- [pptr.dev/api/puppeteer.pdfoptions](https://pptr.dev/api/puppeteer.pdfoptions) — all PDFOptions properties, types, defaults (verified 2026-07-28)
- [pptr.dev/api/puppeteer.page.pdf](https://pptr.dev/api/puppeteer.page.pdf) — page.pdf() signature, remarks on print media type and color adjustment
- [pptr.dev/api/puppeteer.browser](https://pptr.dev/api/puppeteer.browser) — Browser class lifecycle, newPage(), close()
- [pptr.dev/api/puppeteer.launchoptions](https://pptr.dev/api/puppeteer.launchoptions) — headless: true/shell options
- [pptr.dev/api/puppeteer.waitfornetworkidleoptions](https://pptr.dev/api/puppeteer.waitfornetworkidleoptions) — idleTime default 500ms
- [pptr.dev/api/puppeteer.puppeteerlifecycleevent](https://pptr.dev/api/puppeteer.puppeteerlifecycleevent) — networkidle0 vs networkidle2 definitions
- [developer.mozilla.org/en-US/docs/Web/CSS/page-break-inside](https://developer.mozilla.org/en-US/docs/Web/CSS/page-break-inside) — break-inside CSS property
- [developer.mozilla.org/en-US/docs/Web/CSS/-webkit-print-color-adjust](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-print-color-adjust) — print-color-adjust: exact
- [fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap](https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap) — confirmed URL returns 5 Inter font-face rules (fetched 2026-07-28)
- [github.com/puppeteer/puppeteer/releases/tag/puppeteer-v25.4.0](https://github.com/puppeteer/puppeteer/releases/tag/puppeteer-v25.4.0) — Chromium 151.0.7922.47 bundled in 25.4.0
- [api.npmjs.org/downloads/point/last-week/puppeteer](https://api.npmjs.org/downloads/point/last-week/puppeteer) — 11.4M weekly downloads (2026-07-24 week)
- [api.npmjs.org/downloads/point/last-week/pdf-parse](https://api.npmjs.org/downloads/point/last-week/pdf-parse) — 6.7M weekly downloads (2026-07-24 week)

### Secondary (MEDIUM confidence)
- [github.com/mehmet-kozan/pdf-parse README](https://github.com/mehmet-kozan/pdf-parse/blob/main/README.md) — pdf-parse v2.x API: `PDFParse` class, `{ data: buffer }` constructor, `getText()` returning `{ text }`, `destroy()` method
- [pptr.dev/guides/pdf-generation](https://pptr.dev/guides/pdf-generation) — basic PDF generation example, `waitForFonts: true` default behavior confirmation

### Tertiary (LOW — [ASSUMED] in findings)
- `data:` URL blocking external resources (CORS / opaque origin behavior) — standard browser behavior, not Puppeteer-specific documentation; marked [ASSUMED]
- Browser-as-parameter pattern — [ASSUMED] standard best practice
- Test framework conflict (node:test vs Vitest) — [ASSUMED] based on codebase inspection; the "correct" choice requires human confirmation

---

## Metadata

**Confidence breakdown:**
- Standard stack (Puppeteer, pdf-parse versions): HIGH — verified via npm registry and official release notes
- Puppeteer PDF API (`page.pdf()` options, defaults): HIGH — verified via pptr.dev official docs
- Font loading pattern (setContent + networkidle0): MEDIUM — lifecycle events verified via official docs; the specific combination for Google Fonts @import is [ASSUMED] community pattern
- Print CSS (break-inside, print-color-adjust): HIGH — verified via MDN official docs
- pdf-parse v2.x API (PDFParse class, getText, destroy): MEDIUM — verified via GitHub README (not official docs site)
- Test framework (node:test vs Vitest): HIGH (codebase inspection) — the conflict with CONTEXT.md is a HIGH-confidence finding that needs human resolution

**Research date:** 2026-07-28
**Valid until:** 2026-08-28 (Puppeteer releases frequently; verify `puppeteer@25.4.0` is still the pinned version before install)
