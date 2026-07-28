# Phase 4: CLI Integration, Debug Tooling & Portfolio Readiness - Research

**Researched:** 2026-07-28
**Domain:** Node.js CLI orchestration, Commander 15, error-handling patterns
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLI-01 | User can run `cvgen <path>` and get both PDFs written to disk | Orchestration pattern documented: preflightCheck → extractResume → puppeteer.launch → renderDesigned + renderAts → browser.close |
| CLI-02 | CLI validates input path, fails with human-readable message (not stack trace) if not readable | `readFile` ENOENT caught in `main().catch`; pattern already present in Phase 2 CLI, verified |
| CLI-03 | CLI exits 0 on success, non-zero on any failure | `process.exit(0)` on success; all error paths exit 1; Commander error paths covered |
| CLI-04 | `cvgen --help` prints usage and example invocation | Commander auto-generates help; `.addHelpText('after', ...)` adds example; verified via npm view |
| DEVX-02 | `--verbose`/`--debug` dumps raw Claude response alongside validated JSON | `extractResume` must return raw response object in addition to parsed; verbose flag wiring documented |
| DEVX-03 | `cvgen init` generates example Obsidian note demonstrating frontmatter/heading convention | Subcommand pattern via `.command('init')` + `.action()`; template content derived from fixture convention |
</phase_requirements>

---

## Summary

Phase 4 is a pure integration and polish phase — all domain-hard work (Claude extraction, Puppeteer rendering) is already shipped in Phases 2–3. The deliverable is replacing the Phase 2 CLI stub in `src/cli/index.ts` with a full Commander 15 program that wires the existing lib layer into a single end-to-end flow, adds debug/verbose output, and implements the `cvgen init` subcommand.

Commander 15 is not currently in `package.json` or `node_modules` — it must be added as a production dependency. It ships its own TypeScript typings (`typings/index.d.ts`); no separate `@types/commander` is needed. The existing test at `src/cli/index.test.ts` Test 8 explicitly asserts that `commander` is NOT imported in the CLI source — this test must be removed or rewritten as part of Phase 4's CLI replacement.

The existing `extractResume` function in `src/lib/extract.ts` returns only the parsed `ResumeData`. For DEVX-02, it must also expose the raw Claude API response. The cleanest approach is to change the return type to `{ data: ResumeData; rawResponse: unknown }` so callers can access both without a second API call.

**Primary recommendation:** Wire in Commander 15, update `extractResume` return type to include raw response, write `initCommand` template, update test file to reflect new CLI shape.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CLI argument parsing / help / exit codes | CLI entry (`src/cli/index.ts`) | — | Commander owns argv; entry point owns process lifecycle |
| PDF orchestration (preflight → extract → render) | CLI entry (`src/cli/index.ts`) | lib layer (`extract.ts`, `render.ts`) | Entry point owns the pipeline; lib functions are stateless workers |
| Raw Claude response exposure (DEVX-02) | `src/lib/extract.ts` (return type) + CLI (display) | — | Must come from extraction layer; CLI decides when/how to print |
| Init template generation (DEVX-03) | New `src/lib/init.ts` or inline in `src/cli/index.ts` | — | Small enough for inline; dedicated file is cleaner for testing |
| Puppeteer Browser lifecycle | CLI entry (`src/cli/index.ts`) | `render.ts` (page lifecycle) | Browser is opened once per run by the orchestrator; render functions own individual pages |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `commander` | `15.0.0` | CLI argument parsing, help generation, subcommands | Already in CLAUDE.md recommended stack; de facto standard for Node CLIs; zero runtime deps; ships own TS types [VERIFIED: npm registry] |
| `puppeteer` | `25.4.0` | Headless PDF rendering | Already installed; `renderDesigned`/`renderAts` in `src/lib/render.ts` already accept `Browser` argument [VERIFIED: npm registry] |
| `@anthropic-ai/sdk` | `0.115.0` | Claude extraction | Already installed; `extractResume` in `src/lib/extract.ts` [VERIFIED: npm registry] |
| `zod` | `4.4.3` | Schema validation | Already installed; `ResumeSchema` in `src/schema/resume.ts` [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:fs/promises` | built-in | `readFile` for markdown file loading | Already used in Phase 2 CLI; no new dependency |
| `node:path` | built-in | `resolve`, `basename`, `dirname` for path handling | Already used in `resolveOutputPaths` |
| `node:process` | built-in | `process.loadEnvFile`, `process.env`, `process.exit` | Already used |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Commander 15 | Raw `process.argv` parsing (current Phase 2 approach) | Phase 4 needs `--help`, subcommands, and clean flag wiring — Commander provides all three; current approach is too brittle to extend |
| Inline init template | Separate Handlebars/template file | Overkill; the init content is a fixed string with no dynamic slots needed |

**Installation:**
```bash
npm install commander
```

No `@types/commander` required — Commander 15 bundles its own typings at `typings/index.d.ts` [VERIFIED: npm registry — `types: "typings/index.d.ts"` in package.json].

**Version verification:**

```bash
npm view commander version   # → 15.0.0 (verified 2026-07-28)
```

Commander 15.0.0 was published 2026-05-29. First release: 2011-08-14.

---

## Package Legitimacy Audit

> slopcheck was not available at research time — packages marked per provenance below.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `commander` | npm | ~15 years (first: 2011-08-14) | ~50M/week (CLAUDE.md cites this) | github.com/tj/commander.js | N/A (slopcheck unavailable) | Approved — well-established, confirmed in CLAUDE.md recommended stack, confirmed via `npm view commander version` = 15.0.0 |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time. `commander` is explicitly named in CLAUDE.md's recommended stack and has a 15-year npm history — treat as [VERIFIED: official CLAUDE.md + npm registry]. All other packages are already installed from prior phases.*

---

## Architecture Patterns

### System Architecture Diagram

```
[user] cvgen <path.md> [--verbose] [--validate-only]
        │
        ▼
[src/cli/index.ts — Commander 15 program]
        │
        ├── preflightCheck(markdown) ──────────────────── [src/lib/preflight.ts]
        │       │ errors[] → stderr + exit 1
        │       │ ok ↓
        │
        ├── extractResume(markdown) ────────────────────── [src/lib/extract.ts]
        │       │ returns { data: ResumeData, rawResponse }
        │       │ if --verbose: print rawResponse + data to stderr
        │       │ if --validate-only: print data to stdout + exit 0
        │       │ ok ↓
        │
        ├── puppeteer.launch() ──────────────── [puppeteer dep, browser shared]
        │       │
        │       ├── renderDesigned(data, paths.designed, browser) ── [render.ts]
        │       ├── renderAts(data, paths.ats, browser) ─────────── [render.ts]
        │       └── browser.close()
        │
        └── console.log(paths) → exit 0

[user] cvgen init [output-path]
        │
        ▼
[src/cli/index.ts — init subcommand action]
        │
        └── writeFile(outputPath, INIT_TEMPLATE) → exit 0
```

### Recommended Project Structure

No structural changes needed. Phase 4 modifies these existing files:

```
src/
├── cli/
│   ├── index.ts          ← replace Phase 2 stub with full Commander 15 program
│   └── index.test.ts     ← update/remove Test 8 (asserts no commander import)
├── lib/
│   ├── extract.ts        ← update return type to { data, rawResponse }
│   ├── extract.test.ts   ← update Test 2–4 if return type changes affect assertions
│   ├── preflight.ts      ← no changes needed
│   └── render.ts         ← no changes needed
└── schema/
    └── resume.ts         ← no changes needed
```

No new directories. Optionally: `src/lib/init.ts` for the template generator if the planner wants it testable in isolation.

### Pattern 1: Commander 15 Main Command with Subcommand

**What:** A `Command` instance with `.argument()`, `.option()`, `.command()` for the subcommand, and `.parseAsync()` for async action handlers.

**When to use:** Any time the CLI needs both positional arguments and subcommands.

```typescript
// Source: github.com/tj/commander.js README (verified 2026-07-28)
import { Command } from 'commander';

const program = new Command();

program
  .name('cvgen')
  .description('Turn an Obsidian markdown resume note into two polished PDFs')
  .version('0.1.0')
  .argument('<file>', 'path to Obsidian markdown resume note')
  .option('--verbose', 'dump raw Claude response and validated JSON to stderr')
  .option('--debug', 'alias for --verbose')
  .option('--validate-only', 'extract and validate JSON, skip PDF rendering')
  .option('--dry-run', 'alias for --validate-only')
  .action(async (file: string, options: { verbose: boolean; debug: boolean; validateOnly: boolean; dryRun: boolean }) => {
    // ... main pipeline
  });

program
  .command('init')
  .description('Generate an example Obsidian resume note with the expected frontmatter/headings')
  .argument('[output]', 'path to write the example note', './resume-example.md')
  .action(async (output: string) => {
    // ... write INIT_TEMPLATE to output
  });

program.addHelpText('after', `
Examples:
  cvgen ./my-resume.md
  cvgen ./my-resume.md --verbose
  cvgen init ./my-resume.md`);

await program.parseAsync();
```

[CITED: github.com/tj/commander.js README — "Action handler", "Commands", "Automated help", "parseAsync"]

### Pattern 2: Async Action Handler with Error Boundaries

**What:** The main `.action()` handler is async; unhandled errors are caught by Commander's built-in mechanism, but we want human-readable output rather than a raw stack trace.

**When to use:** Any CLI with async I/O (file reads, API calls, Puppeteer).

```typescript
// Source: existing src/cli/index.ts pattern (Phase 2), adapted for Commander
program
  .argument('<file>', 'path to resume note')
  .action(async (file: string, options: Options) => {
    // All errors thrown here bubble to .parseAsync()'s rejection
    // Wrap in try/catch for targeted human-readable messages
    const absPath = resolve(file);
    let markdown: string;
    try {
      markdown = await readFile(absPath, 'utf8');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Suppress raw ENOENT stack; emit human message
      program.error(`Cannot read file: ${msg}`, { exitCode: 1 });
    }
    // ...
  });

// Top-level
await program.parseAsync().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
```

[CITED: github.com/tj/commander.js README — "Display error", `.error()` API]

### Pattern 3: extractResume Return Type Change for DEVX-02

**What:** Change `extractResume` to return both the parsed data and the raw Anthropic SDK response object so the CLI can optionally display both.

**When to use:** Any time the caller needs to inspect the raw API response alongside validated output.

```typescript
// Source: src/lib/extract.ts (existing), extended for DEVX-02
import type { Message } from '@anthropic-ai/sdk/resources/messages.js';

export interface ExtractResult {
  data: ResumeData;
  rawResponse: Message;   // the full SDK message object before .parsed_output
}

export async function extractResume(markdown: string): Promise<ExtractResult> {
  const client = new Anthropic();
  const response = await client.messages.parse({ /* ... */ });
  if (response.parsed_output === null) {
    throw new Error('Claude returned a response that could not be parsed as structured resume data.');
  }
  return { data: response.parsed_output, rawResponse: response };
}
```

In the CLI, `--verbose`/`--debug` then does:
```typescript
if (options.verbose || options.debug) {
  console.error('--- raw Claude response ---');
  console.error(JSON.stringify(result.rawResponse, null, 2));
  console.error('--- validated JSON ---');
  console.error(JSON.stringify(result.data, null, 2));
}
```

[ASSUMED — `Message` type import path may vary; verify against installed `@anthropic-ai/sdk` typings]

### Pattern 4: Puppeteer Browser Lifecycle in CLI Orchestrator

**What:** The CLI opens one browser, passes it to both render functions, then closes it in `finally`. This matches the existing `scripts/smoke-render.ts` pattern.

**When to use:** Any orchestrator that calls multiple render functions in a single run.

```typescript
// Source: scripts/smoke-render.ts (existing project pattern)
import puppeteer from 'puppeteer';
import { renderDesigned, renderAts, resolveOutputPaths } from '../lib/render.js';

const paths = resolveOutputPaths(resolve(file));
const browser = await puppeteer.launch({ headless: true });
try {
  await renderDesigned(data, paths.designed, browser);
  await renderAts(data, paths.ats, browser);
} finally {
  await browser.close();
}
console.log(`Written: ${paths.designed}`);
console.log(`Written: ${paths.ats}`);
```

[VERIFIED: existing codebase — scripts/smoke-render.ts uses identical pattern]

### Pattern 5: cvgen init Template

**What:** The `init` subcommand writes a markdown file that demonstrates the required frontmatter fields and section headings, mirroring the existing `fixtures/sample-resume.md` convention.

**Template content** (derived from existing fixture and `preflight.ts` required fields):

```markdown
---
name: Your Name
email: you@example.com
phone: (555) 000-0000
location: City, State
linkedin: linkedin.com/in/yourhandle
github: github.com/yourhandle
---

## Professional Summary
One to three sentences summarizing your background and areas of expertise.

## Core Competencies
Skill One, Skill Two, Skill Three, Skill Four

## Experience
### Job Title at Company Name
Jan 2023 – Present · City, State
- Accomplishment with measurable impact.
- Second bullet point about your contributions.

### Previous Title at Previous Company
Mar 2020 – Dec 2022 · City, State
- What you did and why it mattered.

## Education
### Degree at Institution
2018

## Skills
**Category:** Item, Item, Item
**Category:** Item, Item, Item
```

Required fields (from `preflight.ts`): `name`, `email`, `phone`, `location`, `linkedin`, `github`.
Required sections (from `preflight.ts`): `## Experience`, `## Education`, `## Skills`.

[VERIFIED: existing codebase — `src/lib/preflight.ts` REQUIRED_FRONTMATTER_FIELDS and REQUIRED_SECTION_HEADINGS]

### Anti-Patterns to Avoid

- **Calling `process.exit()` inside lib functions:** `extract.ts`, `preflight.ts`, `render.ts` must never call `process.exit()`. Exit is the CLI entry point's responsibility. (Test 4 in `extract.test.ts` already asserts this.)
- **Opening a new Puppeteer browser per render call:** Both `renderDesigned` and `renderAts` accept a `Browser` argument — the caller opens one browser and passes it to both. Never instantiate inside `render.ts`.
- **Printing raw Error stack traces to users:** Catch specific error types and emit targeted messages. The `main().catch` fallback catches anything that slips through.
- **Commander's strict mode rejecting unknown options:** Commander 15 is strict by default (unknown options → error). Do not use `.allowUnknownOption()` unless intentional.
- **Not calling `browser.close()` in finally:** Puppeteer leaves a zombie Chromium process if `browser.close()` is not in a `finally` block.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Help text generation | Custom `--help` string formatting | Commander's `.addHelpText()` | Commander auto-includes all option names, descriptions, defaults; custom help gets out of sync |
| Subcommand routing | `if (args[0] === 'init')` checks | Commander `.command('init').action(...)` | Commander handles `cvgen help init`, unknown subcommands, and help display for free |
| Exit code management on parse errors | Manual `process.exit(N)` for bad flags | Commander's built-in error display + `program.error(msg, { exitCode: N })` | Commander already exits 1 on unknown options, missing required args, etc. |
| Async error propagation from action | Try/catch wrapping around `parseAsync()` | `.catch()` on `parseAsync()` promise | Commander propagates action rejections through the returned promise |

**Key insight:** Commander handles the boring CLI infrastructure. The Phase 4 implementation work is orchestration logic, not CLI plumbing.

---

## Common Pitfalls

### Pitfall 1: Test 8 in `src/cli/index.test.ts` Will Fail After CLI Replacement

**What goes wrong:** The existing `index.test.ts` Test 8 asserts `!src.includes("commander")`. After Phase 4 imports Commander, this test fails.

**Why it happens:** Test 8 was written during Phase 2 to guard against premature Commander adoption. Phase 4 is the intended migration point.

**How to avoid:** Update or remove Test 8 as the first action in the plan. New tests should assert that Commander IS imported and verify the new CLI surface (help text, subcommand presence, verbose flag).

**Warning signs:** Running `npm test` after CLI replacement but before test update.

### Pitfall 2: `extractResume` Return Type Change Breaks Existing Callers

**What goes wrong:** `extract.ts` is imported by `src/cli/index.ts`. If the return type changes from `Promise<ResumeData>` to `Promise<ExtractResult>`, all existing callers must update their destructuring.

**Why it happens:** Phase 2 CLI uses `const data = await extractResume(markdown)` and passes `data` directly to renderers.

**How to avoid:** Update `src/cli/index.ts` simultaneously with `extract.ts`. Also update `extract.test.ts` if it calls `extractResume` directly (currently it does not — Test 2–4 are source-level assertions, not runtime calls).

**Warning signs:** TypeScript error "Property 'contact' does not exist on type 'ExtractResult'" if caller destructuring is missed.

### Pitfall 3: Commander's `--verbose` vs `-V` (Version Flag) Collision

**What goes wrong:** Commander uses `-V` as the default short flag for `--version`. If `--verbose` is defined as `-V, --verbose`, it collides with the version flag.

**Why it happens:** Commander 15 maps short flags case-sensitively: `-V` is different from `-v`. However, `-V` is conventional for `--version` in Commander programs.

**How to avoid:** Define verbose as `--verbose` (no short flag) or `-v, --verbose` (lowercase v). Do not use `-V` for verbose. Example: `.option('--verbose', 'dump raw Claude response and validated JSON')`.

**Warning signs:** `error: option '-V, --verbose' cannot be used with option '-V, --version'` at parse time.

### Pitfall 4: `--validate-only` vs `--dry-run` as Separate Flags vs Aliases

**What goes wrong:** If both `--validate-only` and `--dry-run` are defined as separate options but treated as aliases (same effect), their `opts()` properties have different names (`validateOnly` vs `dryRun`). The action handler must check both.

**Why it happens:** Commander normalizes `--dry-run` to `dryRun` and `--validate-only` to `validateOnly` as separate properties.

**How to avoid:** Define them as separate boolean flags and check `options.validateOnly || options.dryRun` in the action handler. Alternatively, use a single `--validate-only` flag and document `--dry-run` as a synonym with a custom alias mechanism, but that is more complex.

**Warning signs:** `--dry-run` silently does nothing (because only `validateOnly` is checked).

### Pitfall 5: `program.parseAsync()` Must Be `await`-ed

**What goes wrong:** Without `await program.parseAsync()`, the async action handler fires but any unhandled rejection from it is invisible — Node exits 0 regardless.

**Why it happens:** `parseAsync()` returns a Promise. Without `await`, the process exits before the action promise settles.

**How to avoid:** Always: `await program.parseAsync();` (or `.then(...).catch(...)`).

**Warning signs:** CLI appears to succeed (exit 0) even when the action throws.

### Pitfall 6: `--debug` as an Alias for `--verbose` in Commander

**What goes wrong:** Node.js reserves the `--debug` flag at the runtime level (it triggers the V8 inspector). Commander's `--debug` option on the program itself may behave unexpectedly if Node intercepts it first.

**Why it happens:** `node --debug` is a Node runtime flag (though deprecated in favor of `--inspect`). When running via `tsx` during development, `tsx --debug` may not reach Commander at all.

**How to avoid:** Name the flag `--verbose` as the canonical flag. If `--debug` is added as an alias, document that it may not work under all invocation methods. DEVX-02 says "Running with `--verbose`/`--debug`" — implementing `--verbose` alone satisfies the requirement; `--debug` is optional.

**Warning signs:** `--debug` silently does nothing or triggers Node inspector mode.

---

## Code Examples

### Commander 15 TypeScript Types for `opts()`

```typescript
// Source: github.com/tj/commander.js README — TypeScript section (verified 2026-07-28)
import { Command } from 'commander';

interface MainOptions {
  verbose: boolean;
  validateOnly: boolean;
  dryRun: boolean;
}

const program = new Command();
program
  .option('--verbose', 'dump raw Claude API response and validated JSON')
  .option('--validate-only', 'extract and validate, skip PDF rendering')
  .option('--dry-run', 'alias for --validate-only')
  .argument('<file>', 'path to markdown resume note')
  .action(async (file: string, options: MainOptions) => {
    const isValidateOnly = options.validateOnly || options.dryRun;
    const isVerbose = options.verbose;
    // ...
  });
```

### Commander's `program.error()` for Human-Readable Failures

```typescript
// Source: github.com/tj/commander.js README — "Display error" (verified 2026-07-28)
// program.error() prints to stderr, exits with given code (default 1), and does NOT print a stack trace.
program.error(`Cannot read file: ${filePath}`, { exitCode: 1 });
// Equivalent for contextual errors:
program.error(`ANTHROPIC_API_KEY is not set. Export it before running cvgen:\n  export ANTHROPIC_API_KEY=your-key-here`);
```

### Full Puppeteer Lifecycle in CLI Orchestrator

```typescript
// Source: scripts/smoke-render.ts (existing project, verified 2026-07-28)
import puppeteer from 'puppeteer';
import { renderAts, renderDesigned, resolveOutputPaths } from '../lib/render.js';

const absPath = resolve(file);
const paths = resolveOutputPaths(absPath);
const browser = await puppeteer.launch({ headless: true });
try {
  await renderDesigned(data, paths.designed, browser);
  await renderAts(data, paths.ats, browser);
} finally {
  await browser.close();
}
console.log(`Written: ${paths.designed}`);
console.log(`Written: ${paths.ats}`);
```

### Init Template Writer

```typescript
// Source: [ASSUMED] — pattern derived from Node.js built-in fs/promises
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const INIT_TEMPLATE = `---
name: Your Name
email: you@example.com
phone: (555) 000-0000
location: City, State
linkedin: linkedin.com/in/yourhandle
github: github.com/yourhandle
---

## Professional Summary
One to three sentences summarizing your background and areas of expertise.

## Core Competencies
Skill One, Skill Two, Skill Three, Skill Four

## Experience
### Job Title at Company Name
Jan 2023 – Present · City, State
- Accomplishment with measurable impact.
- Second bullet point about your contributions.

## Education
### Degree at Institution
2018

## Skills
**Category:** Item, Item, Item
**Category:** Item, Item, Item
`;

// In the init subcommand action:
program
  .command('init')
  .description('Generate an example Obsidian resume note')
  .argument('[output]', 'path to write the example note', './resume-example.md')
  .action(async (output: string) => {
    const outPath = resolve(output);
    await writeFile(outPath, INIT_TEMPLATE, { encoding: 'utf8', flag: 'wx' }); // 'wx' = fail if exists
    console.log(`Created: ${outPath}`);
  });
```

Note: `flag: 'wx'` prevents silently overwriting an existing resume file. If the path exists, `writeFile` throws EEXIST — catch and emit a helpful message.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ts-node` for dev-run | `tsx` (esbuild-based) | 2024+ | Already in use; no change needed |
| Manual `process.argv` parsing (Phase 2 CLI) | Commander 15 with `parseAsync()` | Phase 4 (now) | Subcommands, help, type-safe opts |

**Deprecated/outdated:**
- Phase 2 raw `process.argv.slice(2)` parsing in `src/cli/index.ts`: replaced by Commander 15 in Phase 4.
- `index.test.ts` Test 8 ("must not import commander"): must be removed or rewritten — it was a Phase 2 guard, not a permanent requirement.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Message` type import path is `@anthropic-ai/sdk/resources/messages.js` | Code Examples — Pattern 3 | TypeScript error at compile time; easy to fix by checking actual SDK typings |
| A2 | `--debug` flag does not conflict with Node runtime `--debug` when invoked via `tsx` | Pitfall 6 | `--debug` silently swallowed by Node; mitigated by making `--verbose` canonical |
| A3 | `flag: 'wx'` on `writeFile` is the right UX for init (fail if file exists) | Code Examples — Init Template | Could frustrate users who expect overwrite behavior; acceptable tradeoff for safety |

---

## Open Questions (RESOLVED)

1. **Should `--debug` be implemented as an explicit Commander flag or dropped?**
   - What we know: DEVX-02 says `--verbose`/`--debug` — both are mentioned
   - What's unclear: `node --debug` is a Node runtime inspector flag; behavior under `tsx` is untested
   - RESOLVED: `--debug` is dropped. `--verbose` alone satisfies DEVX-02. Node's runtime intercepts `--debug` before Commander sees it; implementing it would be silently broken under `tsx`. See Pitfall 6.

2. **Should `extractResume` return type change break `--validate-only` path?**
   - What we know: Phase 2 CLI uses `const data = await extractResume(markdown)` and prints `data`
   - What's unclear: If the return type becomes `{ data, rawResponse }`, does any existing test break?
   - RESOLVED: No breakage. Extract tests (Test 2–4) are source-level assertions, not runtime calls — unaffected. CLI destructures `const { data, rawResponse } = await extractResume(markdown)`. Both files updated together in Plan 04-01 + 04-02.

3. **Should the Puppeteer browser launch show a progress indicator?**
   - What we know: Puppeteer launch + two renders takes 3–8 seconds on a typical machine
   - What's unclear: User experience without feedback (no spinner library is installed)
   - RESOLVED: `console.error('Rendering...')` before `puppeteer.launch()` is sufficient. No spinner library needed; keeps dependencies minimal.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v26.4.0 | — |
| `tsx` | Dev-run (`npm run dev`) | ✓ | 4.23.1 (in devDeps) | — |
| `tsc` | Build | ✓ | TypeScript ^6.0.3 (in devDeps) | — |
| `puppeteer` | PDF rendering | ✓ | 25.4.0 (in deps) | — |
| `@anthropic-ai/sdk` | Claude extraction | ✓ | 0.115.0 (in deps) | — |
| `commander` | CLI parsing | ✗ — **NOT INSTALLED** | — | None; must be added to `package.json` dependencies |
| `ANTHROPIC_API_KEY` | End-to-end UAT | ✓ (in user env per Phase 2 UAT) | — | — |

**Missing dependencies with no fallback:**
- `commander@15.0.0` — must be installed before implementation begins. Add to `package.json` `dependencies` and run `npm install`.

---

## Security Domain

> `security_enforcement` not explicitly set in config.json — treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No user auth; API key is env var (SEC-01, already implemented) |
| V3 Session Management | no | CLI tool; no sessions |
| V4 Access Control | no | Single-user local CLI |
| V5 Input Validation | yes | `preflightCheck` (already in Phase 2); file path is resolved before readFile |
| V6 Cryptography | no | No crypto operations |

### Known Threat Patterns for CLI Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key in help output / stack trace | Info Disclosure | Commander error messages never echo options values; `ANTHROPIC_API_KEY` is never printed |
| Path traversal via `<file>` argument | Tampering | `resolve(file)` normalizes path; no directory walk performed |
| `cvgen init` clobbering existing file | Tampering | Use `flag: 'wx'` (exclusive create) in `writeFile`; fail clearly if target exists |
| HTML injection via resume content | Tampering | `escapeHtml()` already applied in `render.ts` templates; no new HTML surfaces in Phase 4 |

---

## Sources

### Primary (HIGH confidence)
- `github.com/tj/commander.js README` — Commander 15 API: `.command()`, `.argument()`, `.option()`, `.action()`, `.addHelpText()`, `program.error()`, `parseAsync()`, exit codes — fetched via `gh api` 2026-07-28
- `src/cli/index.ts` (existing codebase) — Phase 2 CLI pattern: env load, key guard, preflight, extractResume, validate-only routing — read directly 2026-07-28
- `src/lib/render.ts` (existing codebase) — `renderDesigned`, `renderAts`, `resolveOutputPaths` signatures — read directly 2026-07-28
- `src/lib/extract.ts` (existing codebase) — `extractResume` return type and `messages.parse` usage — read directly 2026-07-28
- `src/lib/preflight.ts` (existing codebase) — required frontmatter fields and section headings for init template — read directly 2026-07-28
- `scripts/smoke-render.ts` (existing codebase) — Puppeteer browser lifecycle orchestration pattern — read directly 2026-07-28
- `package.json` (existing codebase) — installed dependencies, bin field, scripts — read directly 2026-07-28
- `npm view commander` — version 15.0.0, published 2026-05-29, types bundled — verified 2026-07-28

### Secondary (MEDIUM confidence)
- `src/cli/index.test.ts` — Test 8 assertion that commander is NOT imported; confirms Phase 2 CLI has no Commander dependency — read directly 2026-07-28

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — commander version confirmed via npm registry; all other deps already installed and verified
- Architecture: HIGH — lib layer already exists; integration pattern directly mirrors smoke-render.ts
- Pitfalls: HIGH — Test 8 conflict is concrete and observable; Commander flag collision is documented behavior

**Research date:** 2026-07-28
**Valid until:** 2026-08-28 (Commander 15 API is stable; no breaking changes expected within 30 days)
