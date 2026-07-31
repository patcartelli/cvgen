---
quick_id: 260731-h3z
slug: add-date-to-pdf-filename-and-make-email-
status: complete
date: 2026-07-31
commit: 66fcadd
---

# Quick Task 260731-h3z: Date in filename + clickable links

## What was done

**Date in filename:** `resolveOutputPaths()` now accepts an optional `date` (YYYY-MM-DD) appended after company slug. CLI passes `new Date().toISOString().split("T")[0]` at render time.
- Example: `pat_cartelli-resume-EZCater-2026-07-31.pdf`

**Clickable links in designed PDF:** Added `contactLink()` helper in `render.ts`. Email uses `mailto:`, LinkedIn/GitHub use `https://` (prepended if no scheme present). Visually unchanged (`color:inherit; text-decoration:none`) but clickable in PDF readers.

**ATS template:** unchanged — plain text only.

## Files changed

- `src/lib/render.ts` — added `contactLink()`, updated `resolveOutputPaths()` signature
- `src/cli/index.ts` — passes `today` date to `resolveOutputPaths()`
- `src/lib/render.test.ts` — added 2 new tests for date (21/21 pass)
