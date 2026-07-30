# Roadmap: cvgen (Resume Generator)

## Milestones

- ✅ **v1.0 MVP** — Phases 1–4 (shipped 2026-07-28)
- **v1.1 Typography & Workflow Improvements** — Phases 5–7 (active)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–4) — SHIPPED 2026-07-28</summary>

**Overview:** cvgen goes from an empty repo to a working CLI that turns an Obsidian-native markdown resume note into two polished PDFs. The build follows a strict dependency chain: lock the schema and repo hygiene first, then build markdown-to-JSON extraction, then build both PDF renderers against fixture data, and finally wire everything into the actual `cvgen` command.

- [x] Phase 1: Scaffold, Schema & Secret Hygiene (3/3 plans) — completed 2026-07-27
- [x] Phase 2: Markdown to Structured JSON Extraction (2/2 plans) — completed 2026-07-28
- [x] Phase 3: Designed & ATS PDF Rendering (2/2 plans) — completed 2026-07-28
- [x] Phase 4: CLI Integration, Debug Tooling & Portfolio Readiness (2/2 plans) — completed 2026-07-28

Full phase details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### v1.1 Typography & Workflow Improvements

- [x] **Phase 5: Typography Polish** — Designed PDF visual refinements (summary size, bullet color, header spacing) — completed 2026-07-30
- [x] **Phase 6: Output Directory Routing** — CLI prompts for tailored vs. general and routes PDFs to correct directory (completed 2026-07-30)
- [x] **Phase 7: Quality, Packaging & Global Install** — Type fix, test runner consolidation, npm global install (completed 2026-07-30)

## Phase Details

### Phase 5: Typography Polish
**Goal**: The designed PDF's visual hierarchy is complete — summary, bullets, and section headers are consistently styled
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: TYPO-01, TYPO-02, TYPO-03
**Success Criteria** (what must be TRUE):
  1. The designed PDF's summary section text is visibly smaller than body copy paragraphs
  2. Bullet points in the designed PDF render in a muted navy accent color (#2d4a6b), not default black
  3. Every section header in the designed PDF has the same bottom spacing as the Experience header
**Plans**: 1 plan
Plans:
- [x] 05-01-PLAN.md — Apply typography decisions D-01 to D-07 to designedHtmlTemplate() and human-verify designed PDF via smoke-render — completed 2026-07-30
**UI hint**: yes

### Phase 6: Output Directory Routing
**Goal**: Users can direct output to a company-specific folder when submitting a tailored resume
**Depends on**: Phase 5
**Requirements**: OUTPUT-01, OUTPUT-02
**Success Criteria** (what must be TRUE):
  1. Running `cvgen <path>` prompts the user whether the resume is tailored; entering "no" writes both PDFs to `output/` relative to cwd
  2. Entering "yes" at the tailored prompt asks for a company name; entering "Acme Corp" writes both PDFs to `output/Acme-Corp/` (or equivalent slug)
  3. The output directory is created automatically if it does not exist
**Plans**: 2 plans in 2 waves
Plans:
- [x] 06-01-PLAN.md — Add toCompanySlug export and update resolveOutputPaths signature in render.ts; rewrite Tests 1–3 and add slug unit tests in render.test.ts; fix smoke-render.ts one-line call
**Wave 2** *(blocked on Wave 1 completion)*
- [x] 06-02-PLAN.md — Wire Step D.5 interactive prompts and mkdir into cli/index.ts; add integration tests for "n" and "y" prompt paths

Cross-cutting constraints:
- `toCompanySlug` must be exported from `src/lib/render.ts` (Plan 01) before Plan 02 imports it
- `resolveOutputPaths(inputMdPath, outputDir)` two-arg signature must exist in render.ts before Plan 02 calls it at Step H

### Phase 7: Quality, Packaging & Global Install
**Goal**: cvgen is installable as a global command and the codebase has no type or test infrastructure debt
**Depends on**: Phase 6
**Requirements**: QUAL-01, QUAL-02, QUAL-03
**Success Criteria** (what must be TRUE):
  1. Running `npm install -g .` (or `npm link`) and then `cvgen <path>` in any directory works without `npx tsx`
  2. `npm test` runs exactly one test runner with no conflicting script entries in package.json
  3. `rawResponse` on `ExtractResult` is typed as `ParsedMessage<ResumeData>` and `--verbose` output reflects the correct type
**Plans**: 2 plans (both Wave 1, parallel — no file overlap)
Plans:
- [x] 07-01-PLAN.md — Reconcile REQUIREMENTS.md and PROJECT.md tracking: mark QUAL-01/QUAL-02 complete (already implemented in commits 9ba6e1d and fc9a507) and move TYPO-01/02/03 + CR-01/WR-04 bullets from Active to Validated
- [x] 07-02-PLAN.md — Add prepack script to package.json, rewrite README Usage section to reflect Phase 06 output routing, and human-verify `npm run build && npm link && cvgen --help` end-to-end (QUAL-03)

Cross-cutting constraints:
- Plan 01 modifies only tracking docs (REQUIREMENTS.md, PROJECT.md); Plan 02 modifies package.json + README.md — zero file overlap, safe to run in parallel
- QUAL-01 and QUAL-02 require NO source code changes — tracking updates only (research confirms both are already implemented on main)
- Plan 02 Task 3 is a `checkpoint:human-verify` — the phase is not autonomous end-to-end

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Scaffold, Schema & Secret Hygiene | v1.0 | 3/3 | Complete | 2026-07-27 |
| 2. Markdown to Structured JSON Extraction | v1.0 | 2/2 | Complete | 2026-07-28 |
| 3. Designed & ATS PDF Rendering | v1.0 | 2/2 | Complete | 2026-07-28 |
| 4. CLI Integration, Debug Tooling & Portfolio Readiness | v1.0 | 2/2 | Complete | 2026-07-28 |
| 5. Typography Polish | v1.1 | 1/1 | Complete    | 2026-07-30 |
| 6. Output Directory Routing | v1.1 | 2/2 | Complete   | 2026-07-30 |
| 7. Quality, Packaging & Global Install | v1.1 | 2/2 | Complete   | 2026-07-30 |
