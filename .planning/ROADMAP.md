# Roadmap: cvgen (Resume Generator)

## Overview

cvgen goes from an empty repo to a working CLI that turns an Obsidian-native markdown resume note into two polished PDFs. The build follows a strict dependency chain: lock the schema and repo hygiene first (nothing else can safely start before this, since the repo is public from commit zero), then build markdown-to-JSON extraction against that schema, then build both PDF renderers against fixture data (never blocked on a live Claude call), and finally wire everything into the actual `cvgen` command with polish and debug tooling. Each phase produces something independently verifiable — a validated schema, an extraction pipeline, two renderers, a working CLI — rather than horizontal slices that only come together at the very end.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Scaffold, Schema & Secret Hygiene** - Repo tooling, the Zod resume schema, and public-repo secret hygiene exist before any Claude-API code is written (completed 2026-07-27)
- [x] **Phase 2: Markdown to Structured JSON Extraction** - CLI can turn a markdown resume into schema-validated JSON via Claude, safely and inspectably (completed 2026-07-28)
- [x] **Phase 3: Designed & ATS PDF Rendering** - Validated resume JSON renders into two structurally distinct, single-column PDFs (completed 2026-07-28)
- [ ] **Phase 4: CLI Integration, Debug Tooling & Portfolio Readiness** - The full `cvgen <path>` command works end-to-end with clear errors, help text, debug flags, and an init scaffold

## Phase Details

### Phase 1: Scaffold, Schema & Secret Hygiene

**Goal**: The Zod schema that every later stage depends on is locked, and the public repo is safe to develop in from the first commit.
**Depends on**: Nothing (first phase)
**Requirements**: SCHEMA-01
**Success Criteria** (what must be TRUE):

  1. Type-check, lint, and format commands (tsc, Biome) run clean on the scaffolded repo with zero errors
  2. A Zod schema validates a fictional `fixtures/sample-resume.json` (contact, summary, experience, education, skills) and rejects a deliberately malformed copy of it
  3. A committed file containing an API-key-shaped secret is caught by the pre-commit secret scanner before it reaches history
  4. `.gitignore` and `.env.example` exist and no real secrets or personal data appear anywhere in repo history

**Plans**: 3 plans
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Repo scaffold: package.json (ESM CLI + pinned deps), tsconfig (NodeNext strict), biome.json, .gitignore, .env.example; npm install; verify empty-tree tsc + biome pass

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Zod ResumeSchema (D-09..D-14) + validate stub + CLI shebang stub + valid/malformed fixtures + smoke-test script proving pass/fail (satisfies SCHEMA-01)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Install gitleaks, activate simple-git-hooks pre-commit (D-15..D-17); prove positive control (fake key blocked) and negative control (clean commit succeeds); scan history

### Phase 2: Markdown to Structured JSON Extraction

**Goal**: Users can turn a markdown resume note into validated structured JSON via the Claude API, safely and inspectably, without touching a renderer.
**Depends on**: Phase 1
**Requirements**: PARSE-01, PARSE-02, PARSE-03, SEC-01, DEVX-01
**Success Criteria** (what must be TRUE):

  1. Running extraction against a fixture markdown resume produces JSON that validates against the Phase 1 schema
  2. When a required section is missing or malformed in the input note, the user sees a human-readable error naming the specific section, not a raw stack trace
  3. The Claude API key is read only from an environment variable — running with it unset produces a clear failure message and the CLI never prompts for or persists a key
  4. Running with `--validate-only`/`--dry-run` prints the extracted, validated JSON to stdout and performs no PDF rendering

**Plans**: 2 plans
Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Lib layer: validateResume path-based Zod errors, preflightCheck for frontmatter/section headings, extractResume Claude API wrapper (messages.parse + zodOutputFormat), and happy-path markdown fixture (satisfies PARSE-01, PARSE-02, PARSE-03)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — CLI entry replacement: env load, ANTHROPIC_API_KEY guard, --validate-only/--dry-run argv routing, pipeline orchestration; ends with blocking human end-to-end verification against real API (satisfies SEC-01, DEVX-01, PARSE-03)

### Phase 3: Designed & ATS PDF Rendering

**Goal**: Validated resume JSON can be rendered into a portfolio-quality designed PDF and a genuinely distinct, machine-readable ATS-clean PDF.
**Depends on**: Phase 1 (schema; does not require Phase 2 to be complete — built and tested against the fixture)
**Requirements**: RENDER-01, RENDER-02, RENDER-03
**Success Criteria** (what must be TRUE):

  1. Rendering the sample fixture through the designed pipeline produces a single-column, image-free typographic PDF
  2. Rendering the same fixture through the ATS pipeline produces a visually distinct single-column PDF using system-safe fonts, with no layout tables and no hidden/near-invisible text
  3. Extracting text from the ATS-clean PDF (e.g. via pdftotext/pdf-parse) returns all resume content in correct linear reading order
  4. Re-running either renderer against the same input writes predictable, non-destructive filenames (e.g. `<slug>-resume.pdf` / `<slug>-resume-ats.pdf`) without clobbering differently-named prior output

**Plans**: 2 plans
Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Install puppeteer 25.4.0 + pdf-parse 2.4.5; create src/lib/render.ts (renderDesigned, renderAts, resolveOutputPaths) + scripts/smoke-render.ts driver proving both PDFs render from fixture (satisfies RENDER-01, RENDER-02, RENDER-03)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-02-PLAN.md — src/lib/render.test.ts: node:test + pdf-parse ATS extraction proving linear reading order + resolveOutputPaths unit tests; blocking human-verify checkpoint on designed PDF (D-T02) (satisfies RENDER-02, RENDER-03)

### Phase 4: CLI Integration, Debug Tooling & Portfolio Readiness

**Goal**: A user runs one command against a real markdown resume note and reliably gets both PDFs, with clear errors, help text, debug visibility, and an onboarding path.
**Depends on**: Phase 2, Phase 3
**Requirements**: CLI-01, CLI-02, CLI-03, CLI-04, DEVX-02, DEVX-03
**Success Criteria** (what must be TRUE):

  1. Running `cvgen <path-to-markdown-file>` end-to-end writes both the designed and ATS PDFs to disk from a single invocation
  2. Running cvgen against a nonexistent or unreadable path fails with a clear human-readable message (not a stack trace) and exits non-zero; a successful run exits 0
  3. Running `cvgen --help` prints usage and an example invocation
  4. Running with `--verbose`/`--debug` shows the raw Claude API response alongside the validated JSON
  5. Running `cvgen init` generates an example Obsidian note demonstrating the expected frontmatter/heading convention

**Plans**: 2 plans
Plans:
**Wave 1**

- [ ] 04-01-PLAN.md — Install commander@15.0.0; update extractResume return type to ExtractResult ({ data, rawResponse }); add source assertion Test 8 to extract.test.ts confirming new interface (satisfies DEVX-02 extract layer)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 04-02-PLAN.md — Replace src/cli/index.ts with full Commander 15 program (main pipeline + --verbose + --validate-only/--dry-run + cvgen init subcommand); rewrite index.test.ts Test 8 to assert Commander IS present; blocking human end-to-end UAT (satisfies CLI-01, CLI-02, CLI-03, CLI-04, DEVX-02, DEVX-03)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffold, Schema & Secret Hygiene | 3/3 | Complete   | 2026-07-27 |
| 2. Markdown to Structured JSON Extraction | 2/2 | Complete   | 2026-07-28 |
| 3. Designed & ATS PDF Rendering | 2/2 | Complete   | 2026-07-28 |
| 4. CLI Integration, Debug Tooling & Portfolio Readiness | 0/2 | Not started | - |
