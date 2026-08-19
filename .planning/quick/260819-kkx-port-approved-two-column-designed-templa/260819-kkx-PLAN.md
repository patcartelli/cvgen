---
quick_id: 260819-kkx
date: 2026-08-19
description: Port approved two-column designed template into render.ts and extend schema
mode: quick
status: planned
source: handoff/2026-08-19-two-column/HANDOFF.md (steps 1-2 only)
---

# Quick Task 260819-kkx — Two-column designed template port

Implements steps 1 and 2 of the 2026-08-19 designed-template handoff. Steps 3-5
(master markdown edits, live extraction iteration, full run) are explicitly out
of scope for this task.

## Context

The design was approved over ~15 review rounds and handed off as working JS at
`handoff/2026-08-19-two-column/template-two-col.js`. The CSS in that file is the
spec. `master-clean-fixture.json` is the acceptance fixture; it must validate and
render to exactly 2 pages.

Quick task 260819-i5h (commit 374cb4a) already landed `engagements[]`,
`selectedWork`, and en-dash date ranges. Build on it, do not redo it.

## Task 1 — Schema extension and engagement key rename

**Files:** `src/schema/resume.ts`, `src/lib/render.ts` (ATS ref only),
`src/schema/validate.test.ts`, `src/lib/extract.test.ts`, `src/lib/render.test.ts`

**Action:**
- `ContactSchema`: add `headline?: string`.
- `ExperienceSchema`: add `industry?`, `via?`, `location?` (all optional strings,
  each with self-describing `.describe()` text — `extract.ts` carries no prompt
  guidance, so field names and descriptions are the only signal the extraction
  API receives).
- `EngagementSchema`: rename `client` → `company`; add the same `industry`,
  `via`, `location` fields so EngagementSchema === ExperienceSchema minus
  `engagements` (one nesting level only). Preserve the existing
  anti-double-dipping `.describe()` guidance verbatim in intent when renaming.
- Update the one `eng.client` reference in the ATS template (`render.ts:574`) to
  `eng.company`. This is a mechanical rename, not an ATS behavior change.
- Update `nestedResume` in `render.test.ts` and any `client:` usages in
  `validate.test.ts` / `extract.test.ts`.

**Verify:** `master-clean-fixture.json` parses clean through `ResumeSchema`.

**Done:** Fixture validates as-is with zero edits to the fixture.

## Task 2 — Port the two-column template

**Files:** `src/lib/render.ts`

**Action:**
- Replace `designedHtmlTemplate` (render.ts:102-711) with the two-column layout
  from `template-two-col.js`. Leave `atsHtmlTemplate` alone.
- Reuse the existing `escapeHtml`, `contactLink`, `dateRange`, and
  `urlWithPassword` helpers rather than duplicating the prototype's copies.
- Drop the prototype's `INDUSTRY_ON_COMPANY_LINE` switch; hardcode the approved
  placement (industry beside the company name).
- Parameterize the small size as `opts.small`, default 10.
- Change designed-PDF margins 0.6in -> 0.75in in `renderDesigned`. ATS keeps 0.6in.

**Locked values, do not drift:**
- Inter only, weights 400/500.
- Three sizes: 20px name, 14px section headers (400) / company names (500),
  one small size (default 10px) for everything else.
- line-height always 1.5x font size (20/30, 14/21, 10/15).
- Two greys: `#232323` text, `#555555` secondary (`--muted`/`--faint` collapse).
- One accent `#FEAC03`, used once, on the header rule. Bullet dots are
  text-colored, never accented.
- `--measure: 392px`, `--rail: 232px`, `--gutter: 48px` (= 672px content box).
- Rail is a right float, whitespace only, no border. Order: Core Competencies,
  Skills, Education.
- Rhythm: 20px between entries, 16px nested, 2px meta-to-first-bullet, 3px
  between bullets.
- NO `break-inside: avoid` on entries — split entries are deliberate and accepted.
- `type`: full-time renders nothing; contract renders plain "Contract", no parens.

**Verify:** Designed PDF renders without error; visual diff against
`approved-render.pdf`.

**Done:** Designed output matches the approved render.

## Task 3 — Fixture render test and verification gates

**Files:** `src/lib/render.test.ts`

**Action:**
- Add a render test that loads `master-clean-fixture.json`, validates it through
  `ResumeSchema`, renders the designed PDF, and asserts the page count is
  exactly 2.
- Update the existing "nests the client..." designed-PDF assertion: the old
  template comma-joined company and role via `companyRoleHeading`; the new
  template puts company on its own line with the role in the meta line. The ATS
  assertions keep the comma form since that template is unchanged.

**Verify:**
- Fixture renders to EXACTLY 2 pages (hard rule).
- `pdftotext <pdf> - | grep -c '—'` returns 0; en dashes in date ranges survive.
- Full existing test suite passes.

**Done:** All three gates green, evidence captured.

## Out of scope / deliberately not done

- Obsidian master markdown edits (handoff step 3).
- Live Claude API extraction runs and `.describe()` iteration (steps 4-5).
- ATS template `(full-time)` divergence: the ATS template renders
  `(${exp.type})` at render.ts:553, so it still prints "(full-time)" while the
  designed template will print nothing. Flagged for the user; NOT changed here,
  because the handoff says leave the ATS template alone.
- Page 2 opening with "Parental Leave" — accepted quirk, hold per handoff.
- The 52 pre-existing uncommitted `.planning/` deletions — untouched, and
  excluded from every commit in this task.
