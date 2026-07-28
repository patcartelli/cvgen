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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Pattern |
|-----------|--------|-------|-------------|
| v1.0 | 4 | 9 | Fixture-first rendering; source-level tests; Commander CLI pattern |

### Cumulative Quality

| Milestone | Tests | Suites |
|-----------|-------|--------|
| v1.0 | 38 | 6 |

### Top Lessons (Verified Across Milestones)

1. Test subprocess isolation — always set explicit `cwd` when spawning CLI subprocesses in tests
2. Close verification artifacts immediately when human testing is done
