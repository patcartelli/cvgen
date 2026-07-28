---
phase: 03-designed-ats-pdf-rendering
plan: "01"
subsystem: rendering
tags: [puppeteer, pdf, render, ats, designed, html-template]
dependency_graph:
  requires: [src/schema/resume.ts, fixtures/sample-resume.json]
  provides: [src/lib/render.ts, scripts/smoke-render.ts]
  affects: [Phase 4 CLI wiring]
tech_stack:
  added: [puppeteer@25.4.0, pdf-parse@2.4.5]
  patterns: [shared-browser-lifecycle, html-template-literal, escapeHtml-injection-guard, print-color-adjust-exact]
key_files:
  created:
    - src/lib/render.ts
    - scripts/smoke-render.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - "Used waitUntil: 'load' + waitForNetworkIdle() instead of waitUntil: 'networkidle0' — Puppeteer 25.x SetContentWaitForOptions excludes networkidle events; behavior is equivalent"
  - "Accent color #2d4a6b (dark slate blue) applied to candidate name and section headers per D-D03"
  - "Core competencies rendered as inline chip spans (designed) and pipe-separated text (ATS) for clear visual distinction"
metrics:
  duration: "5 minutes"
  completed_date: "2026-07-28"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 2
---

# Phase 3 Plan 1: Rendering Library (renderDesigned + renderAts + smoke driver) Summary

**One-liner:** Puppeteer 25.4.0 render library with Inter/designed and Arial/ATS templates, HTML-escaped interpolation, and a smoke driver confirming 172KB designed + 82KB ATS PDFs from the fixture.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install puppeteer 25.4.0 and pdf-parse 2.4.5 | 4cf604b | package.json, package-lock.json |
| 2 | Create src/lib/render.ts | de77c91 | src/lib/render.ts (557 lines) |
| 3 | Smoke driver — render both PDFs from fixture | 6db3f2c | scripts/smoke-render.ts |

## What Was Built

### src/lib/render.ts (557 lines)

Three public exports:

- `renderDesigned(data, outputPath, browser)` — designed single-column typographic PDF: Inter font via Google Fonts `@import`, muted accent color `#2d4a6b` on candidate name and section headers, chip-style core competencies, `printBackground: true`, `print-color-adjust: exact`
- `renderAts(data, outputPath, browser)` — ATS-clean PDF: Arial/Helvetica system font, black-only, no tables, no images, no color, pipe-separated layout, bold headers, `printBackground: false`
- `resolveOutputPaths(inputMdPath)` — pure helper returning `{ designed, ats }` paths per D-O01/D-O02

Internal helpers:
- `escapeHtml()` — 5-replacement HTML escaping (& first) applied to all `ResumeData` string fields before interpolation (T-03-01 mitigation)
- `designedHtmlTemplate()` / `atsHtmlTemplate()` — template literal functions co-located with render logic

Both renderers accept a shared `Browser` instance and close only their own `Page` in a `finally` block — never `browser.close()`.

### scripts/smoke-render.ts (52 lines)

Smoke driver that:
1. Loads `fixtures/sample-resume.json`
2. Creates a `cvgen-smoke-*` temp directory
3. Launches Puppeteer with a single shared Browser
4. Calls `renderDesigned` then `renderAts`
5. Asserts both PDFs are >1000 bytes
6. Prints absolute paths and exits 0

Output confirmed: designed PDF 172283 bytes, ATS PDF 81582 bytes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Puppeteer 25.x SetContentWaitForOptions excludes networkidle0**

- **Found during:** Task 2 — TypeScript compilation of render.ts
- **Issue:** Plan specified `page.setContent(html, { waitUntil: "networkidle0" })` but `SetContentWaitForOptions.waitUntil` in Puppeteer 25.4.0 is typed as `Exclude<PuppeteerLifeCycleEvent, 'networkidle0' | 'networkidle2'>` — `networkidle0` is explicitly excluded from this option type
- **Fix:** Used `waitUntil: "load"` in `setContent()` + explicit `await page.waitForNetworkIdle()` afterward. This is functionally equivalent per RESEARCH.md Pattern 1 description ("belt-and-suspenders for font CDN") and is the documented approach for the designed renderer
- **Files modified:** src/lib/render.ts
- **Commit:** de77c91

## Known Stubs

None — all data from `ResumeData` is fully rendered in both templates. No hardcoded empty values, no placeholder text. Both PDFs verified end-to-end with real fixture data.

## Threat Surface Scan

No new security-relevant surface beyond the plan's `<threat_model>`. All threats addressed:

| Threat | Mitigation Status |
|--------|-------------------|
| T-03-01 (HTML injection via ResumeData strings) | Mitigated — `escapeHtml()` applied to all 30+ string interpolation points |
| T-03-02 (Google Fonts CDN disclosure) | Accepted — Inter loaded at render time per D-D02 |
| T-03-03 (Puppeteer/Chromium missing) | Mitigated — full `puppeteer` package with approved postinstall; smoke test confirms Chromium launches |
| T-03-SC (npm install trust) | Accepted — both packages gate-approved per RESEARCH.md legitimacy audit |

## Self-Check: PASSED

- [x] src/lib/render.ts exists (557 lines, well above 200 minimum)
- [x] scripts/smoke-render.ts exists
- [x] Commit 4cf604b exists (Task 1: install)
- [x] Commit de77c91 exists (Task 2: render.ts)
- [x] Commit 6db3f2c exists (Task 3: smoke-render.ts)
- [x] `npx tsc --noEmit` exits 0
- [x] `npx tsc --noEmit -p tsconfig.scripts.json` exits 0
- [x] `npm ls puppeteer` → 25.4.0
- [x] `npm ls pdf-parse` → 2.4.5
- [x] `npm run smoke-render` exits 0, produces two PDFs (172283 bytes designed, 81582 bytes ATS)
- [x] No `<table`, `<img`, `column-count`, `display: grid`, or `browser.close()` in render.ts
