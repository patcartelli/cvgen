---
slug: fix-test3-env-isolation
created: "2026-07-28T21:24:04Z"
status: in-progress
files_modified:
  - src/cli/index.test.ts
---

# Fix Test 3 .env isolation in index.test.ts

## Problem

`runCli` always spawns from `projectRoot` as cwd. Test 3 deletes `ANTHROPIC_API_KEY` from the subprocess env, but the subprocess inherits `projectRoot` as cwd — where a real `.env` file lives. `process.loadEnvFile(".env")` loads it, repopulates the key, and the CLI exits 0 instead of 1.

## Fix

1. Add optional `cwd?: string` parameter to `runCli` (default: `projectRoot`)
2. In Test 3, pass `mkdtempSync(join(tmpdir(), "cvgen-no-env-"))` as the cwd so there is no `.env` file in the subprocess working directory

## Tasks

- [ ] Add `cwd?: string` to `runCli` signature and spread into `spawnSync` options
- [ ] Update Test 3 to pass a fresh temp dir as cwd
- [ ] Run `npm test` — all 38 tests must pass including Test 3 exiting 1
- [ ] Commit atomically
