---
slug: fix-test3-env-isolation
status: complete
completed: "2026-07-28T21:24:04Z"
files_modified:
  - src/cli/index.test.ts
---

# Fix Test 3 .env isolation — Complete

Added optional `cwd` parameter to `runCli` (default: `projectRoot`). Test 3 now passes `mkdtempSync(...)` as cwd so `process.loadEnvFile(".env")` finds no `.env` file, the key guard fires, and the CLI correctly exits 1.

Commit: `93db7d7` — fix(04): isolate Test 3 from project .env — pass temp cwd to runCli

Result: 38/38 tests pass.
