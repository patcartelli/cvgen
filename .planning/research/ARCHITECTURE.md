# Architecture Research

**Domain:** Single-shot TypeScript CLI pipeline (markdown → LLM extraction → schema validation → dual HTML/PDF rendering)
**Researched:** 2026-07-27
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                          cli/ (entrypoint)                             │
│  argv parsing → orchestration of stages below → exit codes / stdout    │
└──────────────────────────────┬──────────────────────────────────────┘
                                │ orchestrates, in sequence
                                ▼
┌───────────────────┐   ┌────────────────────┐   ┌─────────────────────┐
│ parser/clean.ts     │→│ parser/extract.ts   │→│ schema/validate.ts    │
│ strip Obsidian noise│  │ Claude API call,    │  │ safeParse against     │
│ (pure fn, no I/O)   │  │ constrained by      │  │ ResumeSchema, explicit│
│                     │  │ schema/resume.ts    │  │ boundary check        │
└───────────────────┘   └────────────────────┘   └──────────┬──────────┘
                                                             │ validated
                                                             │ ResumeData
                                        ┌────────────────────┴───────────────────┐
                                        ▼                                        ▼
                          ┌───────────────────────┐              ┌───────────────────────┐
                          │ renderers/designed/    │              │ renderers/ats/         │
                          │ template.ts → HTML     │              │ template.ts → HTML     │
                          └───────────┬───────────┘              └───────────┬───────────┘
                                      └───────────────┬───────────────────────┘
                                                       ▼
                                        ┌───────────────────────────┐
                                        │ renderers/print.ts         │
                                        │ (shared Puppeteer plumbing)│
                                        └─────────────┬─────────────┘
                                                       ▼
                                     designed.pdf            ats.pdf   (disk)
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|-------------------------|
| `cli/` | argv parsing, stage orchestration, exit codes, stdout/stderr reporting | `commander` (or plain `process.argv` — only one positional arg in v1) wiring the other three modules together; the only module allowed to touch `process.*`, `console.*`, or exit codes |
| `parser/clean.ts` | Deterministic text cleaning: strip Obsidian-specific syntax (`[[wikilinks]]`, `![[embeds]]`, callouts), extract/drop frontmatter, normalize whitespace | Pure function, `string → string`. No network, no schema knowledge. Optionally uses `gray-matter` for frontmatter, but does **not** need a full markdown AST (remark/unified) — the LLM does the structural understanding, this stage only removes noise |
| `parser/extract.ts` | Calls the Claude API with the cleaned text, constrains the response to `schema/resume.ts`'s Zod schema via `zodOutputFormat()`, returns the raw parsed output | Uses `@anthropic-ai/sdk` + `@anthropic-ai/sdk/helpers/zod`; the only module (besides `renderers/print.ts`) doing I/O — reads `ANTHROPIC_API_KEY` from env |
| `schema/resume.ts` | Single source of truth for the resume data shape: Zod schema + inferred TS type | `z.object({...})`, exports both the schema (consumed by `extract.ts` for `zodOutputFormat`) and `type ResumeData = z.infer<typeof ResumeSchema>` (consumed by renderers) |
| `schema/validate.ts` | Explicit validation boundary between extraction and rendering | Thin `safeParse` wrapper returning a typed result or a formatted, human-readable error — this is the "trust boundary," called even though the Claude call is already schema-constrained |
| `renderers/designed/` | Portfolio-quality single-column HTML/CSS template driven by `ResumeData` | Pure function `ResumeData → string` (HTML). No Puppeteer knowledge, no filesystem access |
| `renderers/ats/` | Simplified, machine-readable single-column HTML/CSS template driven by the same `ResumeData` | Same shape as above, visually and structurally distinct output |
| `renderers/shared/format.ts` | Small cross-template helpers (date range formatting, HTML-escaping) | Plain functions; the *only* thing shared between the two templates besides the data type |
| `renderers/print.ts` | Mechanical "HTML string → PDF file" step | Launches Puppeteer once per CLI run, exposes `printToPdf(browser, html, outPath)`, called twice (once per template) against a single shared browser instance |

## Recommended Project Structure

```
src/
├── cli/
│   └── index.ts            # argv → orchestrate clean→extract→validate→render×2→print×2
├── parser/
│   ├── clean.ts             # pure markdown cleaning (no Claude, no schema import)
│   └── extract.ts           # Claude API call, imports schema/resume.ts for zodOutputFormat
├── schema/
│   ├── resume.ts            # ResumeSchema (Zod) + `type ResumeData = z.infer<...>`
│   └── validate.ts           # safeParse wrapper + formatted error output
├── renderers/
│   ├── designed/
│   │   ├── template.ts       # ResumeData → HTML string (designed layout)
│   │   └── styles.css        # print CSS for the designed PDF
│   ├── ats/
│   │   ├── template.ts       # ResumeData → HTML string (ATS-clean layout)
│   │   └── styles.css        # plain print CSS for ATS parsers
│   ├── shared/
│   │   └── format.ts         # date formatting, HTML escaping — used by both templates
│   └── print.ts              # shared Puppeteer launch + page.pdf() plumbing
└── fixtures/
    └── sample-resume.json    # schema-valid JSON used to develop/test renderers without calling Claude
```

### Structure Rationale

- **`schema/` has no dependents outside itself:** it imports nothing from `parser/` or `renderers/`. This makes it buildable and testable first, and it's the one folder every other folder depends on — the literal "contract" of the pipeline.
- **`parser/` holds two files, not two folders, deliberately:** STC-140 specifies four top-level folders (parser, schema, renderers, cli), not five. The Claude call belongs in its own file (`extract.ts`) separate from text cleaning (`clean.ts`) for testability and separation of concerns, but both live under the `parser/` boundary since both are "markdown-in, resume-data-out" concerns from the CLI's point of view.
- **`renderers/` splits into `designed/` and `ats/` subfolders, not a single generic template with variants:** the two outputs are described as "visually distinct" by design (STC-140/PROJECT.md), so forcing a shared template abstraction for exactly two fixed outputs is premature generalization. Only the truly identical parts (date formatting, HTML escaping, the Puppeteer print step) are factored into `shared/` and `print.ts`.
- **`fixtures/` exists so renderers can be built and tested without ever calling the Claude API** — this is the single highest-leverage structural decision for development speed, since Claude calls are slow, cost money, and are non-deterministic.

## Architectural Patterns

### Pattern 1: Schema-as-contract (single source of truth)

**What:** One Zod schema (`schema/resume.ts`) is imported in exactly two places: `parser/extract.ts` (to constrain Claude's structured output via `zodOutputFormat()`) and `renderers/*/template.ts` (type-only import, for compile-time safety on the data shape). `schema/validate.ts` re-validates the extracted JSON with `safeParse` before it's allowed to reach a renderer.
**When to use:** Any pipeline where an LLM's output feeds a downstream stage that assumes a specific shape.
**Trade-offs:** Slight redundancy (Claude's structured output is already schema-constrained, then re-validated) — but this redundancy is the point: it converts "the model probably got it right" into an explicit, testable boundary with a clear failure mode (a validation error, not a runtime crash three stages later inside a template).

**Example:**
```typescript
// schema/resume.ts
import { z } from "zod";

export const ResumeSchema = z.object({
  contact: z.object({ name: z.string(), email: z.string().email() /* … */ }),
  summary: z.string(),
  experience: z.array(z.object({ /* … */ })),
  education: z.array(z.object({ /* … */ })),
  skills: z.array(z.string()),
});

export type ResumeData = z.infer<typeof ResumeSchema>;
```

```typescript
// parser/extract.ts
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ResumeSchema } from "../schema/resume";

export async function extract(cleanedMarkdown: string): Promise<unknown> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: cleanedMarkdown }],
    output_config: { format: zodOutputFormat(ResumeSchema) },
  });
  return response.parsed_output; // still treated as untrusted until validate() runs
}
```

```typescript
// schema/validate.ts
import { ResumeSchema, type ResumeData } from "./resume";

export function validate(raw: unknown): ResumeData {
  const result = ResumeSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Extracted resume JSON failed validation:\n${result.error.format()}`);
  }
  return result.data;
}
```

### Pattern 2: Pure-function pipeline stages with isolated I/O

**What:** `clean()`, `validate()`, and both `template.ts` renderers are synchronous, pure, side-effect-free functions. Only `extract.ts` (network) and `print.ts` (filesystem + headless browser) perform I/O.
**When to use:** Any small CLI pipeline where you want each stage independently unit-testable without mocking a network or filesystem.
**Trade-offs:** Requires discipline to keep `console.log`/`process.exit` out of library code — those belong exclusively in `cli/index.ts`. Pays off immediately: `clean()` and both templates can be tested with plain input/output assertions, no test doubles needed.

### Pattern 3: Fixture-driven renderer development

**What:** A single schema-valid `fixtures/sample-resume.json` lets `renderers/designed` and `renderers/ats` be built, iterated, and visually checked (open the HTML in a browser, or print to PDF) without ever invoking `parser/extract.ts`.
**When to use:** Whenever a pipeline stage depends on an expensive/slow/non-deterministic upstream stage (here: a paid LLM call).
**Trade-offs:** None significant — this is close to free once `schema/` exists, and it decouples "does the template look right" from "does the extraction prompt work," which are genuinely different problems with different debugging loops.

## Data Flow

### Pipeline Flow

```
argv[2] (markdown file path)
    ↓
cli/index.ts: fs.readFile(path)
    ↓ raw markdown string
parser/clean.ts: clean(raw) → cleaned markdown string
    ↓
parser/extract.ts: extract(cleaned) → Claude API call (Zod-constrained) → raw JSON (untrusted)
    ↓
schema/validate.ts: validate(raw) → ResumeData (typed, trusted) — throws on failure, CLI exits non-zero
    ↓
    ├──→ renderers/designed/template.ts: render(data) → designedHtml
    │        ↓
    │    renderers/print.ts: printToPdf(browser, designedHtml, "designed.pdf")
    │
    └──→ renderers/ats/template.ts: render(data) → atsHtml
             ↓
         renderers/print.ts: printToPdf(browser, atsHtml, "ats.pdf")
    ↓
cli/index.ts: report success (file paths written) or failure (stage + error message)
```

### Key Data Flows

1. **Markdown → structured data (linear, single-threaded):** file path → raw text → cleaned text → Claude extraction → validation. Each stage's output is the next stage's only input; no stage reaches back into an earlier stage or into `schema/` except to import types/the schema itself.
2. **Structured data → two PDFs (fan-out, independent):** once `ResumeData` is validated, both renderers consume the *same* immutable object and produce independent HTML strings. There is no dependency between the designed and ATS render paths — they can run concurrently (`Promise.all`), and a failure in one template does not need to block the other.
3. **Browser reuse across the fan-out:** launch Puppeteer **once** in `cli/index.ts` (or inside `print.ts` behind a lazy singleton), pass the open `Browser` instance into `printToPdf()` twice, and close it once at the end. Chromium cold-start is the most expensive operation in the whole pipeline — avoid paying it twice for two PDFs from one run.

## Scaling Considerations

This is a personal, single-invocation CLI — "scale" here means "will this structure survive reuse," not concurrent users.

| Scale | Architecture Adjustments |
|-------|---------------------------|
| Personal CLI usage (current, v1) | Current structure is sufficient as-is: one process per run, one Chromium launch, two PDFs, exit |
| Reused as a library (e.g. imported by scripts, batch-run against multiple notes) | Already supported for free: `schema/`, `parser/`, and `renderers/` have zero CLI-specific coupling (no `process.argv`, no `console.log`, no `process.exit`) — only `cli/index.ts` knows it's a CLI |
| Hypothetical v2 web service (explicitly deferred per PROJECT.md, but worth designing for) | The same reuse property applies: an API route could call `clean → extract → validate → render → print` directly. The one adjustment needed at that point is a persistent/pooled Puppeteer browser instead of launch-per-request, since browser cold-start (not rendering) is the actual bottleneck |

### Scaling Priorities

1. **First (and only, for v1) bottleneck:** Puppeteer/Chromium launch time. Mitigate by launching once per CLI invocation and reusing the browser for both PDFs — already covered by the recommended structure above.
2. **Second, only relevant if reused as a service later:** Claude API latency/rate limits under concurrent requests — not a v1 concern (one file, one run, one Claude call), but worth knowing the extraction stage is the other place a future service would need a queue or concurrency cap.

## Anti-Patterns

### Anti-Pattern 1: Calling Claude from inside `parser/clean.ts`

**What people do:** Fold "clean the markdown" and "call the LLM" into one function because they're both "parsing."
**Why it's wrong:** Couples a deterministic, instantly-testable pure function to network I/O and non-determinism. It also conflates two unrelated failure modes — a markdown-formatting bug vs. an Anthropic API outage — behind one stack trace, making debugging slower.
**Do this instead:** Keep `clean()` pure and synchronous; put the Claude call in `extract.ts`. Both still live under the `parser/` folder boundary, satisfying STC-140's four-way split, while remaining independently testable.

### Anti-Pattern 2: Building a generic template engine for exactly two renderers

**What people do:** Introduce a shared "template config" system, a base template class, or a plugin architecture so "designed" and "ats" are two configurations of one engine.
**Why it's wrong:** For two fixed, intentionally visually-distinct outputs, this is speculative generality — it adds indirection that has to be maintained for zero actual reuse benefit at this scale (YAGNI).
**Do this instead:** Two independent template modules that both consume `ResumeData`. Share only what's genuinely identical: small formatting helpers (`shared/format.ts`) and the Puppeteer print step (`print.ts`).

### Anti-Pattern 3: Treating Claude's structured output as pre-validated and skipping `schema/validate.ts`

**What people do:** Reason that since `zodOutputFormat()` already constrains Claude's response, a second explicit validation step is redundant, and pass `response.parsed_output` straight to the renderers.
**Why it's wrong:** Structured outputs substantially reduce, but don't eliminate, malformed or partial data (e.g., truncation at `max_tokens`, edge cases in optional fields). Skipping the explicit stage also removes the one place in the pipeline where a clear, stage-attributable error message is produced — without it, a bad field surfaces as an obscure template rendering bug instead of a validation error naming the exact field.
**Do this instead:** Always route extraction output through `schema/validate.ts` as its own explicit pipeline stage, even though it's technically "re-checking" already-constrained output.

### Anti-Pattern 4: One monolithic `cli/index.ts` doing everything inline

**What people do:** Write argv parsing, the Claude call, both templates, and the Puppeteer calls all in one file because "it's just a small CLI."
**Why it's wrong:** Directly contradicts the four-way separation STC-140 asks for, and blocks fixture-driven renderer testing (Anti-Pattern 3's inverse problem) and any future reuse (e.g. a v2 web route) without a rewrite.
**Do this instead:** `cli/index.ts` should be thin glue: read argv, call the four modules' public functions in sequence, handle/report errors, set exit codes. All actual logic lives in `parser/`, `schema/`, `renderers/`.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|----------------------|-------|
| Anthropic Claude API | `@anthropic-ai/sdk` + `@anthropic-ai/sdk/helpers/zod`'s `zodOutputFormat()`, called from `parser/extract.ts` via `client.messages.parse({ output_config: { format: zodOutputFormat(ResumeSchema) } })` | Reads `ANTHROPIC_API_KEY` from `process.env` inside `extract.ts` only (or the `Anthropic` client's default env lookup) — never hardcode, never prompt interactively, per project constraint |
| Puppeteer (bundled Chromium) | `puppeteer.launch()` once per CLI run in `renderers/print.ts`; `page.setContent(html)` then `page.pdf({ path, format: 'A4' })` per template | Launch cost dominates runtime; reuse one `Browser` for both PDFs and close it once at the end of the CLI run |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|----------------|-------|
| `cli` ↔ `parser/clean` | direct function call, `string → string` | CLI owns the `fs.readFile`; `clean()` never touches the filesystem itself |
| `cli` ↔ `parser/extract` | direct async function call | The only network-touching call in the pipeline; CLI awaits it and handles rejection (API errors, rate limits) |
| `cli` ↔ `schema/validate` | direct function call, explicit stage | Called even though `extract` already used the schema to constrain Claude's output — see Anti-Pattern 3 |
| `cli` ↔ `renderers/*` | direct function calls, fan-out | Both renderers called with the same validated `ResumeData`; independent, can run via `Promise.all` |
| `cli` ↔ `renderers/print` | direct async function calls ×2 against one shared `Browser` | CLI (or `print.ts` internally) owns browser lifecycle: launch once, print twice, close once |
| `parser/extract` ↔ `schema/resume` | import (schema value, used at runtime for `zodOutputFormat`) | The only place `parser/` imports from `schema/` |
| `renderers/*` ↔ `schema/resume` | import (type-only: `import type { ResumeData }`) | No runtime coupling — renderers only need the shape, not the Zod validator itself |
| `parser/clean` ↔ everything else | none | Zero imports beyond Node built-ins/markdown-cleaning deps; fully isolated, fully unit-testable |

## Sources

- [Claude API Structured Outputs docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — confirmed `zodOutputFormat()` pattern, `@anthropic-ai/sdk/helpers/zod`, single-schema-drives-both-constraint-and-types approach (HIGH confidence, official docs)
- [Zod + LLMs: How to Validate AI Responses Without Losing Your Mind](https://dev.to/pavelespitia/zod-llms-how-to-validate-ai-responses-without-losing-your-mind-4c5j) — validation-as-boundary pattern even with constrained model output (MEDIUM confidence, community source, consistent with official docs' "still validate and handle edge cases" guidance)
- [Node.js — Create a PDF from HTML with Puppeteer and Handlebars](https://futurestud.io/tutorials/node-js-create-a-pdf-from-html-with-puppeteer-and-handlebars) — confirms the common "compile template → HTML string → Puppeteer `page.pdf()`" pattern (MEDIUM confidence, verified against multiple similar sources)
- [nodebestpractices](https://github.com/goldbergyoni/nodebestpractices) — general TS/Node CLI structure conventions (MEDIUM confidence, community-curated, cross-checked against multiple 2026 CLI guides)

---
*Architecture research for: Obsidian-native resume generator CLI (cvgen)*
*Researched: 2026-07-27*
