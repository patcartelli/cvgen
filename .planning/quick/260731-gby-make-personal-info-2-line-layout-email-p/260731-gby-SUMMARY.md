---
quick_id: 260731-gby
slug: make-personal-info-2-line-layout-email-p
status: complete
date: 2026-07-31
commit: 92e1414
---

# Quick Task 260731-gby: 2-line designed PDF contact header

## What was done

Split the designed PDF contact header from a single line into two rows:
- **Row 1:** email · phone · location
- **Row 2:** LinkedIn · GitHub

Changed `src/lib/render.ts` line 319–325 — replaced the single `.contact-details` div (all 5 fields joined on one line) with an IIFE that builds two `.contact-details-row` child divs. Each row only renders if it has at least one field (empty row is filtered out).

## Outcome

- LinkedIn URL no longer line-breaks on narrower render widths
- ATS template unchanged
- All 15 existing tests pass (exit 0)

## Files changed

- `src/lib/render.ts` — 7 insertions, 1 deletion
