# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-07-28
**Phases:** 4 | **Plans:** 9 | **Timeline:** 2 days

### What Was Built
- TypeScript CLI scaffold with Biome lint, tsc type-checking, gitleaks secret hygiene
- Zod ResumeSchema with 38 tests covering valid, malformed, and edge-case fixtures
- Claude API extraction pipeline (`extractResume` via claude-haiku-4-5 + zodOutputFormat)
- Puppeteer PDF rendering — portfolio-quality designed PDF + ATS-clean single-column PDF
- Full Commander 15 CLI: `cvgen <path>`, `--verbose`, `--validate-only`, `cvgen init`

### What Worked
- Strict phase dependency ordering (schema → extraction → rendering → CLI wiring) meant no blocking cross-phase surprises at integration time
- Fixture-first approach for PDF rendering (Phase 3 built against fixture, never blocked on live Claude call) let rendering and extraction develop in parallel
- Source-level test assertions (reading `src/lib/extract.ts` as a string) gave structural guarantees without needing live API keys in CI
- Wave-based plan execution within each phase caught integration issues early per wave, not all at end-of-phase

### What Was Inefficient
- Phase 02 VERIFICATION.md ended in `human_needed` state and was never formally closed — the human verification happened inline as part of Phase 04 UAT but the artifact wasn't updated
- `afterEach` cleanup stub in `index.test.ts` was wired but intentionally no-op — temp dirs from Test 5 accumulate (CR-02 from code review)
- Test 3's `.env` isolation gap wasn't caught until phase verification — required a quick-task gap closure after the fact

### Patterns Established
- `process.loadEnvFile(".env")` in try/catch at CLI entry — never errors on missing file, key comes from shell env
- `program.error()` over `console.error + process.exit()` inside Commander action handlers — cleaner, no stack traces
- `runCli(args, env, cwd)` with explicit `cwd` override in subprocess tests — prevents .env file bleed across test cases
- `.showHelpAfterError(true)` required for Commander 15 to include "Usage:" in error output when a required arg is missing

### Key Lessons
1. Test isolation for CLI subprocess tests must account for CWD: `spawnSync` inherits the project root unless overridden, which can load `.env` files even when the test deleted the key from `process.env`
2. Verification status artifacts (`human_needed`) should be updated immediately when the human verification is done, not left open until milestone close
3. Commander 15's default error output for missing required args does NOT include "Usage:" — need `.showHelpAfterError(true)` if tests assert that string

### Cost Observations
- Model mix: executor/verifier on sonnet, planner on opus
- 4 phases, 9 plans in 2 calendar days
- Wave-based parallel execution (worktrees) worked for Wave 1 of most phases; Wave 2 checkpoint plans ran sequentially

---

## Milestone: v1.1 — Typography & Workflow Improvements

**Shipped:** 2026-07-31
**Phases:** 3 (5–7) | **Plans:** 5 | **Timeline:** 1 day (2026-07-30–31)

### What Was Built
- Typography polish: 12px summary, #2d4a6b navy bullet markers, consistent 4px section header spacing via 6 targeted CSS edits
- Output routing: interactive readline prompt routes PDFs to `output/` or `output/<Company-Slug>/`; `toCompanySlug` handles D-01/D-02 edge cases
- Global install: `prepack` lifecycle hook, `chmod +x` in build script, `prepare || true` guard; `cvgen` works from any directory after `npm link`

### What Worked
- Research correctly identified that QUAL-01 and QUAL-02 were already done before Phase 7 started — saved two full plans of unnecessary re-implementation
- Pattern mapper on Phase 7 surfaced exact line numbers for every edit, making executor tasks precise to the character
- `writeSync` + `process.exitCode` + `return` pattern correctly handles early exit from async Commander action handlers (avoids exit code 13 and lost stderr)
- Pre-buffering stdin 'line' events fixed a subtle `readline/promises` race where the second question's promise was abandoned on piped EOF

### What Was Inefficient
- `npm link` ran inside a worktree that was subsequently removed, leaving a dangling symlink — `cvgen not found` in the new terminal during UAT; required re-linking from main repo
- readline/promises vs callback readline took 3 iterations to get right (promises silently drops questions on EOF; callback with `ask()` wrapper has the same race; line-buffer approach fixes it)
- Human UAT files were created with `status: partial` and never updated after user said "approved" — required batch-updating at milestone close

### Patterns Established
- `ask()` line-buffer pattern for readline with piped stdin: pre-register a 'line' event queue on the interface so buffered lines are never lost when EOF arrives between questions
- `writeSync(process.stderr.fd, msg)` + `process.exitCode = N` + `process.stdin.destroy()` + `return` for early exit from async Commander action handlers (bypasses exit-code-13 / unsettled-top-level-await issue)
- `chmod +x` appended to `build` script: tsc outputs non-executable files; npm bin requires executable bit; automate it
- `prepare: "simple-git-hooks || true"` — guard all `prepare` scripts against devDep-absent installs (global/CI/production)

### Key Lessons
1. `readline/promises`'s `question()` silently abandons pending promises when the interface closes (stdin EOF in pipe context) — use callback-based readline with a pre-buffered 'line' event queue instead
2. `process.exit()` from inside a Commander async action handler produces exit code 13 ("Unfinished Top-Level Await") and drops buffered stderr — exit by setting `process.exitCode`, destroying stdin, and returning
3. `npm link` from inside an isolated worktree points the global symlink to the worktree path, which is removed after merge — always re-link from main checkout after worktree cleanup
4. Human approval during plan execution should update the corresponding VERIFICATION.md and HUMAN-UAT.md immediately, not deferred to milestone close

### Cost Observations
- 3 phases, 5 plans in 1 calendar day
- Phase 5: pure CSS — single fast plan, no code complexity
- Phase 6: most complex — readline/promises bug took multiple attempts; piped stdin race required a novel pattern
- Phase 7: research-driven shortcut (QUAL-01/02 pre-done) saved significant execution time

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Pattern |
|-----------|--------|-------|-------------|
| v1.0 | 4 | 9 | Fixture-first rendering; source-level tests; Commander CLI pattern |
| v1.1 | 3 | 5 | Research short-circuits; line-buffer readline; async early-exit pattern |

### Cumulative Quality

| Milestone | Tests | Suites | LOC |
|-----------|-------|--------|-----|
| v1.0 | 38 | 6 | ~1200 |
| v1.1 | 44 | 8 | 1791 |

### Top Lessons (Verified Across Milestones)

1. Test subprocess isolation — always set explicit `cwd` when spawning CLI subprocesses in tests
2. Close verification artifacts immediately when human testing is done
3. Pre-buffer stdin 'line' events when using readline with piped input — readline/promises silently drops questions on EOF
4. Early exit from async Commander handlers: `writeSync` + `exitCode` + `stdin.destroy()` + `return` (not `process.exit()`)
