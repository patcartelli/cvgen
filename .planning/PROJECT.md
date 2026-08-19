# cvgen (Resume Generator)

## What This Is

cvgen is a CLI tool that turns an Obsidian-native markdown resume note into two polished output files: a clean, single-column typographic PDF, and a simplified single-column ATS-clean PDF. Claude parses the markdown into structured JSON; Puppeteer renders that JSON into styled HTML and prints it to PDF. It's a personal tool for the user's own job search and doubles as a public portfolio piece (github.com/patcartelli/cvgen).

## Core Value

Running the CLI against a markdown resume note reliably produces a portfolio-quality PDF and a separate ATS-safe PDF — without the user touching a template or text editor.

## Current Milestone: v1.1 Typography & Workflow Improvements

**Goal:** Polish the designed PDF's visual output and resolve v1.0 tech debt to make cvgen installable and clean.

**Target features:**
- Summary text scaled down to body-small size
- Bullet points styled with subtle accent color (#2d4a6b)
- Consistent bottom spacing under all section headers
- CR-01: fix `rawResponse` type to `ParsedMessage<ResumeData>`
- WR-04: consolidate test runners (remove tsx --test / vitest conflict)
- npm publish / global install — `cvgen` as a real global command

## Current State

**v1.1 shipped 2026-07-31.** All 7 phases complete. `cvgen <path>` prompts for company routing, writes PDFs to `output/` or `output/<Company-Slug>/`, and is installable globally via `npm run build && npm link`. 44 automated tests. 1,791 LOC TypeScript. Single test runner (`tsx --test`). `prepack` auto-builds before publish. Next: define v1.2 milestone.

Known tech debt being resolved in v1.1:
- CR-01: `rawResponse` in `ExtractResult` typed as `Message` instead of `ParsedMessage<ResumeData>` — affects `--verbose` completeness
- WR-04: Two conflicting test runners (`tsx --test` vs `vitest.config.ts`) in package.json

## Requirements

### Validated (v1.0)

- [x] Repo has TypeScript config, lint, and format tooling configured out of the box — Phase 01 (2026-07-27)
- [x] User can run `cvgen <path> --validate-only` to extract structured JSON from a markdown resume via Claude API — Phase 02 (2026-07-28)
- [x] CLI parses the markdown resume via the Claude API into structured JSON (contact, summary, experience, education, skills) — Phase 02 (2026-07-28)
- [x] CLI reads the Claude API key from an environment variable (never hardcoded, never prompted interactively) — Phase 02 (2026-07-28)
- [x] CLI renders the structured JSON into a designed typographic PDF (no images) — Phase 03 (2026-07-28); layout became two-column with a right rail on 2026-08-19
- [x] CLI renders the structured JSON into a simplified single-column ATS-clean PDF, visually distinct from the designed PDF — Phase 03 (2026-07-28)
- [x] Single `cvgen <path>` command writes both PDFs to disk and exits cleanly — Phase 04 (2026-07-28)
- [x] Invalid/missing path and missing API key exit 1 with human-readable errors (no stack traces) — Phase 04 (2026-07-28)
- [x] `--verbose` dumps raw Claude response and validated JSON to stderr — Phase 04 (2026-07-28)
- [x] `cvgen init` creates a valid example note with all required frontmatter fields and sections — Phase 04 (2026-07-28)

### Validated (v1.1 — in progress)

- [x] PDF output routed to `output/` or `output/<Company-Slug>/` relative to cwd based on interactive prompt — Phase 06 (2026-07-30)
- [x] `toCompanySlug` converts company name to Title-Case-Hyphen slug (D-01: spaces→hyphens, D-02: strip non-alphanumeric) — Phase 06 (2026-07-30)
- [x] Designed PDF: summary text scaled down to body-small size — Phase 05 (2026-07-30)
- [x] Designed PDF: bullet points styled with subtle accent color (#2d4a6b) — Phase 05 (2026-07-30)
- [x] Designed PDF: consistent bottom spacing under all section headers — Phase 05 (2026-07-30)
- [x] Fix `rawResponse` type to `ParsedMessage<ResumeData>` for correct `--verbose` output (CR-01) — Phase 7 (2026-07-28)
- [x] Remove vitest runner conflict — consolidate on one test runner (WR-04) — Phase 7 (2026-07-28)

### Validated (v1.1 — shipped 2026-07-31)

- [x] `npm link` global install works — `cvgen <path>` runs from any directory without `npx tsx` — Phase 07 (2026-07-31)

### Active (v1.2 — candidates)

- [ ] Non-interactive mode flag (`--company "Acme"`) to skip prompts in CI/scripts
- [ ] Self-hosted Inter font (remove Google Fonts CDN dependency)
- [ ] `npm publish` to npm registry so `npx cvgen` works without cloning

### Out of Scope

- Web UI — deferred to a clearly-scoped v2 per STC-138; v1 is CLI-only
- Job-posting-targeted tailoring — v1 is straight parse-and-render, one note in, two files out
- Multi-column layouts or images in either output — keeps ATS PDF machine-readable and both renderers structurally simple
- Vercel deployment / server component — no web routes exist in v1; revisit if v2 web UI happens

## Context

- Personal project + portfolio piece: repo is public at github.com/patcartelli/cvgen, separate from the studio-cartelli monorepo so it stands alone as a portfolio artifact.
- v1.0 shipped 2026-07-28. Source of truth for the resume is a single markdown note in the user's Obsidian vault. Frontmatter convention (`name`, `email`, `phone`, `location`, `linkedin`, `github`) and section headings (`## Experience`, `## Education`, `## Skills`) were designed fresh as part of this project.
- Originates from the Studio Cartelli Linear workspace. STC-138 decided CLI-only for v1; STC-140 kicked off project init.

## Constraints

- **Tech stack**: TypeScript CLI (no web framework), Claude API client for parsing, Puppeteer for PDF rendering — v1 ships no web routes
- **Output format**: No images in either PDF. The ATS PDF must stay single-column, no tables, no multi-column layout — that is what keeps it machine-readable. The designed PDF may use multi-column layout (superseded 2026-08-19, STC handoff: it now ships an approved two-column layout with a right rail).
- **Secrets**: Claude API key from environment variable only — repo is public

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Drop Next.js/Vercel from v1, use plain TypeScript CLI | STC-138 locked v1 as CLI-only; Next.js adds toolchain weight with zero web routes to serve | ✓ Correct — CLI shipped cleanly |
| ATS-clean output is a simplified single-column PDF, not .txt/.md | User wants a second PDF ATS parsers can read cleanly, not a different file format | ✓ Validated — text extraction confirmed linear order |
| v1 is straight parse-and-render, no job-posting tailoring | Keeps v1 scope tight | ✓ Correct — tailoring is a v1.1+ candidate |
| Obsidian note structure (frontmatter, headings) designed fresh | No existing convention to target | ✓ Convention established — required by `preflightCheck` |
| Commander 15 over yargs for CLI parsing | Zero runtime deps, ESM-first, fits single-command surface | ✓ Correct — `.showHelpAfterError()` needed for test compat |
| `claude-haiku-4-5` for extraction | Speed + cost for structured JSON extraction; not a creative task | ✓ Correct — works reliably against sample fixture |

## Evolution

**After each milestone** (via `/gsd:complete-milestone`):
1. Move shipped requirements from Active → Validated
2. Add new v.next candidates to Active
3. Update Current State
4. Audit Out of Scope reasoning

---
*Last updated: 2026-07-31 — v1.1 Typography & Workflow Improvements milestone shipped*
