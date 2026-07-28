# Phase 2: Markdown to Structured JSON Extraction - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-27
**Phase:** 2-Markdown to Structured JSON Extraction
**Areas discussed:** Prompt strategy, Error detection, Module structure, Markdown fixture

---

## Prompt Strategy

### Question 1: How much context about the markdown format does the system prompt give Claude?

| Option | Description | Selected |
|--------|-------------|----------|
| Schema-only | Short system prompt, trust zodOutputFormat + model inference | ✓ |
| Annotation-aided | Include D-01–D-08 heading conventions explicitly | |
| Let Claude decide | Planner picks based on extraction testing results | |

**User's choice:** Schema-only
**Notes:** Trust the model to infer structure from the well-formatted markdown; keeps the prompt minimal.

### Question 2: Should Phase 2 include any markdown preprocessing before sending to Claude?

| Option | Description | Selected |
|--------|-------------|----------|
| No preprocessing | Send raw markdown string directly | ✓ |
| Light preprocessing | Extract YAML frontmatter separately with a library | |
| Let Claude decide | Planner judges after testing | |

**User's choice:** No preprocessing
**Notes:** One function, one Claude call; keeps extraction code simple.

---

## Error Detection

### Question 1: When should the error check happen?

| Option | Description | Selected |
|--------|-------------|----------|
| Both layers | Pre-flight markdown check + post-call Zod validation | ✓ |
| Post-call Zod only | Skip pre-flight, format ZodError paths | |
| Pre-flight only | Check markdown structure, trust Claude's output without schema validation | |

**User's choice:** Both layers
**Notes:** Pre-flight fails fast and cheap before spending API tokens.

### Question 2: What does the pre-flight check look for?

| Option | Description | Selected |
|--------|-------------|----------|
| Required sections only | All 6 frontmatter fields + ## Experience, ## Education, ## Skills headings | ✓ |
| All defined sections | All 5 section headings, with warnings for optional ones | |
| Frontmatter only | Only pre-check YAML fields, Zod handles headings | |

**User's choice:** Required sections only
**Notes:** Optional sections (Summary, Core Competencies) are not pre-flight checked.

### Question 3: How should Zod errors be formatted?

| Option | Description | Selected |
|--------|-------------|----------|
| Path-based readable message | `experience[0].bullets: expected array, got undefined` | ✓ |
| Section-level summary | Group issues by top-level section | |
| Let Claude decide | Planner picks cleanest format | |

**User's choice:** Path-based readable message
**Notes:** Tells the user exactly which field Claude missed.

---

## Module Structure

### Question 1: Where does the extraction logic live?

| Option | Description | Selected |
|--------|-------------|----------|
| src/lib/extract.ts | Exports `extractResume(markdown: string): Promise<ResumeData>` | ✓ |
| src/extract.ts | Top-level src/ file | |
| src/lib/parser.ts | Same lib pattern, named 'parser' | |

**User's choice:** src/lib/extract.ts
**Notes:** Clean separation between the lib function and the CLI entry point.

### Question 2: How does --validate-only work in Phase 2 without Commander?

| Option | Description | Selected |
|--------|-------------|----------|
| Thin process.argv check in cli/index.ts | Phase 4 replaces with full Commander parsing | ✓ |
| Standalone script: scripts/extract.ts | Separate runnable script, two entry points temporarily | |
| Commander wired in Phase 2 | Add Commander now, Phase 4 adds flags on top | |

**User's choice:** Thin process.argv check in cli/index.ts
**Notes:** Stays within Phase 2 scope; Phase 4 replaces the stub cleanly.

---

## Markdown Fixture

### Question 1: What should the markdown fixture contain?

| Option | Description | Selected |
|--------|-------------|----------|
| Clean well-formed note only | One fixture matching D-01–D-08 exactly | ✓ |
| Clean + messy variant | Happy path plus a second .md with real-world noise | |
| Messy only | Start with a realistic messy note | |

**User's choice:** Clean well-formed note only
**Notes:** Messy/real-world testing deferred to Phase 4's end-to-end pass.

### Question 2: Where should the markdown fixture live?

| Option | Description | Selected |
|--------|-------------|----------|
| fixtures/sample-resume.md | Alongside sample-resume.json — clear .md/.json pairing | ✓ |
| fixtures/input/sample-resume.md | Separate input/ subdirectory | |
| test/fixtures/sample-resume.md | Under a test/ directory | |

**User's choice:** fixtures/sample-resume.md
**Notes:** Pairs with sample-resume.json — input/output co-located.

---

## Claude's Discretion

- Exact system prompt wording (beyond "schema-only, minimal")
- How to format the "unset API key" error message
- Whether to surface all pre-flight errors at once or fail on the first issue
- Pretty-printing approach for --validate-only JSON output

## Deferred Ideas

None — discussion stayed within phase scope.
