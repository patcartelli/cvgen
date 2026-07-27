# cvgen (Resume Generator)

## What This Is

cvgen is a CLI tool that turns an Obsidian-native markdown resume note into two polished output files: a clean, single-column typographic PDF, and a simplified single-column ATS-clean PDF. Claude parses the markdown into structured JSON; Puppeteer renders that JSON into styled HTML and prints it to PDF. It's a personal tool for the user's own job search and doubles as a public portfolio piece (github.com/patcartelli/cvgen).

## Core Value

Running the CLI against a markdown resume note reliably produces a portfolio-quality PDF and a separate ATS-safe PDF — without the user touching a template or text editor.

## Requirements

### Validated

- [x] Repo has TypeScript config, lint, and format tooling configured out of the box — Validated in Phase 01: scaffold-schema-secret-hygiene (2026-07-27)

### Active

- [ ] User can run a CLI command with a path to a markdown file as input
- [ ] CLI parses the markdown resume via the Claude API into structured JSON (contact info, summary, experience, education, skills)
- [ ] CLI renders the structured JSON into a designed single-column typographic PDF (no images, no multi-column layout)
- [ ] CLI renders the structured JSON into a simplified single-column ATS-clean PDF, visually distinct from the designed PDF
- [ ] CLI reads the Claude API key from an environment variable (never hardcoded, never prompted interactively)
- [ ] Repo has TypeScript config, lint, and format tooling configured out of the box

### Out of Scope

- Web UI — deferred to a clearly-scoped v2 per STC-138; v1 is CLI-only
- Job-posting-targeted tailoring — v1 is straight parse-and-render, one note in, two files out
- Multi-column layouts or images in either output — user doesn't want images in the resume, and a single-column layout is simpler to keep both outputs machine-readable and consistent
- Vercel deployment / server component — no web routes exist in v1, so there's nothing to deploy; revisit if v2 web UI happens

## Context

- Personal project + portfolio piece: repo is public at github.com/patcartelli/cvgen (created via STC-147), separate from the studio-cartelli monorepo specifically so it stands alone as a portfolio artifact.
- Source of truth for the resume is a single markdown note living in the user's Obsidian vault — no existing frontmatter/heading convention yet; the parser's expected input structure is being designed fresh as part of this project.
- Originates from the Studio Cartelli Linear workspace, project "Resume Generator." STC-138 (done) decided CLI-only for v1. STC-140 is the scaffold issue that kicked off this project init.
- The original stack decision (STC-138) named Next.js + Vercel-deployable as part of the stack. During project init, that was stress-tested against the actual v1 output surface (PDF/ATS files, no web routes) and revised: v1 drops Next.js in favor of a plain TypeScript CLI. See Key Decisions.

## Constraints

- **Tech stack**: TypeScript CLI (no web framework), Claude API client for parsing, Puppeteer for PDF rendering — Why: v1 ships no web routes, so a framework like Next.js adds toolchain weight without user-facing benefit
- **Output format**: No images, no multi-column layouts in either PDF — Why: keeps the ATS-clean PDF machine-readable and keeps both renderers structurally simple
- **Secrets**: Claude API key must come from an environment variable — Why: this repo is public (portfolio piece); no credentials can ever be committed

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Drop Next.js/Vercel from v1, use a plain TypeScript CLI instead | STC-138 locked v1 as CLI-only; Next.js adds App Router/React toolchain weight with zero web routes to serve in v1 | — Pending (revisit only if/when a v2 web UI actually starts) |
| ATS-clean output is a simplified single-column PDF, not .txt/.md | User wants a second PDF that ATS parsers can still read cleanly, not a different file format | — Pending |
| v1 is straight parse-and-render, no job-posting tailoring | Keeps v1 scope tight; tailoring against a target job description is a candidate v2 feature | — Pending |
| Obsidian note structure (frontmatter, headings) designed fresh | No existing convention to target; this project defines it | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-27 after initialization*
