---
phase: 02-markdown-to-structured-json-extraction
verified: 2026-07-28T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Run extraction against fixtures/sample-resume.md with a real ANTHROPIC_API_KEY and confirm the output validates against the Phase 1 schema"
    expected: "exit 0, stdout contains valid JSON with contact.name == 'Alex Rivera', experience array with 2 entries, skills array with 2 entries"
    why_human: "Requires a live Claude API call — no mock can substitute for the actual messages.parse + zodOutputFormat pipeline executing end-to-end. Plan 02 Task 2 defined this as a blocking human checkpoint; the SUMMARY claims it was done and approved, but verifier cannot rerun a live API call to confirm."
---

# Phase 2: Markdown to Structured JSON Extraction — Verification Report

**Phase Goal:** Parse a markdown resume file into a validated ResumeData JSON object using Claude's structured output, with pre-flight validation and a working --validate-only CLI flag.
**Verified:** 2026-07-28
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|---------|
| 1  | Running extraction against a fixture markdown resume produces JSON that validates against the Phase 1 schema | ? UNCERTAIN | Live API path is mechanically wired (extract.ts uses messages.parse + zodOutputFormat(ResumeSchema), cli pipes to extractResume, validateResume uses ResumeSchema.safeParse); SUMMARY claims human checkpoint passed but verifier cannot rerun a live Claude call |
| 2  | When a required section is missing or malformed, the user sees a human-readable error naming the specific section, not a raw stack trace | ✓ VERIFIED | preflight.test.ts Test 5 passes (subprocess output confirms stderr contains "Missing required frontmatter field:" and "Missing required section:" with exit 1); preflightCheck accumulates all errors before any API call |
| 3  | The Claude API key is read only from an environment variable — running with it unset produces a clear failure message and the CLI never prompts for or persists a key | ✓ VERIFIED | cli/index.test.ts Test 3 passes: stderr contains "ANTHROPIC_API_KEY" and "not set", exit 1; no readline/inquirer/prompts imported (Test 8); ANTHROPIC_API_KEY is never logged as a value (no `console.log(process.env...)`); key construction delegated entirely to extract.ts (new Anthropic() absent from cli/index.ts) |
| 4  | Running with --validate-only/--dry-run prints the extracted, validated JSON to stdout and performs no PDF rendering | ✓ VERIFIED | cli/index.ts:56-58 routes isValidateOnly to console.log(JSON.stringify(data)) + exit 0; --dry-run is synonymous (line 22); rendering path prints "Rendering not yet implemented (Phase 3)." which is intentional Phase 3 boundary; validated by cli/index.test.ts structural tests |

**Score:** 3/4 truths fully verified automatically; 1/4 requires live-API human confirmation

### Roadmap Success Criteria Coverage

| SC# | Criterion | Status | Evidence |
|-----|-----------|--------|---------|
| 1 | Running extraction against a fixture markdown resume produces JSON that validates against the Phase 1 schema | ? UNCERTAIN (human needed) | Mechanically wired; live API path unverifiable without a real ANTHROPIC_API_KEY |
| 2 | When a required section is missing or malformed, the user sees a human-readable error naming the specific section, not a raw stack trace | ✓ VERIFIED | preflight.test.ts 7/7 + cli/index.test.ts Test 5 pass; subprocess produces per-field stderr lines |
| 3 | The Claude API key is read only from an environment variable — running with it unset produces a clear failure message and the CLI never prompts for or persists a key | ✓ VERIFIED | cli/index.test.ts 8/8 pass; grep confirms no env-value logging, no interactive libs |
| 4 | Running with --validate-only/--dry-run prints the extracted, validated JSON to stdout and performs no PDF rendering | ✓ VERIFIED | Source code and structural tests confirm correct routing; --dry-run aliased to --validate-only |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/extract.ts` | extractResume(markdown: string): Promise\<ResumeData\> | ✓ VERIFIED | Exists, 26 lines (min: 15), exports extractResume, uses messages.parse + zodOutputFormat, imports from schema/resume.js with .js extension, guards parsed_output === null, never calls process.exit |
| `src/lib/preflight.ts` | preflightCheck(markdown: string): PreflightError[] | ✓ VERIFIED | Exists, 49 lines (min: 30), exports preflightCheck and PreflightError interface, zero imports, zero console.log, zero process.exit |
| `src/schema/validate.ts` | validateResume with path-based Zod error formatting | ✓ VERIFIED | Exports validateResume, contains issue.path traversal, throws "Resume validation failed:\n{formatted}", uses ResumeSchema.safeParse |
| `src/cli/index.ts` | CLI entry: env load + key guard + argv parse + preflight + extract + validate-only routing | ✓ VERIFIED | Exists, 68 lines (min: 40), contains loadEnvFile, shebang on line 1, imports extractResume and preflightCheck, no commander/readline/inquirer/prompts, no new Anthropic() directly |
| `fixtures/sample-resume.md` | Well-formed markdown fixture matching sample-resume.json | ✓ VERIFIED | Contains all 6 frontmatter fields (name/email/phone/location/linkedin/github), ## Experience, ## Education, ## Skills in correct order, Alex Rivera persona; preflightCheck returns [] (extract.test.ts Test 7) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/lib/extract.ts | src/schema/resume.ts | import { ResumeSchema, type ResumeData } | ✓ WIRED | Lines 4-5: `import type { ResumeData } from "../schema/resume.js"` and `import { ResumeSchema } from "../schema/resume.js"` |
| src/lib/extract.ts | @anthropic-ai/sdk | messages.parse + zodOutputFormat | ✓ WIRED | Line 3: imports from "@anthropic-ai/sdk/helpers/zod.js" with .js extension; line 11: client.messages.parse call; line 16: output_config: { format: zodOutputFormat(ResumeSchema) } |
| src/schema/validate.ts | src/schema/resume.ts | safeParse on ResumeSchema | ✓ WIRED | Line 19: ResumeSchema.safeParse(data) |
| src/cli/index.ts | src/lib/extract.ts | import { extractResume } | ✓ WIRED | Line 8: `import { extractResume } from "../lib/extract.js"`; line 53: `const data = await extractResume(markdown)` |
| src/cli/index.ts | src/lib/preflight.ts | import { preflightCheck } | ✓ WIRED | Line 9: `import { preflightCheck } from "../lib/preflight.js"`; line 44: `const preflightErrors = preflightCheck(markdown)` |
| src/cli/index.ts | process.env.ANTHROPIC_API_KEY | env guard | ✓ WIRED | Line 14: process.loadEnvFile(".env"); line 31: if (!process.env.ANTHROPIC_API_KEY) guard with console.error + process.exit(1) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| src/cli/index.ts | data (ResumeData) | await extractResume(markdown) → client.messages.parse with zodOutputFormat | Live Claude API response parsed and Zod-validated; not static | ? HOLLOW for live path (cannot verify without API key) — mechanically correct wiring confirmed |
| src/schema/validate.ts | result.data (ResumeData) | ResumeSchema.safeParse(data) | Real Zod schema parse of input data | ✓ FLOWING — validate.test.ts confirms valid fixture passes, malformed throws |
| src/lib/preflight.ts | errors (PreflightError[]) | Regex operations on markdown string | Real string analysis, no static returns | ✓ FLOWING — preflight.test.ts 7/7 confirms all paths |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| validate.test.ts (5 tests) | npx tsx --test src/schema/validate.test.ts | 5/5 pass | ✓ PASS |
| preflight.test.ts (7 tests) | npx tsx --test src/lib/preflight.test.ts | 7/7 pass | ✓ PASS |
| extract.test.ts (6 structural tests) | npx tsx --test src/lib/extract.test.ts | 6/6 pass | ✓ PASS |
| cli/index.test.ts (8 tests incl. subprocess) | npx tsx --test src/cli/index.test.ts | 8/8 pass | ✓ PASS |
| TypeScript typecheck | npm run typecheck | 0 errors | ✓ PASS |
| Biome lint | npm run lint | 0 errors, 15 files | ✓ PASS |
| Build + shebang preservation | npm run build && head -1 dist/cli/index.js | #!/usr/bin/env node | ✓ PASS |
| Live extraction end-to-end | npx tsx src/cli/index.ts fixtures/sample-resume.md --validate-only | Requires real ANTHROPIC_API_KEY | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| PARSE-01 | 02-01-PLAN.md | CLI parses markdown resume via Claude's structured-output API into JSON conforming to schema | ✓ SATISFIED (mechanism) / ? LIVE PATH UNCERTAIN | extract.ts uses messages.parse + zodOutputFormat(ResumeSchema); live API path needs human confirmation |
| PARSE-02 | 02-01-PLAN.md | Extracted JSON validated against schema in code before rendering | ✓ SATISFIED | validateResume uses ResumeSchema.safeParse; validate.test.ts confirms path-based error formatting; extract.ts result passes through zodOutputFormat validation at API call time |
| PARSE-03 | 02-01-PLAN.md, 02-02-PLAN.md | Human-readable error naming specific missing/malformed section | ✓ SATISFIED | preflightCheck produces "Missing required frontmatter field: {field}" and "Missing required section: {heading}"; cli/index.ts routes errors to stderr before any API call; subprocess test confirms behavior |
| SEC-01 | 02-02-PLAN.md | API key read only from env var; never prompts or persists | ✓ SATISFIED | ANTHROPIC_API_KEY checked via process.env; loadEnvFile from native Node; no readline/inquirer/prompts; key value never logged; cli/index.test.ts Test 3 confirms error path |
| DEVX-01 | 02-02-PLAN.md | --validate-only/--dry-run prints extracted JSON without PDF rendering | ✓ SATISFIED | Both flags handled (lines 22, 56-58); routes to console.log(JSON.stringify) + exit 0; "Rendering not yet implemented (Phase 3)." is intentional Phase 3 boundary per plan spec |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/cli/index.ts | 61 | "Rendering not yet implemented (Phase 3)." | ℹ Info | Intentional Phase 3 boundary per 02-02-PLAN.md Task 1 Step G spec: "console.log('Rendering not yet implemented (Phase 3).')" — this is the specified placeholder for the non-validate-only branch until Phase 3 is built. Not a STUB (no rendering work has begun). Not a debt marker (no TBD/FIXME/XXX). |

No TBD, FIXME, XXX, or unresolved debt markers found in any modified source files.

### Human Verification Required

### 1. Live End-to-End Extraction

**Test:** With a real ANTHROPIC_API_KEY set, run:
```
npx tsx src/cli/index.ts fixtures/sample-resume.md --validate-only > /tmp/cvgen-out.json
echo "exit: $?"
node -e "const d=JSON.parse(require('fs').readFileSync('/tmp/cvgen-out.json','utf8')); console.log('contact.name:', d.contact?.name); console.log('experience count:', d.experience?.length); console.log('skills count:', d.skills?.length);"
```

**Expected:** exit 0; /tmp/cvgen-out.json parses as valid JSON; `contact.name: Alex Rivera`, `experience count: 2`, `skills count: 2`.

**Why human:** The full extraction pipeline (Claude API call via messages.parse + zodOutputFormat) requires a real ANTHROPIC_API_KEY. No mock or structural test can substitute for the model actually returning structured output that Zod validates against ResumeSchema. This is Roadmap Success Criterion #1 for Phase 2.

Note: Plan 02 Task 2 documented a human checkpoint that was reportedly "approved" with all 6 steps passing (including this exact check). If the developer who ran the checkpoint can affirm that approval was genuine and the CLI produced valid output, this item can be considered satisfied without re-running.

### Gaps Summary

No implementation gaps found. All artifacts exist, are substantive, and are wired correctly. All 20 automated tests (5 + 7 + 6 + 2 structural via subprocess + structural source assertions) pass. The single outstanding item is human confirmation of the live Claude API path, which was a blocking human checkpoint in Plan 02.

---

_Verified: 2026-07-28_
_Verifier: Claude (gsd-verifier)_
