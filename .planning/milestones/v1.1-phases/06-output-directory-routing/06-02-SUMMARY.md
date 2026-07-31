---
plan: "06-02"
phase: "06-output-directory-routing"
status: complete
started: "2026-07-30"
completed: "2026-07-30"
key-files:
  created: []
  modified:
    - src/cli/index.ts
    - src/cli/index.test.ts
requirements:
  - OUTPUT-01
  - OUTPUT-02
---

## Summary

Wired the interactive prompt flow and output directory routing into `src/cli/index.ts` (Step D.5). The CLI now asks the user whether the resume is tailored for a specific company and routes PDFs accordingly.

## What Was Built

**Task 1 — Step D.5 prompt + mkdir + Step H update (`src/cli/index.ts`)**

Four targeted changes to `src/cli/index.ts`:

1. **Imports**: Added `writeSync` from `node:fs`, `mkdir` to fs/promises, `join` to path, `createInterface` from `node:readline` (callback-based, not readline/promises), and `toCompanySlug` to the render.js named import.

2. **Step D.5 readline block** (inserted between Step D and Step E):
   - Creates a callback-based readline interface with an EOF-safe `ask()` helper that races the question callback against the 'close' event. This is critical: `readline/promises`' `question()` silently drops pending promises when stdin closes (e.g., in piped/spawnSync contexts) — the callback-based approach resolves to `""` on close instead.
   - Asks "Is this resume tailored for a specific company? (y/n):" 
   - If "y": asks "Company name:", calls `toCompanySlug()`, exits with error if slug is empty (via `writeSync` + `process.exitCode=1` + `stdin.destroy()` + `return` to let the event loop drain cleanly — `process.exit()` inside the async action handler produces exit code 13 "Unfinished Top-Level Await")
   - If "n": `outputDir = join(process.cwd(), "output")`
   - `rl.close()` in finally block ensures the readline interface is always released

3. **mkdir guard**: `await mkdir(outputDir, { recursive: true })` guarded by `if (!isValidateOnly)` — prevents empty directory creation on `--validate-only` runs.

4. **Step G dedup**: `isValidateOnly` now declared once before Step E; duplicate at Step G removed.

5. **Step H update**: `resolveOutputPaths(absPath)` → `resolveOutputPaths(absPath, outputDir)` two-argument form.

**Task 2 — Integration tests for Step D.5 (`src/cli/index.test.ts`)**

- Extended `runCli()` with optional `input?: string` parameter (fed to spawnSync's stdin)
- Added `describe("Step D.5 interactive prompt")` with 2 tests:
  - **Test 9**: `input: "n\n"` + dummy key → exits non-zero (API rejects dummy key at Step E, NOT key guard at Step B) — proves the "n" path flows through Step D.5
  - **Test 10**: `input: "y\n!!!\n"` + dummy key → exits 1 with "Company name must contain at least one letter or digit" in stderr — proves the empty-slug guard fires before Step E
- Both tests use a temp cwd to prevent `mkdir(output/)` landing in the project root

## Deviations

**Non-trivial deviation: readline implementation changed from readline/promises to callback-based readline**

`readline/promises`' async `question()` has a documented behavioral gap: when the readline interface closes (due to stdin EOF in piped contexts), any pending `question()` Promises are silently abandoned — neither resolved nor rejected. This caused the second `rl.question()` call to hang forever when stdin was a pipe (spawnSync test context), producing Node.js exit code 13 ("Unfinished Top-Level Await") rather than 1.

Fix: replaced `readline/promises` with callback-based `readline` plus an `ask()` wrapper that listens for the 'close' event and resolves to `""` if readline closes before the user answers. In a real TTY, stdin never reaches EOF mid-session, so this fallback never fires for real users.

**Non-trivial deviation: emptySlug exit pattern**

`program.error()` called from inside an async action handler calls `process.exit()` synchronously, which bypasses Node.js stream flushing and produces lost stderr writes + exit code 13. Fixed by:
- `writeSync(process.stderr.fd, "error: ...")` — synchronous write to OS pipe buffer, guaranteed visible
- `process.exitCode = 1` — sets exit code without forcing immediate termination
- `process.stdin.destroy()` — closes stdin so event loop can drain
- `return` — exits action handler cleanly; Commander's chain settles naturally

## Self-Check: PASSED

- `src/cli/index.ts` imports `mkdir`, `join`, `createInterface`, `toCompanySlug`, `writeSync` ✓
- Step D.5 readline block between Step D and Step E ✓
- `rl.close()` in finally block ✓
- `mkdir(outputDir, { recursive: true })` guarded by `!isValidateOnly` ✓
- `resolveOutputPaths(absPath, outputDir)` two-argument form at Step H ✓
- `isValidateOnly` declared exactly once ✓
- `describe("Step D.5 interactive prompt")` with Tests 9 and 10 in index.test.ts ✓
- `npm test` exits 0 (44 tests pass) ✓
- `tsc --noEmit` exits 0 ✓
