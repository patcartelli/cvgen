# Phase 6: Output Directory Routing - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Add two interactive prompts to the `cvgen <path>` CLI flow and rewire PDF output routing:

1. After file preflight, ask the user: "Is this tailored for a specific company? (y/n)"
2. If yes, ask: "Company name?" and write both PDFs to `output/<slug>/` relative to cwd
3. If no, write both PDFs to `output/` relative to cwd
4. Create the output directory automatically if it doesn't exist

This replaces the current behavior where PDFs are written next to the input markdown file.

**In scope:** Interactive prompts, slug generation, output directory routing, auto-mkdir
**Out of scope:** Non-interactive flag (`--company "Acme"`) — deferred to v2 per REQUIREMENTS.md Future Requirements
</domain>

<decisions>
## Implementation Decisions

### Company Name → Directory Slug

- **D-01:** Use Title-Case-Hyphen format — spaces become hyphens, casing is preserved. Example: "Acme Corp" → `Acme-Corp`, "Goldman Sachs" → `Goldman-Sachs`.
- **D-02:** Strip special characters before slugging — ampersands, commas, dots, and other non-alphanumeric/non-space chars are dropped without replacement. Example: "Goldman Sachs & Partners" → `Goldman-Sachs-Partners`, "AT&T" → `ATT`.

### Claude's Discretion

- **Prompt timing:** Place the "tailored?" prompt after preflight (Step D), before the Claude extraction call (Step E). Rationale: file is validated at that point so the prompt has context, and placing it before extraction avoids wasting an API call if the user decides to abort.
- **PDF filename within `output/`:** Keep the existing stem-based naming convention (`{stem}-resume.pdf` / `{stem}-resume-ats.pdf`) — output directory now signals the company; filename doesn't need to repeat it.
- **Prompting library:** Use Node's built-in `readline` (`createInterface` pattern) — no new dependency needed for two simple string prompts.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` §"Phase 6: Output Directory Routing" — goal, success criteria, dependencies
- `.planning/REQUIREMENTS.md` §"Output Directory" — OUTPUT-01, OUTPUT-02 requirements text

### Existing CLI Flow to Modify
- `src/cli/index.ts` — Steps A–H; new prompt inserts between Step D (preflight) and Step E (extraction); Step H call to `resolveOutputPaths` must be replaced with the new routing logic
- `src/lib/render.ts` — `resolveOutputPaths` function (lines ~15–24); current contract uses `dirname(inputMdPath)` — contract changes entirely; function may move or be replaced

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `node:fs/promises` — already imported in `src/cli/index.ts`; add `mkdir` with `{ recursive: true }` for auto-create
- `node:readline` — Node built-in; `createInterface({ input: process.stdin, output: process.stdout })` pattern for the two prompts
- `node:path` — `join`, `basename`, `dirname` already imported; `join(process.cwd(), 'output', slug)` for the new output paths

### Established Patterns
- Steps A–H error handling: `program.error(message, { exitCode: 1 })` for failures; interactive prompt errors should follow the same pattern
- `resolveOutputPaths` returns `{ designed: string; ats: string }` — downstream callers (`renderDesigned`, `renderAts`) only receive the final paths, so the return shape can stay the same while the internal derivation changes
- `smoke-render.ts` script calls `resolveOutputPaths` directly for fixture-based smoke testing — will need updating when `resolveOutputPaths` signature changes

### Integration Points
- `src/cli/index.ts` Step H: `const paths = resolveOutputPaths(absPath)` — this is the sole call site for `resolveOutputPaths` in the live CLI path
- `src/lib/render.test.ts` Tests 1–3: cover `resolveOutputPaths` with the current stem-from-dirname behavior — these tests will need to be updated or replaced when the function's contract changes
- `scripts/smoke-render.ts`: calls `resolveOutputPaths` for non-interactive smoke testing — needs to be made compatible with the new routing (either bypass prompts or accept a fixture path directly)

</code_context>

<specifics>
## Specific Ideas

- Success criteria example uses `output/Acme-Corp/` — confirms Title-Case-Hyphen slug as the target directory name format
- "output/" directory name is hardcoded per success criteria — not configurable in this phase

</specifics>

<deferred>
## Deferred Ideas

- Non-interactive flag (`--company "Acme Corp"`) to skip prompts in CI or scripts — explicitly noted in REQUIREMENTS.md Future Requirements as a v2 item
- Configurable output root (e.g. `--output-dir`) — not in scope for this phase

</deferred>

---

*Phase: 6-output-directory-routing*
*Context gathered: 2026-07-30*
