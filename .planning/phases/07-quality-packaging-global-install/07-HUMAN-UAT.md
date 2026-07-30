---
status: partial
phase: 07-quality-packaging-global-install
source: [07-VERIFICATION.md]
started: 2026-07-30T00:00:00Z
updated: 2026-07-30T00:00:00Z
---

## Current Test

[awaiting human confirmation of global install end-to-end]

## Tests

### 1. Global install end-to-end (QUAL-03)

Automated pre-steps (run by executor in Task 3): npm build, shebang check, npm link, which cvgen → `/opt/homebrew/bin/cvgen`, symlink → `dist/cli/index.js`, cvgen --help from temp dir — all passed.

Human gate: open a NEW terminal session and confirm:

1. `which cvgen` — expect path under global npm bin
2. `ls -la $(which cvgen)` — expect symlink into `dist/cli/index.js` with execute bit
3. `cd $(mktemp -d)` — move outside the repo
4. `cvgen --help` — expect Commander help, exit 0, no ERR_MODULE_NOT_FOUND
5. `cvgen init /tmp/cvgen-verify-$(date +%s).md` — expect sample note created
6. `rm /tmp/cvgen-verify-*.md`

expected: All 6 steps succeed in a fresh terminal outside the repo
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
