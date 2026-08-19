---
quick_id: 260819-i5h
slug: schema-template-nested-engagements-under
status: complete
date: 2026-08-19
commit: 8a0ae62
---

# Quick Task 260819-i5h: Nested engagements, selected work, punctuation

Fresh extract of the 2026-08-19 master no longer lists Bluefish and the stealth/architecture work as sibling 2026 jobs. Both sit under Studio Cartelli. The header portfolio link survives. Designed and ATS PDFs are two pages without trimming Signafire or Wellhub.

## What was done

- `ExperienceSchema.engagements[]` with a self-describing `EngagementSchema` (`client`, `role`, `startDate`, `endDate?`, `bullets[]`). Schema `.describe()` is the extract signal; `extract.ts` stays a thin wrapper.
- Top-level `selectedWork: { url, password? }` rendered in both PDF headers.
- Designed company/role join is a comma. Date ranges use an en dash. ATS dates no longer use `&mdash;`.
- `max_tokens` raised to 4096. System prompt forbids inventing bullets, titles, or employment types.
- Spacing tightened (section gaps, skill-column width, 0.6in page margins) so the designed file fits two pages. No master copy was cut.

## Left unchanged (Patrick deferred)

- `ExperienceSchema.type` still exists and still prints. This extract assigned `contract` to Studio Cartelli, so the designed PDF still shows `(contract)` on that line.

## Verified against the master (2026-08-19)

- Studio Cartelli parent, Bluefish + Stealth nested, Parental Leave present, Norton bullets empty (no invented claim).
- `selectedWork.url = studiocartelli.com/work` with password.
- Designed `output/Master/patrick_cartelli-resume-Master-2026-08-19.pdf`: 2 pages, no em dashes.
- ATS companion: 2 pages, no em dashes.
- 38 tests passing.

## Files changed

- `src/schema/resume.ts`
- `src/lib/render.ts`
- `src/lib/extract.ts`
- `src/schema/validate.test.ts`
- `src/lib/render.test.ts`
- `src/lib/extract.test.ts`
