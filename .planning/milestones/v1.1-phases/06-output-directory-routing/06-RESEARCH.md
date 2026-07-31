# Phase 6: Output Directory Routing - Research

**Researched:** 2026-07-30
**Domain:** Node.js CLI interactive prompts, filesystem routing, slug generation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Title-Case-Hyphen slug format — spaces become hyphens, casing preserved. "Acme Corp" → `Acme-Corp`.
- **D-02:** Strip special characters before slugging — ampersands, commas, dots, and other non-alphanumeric/non-space chars dropped without replacement. "Goldman Sachs & Partners" → `Goldman-Sachs-Partners`, "AT&T" → `ATT`.
- **Prompt timing:** After preflight (Step D), before Claude extraction call (Step E).
- **PDF filename:** Keep existing stem-based naming (`{stem}-resume.pdf` / `{stem}-resume-ats.pdf`).
- **Prompting library:** Node built-in `readline` (`createInterface` pattern) — no new dependency.

### Claude's Discretion
- Exact wording of the two prompt strings
- Error handling for empty company name after slug generation
- How `smoke-render.ts` handles the non-interactive path (bypass prompts or accept fixture path directly)
- Whether `resolveOutputPaths` is modified in-place or replaced by a new function

### Deferred Ideas (OUT OF SCOPE)
- Non-interactive flag (`--company "Acme Corp"`) — v2 per REQUIREMENTS.md Future Requirements
- Configurable output root (`--output-dir`) — not in scope for this phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OUTPUT-01 | CLI asks the user whether the resume is tailored for a specific company; if yes, prompts for the company name | Node `readline/promises` createInterface pattern; two sequential `rl.question()` calls |
| OUTPUT-02 | Both PDFs are written to `output/` (not tailored) or `output/<Company-Name>/` (tailored), relative to cwd, creating the directory if needed | `process.cwd()` + `path.join` for output root; `fs.mkdir({ recursive: true })` for auto-create; `resolveOutputPaths` contract change |
</phase_requirements>

---

## Summary

Phase 6 is a focused CLI flow extension with three mechanical parts: (1) two sequential interactive prompts using Node's built-in `readline/promises` API, (2) a slug function that converts a company name to the Title-Case-Hyphen directory format locked in D-01 and D-02, and (3) rewiring `resolveOutputPaths` so it accepts an output directory instead of deriving one from `dirname(inputMdPath)`.

The existing `resolveOutputPaths` function in `src/lib/render.ts` (lines 15–24) is a pure three-line helper with a simple contract: takes an input `.md` path, returns `{ designed, ats }` using `dirname` for the directory and stem-based filenames. Its return shape (`{ designed: string; ats: string }`) is what `renderDesigned` and `renderAts` consume — that shape can stay unchanged. Only the directory derivation logic changes. The cleanest approach is to change the function's signature to accept a pre-computed `outputDir` string rather than recomputing from the input path, and add the slug + mkdir logic in the CLI layer.

The primary test impact is Tests 1–3 in `render.test.ts`, which currently assert the old dirname-based behavior. Those tests need to be rewritten to match the new signature. The CLI test suite (`index.test.ts`) runs the CLI as a subprocess via `spawnSync`, which supports an `input` option for stdin injection — so integration coverage of the interactive prompts is achievable without a separate mocking library.

**Primary recommendation:** Add a `toCompanySlug()` helper in `src/lib/render.ts` (pure function, easily unit-tested), change `resolveOutputPaths` to take `outputDir: string` instead of deriving it, handle the prompt + mkdir in `src/cli/index.ts` between Steps D and E, and update smoke-render to pass a hardcoded output dir directly (bypassing prompts entirely).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Interactive prompts (y/n, company name) | CLI layer (`src/cli/index.ts`) | — | Prompts are user-facing I/O; belongs in the entry-point action handler, not in lib |
| Slug generation | Lib layer (`src/lib/render.ts`) | — | Pure function with no I/O side effects; testable in isolation; reusable if a `--company` flag is added in v2 |
| Output directory construction | CLI layer (`src/cli/index.ts`) | — | `process.cwd()` and `path.join` needed; CLI owns cwd context |
| Directory auto-creation (`mkdir`) | CLI layer (`src/cli/index.ts`) | — | Filesystem side effect; matches existing pattern of `writeFile` in CLI layer |
| PDF path derivation | Lib layer (`src/lib/render.ts`) via `resolveOutputPaths` | — | `resolveOutputPaths` is already the canonical path helper; contract narrows to accept a pre-computed dir |

---

## Standard Stack

### Core (all built-ins — no new npm packages)

| Module | Source | Purpose | Notes |
|--------|--------|---------|-------|
| `node:readline/promises` | Node.js built-in (≥17.0.0) | Async interactive prompts | `createInterface({ input: process.stdin, output: process.stdout })` + `rl.question()` returns a Promise |
| `node:fs/promises` | Node.js built-in | `mkdir` with `{ recursive: true }` for auto-create | Already imported in `src/cli/index.ts` — add `mkdir` to the existing import |
| `node:path` | Node.js built-in | `join(process.cwd(), 'output', slug)` for output dir construction | Already imported in `src/cli/index.ts` |

**No new npm packages.** [VERIFIED: node.js docs] All capabilities come from Node built-ins already available on Node ≥22.12.0 (the project's `engines.node` floor).

### Package Legitimacy Audit

Not applicable. This phase installs no external packages.

---

## Architecture Patterns

### System Architecture Diagram

```
cvgen <path>
    │
    ▼
[Step A–D: env load, key guard, file read, preflight]
    │
    ▼ (new Step D.5)
[promptOutputDir()]
  readline/promises createInterface
  rl.question("Is this tailored? (y/n)")
    ├── "n" / any non-y → outputDir = join(cwd, 'output')
    └── "y" → rl.question("Company name:")
                company = trim(answer)
                slug = toCompanySlug(company)
                guard: slug empty → program.error(...)
                outputDir = join(cwd, 'output', slug)
    │
    ▼
[fs.mkdir(outputDir, { recursive: true })]
    │
    ▼
[Step E–G: Claude extraction, verbose, validate-only routing]
    │
    ▼ (Step H modified)
[const paths = resolveOutputPaths(absPath, outputDir)]
  designed = join(outputDir, stem + '-resume.pdf')
  ats      = join(outputDir, stem + '-resume-ats.pdf')
    │
    ▼
[renderDesigned + renderAts → write to outputDir]
    │
    ▼
[console.log("Written: " + paths.designed / paths.ats)]
```

### Recommended Project Structure

No new files required. All changes are to existing files:

```
src/
├── cli/
│   └── index.ts          # Add promptOutputDir() logic between Step D and E
│                         # Add mkdir(outputDir, {recursive: true}) before Step E
│                         # Change Step H: pass outputDir to resolveOutputPaths
└── lib/
    ├── render.ts          # Add toCompanySlug() export; change resolveOutputPaths signature
    └── render.test.ts     # Rewrite Tests 1–3 for new resolveOutputPaths; add slug tests
scripts/
└── smoke-render.ts        # Bypass prompts: construct outputDir directly from tmp path
```

### Pattern 1: readline/promises Two-Prompt Async Pattern

**What:** Use `node:readline/promises` (Node ≥17) for `async/await`-native prompts — no callback wrapping needed.
**When to use:** Any time a CLI needs sequential user input in an async action handler.

```typescript
// Source: Node.js built-in readline/promises API [VERIFIED: Node.js docs node.org/api/readline.html]
import { createInterface } from "node:readline/promises";

async function promptOutputDir(cwd: string, inputMdPath: string): Promise<{ outputDir: string; companySlug: string }> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question("Is this resume tailored for a specific company? (y/n): ");
    if (answer.trim().toLowerCase().startsWith("y")) {
      const company = await rl.question("Company name: ");
      const slug = toCompanySlug(company.trim());
      if (!slug) {
        // company name reduced to empty after stripping — treat as non-tailored
        // OR: program.error("Company name cannot be empty or all special characters.")
        return { outputDir: join(cwd, "output"), companySlug: "" };
      }
      return { outputDir: join(cwd, "output", slug), companySlug: slug };
    }
    return { outputDir: join(cwd, "output"), companySlug: "" };
  } finally {
    rl.close(); // CRITICAL: always close to release stdin and prevent process hang
  }
}
```

**Critical detail:** `rl.close()` in `finally` is required. If close is omitted, the process hangs after action completion because readline holds a reference to stdin. [VERIFIED: verified via Node.js docs — `close` event documentation explicitly states this]

### Pattern 2: Slug Function (D-01 + D-02)

**What:** Pure function, no I/O. Strip non-alphanum/non-space, then replace space runs with hyphens.
**When to use:** Any time a user-supplied company name needs to become a safe directory name.

```typescript
// [ASSUMED] — implementation verified by running locally with all test cases (see below)
export function toCompanySlug(company: string): string {
  return company
    .replace(/[^a-zA-Z0-9 ]/g, "") // D-02: strip special chars (ampersands, dots, commas, etc.)
    .trim()
    .replace(/\s+/g, "-");          // D-01: spaces → hyphens, casing preserved
}
```

**Verified edge cases** (all passing locally): [VERIFIED: local execution]

| Input | Output | Notes |
|-------|--------|-------|
| `"Acme Corp"` | `"Acme-Corp"` | D-01 canonical example |
| `"Goldman Sachs"` | `"Goldman-Sachs"` | Multi-word |
| `"Goldman Sachs & Partners"` | `"Goldman-Sachs-Partners"` | D-02: ampersand stripped |
| `"AT&T"` | `"ATT"` | D-02: ampersand stripped, no space inserted |
| `"  Spaces  Around  "` | `"Spaces-Around"` | trim() collapses multiple spaces |
| `""` | `""` | Empty string → empty slug (guard needed) |
| `"!!!"` | `""` | All-special → empty slug (guard needed) |
| `"Company.Name"` | `"CompanyName"` | D-02: dot stripped, no hyphen (no space was present) |
| `"Company, Inc."` | `"Company-Inc"` | Comma and dot stripped; space between words produces hyphen |

### Pattern 3: resolveOutputPaths Signature Change

**What:** Change the function to accept `outputDir: string` instead of deriving it from `dirname(inputMdPath)`.
**When to use:** Called from Step H with the pre-computed outputDir from prompts, and from smoke-render.ts with a hardcoded dir.

```typescript
// Current signature (to be changed):
// export function resolveOutputPaths(inputMdPath: string): { designed: string; ats: string }

// New signature:
export function resolveOutputPaths(
  inputMdPath: string,
  outputDir: string,
): { designed: string; ats: string } {
  const stem = basename(inputMdPath, ".md");
  return {
    designed: join(outputDir, stem + "-resume.pdf"),
    ats: join(outputDir, stem + "-resume-ats.pdf"),
  };
}
```

Return shape `{ designed: string; ats: string }` is unchanged — `renderDesigned` and `renderAts` callers are unaffected. [VERIFIED: read src/lib/render.ts]

### Pattern 4: mkdir Auto-Create

**What:** Create the output directory before writing PDFs. `{ recursive: true }` suppresses errors if directory already exists.
**When to use:** Immediately after the prompts resolve and before the render step.

```typescript
// [VERIFIED: verified locally — mkdir recursive creates nested dirs and is idempotent]
import { mkdir, readFile, writeFile } from "node:fs/promises";

await mkdir(outputDir, { recursive: true });
```

**Where:** In `src/cli/index.ts` between Step D.5 (prompt) and Step E (Claude extraction). This ensures the directory exists before rendering, even though rendering happens later at Step H.

### Pattern 5: smoke-render.ts Non-Interactive Fix

**What:** `smoke-render.ts` currently calls `resolveOutputPaths(inputMdPath)` with one argument. After the signature change, it needs to pass an explicit `outputDir`.
**How:** The script already creates a `tmp` directory — pass `tmp` as the `outputDir` directly.

```typescript
// Before:
const { designed, ats } = resolveOutputPaths(inputMdPath);

// After:
const { designed, ats } = resolveOutputPaths(inputMdPath, tmp);
// No prompts, no mkdir needed (tmp already exists)
```

### Anti-Patterns to Avoid

- **Callback-style `createInterface` with `question()` + manual Promise wrapping:** `node:readline/promises` (available since Node 17) makes this unnecessary and the callback pattern is error-prone when chaining two prompts.
- **Omitting `rl.close()`:** The Node process will hang after action completion. Always close in a `finally` block.
- **Putting `mkdir` after Step E:** If Claude extraction fails, the directory is left orphaned. Putting mkdir after the prompts but before extraction is cleaner — a failed extraction means the dir is there but empty, which is harmless.
- **Putting slug logic in `src/cli/index.ts`:** The slug function is a pure transformation testable without a CLI subprocess. It belongs in `src/lib/render.ts` as an export.
- **Handling empty slug silently:** An empty slug (all-special input) should either fall back to non-tailored or emit a clear error — not silently write to `output/` when the user said "yes".

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async prompt | Promise wrapper around callback `rl.question()` | `node:readline/promises` + `rl.question()` | Already native async; callback wrapping adds error surface |
| Directory auto-create | Custom existence check + mkdir | `fs.mkdir(path, { recursive: true })` | `recursive: true` is idempotent — no pre-check needed; handles nested dirs in one call |
| Slug sanitization | Regex library or `slugify` npm package | Inline `.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "-")` | D-01+D-02 rules are simple and fully specified; no library justified for two replace calls |

**Key insight:** This phase's requirements map perfectly to Node built-ins. There is no problem here that warrants an npm package.

---

## Common Pitfalls

### Pitfall 1: readline Process Hang
**What goes wrong:** Process does not exit after the action handler completes.
**Why it happens:** `readline.createInterface()` attaches a listener to `process.stdin`. If `rl.close()` is never called, Node's event loop stays alive waiting for more input.
**How to avoid:** Always call `rl.close()` in a `finally` block wrapping both `rl.question()` calls.
**Warning signs:** `cvgen` hangs after printing "Written: ..." — manual Ctrl+C required.

### Pitfall 2: Empty Slug from All-Special Company Name
**What goes wrong:** User enters `"&&&"` → `toCompanySlug` returns `""` → `join(cwd, 'output', '')` resolves to `join(cwd, 'output')` — silently writes to the non-tailored directory.
**Why it happens:** D-02 strips all non-alphanum/non-space chars; if no alphanumeric chars remain after stripping, the result is empty.
**How to avoid:** After calling `toCompanySlug`, guard on empty result. Options: (a) `program.error("Company name must contain at least one letter or digit.")` or (b) fall back to non-tailored behavior with a warning. Option (a) is cleaner since the user explicitly said "yes".
**Warning signs:** Test with `"!!!"` as company name input.

### Pitfall 3: validate-only Runs Trigger Prompts Unnecessarily
**What goes wrong:** Running `cvgen <path> --validate-only` asks the interactive prompts even though no PDFs will be rendered.
**Why it happens:** Per CONTEXT.md locked decision, the prompt is placed after Step D and before Step E — which runs before the `--validate-only` exit at Step G.
**How to avoid:** This is accepted behavior per the CONTEXT.md decision (prompts before extraction avoids wasting an API call if the user aborts). However, the `mkdir` call should be skipped for `--validate-only` — no directory is needed if no PDFs are written. Guard: `if (!isValidateOnly) await mkdir(outputDir, { recursive: true })`.
**Warning signs:** Running `--validate-only` creates an empty output directory.

### Pitfall 4: Broken smoke-render.ts After Signature Change
**What goes wrong:** `smoke-render.ts` calls `resolveOutputPaths(inputMdPath)` with one argument; TypeScript complains after the second parameter is required.
**Why it happens:** `resolveOutputPaths` currently takes one required argument; the new signature requires two.
**How to avoid:** Update `smoke-render.ts` in the same task that changes `resolveOutputPaths`. The fix is trivial: pass `tmp` as the second argument (the temp directory already created by the script).
**Warning signs:** `tsc --noEmit -p tsconfig.scripts.json` fails after the signature change.

### Pitfall 5: render.test.ts Tests 1–3 Assert Old Behavior
**What goes wrong:** Tests 1–3 assert that paths are in the same directory as the input `.md` file (old `dirname` behavior). After the signature change they fail.
**Why it happens:** Tests are tightly coupled to the old contract.
**How to avoid:** Rewrite Tests 1–3 to pass an explicit `outputDir` and assert that `designed`/`ats` land inside that dir with correct filenames. The remaining tests (A–H) are unaffected — they test `renderAts` PDF content, not path derivation.
**Warning signs:** `npm test` shows 3 failures immediately after changing `resolveOutputPaths`.

### Pitfall 6: Existing index.test.ts Tests Break on New Prompt
**What goes wrong:** Existing CLI subprocess tests (Tests 1–5) that exercise the full CLI flow hang or fail because the process now waits for stdin input.
**Why it happens:** `spawnSync` without an `input` option leaves the child process waiting on stdin; readline's `rl.question()` blocks until a newline arrives.
**How to avoid:** Tests 1–5 currently exercise paths that exit before reaching the new prompt (Tests 1–2: no file arg; Test 3: no API key exits at Step B; Test 4: file not found exits at Step C; Test 5: preflight fails at Step D). None of them reach Step D.5 where the prompt fires — so existing tests are unaffected. New tests for the prompt behavior will need `input: "n\n"` or `input: "y\nAcme Corp\n"` in the `spawnSync` call.
**Warning signs:** New CLI subprocess tests hang without a timeout.

---

## Code Examples

### Full Step D.5 Integration in cli/index.ts

```typescript
// Source: Node.js readline/promises docs [VERIFIED: Node.js built-in]
// Add to imports at top of src/cli/index.ts:
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";

// In the action handler, between Step D and Step E:

// Step D.5 — prompt for output routing
const { outputDir } = await (async () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const tailored = await rl.question("Is this resume tailored for a specific company? (y/n): ");
    if (tailored.trim().toLowerCase().startsWith("y")) {
      const company = await rl.question("Company name: ");
      const slug = toCompanySlug(company.trim());
      if (!slug) {
        program.error(
          "Company name must contain at least one letter or digit.",
          { exitCode: 1 },
        );
      }
      return { outputDir: join(process.cwd(), "output", slug) };
    }
    return { outputDir: join(process.cwd(), "output") };
  } finally {
    rl.close();
  }
})();

// Only create the directory when PDFs will actually be written
const isValidateOnly = options.validateOnly || options.dryRun;
if (!isValidateOnly) {
  await mkdir(outputDir, { recursive: true });
}

// Step E — extract via Claude (unchanged)
```

### Updated render.test.ts Tests 1–3

```typescript
// Before (old contract — dirname-based):
it("Test 1: /tmp/foo/my-resume.md → same dir with correct suffix", () => {
  const paths = resolveOutputPaths("/tmp/foo/my-resume.md");
  assert.equal(paths.designed, "/tmp/foo/my-resume-resume.pdf");
});

// After (new contract — explicit outputDir):
it("Test 1: resolves designed and ats paths inside the given outputDir", () => {
  const paths = resolveOutputPaths("/tmp/foo/my-resume.md", "/some/output/dir");
  assert.equal(paths.designed, "/some/output/dir/my-resume-resume.pdf");
  assert.equal(paths.ats, "/some/output/dir/my-resume-resume-ats.pdf");
});

it("Test 2: stem derived from inputMdPath basename regardless of outputDir", () => {
  const paths = resolveOutputPaths("./notes/alex.md", "/out");
  assert.equal(basename(paths.designed), "alex-resume.pdf");
  assert.equal(basename(paths.ats), "alex-resume-ats.pdf");
  assert.equal(dirname(paths.designed), dirname(paths.ats));
});

it("Test 3: stem with internal dots — only trailing .md stripped", () => {
  const paths = resolveOutputPaths("/x/2026.q3-resume.md", "/out");
  assert.equal(paths.designed, "/out/2026.q3-resume-resume.pdf");
  assert.equal(paths.ats, "/out/2026.q3-resume-resume-ats.pdf");
});
```

### New slug unit tests to add to render.test.ts

```typescript
describe("toCompanySlug", () => {
  it("spaces to hyphens, casing preserved (D-01)", () => {
    assert.equal(toCompanySlug("Acme Corp"), "Acme-Corp");
    assert.equal(toCompanySlug("Goldman Sachs"), "Goldman-Sachs");
  });
  it("strips special chars without replacement (D-02)", () => {
    assert.equal(toCompanySlug("Goldman Sachs & Partners"), "Goldman-Sachs-Partners");
    assert.equal(toCompanySlug("AT&T"), "ATT");
    assert.equal(toCompanySlug("Company, Inc."), "Company-Inc");
  });
  it("trims leading/trailing whitespace and collapses internal spaces", () => {
    assert.equal(toCompanySlug("  Spaces  Around  "), "Spaces-Around");
  });
  it("returns empty string for all-special input", () => {
    assert.equal(toCompanySlug("!!!"), "");
    assert.equal(toCompanySlug(""), "");
  });
});
```

### New CLI subprocess test for prompt paths

```typescript
// Source: existing spawnSync pattern in src/cli/index.test.ts [VERIFIED: read source]
// Test: "n" response → non-tailored path (no API call needed — use --validate-only)
it("Test X: 'n' at tailored prompt → no company dir in output path", () => {
  // Note: This test requires a live API key to reach Step D.5 (prompt fires before Step E)
  // OR: structure the test to verify behavior at Step H only (validate-only exits before H)
  // For now, the slug unit tests in render.test.ts cover the core logic independently.
  // Full integration test of prompt→PDF path requires a live API key or a mock.
});
```

**Note on integration testing:** The existing `index.test.ts` Tests 1–5 all exit before reaching the new prompt. New integration tests that reach the prompt require either (a) a live API key (expensive) or (b) a mocked extraction step. The slug function unit tests in `render.test.ts` provide the highest-value automated coverage for this phase's new logic. A manual smoke test confirms the end-to-end flow.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `readline.createInterface` + callback `question()` + manual Promise wrap | `node:readline/promises` + native async `rl.question()` | Node 17.0.0 (Nov 2021) | No wrapper boilerplate; `async/await` reads cleanly |
| `dirname(inputMdPath)` for output location | `join(process.cwd(), 'output', slug)` | This phase | PDFs no longer land next to the source markdown file |

**Deprecated/outdated:**
- `readline.createInterface` callback pattern for new code: Superseded by `node:readline/promises` for Node ≥17. Not deprecated but ergonomically inferior.

---

## Open Questions (RESOLVED)

1. **Empty slug fallback behavior**
   - What we know: `toCompanySlug("!!!")` returns `""`.
   - What's unclear: Whether the correct behavior is `program.error()` (fail fast) or fall back to `output/` with a warning.
   - Recommendation: `program.error("Company name must contain at least one letter or digit.", { exitCode: 1 })` — follows existing error pattern and avoids silent mismatch between user intent ("yes, tailored") and actual output location.

2. **validate-only + prompt interaction**
   - What we know: The prompt fires at Step D.5 before the `--validate-only` check at Step G.
   - What's unclear: Whether users expect `--validate-only` to skip prompts entirely.
   - Recommendation: Accept the current behavior (prompt fires for validate-only too) — per CONTEXT.md, this is intentional so the user can abort before the API call. Guard `mkdir` with `if (!isValidateOnly)` to prevent creating an empty directory.

3. **smoke-render.ts output directory after fix**
   - What we know: Currently writes to `tmp` (a `mkdtemp` temp dir).
   - What's unclear: Whether to keep writing to `tmp` or start writing to a real `output/` directory.
   - Recommendation: Keep the temp-dir approach — the smoke script is a fixture-based test harness, not a production run. Pass `tmp` as the `outputDir` argument to the updated `resolveOutputPaths`.

---

## Environment Availability

This phase has no external dependencies beyond Node built-ins already in use. `node:readline/promises` is available on Node ≥17 (project floor is ≥22.12.0). `fs.mkdir` with `{ recursive: true }` has been available since Node 10.12.0. [VERIFIED: local Node 26.4.0 detected; both APIs confirmed working via local execution]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `toCompanySlug` regex `[^a-zA-Z0-9 ]` covers all the special chars mentioned in D-02 (ampersands, commas, dots) | Code Examples | If D-02 intended to preserve some chars (e.g. hyphens in "Coca-Cola"), slug output will differ from expectation |
| A2 | The empty-slug case should call `program.error()` rather than silently falling back to non-tailored output | Open Questions | User might prefer fallback behavior — planner should confirm or defer to discretion |

---

## Sources

### Primary (HIGH confidence)
- Node.js readline/promises official docs (`node.org/api/readline.html`) — `createInterface`, `rl.question()`, `rl.close()` — confirmed available Node ≥17 [VERIFIED: local Node 26.4.0 execution]
- `src/cli/index.ts` — full Steps A–H flow, existing imports, `spawnSync`-based test pattern [VERIFIED: read source]
- `src/lib/render.ts` — `resolveOutputPaths` exact current implementation (lines 15–24) [VERIFIED: read source]
- `src/lib/render.test.ts` — Tests 1–3 exact assertions, test runner (`node:test` via tsx) [VERIFIED: read source]
- `scripts/smoke-render.ts` — exact `resolveOutputPaths` call site and tmp-dir pattern [VERIFIED: read source]
- `package.json` — test script (`tsx --test src/**/*.test.ts`), no new dep needed [VERIFIED: read source]

### Secondary (MEDIUM confidence)
- `fs.mkdir({ recursive: true })` idempotence and nested-dir creation — [VERIFIED: local execution test]
- `toCompanySlug` edge case coverage — [VERIFIED: local execution of all 10 test cases]

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all built-ins, no new packages, verified on local Node 26.4.0
- Architecture: HIGH — all four affected files read; exact current signatures confirmed
- Pitfalls: HIGH — derived from reading actual test assertions and current implementation

**Research date:** 2026-07-30
**Valid until:** Stable (Node built-ins change slowly; 60-day estimate)
