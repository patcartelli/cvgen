# Phase 2: Markdown to Structured JSON Extraction - Context

**Gathered:** 2026-07-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Claude API extraction pipeline: read a markdown resume note, call Claude with the raw markdown and zodOutputFormat(), validate the response against ResumeSchema, and surface readable errors. Also deliver the --validate-only/--dry-run entry point (DEVX-01). No rendering, no full Commander CLI wiring — that is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Prompt Strategy

- **D-P01:** System prompt is schema-only and minimal — e.g., "Extract the resume data from this markdown document." Do NOT include the D-01–D-08 heading conventions. Trust zodOutputFormat() and the Zod schema to guide the model.
- **D-P02:** No markdown preprocessing. Send the raw markdown string directly to Claude — no frontmatter extraction, no section splitting, no Obsidian syntax stripping before the API call.

### Error Detection

- **D-E01:** Two-layer error detection — pre-flight markdown check first, then post-call Zod validation. Pre-flight catches structural issues before burning API tokens.
- **D-E02:** Pre-flight checks: all 6 required frontmatter fields (name, email, phone, location, linkedin, github — from D-01) and the three required section headings (## Experience, ## Education, ## Skills). Summary and Core Competencies are optional (D-06) and are NOT pre-flight checked.
- **D-E03:** Post-call Zod errors formatted as path-based readable messages: e.g., `experience[0].bullets: expected array, got undefined`. Format each ZodError issue as `{field-path}: {message}`.

### Module Structure

- **D-M01:** Extraction logic lives in `src/lib/extract.ts`, exporting `extractResume(markdown: string): Promise<ResumeData>`. This is the function Phase 4's CLI imports and calls.
- **D-M02:** `--validate-only` / `--dry-run` entry point is a thin `process.argv` check in `src/cli/index.ts` — no Commander yet. If the flag is present, call `extractResume()` and `JSON.stringify(result, null, 2)` to stdout. Phase 4 replaces this with full Commander argument parsing.

### Markdown Fixture

- **D-F01:** One clean, well-formed `.md` fixture at `fixtures/sample-resume.md`, following D-01–D-08 exactly and matching the data in `fixtures/sample-resume.json`. This is the happy-path extraction target. Messy/real-world note testing is deferred to Phase 4's end-to-end pass.

### Claude's Discretion

- Exact system prompt wording (beyond "schema-only, minimal")
- How to format the "unset API key" error message (e.g., "Error: ANTHROPIC_API_KEY is not set. Export it before running cvgen.")
- Whether to surface multiple pre-flight errors in one pass or fail on the first missing field/heading
- Pretty-printing approach for --validate-only JSON output

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements & Goals
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria (4 criteria), dependency chain
- `.planning/REQUIREMENTS.md` — PARSE-01, PARSE-02, PARSE-03, SEC-01, DEVX-01 are the requirements this phase covers
- `.planning/PROJECT.md` — core value, constraints (API key from env var, no web routes, no content invention)

### Technology Stack
- `CLAUDE.md` — **primary stack reference**: pinned versions (TypeScript 6.0.3, @anthropic-ai/sdk 0.115.0, Zod 4.4.3, tsx 4.23.1), Claude structured-output pattern (zodOutputFormat + messages.parse), env var pattern (process.loadEnvFile + ANTHROPIC_API_KEY)

### Existing Schema Contract
- `src/schema/resume.ts` — ResumeSchema (Zod) and ResumeData type (inferred). The extraction output MUST validate against this. Do not modify the schema in Phase 2.

### Input Convention (locked in Phase 1)
- `.planning/phases/01-scaffold-schema-secret-hygiene/01-CONTEXT.md` — D-01 through D-08 define the markdown input format exactly; D-09 through D-14 define the Zod schema fields. Both are locked.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/schema/resume.ts` — exports `ResumeSchema` (Zod object) and `ResumeData` (TypeScript type). Import both into `src/lib/extract.ts`.
- `src/schema/validate.ts` — check whether it exports a reusable validate helper before writing a new one.
- `fixtures/sample-resume.json` — the expected validated output for the markdown fixture. Use as the ground truth when verifying extraction.

### Established Patterns
- ESM-only (`"type": "module"` in package.json) — all imports use `.js` extensions in TypeScript source.
- `process.loadEnvFile('.env')` in a try/catch at the entry point (CLAUDE.md env var pattern) — Phase 2 adds this to `src/cli/index.ts`.
- No Commander yet — `src/cli/index.ts` is a stub. Phase 2 replaces the stub with a thin `process.argv` handler.

### Integration Points
- `src/cli/index.ts` receives `process.argv` — Phase 2 replaces the stub to handle `--validate-only`/`--dry-run` and the markdown file path argument.
- `src/lib/extract.ts` is the new file Phase 4 imports — its export signature (`extractResume`) must remain stable from Phase 2 onward.

</code_context>

<specifics>
## Specific Ideas

- `--validate-only` and `--dry-run` are synonymous flags for the same behavior (per DEVX-01). Both should work; one can be an alias of the other.
- The pre-flight error should name the specific missing field/heading: "Missing required frontmatter field: linkedin" or "Missing required section: ## Education". Not a generic "invalid input" message.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Markdown to Structured JSON Extraction*
*Context gathered: 2026-07-27*
