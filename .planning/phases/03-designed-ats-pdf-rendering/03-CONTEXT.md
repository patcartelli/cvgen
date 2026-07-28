# Phase 3: Designed & ATS PDF Rendering - Context

**Gathered:** 2026-07-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Render validated `ResumeData` JSON into two structurally distinct, single-column PDFs: a portfolio-quality typographic "designed" PDF and a machine-readable, clearly different "ATS-clean" PDF. Both renderers are built and tested against `fixtures/sample-resume.json` directly — this phase does NOT depend on Phase 2 being complete. No CLI wiring, no Commander integration — that is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Designed PDF Visual Style
- **D-D01:** Aesthetic direction is **minimal / modern** — clean whitespace, geometric sans-serif, one subtle accent color. Reads like a well-designed portfolio site.
- **D-D02:** Font is **Inter**, loaded via **Google Fonts `@import`** in the HTML template's `<head>`. Puppeteer fetches it at render time (network access required).
- **D-D03:** One **subtle accent color** — Claude picks a tasteful muted color (e.g., dark slate blue, charcoal teal, forest green). Applied to the candidate name and/or section headers only.

### ATS-clean PDF Character
- **D-A01:** Austerity level is **clean but structured** — black only, bold section headers, generous line spacing. No decorative elements, no color. ATS parsers handle bold and spacing without issue.
- **D-A02:** Font is **Arial** — the most widely recognized ATS-safe system font. Specified as `Arial, Helvetica, sans-serif`.
- **D-A03:** The ATS PDF must be **clearly visually distinct** from the designed PDF at a glance. Opening both files, you can immediately tell which is which (different font family, no accent, plainer layout).

### Output File Naming & Placement
- **D-O01:** PDFs land in the **same directory as the input `.md` file** — natural for an Obsidian workflow where output stays with source.
- **D-O02:** Slug is derived from the **input filename stem** — `my-resume.md` → `my-resume-resume.pdf` / `my-resume-resume-ats.pdf`. No dependency on extracted content.

### Test Strategy
- **D-T01:** ATS text-extraction correctness (success criterion #3) is verified via an **automated Vitest test using `pdf-parse`** (dev dependency). The test renders the ATS PDF from the fixture, extracts text with pdf-parse, and asserts all expected resume content appears in correct linear reading order.
- **D-T02:** Designed PDF visual correctness is verified **manually** — open the file and inspect it. No automated appearance test in Phase 3.

### Claude's Discretion
- Specific accent color hex for the designed PDF (tasteful, muted — e.g., `#2d4a6b`, `#1a4a3a`)
- Page margins, line heights, section spacing for both PDFs
- HTML template structure (template literal function vs. separate .html file — template literal preferred for co-location with render logic)
- Puppeteer launch options and PDF print settings (paper format, `printBackground`, margins)
- Module file structure — `src/lib/render.ts` exporting `renderDesigned(data, outputPath)` and `renderAts(data, outputPath)` mirrors the `extract.ts` pattern, but exact signatures at Claude's discretion

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements & Goals
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria (4 criteria), dependency note (depends on Phase 1 schema only; Phase 2 not required)
- `.planning/REQUIREMENTS.md` — RENDER-01, RENDER-02, RENDER-03 are the requirements this phase covers
- `.planning/PROJECT.md` — constraints (no images, no multi-column, no web framework, single-column only in both outputs)

### Technology Stack
- `CLAUDE.md` — **primary stack reference**: pinned versions (TypeScript 6.0.3, Puppeteer 25.4.0, tsx 4.23.1), Puppeteer PDF rendering pattern (`page.pdf()`, `printBackground`, print-media CSS), env var pattern

### Data Contract (what the renderer consumes)
- `src/schema/resume.ts` — `ResumeSchema` (Zod) and `ResumeData` type (TypeScript). The renderer receives `ResumeData` — do not modify the schema in Phase 3.
- `fixtures/sample-resume.json` — the fixture this phase builds and tests against; the designed and ATS renderers must both produce correct output for this data

### Prior Phase Context
- `.planning/phases/01-scaffold-schema-secret-hygiene/01-CONTEXT.md` — D-01..D-14 define the resume data convention (frontmatter fields, section headings, schema shape). Understand what data the renderer receives.
- `.planning/phases/02-markdown-to-structured-json-extraction/02-CONTEXT.md` — D-M01 defines the `extractResume()` module pattern; `src/lib/render.ts` should mirror this pattern so Phase 4 can import it consistently.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/schema/resume.ts` — exports `ResumeSchema` and `ResumeData`. Import `ResumeData` as the render function's input type.
- `fixtures/sample-resume.json` — the happy-path input for renderer development and the Vitest ATS extraction test.
- `src/lib/extract.ts` — module pattern to mirror: named async function export, clear error handling. Phase 4 will import the render functions the same way it imports `extractResume`.

### Established Patterns
- ESM-only (`"type": "module"` in package.json) — all imports use `.js` extensions in TypeScript source.
- No Commander yet — render functions are plain library functions callable from any entry point. Phase 4 wires them into the CLI.
- Vitest for tests — existing test files use `.test.ts` naming convention (see `src/lib/extract.test.ts`, `src/lib/preflight.test.ts`).
- `pdf-parse` is a new dev dependency Phase 3 introduces for ATS text extraction testing.

### Integration Points
- `src/lib/render.ts` (new file) — Phase 4 imports `renderDesigned` and `renderAts` from here. Export signatures must remain stable from Phase 3 onward.
- `src/cli/index.ts` — Phase 4 replaces this stub to call both render functions after extraction. Phase 3 does NOT touch this file.

</code_context>

<specifics>
## Specific Ideas

- Output filenames follow the pattern `<stem>-resume.pdf` and `<stem>-resume-ats.pdf` where `<stem>` is the input filename without its `.md` extension (per RENDER-03's non-destructive naming requirement).
- Inter loaded via `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap')` in the HTML template head.
- pdf-parse (dev dependency) runs in the Vitest ATS extraction test — reads the rendered ATS PDF bytes and asserts resume content appears in linear reading order.
- The ATS PDF should have NO tables in its HTML layout (confirmed out-of-scope per REQUIREMENTS.md — ATS parsers can read table cells out of order).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Designed & ATS PDF Rendering*
*Context gathered: 2026-07-28*
