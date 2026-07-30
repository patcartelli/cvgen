---
status: partial
phase: 06-output-directory-routing
source: [06-VERIFICATION.md]
started: 2026-07-30T21:00:00Z
updated: 2026-07-30T21:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. "n" path — both PDFs written to output/ relative to cwd

expected: Run `echo "n" | ANTHROPIC_API_KEY=<real-key> npx tsx src/cli/index.ts fixtures/sample-resume.md` from project root. Both PDFs written to `output/` relative to cwd; `output/` directory created automatically if absent; CLI logs `Written: output/sample-resume-resume.pdf` and `Written: output/sample-resume-resume-ats.pdf`
result: [pending]

### 2. "y" + company name — PDFs written to output/<Slug>/ relative to cwd

expected: Run `printf "y\nAcme Corp\n" | ANTHROPIC_API_KEY=<real-key> npx tsx src/cli/index.ts fixtures/sample-resume.md` from project root. Both PDFs written to `output/Acme-Corp/`; directory auto-created; CLI logs paths inside `output/Acme-Corp/`
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
