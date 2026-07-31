---
quick_id: 260731-gui
slug: add-candidate-name-to-pdf-filename-name-
status: complete
date: 2026-07-31
commit: 6971669
---

# Quick Task 260731-gui: Candidate name in PDF filename

## What was done

PDF output filenames now include the candidate's name (from `contact.name`) and the company slug:

- **With company:** `pat_cartelli-resume-EZCater.pdf` / `pat_cartelli-resume-EZCater-ats.pdf`
- **No company:** `pat_cartelli-resume.pdf` / `pat_cartelli-resume-ats.pdf`

## Changes

- `src/lib/render.ts` — added `toNameSlug()` helper; updated `resolveOutputPaths()` signature from `(inputMdPath, outputDir)` to `(candidateName, outputDir, companySlug?)`
- `src/cli/index.ts` — added `companySlug` variable, passed `data.contact.name` and `companySlug` to `resolveOutputPaths()`
- `src/lib/render.test.ts` — updated 3 existing tests + added 4 `toNameSlug` tests (19/19 pass)

## Outcome

All 19 tests pass. Type-check clean.
