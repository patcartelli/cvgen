---
plan: 02-02
phase: 02-markdown-to-structured-json-extraction
status: complete
completed: 2026-07-28
requirements: [SEC-01, DEVX-01, PARSE-03]
tasks_total: 2
tasks_complete: 2
---

## What Was Built

Replaced the Phase 1 CLI stub (`src/cli/index.ts`) with the thin `process.argv` orchestrator that wires the full Phase 2 extraction pipeline. The entry point loads `.env`, guards `ANTHROPIC_API_KEY`, parses `--validate-only` / `--dry-run`, reads the markdown file, runs preflight, calls `extractResume`, and routes output to stdout.

## Files Modified

| File | Change |
|------|--------|
| `src/cli/index.ts` | Replaced Phase 1 stub with full argv orchestrator (Task 1) |
| `src/cli/index.test.ts` | New — 8-test suite covering behavioral + structural requirements |
| `src/schema/validate.ts` | Minor Biome formatting (no semantic change) |
| `.planning/config.json` | Workflow config update (auto-chain flag) |
| `package-lock.json` | Lockfile updated for @anthropic-ai/sdk dependency |

## Commits

- `9c011e7`: feat(02-02): replace CLI stub with argv orchestrator + 8-test suite

## Test Results

8/8 tests passing (`src/cli/index.test.ts`):
- Test 1: no args → usage to stderr, exit 1 ✓
- Test 2: only flag (no file path) → usage to stderr, exit 1 ✓
- Test 3: file path + no key → "ANTHROPIC_API_KEY...not set" to stderr, exit 1 ✓
- Test 4: nonexistent file → ENOENT error to stderr, exit 1 ✓
- Test 5: preflight-failing markdown → per-error stderr, exit 1, no API call ✓
- Test 6: shebang on line 1 ✓
- Test 7: loadEnvFile present, no direct `new Anthropic()` construction ✓
- Test 8: no commander/yargs/readline/require ✓

`npm run typecheck` clean. `npm run lint` clean. `npm run build && head -1 dist/cli/index.js` → `#!/usr/bin/env node` (shebang survives tsc emit).

## Human Checkpoint Results (Task 2)

All 6 verification steps passed against real `ANTHROPIC_API_KEY`:

| Step | Verification | Result |
|------|-------------|--------|
| 1 | Unset key → "ANTHROPIC_API_KEY is not set", exit 1, no prompt | ✓ |
| 3 | `--validate-only` against fixture → exit 0, valid JSON | ✓ |
| 4 | `contact.name: Alex Rivera`, `experience count: 2`, `skills count: 2` | ✓ |
| 5 | `--dry-run` produces valid JSON matching schema | ✓ |
| 6 | Preflight-failing markdown → 9 error lines to stderr, exit 1, fast | ✓ |

## Key Architecture Notes

- **Step ordering deviation**: argv parsing (Step C) was moved before the key guard (Step B) so `cvgen` with no args shows usage text regardless of API key status. The plan spec ordered B before C, but the test behaviors require C first. Deviation is intentional and locked.
- `src/cli/index.ts` never constructs `new Anthropic()` — delegates to `extractResume` which owns the client lifecycle.
- `.env` load uses native `process.loadEnvFile()` (Node 22+), wrapped in try/catch for optional file.

## Exported Interface for Phase 3+

```
cvgen <path-to-markdown-file> [--validate-only | --dry-run]
  --validate-only   Print extracted ResumeData JSON to stdout, exit 0
  --dry-run         Synonym for --validate-only
  (no flag)         "Rendering not yet implemented (Phase 3)." then exit 0
```

## Requirements Satisfied

- **SEC-01**: API key loaded from env only; never prompted, never persisted, never logged as value ✓
- **DEVX-01**: `--validate-only` and `--dry-run` both print schema-validated JSON to stdout ✓
- **PARSE-03**: Preflight error messages surface to the user via stderr before any API call ✓
