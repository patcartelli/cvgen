# Project Research Summary

**Project:** cvgen (Resume Generator)
**Domain:** Single-shot Node/TypeScript CLI — markdown-to-PDF resume generator (Claude API extraction + Puppeteer rendering)
**Researched:** 2026-07-27
**Confidence:** HIGH

## Executive Summary

cvgen is a small, single-invocation TypeScript CLI, not a web app or service — a developer reads a markdown file, calls Claude once to extract structured resume data, and renders that data through two independent HTML-to-PDF pipelines (a portfolio-quality "designed" PDF and a machine-parseable "ATS-clean" PDF). This is a well-trodden pattern space: JSON Resume already defines the structured-data shape experts converge on (basics/work/education/skills), Anthropic's own SDK ships a purpose-built structured-outputs helper (zodOutputFormat()) for exactly this "constrain an LLM's output to a schema" problem, and Puppeteer is the standard tool for text-faithful HTML-to-PDF rendering. The research across all four files converges cleanly: one Zod schema is the load-bearing contract of the whole system, everything downstream (parsing, validation, both renderers) depends on it, and nothing should be built before it's locked.

The recommended approach is a strict four-stage pipeline: parser/clean (pure text cleanup), then parser/extract (Claude call, schema-constrained), then schema/validate (explicit re-validation boundary, not skipped just because the API call was already constrained), then renderers/designed and renderers/ats (independent templates over one shared data type), then renderers/print (one shared Puppeteer browser instance, reused for both PDFs). Architecture research is unusually confident here because the pattern (schema-as-contract, pure-function pipeline stages, fixture-driven renderer development so templates never require a live, slow, paid, non-deterministic Claude call to iterate on) has few viable alternatives at this scale, and STC-140 already locked a four-folder structure that maps directly onto it.

The dominant risks are not "will Claude return valid JSON" (structured outputs solve that) but three quieter failure classes: (1) schema-conformant but semantically wrong extraction, such as hallucinated dates or merged bullets, which is invisible to validation and only shows up as wrong text in the final PDF; (2) the ATS-clean PDF silently inheriting ATS-unfriendly formatting (shared CSS, an accidental two-column date-alignment trick) because "looks plain" and "extracts in linear reading order" are different properties, verifiable only by actually running pdftotext/pdf-parse on the output; and (3) public-repo secret and personal-data hygiene, since this is a public portfolio repo from commit zero with no "clean up before going public" grace period. All three are addressable with concrete, cheap gates (verbatim-extraction prompting plus spot-check diff, a text-extraction regression check on the ATS PDF, .gitignore plus a secret scanner as commit #1) rather than architectural rework, provided they're built into the relevant phase's definition of done rather than retrofitted.

## Key Findings

### Recommended Stack

Node greater than or equal to 22.12.0 (develop on 24 LTS) running a plain ESM TypeScript CLI: Commander for the single-command argv surface, @anthropic-ai/sdk (0.115.0) with its zodOutputFormat() structured-output helper, Zod (4.4.3) as the one schema that drives both Claude's constrained output and compile-time types, and full puppeteer (25.4.0, not puppeteer-core) since this is a locally-run CLI with no serverless component. Biome is the recommended lint/format tool specifically because TypeScript 7.0 (GA July 2026) broke typescript-eslint compatibility (peer range explicitly excludes 7.x) — Biome has its own type synthesizer and sidesteps the conflict entirely, or pin typescript@^6.0.3 if ESLint is preferred. No bundler (tsup/esbuild) is needed or wanted: cvgen is consumed only via its bin entry, and bundling Puppeteer specifically is a known source of "Could not find Chromium" errors. Use native process.loadEnvFile() instead of dotenv — one flat secret, no expansion need, Node greater than or equal to 22 already anyway.

**Core technologies:**
- Node.js >=22.12.0 — runtime; hard floor set by Puppeteer 25.x's engines.node
- Commander 15 — CLI parsing — zero deps, exact fit for a single-command surface (only worth outgrowing if subcommands like `cvgen init` are added later)
- @anthropic-ai/sdk 0.115.0 + Zod 4.4.3 — Claude extraction — zodOutputFormat() gives schema-constrained generation plus one shared type/validator
- Puppeteer 25.4.0 (full package) — PDF rendering — bundles matched Chromium, correct choice for a local CLI (not puppeteer-core/@sparticuz/chromium, which target serverless)
- Biome 2.5.5 — lint/format — avoids the TS 6/7 + typescript-eslint peer-dependency conflict entirely

### Expected Features

JSON Resume's schema shape (basics/work/education/skills) is the closest existing standard and should be adapted rather than invented from scratch. No competitor tool analyzed (codysnider/resume, JSON Resume ecosystem, pandoc-based generators) produces both a designed and an ATS-safe PDF from one shared source — this dual-output pattern is cvgen's clearest differentiation opportunity, provided the two renderers stay genuinely independent (see Pitfall 8 below).

**Must have (table stakes):**
- File-path argument with existence/readability check, failing fast with a human-readable message
- Locked structured-data schema (contact, summary, experience, education, skills) as the one contract everything depends on
- Markdown to JSON via Claude structured outputs, re-validated in code (Zod .parse()), not trusted as-is
- Human-readable errors naming the specific missing/malformed section (not a raw Zod stack trace)
- Designed single-column typographic PDF + a structurally distinct ATS-clean PDF (system-safe fonts, no layout tables, no hidden text)
- Env-var-only API key handling, clear failure when unset, never prompted or persisted
- --help, correct non-zero exit codes on failure, predictable non-clobbering output filenames

**Should have (competitive/portfolio differentiators):**
- --validate-only/--dry-run — inspect extracted JSON without rendering, highest-value non-required feature given the schema is being designed fresh
- Staged progress output (parsing, validating, rendering x2) so a several-second CLI doesn't feel broken
- --verbose/--debug dumping raw Claude output for extraction debugging

**Defer (v1.x/v2+):**
- cvgen init scaffold (build only after the note schema stabilizes from real use)
- Render-preference config file (margins, page size, font choice)
- Parse-confidence/provenance flags ("inferred" vs. "explicit" sections)
- Web UI, job-posting-targeted tailoring — both explicitly out of scope per PROJECT.md/STC-138

### Architecture Approach

A strict four-module pipeline (cli/ -> parser/ -> schema/ -> renderers/) where schema/ is the dependency root everything else imports from, parser/clean.ts and parser/extract.ts stay separated (pure text cleanup vs. network I/O) even though both live under one folder boundary per STC-140, and renderers/designed/ and renderers/ats/ are two independent template modules — not one generic templating engine with variants — sharing only genuinely identical helpers (date formatting, HTML escaping, the Puppeteer print step). A fixtures/sample-resume.json lets both renderers be built and visually iterated without ever calling the (slow, paid, non-deterministic) Claude API.

**Major components:**
1. cli/index.ts — thin orchestration only: argv parsing, calling the pipeline stages in sequence, exit codes/stderr reporting — the only module allowed to touch process.*/console.*
2. parser/{clean,extract}.ts + schema/{resume,validate}.ts — deterministic markdown cleanup, schema-constrained Claude extraction, and an explicit re-validation boundary between them
3. renderers/{designed,ats}/template.ts + renderers/print.ts — two independent ResumeData -> HTML template functions, fanned out to a single shared Puppeteer Browser instance (launched once, used twice, closed once)

### Critical Pitfalls

1. **Schema-conformant but semantically wrong extraction (hallucinated dates, merged bullets, dropped skills)** — invisible to validation since it's still valid JSON; mitigate with a "verbatim, don't paraphrase" system-prompt instruction, extracting dates as literal strings normalized in deterministic code rather than by LLM inference, and a manual diff/spot-check before calling extraction "done."
2. **The ATS-clean PDF silently inherits ATS-unfriendly formatting via shared CSS** — "looks single-column" and "extracts in linear reading order" are different properties; verify with actual text extraction (pdftotext/pdf-parse), not visual inspection, and keep the ATS stylesheet independently declared (an explicit property allowlist) rather than "the designed stylesheet with overrides."
3. **No content-hash cache on the Claude call** — every CLI invocation (even a pure CSS tweak) re-triggers a full paid, several-second, non-deterministic API call; cache extracted JSON keyed on a hash of the source markdown, established during initial CLI wiring rather than retrofitted later.
4. **Font-loading race plus missing print CSS produce PDFs that only look right on the author's machine** — page.pdf() firing before document.fonts.ready resolves, plus missing break-inside: avoid on job entries, causes fallback-font or awkwardly-split-page output on a fresh clone/CI or with a genuinely multi-page resume; bundle fonts locally, await document.fonts.ready, and test against a multi-page fixture, not just a short placeholder.
5. **Secrets/personal data leaking into public-repo history** — this repo is public from commit zero (no private grace period); .gitignore + .env.example + a pre-commit secret scanner (gitleaks) must exist before the first API-key-touching code is written, and any committed example note/PDF must use fictional data, never the user's real resume.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Scaffold, schema, and secret hygiene
**Rationale:** The Zod schema is the one artifact every other stage depends on, and public-repo secret hygiene has no "clean up later" grace period — both must exist before any Claude-API-touching code is written.
**Delivers:** Repo scaffold (TS config, Biome, tsc build), .gitignore + .env.example + pre-commit secret scanner as the very first commit, schema/resume.ts (Zod schema adapted from JSON Resume) + schema/validate.ts, fixtures/sample-resume.json with fictional data.
**Addresses:** "Repo has TypeScript config, lint, and format tooling" (Active requirement); structured-data schema definition (FEATURES P1)
**Avoids:** Pitfall 7 (secret/personal-data leak) — the only pitfall whose prevention phase is explicitly "scaffold," not later

### Phase 2: Markdown to structured JSON extraction
**Rationale:** Depends only on Phase 1's schema; nothing about rendering needs to exist yet, and fixture-driven rendering (Phase 3) explicitly should not wait on this being perfect.
**Delivers:** parser/clean.ts (pure), parser/extract.ts (Claude call via zodOutputFormat()), content-hash caching on extraction, env-var API key handling with clear failure messaging, --validate-only/--dry-run flag.
**Uses:** @anthropic-ai/sdk + Zod structured-output pattern (STACK.md)
**Implements:** parser/ and schema/validate.ts boundary (ARCHITECTURE.md Pattern 1 & 3)

### Phase 3: Designed and ATS PDF rendering
**Rationale:** Both renderers only need validated ResumeData (from the fixture, not live Claude calls) and can be built/tested in parallel with Phase 2's extraction work; this is also where the highest-density pitfalls live (fonts, page-breaks, ATS text-order), so it needs its own definition-of-done checks rather than inheriting Phase 2's.
**Delivers:** renderers/designed/ and renderers/ats/ (independently-declared stylesheets), renderers/print.ts (single shared Puppeteer browser instance for both PDFs), bundled local fonts + document.fonts.ready wait, print CSS (break-inside: avoid), text-extraction regression check on the ATS output.
**Addresses:** Designed PDF + ATS-clean PDF renderers (FEATURES P1, both Active requirements)
**Avoids:** Pitfalls 4, 5, 6, 8 (Puppeteer install friction, font/OS rendering inconsistency, page-break control, ATS-CSS leakage) — all mapped to "rendering/PDF phase" in PITFALLS.md

### Phase 4: CLI integration, polish, and portfolio-readiness
**Rationale:** Wires the three prior phases into the actual `cvgen <path>` command; comes last because it depends on all upstream stages existing and stable.
**Delivers:** cli/index.ts orchestration (thin glue only, per Anti-Pattern 4), --help, exit codes, staged progress output, --verbose/--debug raw-output dump, README documenting install requirements (Node version, Chromium download needs network access) and a fresh-clone smoke test, end-to-end cvgen invocation producing both PDFs from a real Obsidian note.

### Phase Ordering Rationale

- Schema-first ordering is not a stylistic preference — FEATURES.md and ARCHITECTURE.md both independently converge on "schema is the single upstream artifact everything else depends on," so it must be Phase 1, not discovered mid-build.
- Extraction (Phase 2) and rendering (Phase 3) are architecturally parallel-capable (fixture-driven rendering means Phase 3 never needs a live Claude call), but are sequenced here for planning clarity since a single developer will likely build them in order; a team could split them.
- Secret hygiene is pulled forward into Phase 1 specifically because PITFALLS.md identifies zero grace period for a public repo — this is the one pitfall category where "later" is unacceptable, unlike caching or page-break CSS which degrade gracefully if temporarily skipped.
- CLI integration is last because it's pure composition risk (Anti-Pattern 4 — a monolithic cli/index.ts) — nothing new is invented here, so it should be quick if Phases 1-3 kept their module boundaries clean.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (rendering):** Font embedding/PDF-viewer-compatibility and ATS text-extraction verification are both narrow, under-documented areas (PITFALLS.md confidence here is MEDIUM — no single authoritative ATS spec exists) — worth a focused research pass on pdftotext/pdf-parse verification tooling and Puppeteer font-bundling specifics before implementation.
- **Phase 2 (extraction):** The Obsidian note's expected frontmatter/heading convention is being designed fresh with no existing standard to lean on (per PROJECT.md) — the schema-to-prompt mapping (how ambiguous dates/nested bullets get instructed) may need iteration research once real messy input is tested.

Phases with standard patterns (skip research-phase):
- **Phase 1 (scaffold):** Zod schema design, .gitignore/secret-scanner setup, and Biome config are all well-documented, high-confidence patterns (STACK.md rates this HIGH via live npm registry + official docs).
- **Phase 4 (CLI integration):** Commander wiring and exit-code conventions are standard, low-risk CLI patterns (clig.dev, HIGH confidence).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core picks verified against live npm registry metadata + Context7 official SDK docs; TS6/7 + typescript-eslint conflict independently confirmed via two GitHub issues |
| Features | MEDIUM-HIGH | CLI UX conventions (clig.dev) and Claude structured-outputs capability are HIGH/official-source; ATS-parsing behavior and competitor feature sets are MEDIUM (career-advice sites, README skims, no ATS-vendor internals) |
| Architecture | HIGH | Pattern space is narrow and well-precedented at this scale (schema-as-contract, pure-function pipeline, fixture-driven rendering); cross-checked against official Claude structured-outputs docs and general Node CLI best-practice guides |
| Pitfalls | MEDIUM-HIGH | Claude structured-output and public-repo secret-handling pitfalls verified against official docs/GitHub issue threads; Puppeteer font/rendering pitfalls verified against maintainer issue threads; ATS-parsing pitfalls are industry-consensus only, since ATS internals are proprietary and vary by vendor |

**Overall confidence:** HIGH

### Gaps to Address

- **ATS-parser ground truth:** No authoritative ATS vendor spec exists (Workday, Greenhouse internals are proprietary) — the "verify via text extraction" recommendation is the best available proxy, but actual behavior across real ATS platforms is unverifiable without live testing against those systems. Treat the text-extraction check as necessary-but-not-provably-sufficient during planning.
- **Obsidian note convention:** No existing frontmatter/heading standard to adopt — this is being designed fresh as part of the project (confirmed in PROJECT.md), so Phase 2 planning should budget iteration time against real messy notes rather than assuming the first schema draft is final.
- **TypeScript 7.0 adoption timing:** Its programmatic compiler API doesn't ship until 7.1 — if Biome is chosen, TS7 is safe now; if ESLint is later added, TypeScript must stay pinned to ^6.0.3. This is a live-tracked ecosystem gap (both GitHub issues cited are open/recently closed), not a stable fact — worth a quick version-check at Phase 1 execution time rather than trusting this document's exact version numbers indefinitely.

## Sources

### Primary (HIGH confidence)
- /anthropics/anthropic-sdk-typescript (Context7) — zodOutputFormat()/jsonSchemaOutputFormat structured-output helpers, messages.parse
- Claude API Structured Outputs (docs.claude.com / platform.claude.com) — official Anthropic documentation
- npm registry `npm view` live metadata (2026-07-27) for commander, yargs, @anthropic-ai/sdk, puppeteer, puppeteer-core, @sparticuz/chromium, tsx, tsup, typescript, eslint, prettier, @biomejs/biome, dotenv, zod, typescript-eslint
- Announcing TypeScript 7.0 (devblogs.microsoft.com); typescript-eslint#12518; eslint#21070
- Node.js Evolving the Release Schedule (nodejs.org) + endoflife.date/nodejs
- JSON Resume Schema (jsonresume.org) / JSON Resume Documentation (docs.jsonresume.org)
- Command Line Interface Guidelines (clig.dev)
- Increase output consistency — Claude Platform Docs

### Secondary (MEDIUM confidence)
- Why Your TypeScript 7 Upgrade Broke ESLint, ts-jest, and ts-morph (dev.to)
- Biome type-aware linter issue #3187
- Puppeteer font/PDF issue threads: puppeteer#3668, #2278, #2410, #7401; browserless.io Puppeteer font fix guide
- ATS-friendliness research: Jobscan ATS-friendly formats, Jobscan keyword stuffing, Cangrade white-fonting, Resumemate tables/ATS parsing
- codysnider/resume (README-derived), competitor generators surfaced via WebSearch
- GitHub public-repo secret-handling community discussions (161907, 187601, 169652)

### Tertiary (LOW confidence)
- nietaki/markdown-resume and other WebSearch-surfaced markdown-resume tools — not individually verified beyond search summaries, needs validation if directly emulated

---
*Research completed: 2026-07-27*
*Ready for roadmap: yes*
