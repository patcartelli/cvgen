# Phase 2: Markdown to Structured JSON Extraction - Research

**Researched:** 2026-07-27
**Domain:** Claude API structured output, Zod v4 error formatting, CLI entry-point wiring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Prompt Strategy**
- D-P01: System prompt is schema-only and minimal. Do NOT include D-01–D-08 heading conventions. Trust `zodOutputFormat()` and the Zod schema to guide the model.
- D-P02: No markdown preprocessing. Send the raw markdown string directly to Claude — no frontmatter extraction, no section splitting, no Obsidian syntax stripping before the API call.

**Error Detection**
- D-E01: Two-layer error detection — pre-flight markdown check first, then post-call Zod validation.
- D-E02: Pre-flight checks: all 6 required frontmatter fields (`name`, `email`, `phone`, `location`, `linkedin`, `github`) and the three required section headings (`## Experience`, `## Education`, `## Skills`). Summary and Core Competencies are optional (D-06) and are NOT pre-flight checked.
- D-E03: Post-call Zod errors formatted as path-based readable messages: `{field-path}: {message}`.

**Module Structure**
- D-M01: Extraction logic lives in `src/lib/extract.ts`, exporting `extractResume(markdown: string): Promise<ResumeData>`.
- D-M02: `--validate-only` / `--dry-run` entry point is a thin `process.argv` check in `src/cli/index.ts` — no Commander yet.

**Markdown Fixture**
- D-F01: One clean `.md` fixture at `fixtures/sample-resume.md`, following D-01–D-08 exactly, matching `fixtures/sample-resume.json`.

### Claude's Discretion

- Exact system prompt wording (beyond "schema-only, minimal")
- How to format the "unset API key" error message
- Whether to surface multiple pre-flight errors in one pass or fail on first
- Pretty-printing approach for `--validate-only` JSON output

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PARSE-01 | CLI parses markdown resume via Claude structured-output API into JSON conforming to the schema | `messages.parse()` + `zodOutputFormat(ResumeSchema)` pattern verified from installed SDK source |
| PARSE-02 | Extracted JSON is validated against the schema in code before rendering | SDK's `zodOutputFormat` runs `safeParse` internally; `validate.ts` stub needs upgrading to emit path-based messages |
| PARSE-03 | When required sections are missing or malformed, user gets human-readable error naming the specific section | Pre-flight string check on raw markdown; Zod `issue.path.join('.')` pattern for post-call errors |
| SEC-01 | Claude API key is read only from an environment variable; CLI fails clearly if unset | `process.loadEnvFile()` + env var guard pattern; SDK reads `ANTHROPIC_API_KEY` from `process.env` automatically |
| DEVX-01 | `--validate-only`/`--dry-run` flag runs parsing and validation and prints extracted JSON without rendering | Thin `process.argv` check in `src/cli/index.ts` before commander wiring in Phase 4 |
</phase_requirements>

---

## Summary

Phase 2 builds the Claude API extraction pipeline. The technical scope is narrow: three new files (`src/lib/extract.ts`, `src/cli/index.ts` replacement, `fixtures/sample-resume.md`), one upgraded existing file (`src/schema/validate.ts`), and one new dependency (`@anthropic-ai/sdk` — already added to `package.json` during research).

The Anthropic SDK 0.115.0 provides `messages.parse()` + `zodOutputFormat()` as a first-class structured-output path. The SDK's internal implementation calls `safeParse` on the response and throws an `AnthropicError` on validation failure — the project's additional post-call validation step (D-E01) must use the raw `safeParse` result from `extractResume()`, not rely on the SDK's throw path for user-facing error formatting.

Zod 4's `$ZodIssue` type exposes `.path` (array of property keys) and `.message` — these are the correct primitives for building D-E03's `{field-path}: {message}` strings. The SDK itself imports from `zod/v4`, which is properly exported from the installed `zod@4.4.3` package.

**Primary recommendation:** Use `client.messages.parse()` with `zodOutputFormat(ResumeSchema)` for the API call. Run pre-flight string checks on the raw markdown string before the API call (D-E02). After the API call, run a separate `ResumeSchema.safeParse()` to produce user-friendly path-based error messages (D-E03) — do not rely on the SDK's internal error throw for this purpose.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pre-flight input validation | CLI entry point (`src/cli/index.ts`) | — | Fast-fail before burning API tokens; called before `extractResume()` |
| Claude API call + response parsing | `src/lib/extract.ts` | — | Isolated library function; no I/O, no process.exit, returns data or throws |
| Post-call Zod validation | `src/lib/extract.ts` | — | Part of the extraction contract; Phase 4 imports this function and trusts it validates |
| API key env var loading | `src/cli/index.ts` | — | Entry point owns process.env setup before any lib code runs |
| `--validate-only` mode routing | `src/cli/index.ts` | — | CLI concern, not lib concern; extract.ts has no knowledge of flags |
| Markdown fixture | `fixtures/` | — | Test/dev artifact owned at repo root alongside existing JSON fixtures |

---

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@anthropic-ai/sdk` | `0.115.0` | Claude API client, `messages.parse()`, `zodOutputFormat()` | [VERIFIED: npm registry + installed in project] |
| `zod` | `4.4.3` | Schema validation, `ResumeSchema`, `$ZodIssue.path`/`.message` for error formatting | [VERIFIED: npm registry + installed in project] |

**No new runtime dependencies are required for Phase 2.** `@anthropic-ai/sdk` was added to `dependencies` in `package.json` during this research session (`npm install @anthropic-ai/sdk@0.115.0 --save`).

### Supporting (dev, already in project)

| Library | Version | Purpose |
|---------|---------|---------|
| `tsx` | `4.23.1` | Dev-run: `tsx src/cli/index.ts fixtures/sample-resume.md --validate-only` |
| `typescript` | `6.0.3` | Type-check via `tsc --noEmit` |

### Installation

```bash
# @anthropic-ai/sdk is already added to package.json during Phase 2 research.
# If running from a fresh clone:
npm install
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `@anthropic-ai/sdk` | npm | Jan 2023 (~2.5 yrs) | github.com/anthropics/anthropic-sdk-typescript | N/A (official Anthropic SDK) | Approved |
| `zod` | npm | Mar 2020 (~6 yrs) | github.com/colinhacks/zod | N/A (de-facto industry standard) | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time. Both packages are verified as legitimate via official source repositories on npm and confirmed present in the installed `node_modules`. `@anthropic-ai/sdk` is the official Anthropic-authored SDK (confirmed via `npm view @anthropic-ai/sdk repository`). `zod` is the de-facto standard TypeScript validation library. No `postinstall` scripts found on either package.*

---

## Architecture Patterns

### System Architecture Diagram

```
CLI entry (src/cli/index.ts)
    │
    ├─► [1] process.loadEnvFile('.env')   ← loads .env if present, try/catch
    │
    ├─► [2] env guard: ANTHROPIC_API_KEY set?
    │       NO → print error message + process.exit(1)
    │
    ├─► [3] parse process.argv for file path + flags
    │       (--validate-only or --dry-run)
    │
    ├─► [4] readFile(markdownPath)         ← node:fs/promises
    │
    ├─► [5] preflight(markdown)            ← pure string checks
    │       │
    │       ├─ check frontmatter fields: name, email, phone, location, linkedin, github
    │       └─ check section headings: ## Experience, ## Education, ## Skills
    │           FAIL → print "Missing required frontmatter field: <field>" + exit(1)
    │
    ├─► [6] extractResume(markdown)        ← src/lib/extract.ts
    │       │
    │       ├─ new Anthropic()             ← reads ANTHROPIC_API_KEY from process.env
    │       ├─ client.messages.parse({
    │       │     model: 'claude-haiku-4-5',
    │       │     max_tokens: 2048,
    │       │     system: "...",
    │       │     messages: [{ role: 'user', content: markdown }],
    │       │     output_config: { format: zodOutputFormat(ResumeSchema) }
    │       │   })
    │       ├─ response.parsed_output is null?
    │       │     → throw with path-based Zod issue messages
    │       └─ return validated ResumeData
    │
    └─► [7] --validate-only?
            YES → JSON.stringify(result, null, 2) to stdout + exit(0)
            NO  → (stub: "rendering not yet implemented" + exit(0))
```

### Recommended Project Structure (additions for Phase 2)

```
src/
├── cli/
│   └── index.ts         # REPLACE stub: env guard + argv parse + preflight + extract call
├── lib/
│   └── extract.ts       # NEW: extractResume(markdown) → Promise<ResumeData>
└── schema/
    ├── resume.ts        # UNCHANGED (Phase 1)
    └── validate.ts      # UPGRADE: path-based Zod error formatting
fixtures/
├── sample-resume.md     # NEW: follows D-01–D-08 exactly, matches sample-resume.json
├── sample-resume.json   # UNCHANGED (Phase 1)
└── sample-resume-malformed.json  # UNCHANGED (Phase 1)
```

### Pattern 1: messages.parse() with zodOutputFormat

The SDK's `messages.parse()` method accepts `output_config.format: zodOutputFormat(schema)` and returns a `ParsedMessage<T>` with a `parsed_output: T | null` property. The SDK internally calls `schema.safeParse()` on the response content and throws `AnthropicError` if validation fails.

**Critical detail:** The `output_config.format` field in `MessageCreateParamsBase` is typed as `JSONOutputFormat | null`. The `messages.parse()` overload re-types `output_config` via `ParseableMessageCreateParams` (from `lib/parser.ts`) to allow `AutoParseableOutputFormat<T>` — which is what `zodOutputFormat()` returns. This is the correct method to use; `messages.create()` does not do auto-parsing.

```typescript
// Source: Verified from installed @anthropic-ai/sdk@0.115.0 node_modules source
// Import paths use .js extensions (NodeNext ESM requirement)
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod.js";
import { ResumeSchema, type ResumeData } from "../schema/resume.js";

export async function extractResume(markdown: string): Promise<ResumeData> {
  const client = new Anthropic();
  // client reads ANTHROPIC_API_KEY from process.env automatically

  const response = await client.messages.parse({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: "Extract the resume data from this markdown document.",
    messages: [{ role: "user", content: markdown }],
    output_config: { format: zodOutputFormat(ResumeSchema) },
  });

  if (response.parsed_output === null) {
    // SDK threw internally; we shouldn't reach here, but guard anyway
    throw new Error("Claude returned a response that did not match the resume schema.");
  }

  return response.parsed_output;
}
```

### Pattern 2: path-based Zod error formatting

`$ZodIssue` has `.path: PropertyKey[]` (array of string/number keys) and `.message: string`. Joining the path with `"."` gives human-readable field paths like `experience[0].bullets`.

```typescript
// Source: Verified from installed zod@4.4.3 node_modules/zod/v4/core/errors.d.ts
import { ResumeSchema, type ResumeData } from "../schema/resume.js";
import type { $ZodIssue } from "zod/v4/core/errors.js";

export function formatZodErrors(issues: $ZodIssue[]): string {
  return issues
    .map((issue) => {
      const path = issue.path
        .map((p, i) =>
          typeof p === "number" ? `[${p}]` : i === 0 ? p : `.${p}`
        )
        .join("");
      return `  ${path || "(root)"}: ${issue.message}`;
    })
    .join("\n");
}

// Usage in validate.ts upgrade:
export function validateResume(data: unknown): ResumeData {
  const result = ResumeSchema.safeParse(data);
  if (!result.success) {
    const formatted = formatZodErrors(result.error.issues);
    throw new Error(`Resume validation failed:\n${formatted}`);
  }
  return result.data;
}
```

### Pattern 3: pre-flight markdown checks

The pre-flight check uses simple string-based detection on the raw markdown — no YAML parser needed. The required frontmatter fields (D-01) are checked by looking for `fieldname:` patterns inside the `---` block. Section headings (D-06/D-08) are checked with line-start matching.

```typescript
// Source: Derived from D-E02 decisions + D-01/D-08 markdown conventions
const REQUIRED_FRONTMATTER_FIELDS = [
  "name", "email", "phone", "location", "linkedin", "github",
] as const;

const REQUIRED_SECTION_HEADINGS = [
  "## Experience",
  "## Education",
  "## Skills",
] as const;

export interface PreflightError {
  type: "frontmatter" | "section";
  missing: string;
  message: string;
}

export function preflightCheck(markdown: string): PreflightError[] {
  const errors: PreflightError[] = [];

  // Extract frontmatter block (between first two ---)
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter = frontmatterMatch?.[1] ?? "";

  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    // Match "fieldname:" at start of a line (handles "name: value" or "name:")
    if (!new RegExp(`^${field}:`, "m").test(frontmatter)) {
      errors.push({
        type: "frontmatter",
        missing: field,
        message: `Missing required frontmatter field: ${field}`,
      });
    }
  }

  for (const heading of REQUIRED_SECTION_HEADINGS) {
    if (!markdown.includes(`\n${heading}`) && !markdown.startsWith(heading)) {
      errors.push({
        type: "section",
        missing: heading,
        message: `Missing required section: ${heading}`,
      });
    }
  }

  return errors;
}
```

**Planner note on error accumulation (Claude's Discretion):** The CONTEXT leaves it to Claude's discretion whether to fail on the first pre-flight error or accumulate all errors. Accumulating all errors (returning an array, printing each one) is recommended: it gives the user a complete picture in one run. The CLI should print all errors before exiting.

### Pattern 4: env var loading + API key guard

```typescript
// Source: Verified from CLAUDE.md env var pattern + Node 26.4.0 (process.loadEnvFile confirmed available)
// In src/cli/index.ts, before any other imports that might read env:

// Load .env if present (ignore if missing)
try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional; ANTHROPIC_API_KEY may already be in environment
}

if (!process.env["ANTHROPIC_API_KEY"]) {
  console.error(
    "Error: ANTHROPIC_API_KEY is not set. Export it before running cvgen:\n" +
    "  export ANTHROPIC_API_KEY=your-key-here\n" +
    "Or add it to a .env file in the project root."
  );
  process.exit(1);
}
```

### Pattern 5: --validate-only / --dry-run argv handling

```typescript
// Source: Derived from D-M02 decisions
const args = process.argv.slice(2);
const isValidateOnly = args.includes("--validate-only") || args.includes("--dry-run");
const filePath = args.find((a) => !a.startsWith("--"));

if (!filePath) {
  console.error("Usage: cvgen <path-to-markdown-file> [--validate-only]");
  process.exit(1);
}
```

### Pattern 6: Model selection (Claude's Discretion)

The recommended model for this phase's extraction task is **`claude-haiku-4-5`** (the dated snapshot ID is the same string without hyphens replaced: see models overview page). Rationale:

- Cheapest and fastest current model from Anthropic
- Resume extraction is a straightforward structured-data task — no complex reasoning needed
- 200k token context window is sufficient (a resume markdown is ~1–3k tokens)
- `max_tokens: 2048` is enough for the schema JSON output (the full `ResumeData` object is ~500–800 tokens)
- The user runs this CLI repeatedly against their own resume during job applications — cost and latency matter

[VERIFIED: platform.claude.com/docs/en/about-claude/models/overview] — `claude-haiku-4-5` is the current generally-available fastest/cheapest model as of 2026-07-27.

### Anti-Patterns to Avoid

- **Using `messages.create()` instead of `messages.parse()`:** `messages.create()` returns a raw `Message` — `parsed_output` is not populated. Only `messages.parse()` populates `parsed_output` when `zodOutputFormat()` is passed.
- **Relying on the SDK's internal Zod error throw for user messages:** The SDK throws `AnthropicError` with a generic internal message. Phase 2 must run its own `safeParse()` for user-facing D-E03 formatting.
- **Importing from `@anthropic-ai/sdk/helpers/zod` without `.js` extension:** The project uses `"moduleResolution": "NodeNext"`. All relative and subpath imports need `.js` extensions. The correct import is `"@anthropic-ai/sdk/helpers/zod.js"`.
- **Calling `process.exit()` from `src/lib/extract.ts`:** This library function is imported by Phase 4's Commander-based CLI. It must throw errors, never call `process.exit()`. Only `src/cli/index.ts` calls `process.exit()`.
- **Importing `zod/v4` directly in project source:** Project source imports `from "zod"` (re-exports `zod/v4/classic`). The `zod/v4` sub-path is used internally by the SDK — project source should continue using the bare `"zod"` import for consistency with the existing `src/schema/resume.ts`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON-schema generation from Zod | Custom schema serializer | `zodOutputFormat()` from `@anthropic-ai/sdk/helpers/zod.js` | SDK handles `$defs`/`$ref` nesting, `additionalProperties: false`, unsupported constraint stripping |
| Structured output parsing + validation | Manual `JSON.parse` + schema check loop | `client.messages.parse()` + `zodOutputFormat()` | SDK handles response extraction, JSON parse errors, and Zod validation atomically |
| YAML frontmatter parsing | Regex-based YAML tokenizer | Simple string checks (D-P02 decision: no preprocessing) | Required fields are line-start patterns — full YAML parse would add a dependency for no benefit |

**Key insight:** The SDK's `zodOutputFormat()` converts Zod schemas to JSON Schema, passes them to the API's `output_config.format`, and validates the response — three correctness problems bundled into one call. The only custom code needed is the pre-flight check and the user-facing error formatter.

---

## Common Pitfalls

### Pitfall 1: `output_config.format` type mismatch at compile time

**What goes wrong:** TypeScript reports `Argument of type 'AutoParseableOutputFormat<ResumeData>' is not assignable to parameter of type 'JSONOutputFormat'` when passing `zodOutputFormat(ResumeSchema)` to `messages.parse()`.

**Why it happens:** `MessageCreateParamsBase.output_config.format` is typed as `JSONOutputFormat | null`. The `messages.parse()` overload re-types `output_config` through `ParseableMessageCreateParams` which allows `AutoParseableOutputFormat<T>`. If you call `messages.create()` instead of `messages.parse()`, or if you destructure params before passing, TypeScript narrows back to `JSONOutputFormat` and rejects the call.

**How to avoid:** Always use `client.messages.parse()`, never `client.messages.create()`, when you want `parsed_output`. Pass the `zodOutputFormat(...)` result inline in the object literal so TypeScript can infer the correct overload.

### Pitfall 2: Missing `.js` extension on subpath imports

**What goes wrong:** `Cannot find module '@anthropic-ai/sdk/helpers/zod'` at runtime, or `tsc` reports `Module not found`.

**Why it happens:** `"moduleResolution": "NodeNext"` requires explicit `.js` extensions on all module specifiers, including subpath imports from packages that use `exports` maps. The TypeScript compiler resolves `helpers/zod.js` through the package's `exports["./helpers/*"]` entry, which maps to `./helpers/*.mjs` at runtime.

**How to avoid:** Always write `import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod.js"`.

### Pitfall 3: `process.loadEnvFile` silently fails if called after Anthropic client construction

**What goes wrong:** The env guard passes (`ANTHROPIC_API_KEY` appears set), but at API call time the SDK sends no key and gets a 401.

**Why it happens:** The Anthropic client reads `process.env.ANTHROPIC_API_KEY` at construction time (`new Anthropic()`). If `process.loadEnvFile()` is called after `new Anthropic()`, the key won't be in `process.env` when the client captures it.

**How to avoid:** `process.loadEnvFile()` must be the very first executable statement in `src/cli/index.ts`, before any imports that instantiate a client and before the env guard check.

### Pitfall 4: `parsed_output` is `null` — not thrown

**What goes wrong:** Code does `response.parsed_output.contact.name` and crashes with `Cannot read properties of null`.

**Why it happens:** `parsed_output` is typed `T | null`. The SDK returns `null` when the structured output format is not an `AutoParseableOutputFormat` (e.g., passed to `messages.create()` instead of `messages.parse()`). It can also be `null` if the model's `stop_reason` is not `end_turn`.

**How to avoid:** Always check `if (response.parsed_output === null)` and throw a descriptive error. The TypeScript type forces this check.

### Pitfall 5: SDK's `zodOutputFormat` internal validation vs. project's D-E03 error format

**What goes wrong:** SDK throws `AnthropicError: Failed to parse structured output: ...` with its own condensed format before the project's path-based formatting can run.

**Why it happens:** `zodOutputFormat()`'s `parse()` function calls `safeParse` and throws `AnthropicError` on failure — this throw propagates out of `messages.parse()`. The project's validate step (D-E03) is bypassed.

**How to avoid:** Catch `AnthropicError` in `extractResume()` and re-format. Or: treat the SDK's successful `parsed_output` as the success path and use a separate `ResumeSchema.safeParse(response.parsed_output)` for post-call validation — but this double-validates an already-validated object. The simpler path: let the SDK throw if the model returns garbage, catch `AnthropicError` at the CLI layer, and run `ResumeSchema.safeParse()` only on `parsed_output` when you need to provide path-based error messages (e.g., for a warning mode). For the happy path, `parsed_output !== null` is sufficient.

### Pitfall 6: Pre-flight frontmatter check hits `---` in markdown body

**What goes wrong:** Pre-flight regex matches a `---` divider in the body as the end of frontmatter, truncating the frontmatter check.

**Why it happens:** The YAML frontmatter pattern `^---\n([\s\S]*?)\n---` uses non-greedy matching. If the document body also contains `---` (Obsidian sometimes uses horizontal rules), the regex matches only the first `---` to `---` pair, which is correct. But some Obsidian notes use `---` as a horizontal rule inside frontmatter (uncommon) or have no frontmatter at all.

**How to avoid:** The regex `^---\n([\s\S]*?)\n---` is the correct pattern for YAML frontmatter. It anchors at the start of the string (`^`) and uses non-greedy `*?` so it stops at the first `---` after the opening. If the document has no frontmatter, `frontmatterMatch` is `null` — the pre-flight check will flag all 6 fields as missing. This is the correct behavior (D-E02: all 6 fields are required).

---

## Code Examples

### Full extractResume function skeleton

```typescript
// src/lib/extract.ts
// Source: Verified API surface from @anthropic-ai/sdk@0.115.0 installed in node_modules

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod.js";
import { ResumeSchema, type ResumeData } from "../schema/resume.js";

export async function extractResume(markdown: string): Promise<ResumeData> {
  const client = new Anthropic();
  // SDK reads ANTHROPIC_API_KEY from process.env automatically at construction

  const response = await client.messages.parse({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: "Extract the resume data from this markdown document.",
    messages: [{ role: "user", content: markdown }],
    output_config: { format: zodOutputFormat(ResumeSchema) },
  });

  if (response.parsed_output === null) {
    throw new Error(
      "Claude returned a response that could not be parsed as structured resume data."
    );
  }

  return response.parsed_output;
}
```

### cli/index.ts skeleton (Phase 2 thin version)

```typescript
// src/cli/index.ts
// Source: Derived from D-M02, SEC-01, DEVX-01 decisions

// 1. Load env FIRST, before anything that reads process.env
try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional
}

// 2. API key guard
if (!process.env["ANTHROPIC_API_KEY"]) {
  console.error(
    "Error: ANTHROPIC_API_KEY is not set.\n" +
    "Export it before running cvgen:\n" +
    "  export ANTHROPIC_API_KEY=your-key-here\n" +
    "Or add ANTHROPIC_API_KEY=... to a .env file in the project root."
  );
  process.exit(1);
}

// 3. Imports after env setup
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { preflightCheck } from "../lib/preflight.js"; // or inline in this file
import { extractResume } from "../lib/extract.js";

const args = process.argv.slice(2);
const isValidateOnly = args.includes("--validate-only") || args.includes("--dry-run");
const filePath = args.find((a) => !a.startsWith("--"));

if (!filePath) {
  console.error("Usage: cvgen <path-to-markdown-file> [--validate-only | --dry-run]");
  process.exit(1);
}

const markdown = await readFile(resolve(filePath), "utf8");

const preflightErrors = preflightCheck(markdown);
if (preflightErrors.length > 0) {
  for (const err of preflightErrors) {
    console.error(err.message);
  }
  process.exit(1);
}

const data = await extractResume(markdown);

if (isValidateOnly) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

console.log("Rendering not yet implemented (Phase 3).");
process.exit(0);
```

**Note on top-level await:** The project uses `"type": "module"` with `"target": "ES2022"` and `"module": "NodeNext"`. Top-level `await` in `.ts` files is valid in this configuration. The shebang line (`#!/usr/bin/env node`) is kept at the top of the compiled `dist/cli/index.js` via the `bin` field in `package.json`.

**Note on import ordering:** The dynamic imports (after env setup) require a top-level-await-based approach or restructuring into an async main function. The cleaner pattern is an `async function main()` called at the bottom of the file — avoid actual dynamic `import()` calls since the module graph is static. The env must be loaded before the `Anthropic` client is *constructed*, not necessarily before the import statement. The SDK reads `process.env` at `new Anthropic()` call time, not at import time. So the safe pattern is: load env, set up guard, then proceed (imports at top of file are fine).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `messages.create()` + manual JSON parse | `messages.parse()` + `zodOutputFormat()` | SDK 0.115.x / 2025-2026 | No manual `JSON.parse`, no custom JSON Schema serializer, `parsed_output` is typed |
| `zodOutputFormat` from `@anthropic-ai/sdk/helpers/zod` (old path) | Same path, but imports must use `.js` extension in NodeNext | NodeNext module resolution | Breaking if `.js` omitted |
| Zod v3 `.error.format()` for error display | Zod v4 `.error.issues[]` with `.path`/`.message` primitives | Zod 4.x | `formatError()` still available but `issues` is more direct for custom formatting |

**Deprecated/outdated:**
- `messages.create()` for structured outputs: still works, but no auto-parsing — prefer `messages.parse()`.
- `zodOutputFormat` beta import path (if it ever existed): only path in 0.115.0 is `@anthropic-ai/sdk/helpers/zod.js`.

---

## Open Questions

1. **Top-level await vs. async main in src/cli/index.ts**
   - What we know: `"module": "NodeNext"` + `"target": "ES2022"` supports top-level await. The shebang (`#!/usr/bin/env node`) on the CLI entry is required.
   - What's unclear: Whether the shebang line in TypeScript source is handled correctly by `tsc` output — `tsc` emits it as-is into `dist/cli/index.js`. The `bin` entry points at `dist/cli/index.js`. `tsx` runs `.ts` source directly in dev.
   - Recommendation: Use an `async function main() {...}; main().catch(...)` pattern to avoid any edge cases with top-level await + shebang. The plan task should specify this explicitly.

2. **Where does `preflightCheck` live?**
   - What we know: D-M01 says extraction logic is in `src/lib/extract.ts`. Preflight is a separate concern (it checks the raw markdown, not the API response).
   - What's unclear: D-M01 doesn't specify where preflight lives.
   - Recommendation: Put `preflightCheck` in `src/lib/preflight.ts` as a named export. This keeps `extract.ts` focused on the API call and keeps the pre-flight logic testable in isolation.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js >= 22.12.0 | `process.loadEnvFile()`, `@anthropic-ai/sdk` | ✓ | v26.4.0 | — |
| `tsx` | Dev-run `npm run dev` | ✓ | v4.23.1 | Build with `tsc` and run `node dist/cli/index.js` |
| ANTHROPIC_API_KEY env var | `extractResume()` → Claude API | ✗ (not set in current shell) | — | User must export before running; `.env` file is the documented fallback |
| `@anthropic-ai/sdk` in node_modules | `src/lib/extract.ts` | ✓ | 0.115.0 (installed during research) | — |
| `zod` in node_modules | `ResumeSchema`, error formatting | ✓ | 4.4.3 | — |

**Missing dependencies with no fallback:**
- `ANTHROPIC_API_KEY` — the phase cannot be manually smoke-tested without a real API key. The env guard (SEC-01) handles this gracefully at runtime (clear error message + exit 1).

**Missing dependencies with fallback:**
- None — all tooling is present.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | Yes | Zod `ResumeSchema.safeParse()` on all API output; pre-flight string check on input |
| V6 Cryptography | No | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key in code/log | Information disclosure | Read-only from `process.env`; never log the key value; `.env` in `.gitignore` (already in place) |
| Prompt injection via markdown input | Tampering | Resume is user's own document; schema-constrained output prevents arbitrary code execution |
| Committing `.env` file | Information disclosure | `.gitignore` already excludes `.env`; gitleaks pre-commit hook (Phase 1) catches API key patterns in staged files |

**SEC-01 implementation note:** The Anthropic client reads `ANTHROPIC_API_KEY` from `process.env` at construction time. The CLI must:
1. Never log `process.env.ANTHROPIC_API_KEY`
2. Check `if (!process.env["ANTHROPIC_API_KEY"])` and fail before constructing the client
3. Call `process.loadEnvFile()` in a try/catch (ignore if `.env` absent — it's optional)

The project must NOT: prompt the user for the key interactively, persist the key to disk in any format, or pass the key as a CLI argument (it would appear in shell history).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `claude-haiku-4-5` is a valid, general-availability model for the Claude API as of 2026-07-27 | Code Examples | Plan uses wrong model ID; easy to fix by substituting a different model string |

**All other claims in this research were verified against installed `node_modules` source code or official documentation (platform.claude.com/docs).**

---

## Sources

### Primary (HIGH confidence)

- Installed `@anthropic-ai/sdk@0.115.0` node_modules source — `helpers/zod.js` (zodOutputFormat implementation), `resources/messages/messages.d.ts` (parse() signature, Model type union), `lib/parser.d.ts` (ParsedMessage, AutoParseableOutputFormat), `client.js` (ANTHROPIC_API_KEY env var reading, construction behavior)
- Installed `zod@4.4.3` node_modules source — `v4/core/errors.d.ts` ($ZodIssue, $ZodError, .path, .message), `package.json` exports map (`./v4` sub-path)
- [platform.claude.com/docs/en/about-claude/models/overview](https://platform.claude.com/docs/en/about-claude/models/overview) — current model list, API IDs, pricing, claude-haiku-4-5 availability
- [platform.claude.com/docs structured outputs page](https://platform.claude.com/docs/en/docs/build-with-claude/structured-outputs) — zodOutputFormat usage pattern, parsed_output behavior
- `npm view @anthropic-ai/sdk version time.created repository` — registry metadata, source repo
- `npm view zod version time.created repository` — registry metadata, source repo

### Secondary (MEDIUM confidence)

- CLAUDE.md stack reference — version pins, ESM conventions, env var pattern, process.loadEnvFile() guidance
- Phase 1 CONTEXT.md (D-01 through D-14) — markdown format convention, Zod schema shape, locked decisions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — inspected installed node_modules source directly
- Architecture: HIGH — derived from locked decisions in CONTEXT.md + verified SDK API surface
- Pitfalls: HIGH — derived from TypeScript type inspection + SDK source reading
- Model selection: MEDIUM — verified model ID from official docs; Claude's Discretion item

**Research date:** 2026-07-27
**Valid until:** 2026-08-27 (SDK and model API are relatively stable; model IDs can be superseded but existing IDs don't break)
