# cvgen (Resume Generator)

## What This Is

cvgen is a CLI tool that turns an Obsidian-native markdown resume note into two polished output files: a clean, single-column typographic PDF, and a simplified single-column ATS-clean PDF. Claude parses the markdown into structured JSON; Puppeteer renders that JSON into styled HTML and prints it to PDF. It's a personal tool for the user's own job search and doubles as a public portfolio piece (github.com/patcartelli/cvgen).

## Core Value

Running the CLI against a markdown resume note reliably produces a portfolio-quality PDF and a separate ATS-safe PDF — without the user touching a template or text editor.

## Current State

**v1.0 shipped 2026-07-28.** Full pipeline working end-to-end: `cvgen <path>` runs preflight → Claude extraction → Puppeteer rendering → two PDFs on disk. 841 LOC TypeScript, 38 automated tests, 9 plans across 4 phases.

Known tech debt from code review (non-blocking for v1.0):
- CR-01: `rawResponse` in `ExtractResult` typed as `Message` instead of `ParsedMessage<ResumeData>` — affects `--verbose` completeness
- WR-04: Two conflicting test runners (`tsx --test` vs `vitest.config.ts`) in package.json

## Requirements

### Validated (v1.0)

- [x] Repo has TypeScript config, lint, and format tooling configured out of the box — Phase 01 (2026-07-27)
- [x] User can run `cvgen <path> --validate-only` to extract structured JSON from a markdown resume via Claude API — Phase 02 (2026-07-28)
- [x] CLI parses the markdown resume via the Claude API into structured JSON (contact, summary, experience, education, skills) — Phase 02 (2026-07-28)
- [x] CLI reads the Claude API key from an environment variable (never hardcoded, never prompted interactively) — Phase 02 (2026-07-28)
- [x] CLI renders the structured JSON into a designed single-column typographic PDF (no images, no multi-column layout) — Phase 03 (2026-07-28)
- [x] CLI renders the structured JSON into a simplified single-column ATS-clean PDF, visually distinct from the designed PDF — Phase 03 (2026-07-28)
- [x] Single `cvgen <path>` command writes both PDFs to disk and exits cleanly — Phase 04 (2026-07-28)
- [x] Invalid/missing path and missing API key exit 1 with human-readable errors (no stack traces) — Phase 04 (2026-07-28)
- [x] `--verbose` dumps raw Claude response and validated JSON to stderr — Phase 04 (2026-07-28)
- [x] `cvgen init` creates a valid example note with all required frontmatter fields and sections — Phase 04 (2026-07-28)

### Active (v1.1 candidates)

- [ ] Fix `rawResponse` type to `ParsedMessage<ResumeData>` for correct `--verbose` output (CR-01)
- [ ] Remove vitest runner conflict — consolidate on one test runner (WR-04)
- [ ] `npm publish` / `npm link` so `cvgen` can be run as a global command without `npx tsx`

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
- **Output format**: No images, no multi-column layouts in either PDF — keeps ATS PDF machine-readable
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
*Last updated: 2026-07-28 after v1.0 milestone shipped*
