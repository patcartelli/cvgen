# Phase 4: CLI Integration, Debug Tooling & Portfolio Readiness - Pattern Map

**Mapped:** 2026-07-28
**Files analyzed:** 5 (3 modified, 1 new/inline, 1 config update)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/cli/index.ts` | CLI entry / orchestrator | request-response (pipeline) | `scripts/smoke-render.ts` + `src/cli/index.ts` (self) | exact — same project, same pipeline shape; smoke-render owns the browser lifecycle to copy |
| `src/cli/index.test.ts` | test | — | `src/cli/index.test.ts` (self) | exact — modify Test 8 in place; all other test patterns stay |
| `src/lib/extract.ts` | service | request-response (API call) | `src/lib/extract.ts` (self) | exact — return type extension only; core pattern unchanged |
| `src/lib/extract.test.ts` | test | — | `src/lib/extract.test.ts` (self) | exact — source-level assertions unaffected; no new tests needed unless planner adds them |
| `package.json` | config | — | `package.json` (self) | exact — add `commander` to `dependencies`; no structural changes |

---

## Pattern Assignments

### `src/cli/index.ts` (CLI entry / orchestrator, pipeline)

**Primary analog:** `scripts/smoke-render.ts` (Puppeteer browser lifecycle)
**Secondary analog:** `src/cli/index.ts` itself (env load, key guard, preflight, extract, routing — all carry forward)

**Shebang + env-load pattern** (`src/cli/index.ts` lines 1–17 — carry forward verbatim):
```typescript
#!/usr/bin/env node
// src/cli/index.ts

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { extractResume } from "../lib/extract.js";
import { preflightCheck } from "../lib/preflight.js";

async function main(): Promise<void> {
  // Step A — env load (.env is optional; ANTHROPIC_API_KEY may already be in environment)
  try {
    process.loadEnvFile(".env");
  } catch {
    // .env missing or unreadable — not an error; key may come from the shell environment
  }
```

**Key guard pattern** (`src/cli/index.ts` lines 31–38 — carry forward verbatim):
```typescript
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "Error: ANTHROPIC_API_KEY is not set. Export it before running cvgen:\n" +
        "  export ANTHROPIC_API_KEY=your-key-here\n" +
        "Or add ANTHROPIC_API_KEY=... to a .env file in the project root.",
    );
    process.exit(1);
  }
```

**Preflight + error loop pattern** (`src/cli/index.ts` lines 44–50 — carry forward verbatim):
```typescript
  const preflightErrors = preflightCheck(markdown);
  if (preflightErrors.length > 0) {
    for (const err of preflightErrors) {
      console.error(err.message);
    }
    process.exit(1);
  }
```

**Top-level error catch pattern** (`src/cli/index.ts` lines 65–68 — carry forward verbatim):
```typescript
main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
```

**Puppeteer browser lifecycle** (`scripts/smoke-render.ts` lines 30–36 — copy this exact try/finally shape):
```typescript
const browser = await puppeteer.launch({ headless: true });
try {
  await renderDesigned(data, designed, browser);
  await renderAts(data, ats, browser);
} finally {
  await browser.close();
}
```

**resolveOutputPaths usage** (`scripts/smoke-render.ts` lines 27–28):
```typescript
const { designed, ats } = resolveOutputPaths(inputMdPath);
// ...
console.log("Designed PDF:", designed);
console.log("ATS PDF:     ", ats);
```

**Imports from render.ts** (`scripts/smoke-render.ts` line 10):
```typescript
import { renderAts, renderDesigned, resolveOutputPaths } from "../src/lib/render.js";
```
(In `src/cli/index.ts`, the relative path is `"../lib/render.js"` — one level up, not two.)

**Commander 15 program shape** (from RESEARCH.md Pattern 1 — no existing analog; use research pattern directly):
```typescript
import { Command } from 'commander';
import puppeteer from 'puppeteer';

const program = new Command();

program
  .name('cvgen')
  .description('Turn an Obsidian markdown resume note into two polished PDFs')
  .version('0.1.0')
  .argument('<file>', 'path to Obsidian markdown resume note')
  .option('--verbose', 'dump raw Claude response and validated JSON to stderr')
  .option('--validate-only', 'extract and validate JSON, skip PDF rendering')
  .option('--dry-run', 'alias for --validate-only')
  .addHelpText('after', `
Examples:
  cvgen ./my-resume.md
  cvgen ./my-resume.md --verbose
  cvgen init ./my-resume.md`)
  .action(async (file: string, options: { verbose: boolean; validateOnly: boolean; dryRun: boolean }) => {
    // pipeline goes here
  });

program
  .command('init')
  .description('Generate an example Obsidian resume note with the expected frontmatter/headings')
  .argument('[output]', 'path to write the example note', './resume-example.md')
  .action(async (output: string) => {
    // write INIT_TEMPLATE to output
  });

await program.parseAsync().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
```

**`program.error()` for human-readable failures** (from RESEARCH.md Pattern 2):
```typescript
// Inside .action() handler — replaces console.error + process.exit(1) for file-read errors
program.error(`Cannot read file: ${absPath} — ${msg}`, { exitCode: 1 });

// For missing API key (use program.error instead of console.error + process.exit)
program.error(
  "Error: ANTHROPIC_API_KEY is not set. Export it before running cvgen:\n" +
  "  export ANTHROPIC_API_KEY=your-key-here"
);
```
Note: `program.error()` prints to stderr and exits non-zero without a stack trace — this replaces the existing `console.error + process.exit(1)` guards inside the `.action()` handler. The top-level `.catch()` on `parseAsync()` handles anything that slips through.

**Verbose/debug output pattern** (from RESEARCH.md Pattern 3):
```typescript
if (options.verbose) {
  console.error('--- raw Claude response ---');
  console.error(JSON.stringify(result.rawResponse, null, 2));
  console.error('--- validated JSON ---');
  console.error(JSON.stringify(result.data, null, 2));
}
```

**validate-only routing** (adapted from `src/cli/index.ts` lines 56–59):
```typescript
const isValidateOnly = options.validateOnly || options.dryRun;
if (isValidateOnly) {
  console.log(JSON.stringify(result.data, null, 2));
  process.exit(0);
}
```

**INIT_TEMPLATE constant** (inline string constant at top of file or in dedicated `src/lib/init.ts`):
```typescript
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

### Previous Title at Previous Company
Mar 2020 – Dec 2022 · City, State
- What you did and why it mattered.

## Education
### Degree at Institution
2018

## Skills
**Category:** Item, Item, Item
**Category:** Item, Item, Item
`;
```
Required fields sourced from `src/lib/preflight.ts` lines 3–10: `name`, `email`, `phone`, `location`, `linkedin`, `github`.
Required sections sourced from `src/lib/preflight.ts` lines 12–14: `## Experience`, `## Education`, `## Skills`.

**init subcommand writeFile with wx flag** (from RESEARCH.md Pattern 5):
```typescript
import { writeFile } from 'node:fs/promises';

// In init .action():
const outPath = resolve(output);
try {
  await writeFile(outPath, INIT_TEMPLATE, { encoding: 'utf8', flag: 'wx' });
  console.log(`Created: ${outPath}`);
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  program.error(`Cannot create file: ${msg}`, { exitCode: 1 });
}
```

---

### `src/cli/index.test.ts` (test — modify Test 8 only)

**Analog:** `src/cli/index.test.ts` itself — all existing patterns carry forward

**Test structure to preserve** (`src/cli/index.test.ts` lines 1–60 — unchanged):
- `runCli()` helper using `spawnSync` (`npx tsx <cliSrcPath>`)
- `envWithoutKey()` / `envWithDummyKey()` helpers
- Tests 1–7 are unaffected by Phase 4 changes

**Test 8 — remove or replace** (`src/cli/index.test.ts` lines 171–183):
```typescript
// REMOVE THIS TEST ENTIRELY (it was a Phase 2 guard against premature Commander adoption):
it("Test 8 (source-level): does NOT import commander, yargs, readline, inquirer, prompts, or use require()", () => {
  // ... asserts !src.includes("commander") — will fail after Phase 4
});
```

**Replacement Test 8 — assert Commander IS present** (new, modeled on existing source-level test structure in lines 143–165):
```typescript
it("Test 8 (source-level): imports commander and exports a Commander program", () => {
  const src = readFileSync(cliSrcPath, "utf8");
  assert.ok(src.includes("commander"), "must import from 'commander'");
  assert.ok(src.includes("new Command()"), "must instantiate a Commander Command");
  assert.ok(src.includes("parseAsync"), "must call parseAsync");
  // Still must not use require() or interactive prompt libraries
  assert.ok(!src.includes("require("), "must not use require() — ESM only");
  assert.ok(!src.includes("inquirer"), "must not import inquirer");
});
```

**Test helper pattern to carry forward** (`src/cli/index.test.ts` lines 26–40):
```typescript
function runCli(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): { stdout: string; stderr: string; status: number } {
  const result = spawnSync("npx", ["tsx", cliSrcPath, ...args], {
    cwd: projectRoot,
    env,
    encoding: "utf8",
    timeout: 15000,
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}
```

---

### `src/lib/extract.ts` (service, request-response — return type change)

**Analog:** `src/lib/extract.ts` itself — entire function body carries forward; only the return type and return statement change

**Current imports** (`src/lib/extract.ts` lines 1–5 — carry forward; add Message type import):
```typescript
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod.js";
import type { ResumeData } from "../schema/resume.js";
import { ResumeSchema } from "../schema/resume.js";
```
Add after existing imports:
```typescript
import type { Message } from "@anthropic-ai/sdk/resources/messages.js";
// Note: verify this import path against installed SDK typings before committing.
// Alternative if Message is re-exported from root: import type { Message } from "@anthropic-ai/sdk";
```

**New ExtractResult interface** (add before function — no existing analog):
```typescript
export interface ExtractResult {
  data: ResumeData;
  rawResponse: Message;
}
```

**Updated function signature** (`src/lib/extract.ts` line 7 — change only the return type):
```typescript
// Before:
export async function extractResume(markdown: string): Promise<ResumeData> {

// After:
export async function extractResume(markdown: string): Promise<ExtractResult> {
```

**Updated return statement** (`src/lib/extract.ts` line 25 — change only the return expression):
```typescript
// Before:
return response.parsed_output;

// After:
return { data: response.parsed_output, rawResponse: response };
```

**Null guard — preserve verbatim** (`src/lib/extract.ts` lines 19–23):
```typescript
if (response.parsed_output === null) {
  throw new Error(
    "Claude returned a response that could not be parsed as structured resume data.",
  );
}
```

**Full updated function body** (lines 8–26 carry forward with only return changed):
```typescript
export async function extractResume(markdown: string): Promise<ExtractResult> {
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: "Extract the resume data from this markdown document.",
    messages: [{ role: "user", content: markdown }],
    output_config: { format: zodOutputFormat(ResumeSchema) },
  });

  if (response.parsed_output === null) {
    throw new Error(
      "Claude returned a response that could not be parsed as structured resume data.",
    );
  }

  return { data: response.parsed_output, rawResponse: response };
}
```

---

### `src/lib/extract.test.ts` (test — assess for breakage)

**Analog:** `src/lib/extract.test.ts` itself

**Assessment:** Tests 2–7 are all source-level or fixture assertions — none call `extractResume()` at runtime. The return type change does NOT break any existing test. No changes required unless the planner wants to add a new source-level assertion confirming `ExtractResult` is exported.

**Existing test pattern to follow if new tests are added** (`src/lib/extract.test.ts` lines 20–37):
```typescript
it("Test 2: extract.ts uses messages.parse with zodOutputFormat(ResumeSchema), haiku model, max_tokens 2048", async () => {
  const src = await readFile(extractSrcPath, "utf8");
  assert.ok(src.includes("messages.parse"), "...");
  // ...
});
```

---

### `package.json` (config — add commander dependency)

**Analog:** `package.json` itself — existing structure unchanged

**Current dependencies block** (`package.json` lines 26–30 — add `commander` here):
```json
"dependencies": {
  "@anthropic-ai/sdk": "^0.115.0",
  "commander": "^15.0.0",
  "puppeteer": "^25.4.0",
  "zod": "^4.4.3"
}
```

**No other `package.json` changes needed:** `bin` field already points to `dist/cli/index.js` (line 9), `type` is already `"module"` (line 4), and all other scripts are unaffected.

**Install command:**
```bash
npm install commander
```

---

## Shared Patterns

### Env Load (try/catch around process.loadEnvFile)
**Source:** `src/cli/index.ts` lines 13–17
**Apply to:** `src/cli/index.ts` (carry forward to Phase 4 replacement)
```typescript
try {
  process.loadEnvFile(".env");
} catch {
  // .env missing or unreadable — not an error; key may come from the shell environment
}
```

### Top-Level Error Catch
**Source:** `src/cli/index.ts` lines 65–68
**Apply to:** `src/cli/index.ts` — replaces `main().catch()`; in Phase 4 attaches to `program.parseAsync()`
```typescript
await program.parseAsync().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
```

### Puppeteer try/finally Browser Lifecycle
**Source:** `scripts/smoke-render.ts` lines 30–36
**Apply to:** `src/cli/index.ts` main `.action()` handler
```typescript
const browser = await puppeteer.launch({ headless: true });
try {
  await renderDesigned(data, designed, browser);
  await renderAts(data, ats, browser);
} finally {
  await browser.close();
}
```

### Human-Readable Error via program.error()
**Source:** RESEARCH.md Pattern 2 (no existing codebase analog — Commander is not yet installed)
**Apply to:** `src/cli/index.ts` — all error paths inside `.action()` handlers
```typescript
program.error(`Cannot read file: ${absPath} — ${msg}`, { exitCode: 1 });
```

### Source-Level Test Assertions (no live API call)
**Source:** `src/lib/extract.test.ts` lines 21–56 and `src/cli/index.test.ts` lines 143–165
**Apply to:** Any new source-level tests in `src/cli/index.test.ts`
```typescript
it("description", async () => {
  const src = await readFile(targetSrcPath, "utf8");
  assert.ok(src.includes("expected-string"), "assertion message");
});
// OR synchronous variant:
it("description", () => {
  const src = readFileSync(targetSrcPath, "utf8");
  assert.ok(src.includes("expected-string"), "assertion message");
});
```

---

## No Analog Found

All files in Phase 4 have close codebase analogs. The only truly new pattern is Commander 15's API itself — use RESEARCH.md Pattern 1 and Pattern 2 for that surface.

| File / Pattern | Reason |
|----------------|--------|
| Commander 15 program wiring | `commander` not yet installed; no existing usage in codebase. Use RESEARCH.md Pattern 1 verbatim. |
| `program.error()` calls | Same as above — no Commander usage to copy from. Use RESEARCH.md Pattern 2. |

---

## Metadata

**Analog search scope:** `src/cli/`, `src/lib/`, `scripts/`, `package.json`
**Files read:** 7 (`src/cli/index.ts`, `src/cli/index.test.ts`, `src/lib/extract.ts`, `src/lib/extract.test.ts`, `src/lib/preflight.ts`, `scripts/smoke-render.ts`, `package.json`)
**Pattern extraction date:** 2026-07-28
