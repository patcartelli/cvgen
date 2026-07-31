# Milestones

## v1.1 Typography & Workflow Improvements (Shipped: 2026-07-31)

**Phases completed:** 3 phases, 5 plans, 9 tasks

**Key accomplishments:**

- Six CSS edits to designedHtmlTemplate() implement complete visual hierarchy — 12px summary, navy (#2d4a6b) bullet markers, and consistent 4px section header spacing — all human-verified against three ROADMAP success criteria
- `toCompanySlug` export and two-argument `resolveOutputPaths` in render.ts with 7 new unit tests — pure function contracts for Phase 6 output routing
- Task 1 — Step D.5 prompt + mkdir + Step H update (`src/cli/index.ts`)
- QUAL-01 and QUAL-02 closed in REQUIREMENTS.md; five stale Active bullets (TYPO-01/02/03, CR-01, WR-04) migrated to Validated in PROJECT.md, leaving QUAL-03 as the sole remaining Active item

---

## v1.0 MVP (Shipped: 2026-07-28)

**Phases:** 4 | **Plans:** 9 | **Timeline:** 2 days (2026-07-27 → 2026-07-28)
**Source files:** 841 LOC TypeScript | **Commits:** 81

**Key accomplishments:**

- TypeScript CLI scaffold with Biome lint/format, tsc type-checking, and gitleaks secret-hygiene pre-commit hook
- Zod ResumeSchema with full fixture coverage — safeParse accepts valid and rejects malformed data
- Claude API extraction pipeline — `extractResume()` parses markdown resume notes into validated structured JSON via claude-haiku-4-5
- Puppeteer PDF rendering — designed typographic PDF and ATS-clean single-column PDF from the same JSON source
- Full Commander 15 CLI — `cvgen <path>` runs preflight → extract → render both PDFs end-to-end, with `--verbose` debug output and `cvgen init` scaffold subcommand
- 38 automated tests across 6 suites; all 6 requirement areas (CLI-01–04, DEVX-02–03) verified via human UAT

**Stats:**

- Files changed: 76 files, 15,354 insertions
- Open items deferred: 1 (Phase 02 VERIFICATION.md human_needed — validated end-to-end in Phase 04 UAT)

---
