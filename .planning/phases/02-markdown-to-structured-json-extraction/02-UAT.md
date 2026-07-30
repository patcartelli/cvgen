---
status: complete
phase: 02-markdown-to-structured-json-extraction
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md]
started: 2026-07-30T00:00:00Z
updated: 2026-07-30T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running process. Run `npm run build` — exits 0, no errors. Then run `node dist/cli/index.js` (no args) — it prints usage text to stderr and exits 1. Confirms the built CLI boots cleanly from scratch.
result: pass

### 2. No args → usage error
expected: Run `cvgen` (or `node dist/cli/index.js`) with no arguments. It prints a usage message to stderr and exits with code 1. No JSON output, no crash.
result: pass

### 3. Missing API key → clear error
expected: Unset ANTHROPIC_API_KEY (e.g. `ANTHROPIC_API_KEY= cvgen fixtures/sample-resume.md`) and run against any markdown file. It prints something like "ANTHROPIC_API_KEY is not set" to stderr and exits 1. No API call attempted.
result: pass

### 4. Preflight: bad markdown → errors surfaced
expected: Run `cvgen` against a malformed or empty markdown file (or create a temp file with no frontmatter). It prints per-error messages to stderr (one line per missing field/section) and exits 1 — fast, no API call.
result: pass

### 5. --validate-only with fixture → JSON output
expected: Run `cvgen fixtures/sample-resume.md --validate-only`. It exits 0 and prints valid JSON to stdout containing at minimum `contact.name` (Alex Rivera), an `experience` array, and a `skills` array.
result: pass

### 6. --dry-run synonym
expected: Run `cvgen fixtures/sample-resume.md --dry-run`. Behaves identically to --validate-only: valid JSON to stdout, exit 0.
result: pass

### 7. Nonexistent file → ENOENT error
expected: Run `cvgen /tmp/does-not-exist.md --validate-only`. It prints an ENOENT (file not found) error to stderr and exits 1. No API call attempted.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
