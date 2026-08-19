---
quick_id: 260819-kkx
date: 2026-08-19
status: complete
commit: 8778fb7
scope: handoff steps 1-2 only
---

# Summary — 260819-kkx

Ported the two-column designed template approved on 2026-08-19 into `render.ts`
and extended the schema to feed it. Steps 3-5 of the handoff (master markdown,
extraction iteration, full run) remain open.

## What changed

**`src/schema/resume.ts`**
- `ContactSchema.headline?`, `ResumeSchema.summaryHeading?`.
- `ExperienceSchema` gains `industry?`, `via?`, `location?`.
- Restructured around a shared `experienceBase` so `EngagementSchema` is
  literally `ExperienceSchema` minus `engagements`, per the handoff. This
  renamed the engagement `client` field to `company`.
- `role` is now optional rather than "empty string for non-role entries".

**`src/lib/render.ts`**
- `designedHtmlTemplate` replaced with the two-column rail layout. Reuses the
  existing `escapeHtml` / `contactLink` / `dateRange` / `urlWithPassword`
  helpers instead of the prototype's duplicates.
- Dropped the prototype's `INDUSTRY_ON_COMPANY_LINE` switch; industry is
  hardcoded beside the company name (the approved placement).
- `opts.small` added (default 10) and threaded through `renderDesigned`.
- Designed margins 0.6in -> 0.75in. ATS untouched at 0.6in.
- Removed `companyRoleHeading`, dead once the old template went.

**Tests** — `render.test.ts` fixture test (10 assertions), `validate.test.ts`
key rename.

## Verification

| Gate | Result |
|---|---|
| Fixture validates unmodified | PASS |
| Fixture renders to exactly 2 pages | PASS (2) |
| Em dashes in output | PASS (0) |
| En dashes in date ranges | PASS (10, matches approved) |
| Full test suite | PASS (65/65) |
| `tsc --noEmit` | PASS |
| Visual vs `approved-render.pdf` | PASS — structurally identical |

## Findings worth carrying forward

**1. `approved-render.pdf` was rendered without Inter.** It embeds
`AAAAAA+LiberationSans`; the Google Fonts `@import` did not resolve when that
artifact was produced. Our render does load Inter (verified via
`document.fonts.check`), and Inter is ~6.5% wider than the fallback at the same
px size. Every text difference between the two PDFs is a wrap point caused by
this — the words are identical, and both land on exactly 2 pages. Our render is
the spec-correct one. Do not "fix" the wrap differences by chasing the approved
artifact.

**2. Page-2 headroom is about 16 lines** (44 of ~60 used at 15px line-height
inside a 9.5in printable height). The Norton bullets from handoff step 3 have
room, but the margin is not large.

**3. `role` had to become optional.** The fixture's stealth/architecture
engagement has no role at all, and the old schema required the field. The
handoff's "empty string for non-role entries" convention does not match the
fixture it shipped alongside.

## Deliberately not done

- ATS `(full-time)` divergence: the ATS template still renders `(${exp.type})`,
  so it prints "(full-time)" while the designed template now prints nothing for
  full-time and plain "Contract" for contracts. The handoff says leave ATS
  alone, so this is flagged, not changed. Needs a decision.
- The ATS template hardcodes the label "Client engagement" for every engagement.
  Now that `via` exists, `eng.via ?? "Client engagement"` would be the natural
  wiring. Not done for the same reason.
- Obsidian master markdown, extraction runs, `.describe()` iteration (steps 3-5).
- Page 2 opening with "Parental Leave" — accepted quirk, held per handoff.
- The 52 pre-existing uncommitted `.planning/` deletions — untouched.

## Constraint conflict to resolve

`.planning/PROJECT.md` (surfaced in `CLAUDE.md`) still lists the constraint
"No images, no multi-column layouts in either PDF". The designed PDF is now
two-column by approved design. The ATS PDF remains single-column, so the stated
machine-readability rationale still holds, but the constraint text needs
amending to match reality.
