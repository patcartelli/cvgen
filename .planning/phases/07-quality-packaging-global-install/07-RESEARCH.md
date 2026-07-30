# Phase 7: Quality, Packaging & Global Install — Research

**Researched:** 2026-07-30
**Domain:** npm global install / CLI packaging, TypeScript types, test-runner consolidation
**Confidence:** HIGH

---

## Summary

Phase 7 has three formal requirements (QUAL-01, QUAL-02, QUAL-03). Two of them — QUAL-01 (rawResponse type fix) and QUAL-02 (test runner consolidation) — were already resolved by quick tasks before v1.1 phase work began, but the formal tracking documents (REQUIREMENTS.md, PROJECT.md, and the ROADMAP's phase Success Criteria checklist) have not been updated to reflect this.

QUAL-03 (global install) is the only substantive code-path work remaining. The package.json infrastructure for global install is largely correct: the `bin` field, shebang, `files` array, `type: "module"`, and `engines` constraint are all present and valid. The gap is that `dist/` is gitignored and the `prepare` lifecycle hook runs `simple-git-hooks` (not `tsc`), so a fresh clone followed by `npm install -g .` or `npm link` will fail unless the user first runs `npm run build`. The current README install instructions already document this 3-step flow (`npm install` → `npm run build` → `npm link`), but the README's output-path description is stale after Phase 6 changed output routing from "alongside the input file" to `output/` relative to cwd.

**Primary recommendation:** Phase 7 is a documentation and tracking-reconciliation task with one additive packaging safeguard (`prepack` build hook) and one README correction, not a code-rewrite task. The correct approach is: (1) add `"prepack": "npm run build"` to package.json so `npm pack` and future `npm publish` auto-compile; (2) correct the README output-path prose to reflect Phase 6 routing; (3) update REQUIREMENTS.md and PROJECT.md to mark QUAL-01 and QUAL-02 as complete; and (4) execute the human-verify step for QUAL-03 (run `npm run build && npm link && cvgen --help` in a temp directory).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUAL-01 | `rawResponse` in `ExtractResult` is typed as `ParsedMessage<ResumeData>` so `--verbose` output is complete (CR-01) | Already implemented in commit 9ba6e1d. `src/lib/extract.ts` imports `ParsedMessage` from `@anthropic-ai/sdk` and declares `rawResponse: ParsedMessage<ResumeData>`. No code change required — only REQUIREMENTS.md/PROJECT.md tracking update. |
| QUAL-02 | Test suite runs under a single test runner with no conflicting scripts in package.json (WR-04) | Already implemented in commit fc9a507. vitest removed (`npm uninstall vitest`), `vitest.config.ts` deleted, `test` script is `tsx --test src/**/*.test.ts` with no competing entry. 44 tests pass. No code change required — only tracking update. |
| QUAL-03 | User can install and run `cvgen` as a global command via `npm install -g` or `npm link` | Requires: (1) verify build → link flow works end-to-end; (2) add `prepack` build hook; (3) update stale README output-path description. No source code changes needed. |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Global CLI invocation (`cvgen <path>`) | Build artifact (dist/) | OS bin PATH | Node resolves the `bin` field symlink; shebang delegates runtime to `node` |
| `rawResponse` typing | Source (src/lib/extract.ts) | — | Compile-time type lives in the source layer; no runtime tier involved |
| Test runner execution | Dev toolchain (tsx --test) | — | Runs against source via tsx, no build artifact needed |
| Documentation accuracy | Repository docs (README.md, .planning/*.md) | — | Consumer-facing and planner-facing; no runtime tier |

---

## Standard Stack

No new libraries are introduced in Phase 7. All existing tooling applies.

| Tool | Current Version | Role in Phase 7 |
|------|----------------|-----------------|
| TypeScript (tsc) | ^6.0.3 | `npm run build` compiles src/ → dist/ for packaging |
| tsx | ^4.23.1 | Test runner (`tsx --test`) — already the only runner |
| `@anthropic-ai/sdk` | ^0.115.0 | `ParsedMessage<T>` type sourced from its root export |

**No new packages to install. No Package Legitimacy Audit required.**

---

## Pre-Research State: What Is Already Done

This section documents findings the planner MUST treat as facts, not as tasks.

### QUAL-01 — rawResponse type (ALREADY DONE)

**Commit:** `9ba6e1d` (2026-07-28) `fix: use ParsedMessage<ResumeData> for rawResponse`

**Current state of `src/lib/extract.ts`:**
```typescript
import type { ParsedMessage } from "@anthropic-ai/sdk";   // ← correct root-level import
export interface ExtractResult {
  data: ResumeData;
  rawResponse: ParsedMessage<ResumeData>;                 // ← correct type
}
```

`ParsedMessage<T>` is defined in `@anthropic-ai/sdk/lib/parser.d.ts` as:
```typescript
export type ParsedMessage<ParsedT> = Message & {
  content: Array<ParsedContentBlock<ParsedT>>;
  parsed_output: ParsedT | null;
};
```

`parsed_output` is a named property on the object (not a non-enumerable method), so `JSON.stringify(rawResponse)` in `--verbose` mode will include it. The old `Message` type did not have `parsed_output` and the field was invisible in verbose output. This is verified as correct. [VERIFIED: grep of node_modules/@anthropic-ai/sdk/lib/parser.d.ts]

**Tracking needed:** REQUIREMENTS.md line 23 (`- [ ] QUAL-01`) → change to `[x]`. PROJECT.md "Active" list entry for CR-01 → move to "Validated". No source edits.

### QUAL-02 — Test runner (ALREADY DONE)

**Commit:** `fc9a507` (2026-07-28) `chore: remove vitest — consolidate on tsx --test`

**Current state of package.json:**
- `"test": "tsx --test src/**/*.test.ts"` — only one test entry [VERIFIED: package.json]
- No `vitest.config.*` file exists [VERIFIED: find output]
- No vitest in `devDependencies` [VERIFIED: package.json]
- 44 tests, 0 failures [VERIFIED: npm test output]

**Tracking needed:** REQUIREMENTS.md line 24 (`- [ ] QUAL-02`) → change to `[x]`. PROJECT.md WR-04 entry → move to Validated. No source edits.

---

## QUAL-03: Global Install — Technical Analysis

### Current package.json Fields (All Correct)

```json
{
  "name": "cvgen",
  "type": "module",
  "engines": { "node": ">=22.12.0" },
  "files": ["dist"],
  "bin": { "cvgen": "dist/cli/index.js" }
}
```

All four fields required for a global CLI are present and correct. [VERIFIED: package.json]

### Shebang (Correct)

`dist/cli/index.js` line 1: `#!/usr/bin/env node` [VERIFIED: head -1 dist/cli/index.js]

The shebang is emitted by tsc because it is in `src/cli/index.ts` line 1. tsc preserves shebangs verbatim. npm sets the execute bit (+x) automatically on the file when creating the global symlink — the file does not need to be pre-marked executable in the repo. [ASSUMED: npm bin chmod behavior; consistent with how node_modules/.bin links work locally]

### dist/ Is Gitignored — The Critical Gap

`.gitignore` contains `dist/`. This means:

- `dist/` is not tracked in git
- A fresh `git clone` produces no `dist/` directory
- Running `npm install -g .` after a fresh clone will find no `dist/cli/index.js` to link

**The current README already handles this correctly:**
```bash
git clone https://github.com/patcartelli/cvgen.git
cd cvgen
npm install
npm run build   # compile TypeScript to dist/
npm link        # makes `cvgen` available as a global command
```
[VERIFIED: README.md Install section]

### npm Lifecycle Hook Gap

The `prepare` lifecycle hook currently runs `simple-git-hooks`, not `tsc`. [VERIFIED: package.json scripts.prepare]

| Hook | When it runs | Impact |
|------|-------------|--------|
| `prepare` | `npm install`, `npm link`, `npm pack`, `npm publish` | Currently installs git hooks only, does NOT build |
| `prepack` | `npm pack`, `npm publish` (NOT `npm link`) | Would auto-build before tarball creation |

**Recommendation:** Add `"prepack": "npm run build"` to package.json scripts. This ensures that if the package is ever published to the registry (`npm publish`) or packed for distribution (`npm pack`), the dist/ is always rebuilt from current source. It does NOT run on `npm install` or `npm link`, so dev workflow is unchanged.

For the `npm link` path (documented in README), the user must still run `npm run build` first — this is standard and is already in the README.

### README Stale Content

The README's "Output files are written alongside the input file" description is incorrect after Phase 6. [VERIFIED: README.md Usage section vs Phase 6 source code]

**What README says (stale):**
> Output files are written alongside the input file:
> - `resume-resume.pdf` — portfolio-quality typographic PDF
> - `resume-resume-ats.pdf` — simplified single-column ATS-safe PDF

**What Phase 6 actually does (current behavior):**
- Running `cvgen <path>` prompts whether the resume is tailored
- Answering "n" → files written to `output/` relative to cwd
- Answering "y" + company name → files written to `output/<Company-Slug>/` relative to cwd

The Usage section also lacks a mention of the tailored-prompt interaction.

---

## Architecture Patterns

### npm Global Install Flow (npm link, development)

```
git clone → npm install → npm run build → npm link
                                |
                          tsc: src/ → dist/
                                |
                          dist/cli/index.js
                          (shebang: #!/usr/bin/env node)
                                |
                    npm creates global symlink:
                    ~/.npm/bin/cvgen → .../dist/cli/index.js
                    (npm sets +x automatically)
                                |
                          cvgen <path>
                          (any directory, node resolves symlink)
```

### Lifecycle Hook Pattern for Publishing

```
package.json scripts:
  "prepack":  "npm run build"   ← auto-compile before npm pack / npm publish
  "prepare":  "simple-git-hooks" ← git hooks only (unchanged)
  "build":    "tsc"
```

This follows the standard TypeScript CLI pattern: `prepack` gates the tarball, `prepare` handles dev environment. [ASSUMED: lifecycle hook best practice pattern from training knowledge; consistent with npm docs behavior]

---

## Common Pitfalls

### Pitfall 1: Stale dist/ After Source Changes
**What goes wrong:** Developer edits source, runs `npm link`, tests the old compiled version of the binary.
**Why it happens:** `dist/` is gitignored and not auto-rebuilt by `npm link`. The symlink points to the compiled files, not the source.
**How to avoid:** Always run `npm run build` before `npm link` (documented in README). For future self: consider adding `prepack` as the safety net for registry publishing.
**Warning signs:** `cvgen --version` prints old version number, or Phase 6 prompts are absent.

### Pitfall 2: execute bit Missing on dist/cli/index.js
**What goes wrong:** `cvgen` command fails with "permission denied" after `npm link`.
**Why it happens:** If tsc emits the file with 0644 (no execute bit), and npm link doesn't set it.
**How to avoid:** npm does set +x when creating global bin symlinks. The shebang being present is what triggers this behavior. Confirm end-to-end: `npm link && cvgen --help`.
**Warning signs:** `ls -la $(which cvgen)` shows no execute bit.

### Pitfall 3: ESM resolution at global install
**What goes wrong:** `cvgen` throws `ERR_REQUIRE_ESM` or cannot find modules after global install.
**Why it happens:** `"type": "module"` in package.json makes all `.js` files ESM. If node's module resolver can't trace relative imports from the symlink target location, imports like `../lib/render.js` may fail.
**How to avoid:** `npm link` symlinks to the ORIGINAL `dist/` directory (not a copy), so relative imports resolve against the original project path, not the global bin location. This is correct behavior for development installs. [ASSUMED: npm link symlink resolution behavior]
**Warning signs:** `Error [ERR_MODULE_NOT_FOUND]: Cannot find module` after running the globally linked command.

### Pitfall 4: REQUIREMENTS.md / PROJECT.md Tracking Drift
**What goes wrong:** QUAL-01 and QUAL-02 remain marked `[ ]` in REQUIREMENTS.md despite being done, causing confusion about Phase 7 scope.
**Why it happens:** Quick tasks completed the work but didn't update the formal requirement tracking docs.
**How to avoid:** Phase 7 Wave 1 must update REQUIREMENTS.md, PROJECT.md active/validated lists, and ROADMAP.md completion notes. Do this first.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type for structured Claude API response | Custom wrapper type | `ParsedMessage<T>` from `@anthropic-ai/sdk` | Already the correct type in extract.ts; already has `parsed_output: T | null` as an enumerable property |
| Build-before-pack automation | Custom pre-publish script | `"prepack": "npm run build"` in package.json scripts | npm's `prepack` hook is the designated hook for this purpose |
| Test runner | New test framework | `tsx --test` (Node built-in test runner via tsx) | Already the sole runner; 44 tests pass; no reason to change |

---

## Code Examples

### ParsedMessage type source (from installed SDK)

```typescript
// node_modules/@anthropic-ai/sdk/lib/parser.d.ts
export type ParsedMessage<ParsedT> = Message & {
  content: Array<ParsedContentBlock<ParsedT>>;
  parsed_output: ParsedT | null;
};
```
[VERIFIED: grep node_modules/@anthropic-ai/sdk/lib/parser.d.ts]

### Correct import for ParsedMessage (already in extract.ts)

```typescript
import type { ParsedMessage } from "@anthropic-ai/sdk";
```
[VERIFIED: src/lib/extract.ts line 3]

### prepack hook pattern (to add)

```json
{
  "scripts": {
    "build": "tsc",
    "prepack": "npm run build",
    "prepare": "simple-git-hooks",
    "test": "tsx --test src/**/*.test.ts"
  }
}
```
[ASSUMED: npm lifecycle hook pattern from training; consistent with npm documentation]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `rawResponse: Message` (base SDK type, no `parsed_output`) | `rawResponse: ParsedMessage<ResumeData>` (includes `parsed_output` as enumerable prop) | Commit 9ba6e1d, 2026-07-28 | `--verbose` JSON.stringify now includes the parsed resume data |
| Two test runners: `tsx --test` + vitest | Single runner: `tsx --test` | Commit fc9a507, 2026-07-28 | `npm test` is unambiguous; no vitest config to maintain |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | CLI runtime | ✓ | v26.4.0 (exceeds >=22.12.0) | — |
| npm | Package install/link | ✓ | 11.17.0 | — |
| tsc | `npm run build` | ✓ | ^6.0.3 (devDep) | — |
| tsx | `npm test` | ✓ | ^4.23.1 (devDep) | — |

**No missing dependencies.** All tools needed for Phase 7 are present.

---

## Validation Architecture

> `nyquist_validation: false` in .planning/config.json — this section is skipped.

---

## Security Domain

No security concerns specific to Phase 7. All changes are documentation, build hooks, and tracking updates. The security posture established in prior phases (API key from env only, no credential commits) is unchanged.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | npm sets +x on the bin target file automatically when creating global symlinks | Common Pitfalls / Global Install Flow | If npm doesn't set +x, `cvgen` would fail with permission denied after `npm link`; human-verify step catches this |
| A2 | npm link symlink resolves relative imports against the original project path, not the global bin directory | Common Pitfalls Pitfall 3 | If ESM relative imports fail, the linked command would throw ERR_MODULE_NOT_FOUND; human-verify step catches this |
| A3 | `"prepack"` is the correct npm lifecycle hook to auto-build before `npm pack` / `npm publish` (not before `npm link`) | Architecture Patterns / prepack pattern | If the hook name is wrong, dist/ would not be rebuilt before publishing; low risk since the research phase verified this via README context and npm lifecycle reasoning |

---

## Open Questions

1. **Does the human-verify for QUAL-03 need a live API key?**
   - What we know: `cvgen --help` and `cvgen init` do not call the API; they test the global symlink resolution without requiring ANTHROPIC_API_KEY.
   - What's unclear: Whether the phase success criterion "works in any directory" means only `--help` (sufficient to prove bin wiring) or a full PDF render with a live key.
   - Recommendation: `npm run build && npm link && cvgen --help` is sufficient to verify QUAL-03 (the bin field, shebang, ESM resolution, and global PATH wiring). A full PDF render belongs to integration testing, not packaging verification.

2. **Should README output-path description be updated in Phase 7 or was it Phase 6's responsibility?**
   - What we know: Phase 6 VERIFICATION.md gap list is empty; README update was not listed as a Phase 6 deliverable.
   - What's unclear: Whether this falls naturally into Phase 7 (as "no code debt remaining") or is a standalone quick task.
   - Recommendation: Include it in Phase 7 as a Wave 1 doc task. It's a 3-line README change.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/extract.ts` — current rawResponse type, import path (read directly)
- `node_modules/@anthropic-ai/sdk/lib/parser.d.ts` — ParsedMessage<T> definition (read directly)
- `package.json` — bin, files, type, engines, scripts fields (read directly)
- `dist/cli/index.js` line 1 — shebang verified (read directly)
- `.gitignore` — dist/ exclusion confirmed (read directly)
- `README.md` — install instructions and stale output-path description (read directly)
- `npm test` output — 44 pass, 0 fail, single runner (executed directly)
- `npm run typecheck` output — exits 0, no type errors (executed directly)
- `npm run build` output — exits 0, dist/ rebuilt (executed directly)
- git log — commit 9ba6e1d and fc9a507 verified (executed directly)
- `.planning/quick/20260728-fix-cr01-wr04/SUMMARY.md` — QUAL-01 and QUAL-02 completion record (read directly)

### Tertiary (LOW confidence)
- npm bin chmod behavior (+x set automatically) — training knowledge, will be confirmed by human-verify step [ASSUMED]
- `prepack` lifecycle hook fires for `npm pack` / `npm publish` but not `npm link` — training knowledge [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- QUAL-01 status (already done): HIGH — verified via git commit, current source code, and SDK type definition
- QUAL-02 status (already done): HIGH — verified via git commit, package.json, npm test output
- QUAL-03 packaging analysis: HIGH (file structure) / ASSUMED (npm runtime behavior)
- README stale content: HIGH — verified by reading README and Phase 6 source

**Research date:** 2026-07-30
**Valid until:** 2026-08-30 (stable domain; no moving dependencies)
