---
phase: quick-260820-mct
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/render.ts
  - src/lib/render.test.ts
  - src/cli/index.ts
  - src/cli/index.test.ts
  - README.md
autonomous: false
requirements: [STC-230]

must_haves:
  truths:
    - "`cvgen resume.md --company \"Acme Corp\"` writes both PDFs to output/Acme-Corp/ with no prompt on stdout"
    - "`cvgen resume.md --no-company` writes both PDFs to bare output/ with no prompt on stdout"
    - "`cvgen resume.md --company \"\"` exits 1 with a message about needing at least one letter or digit, and creates no output directory"
    - "`cvgen resume.md --company Acme --no-company` exits 1 with a message that the two flags cannot be used together"
    - "`cvgen resume.md` with no routing flag and non-TTY stdin exits 1 naming both --company and --no-company, instead of hanging"
    - "`cvgen resume.md` with no routing flag on a real TTY still asks both questions exactly as it did in v1.1"
  artifacts:
    - path: "src/lib/render.ts"
      provides: "resolveCompanyRouting pure routing decision helper"
      contains: "export function resolveCompanyRouting"
    - path: "src/lib/render.test.ts"
      provides: "unit coverage for every resolveCompanyRouting branch"
      contains: "resolveCompanyRouting"
    - path: "src/cli/index.ts"
      provides: "--company / --no-company Commander options wired to routing"
      contains: "--no-company"
    - path: "src/cli/index.test.ts"
      provides: "subprocess coverage for both flags, both error paths, and non-TTY guard"
      contains: "--no-company"
  key_links:
    - from: "src/cli/index.ts"
      to: "src/lib/render.ts"
      via: "resolveCompanyRouting import"
      pattern: "resolveCompanyRouting"
    - from: "src/cli/index.ts"
      to: "Commander negated-option event"
      via: "program.on('option:no-company')"
      pattern: "option:no-company"
    - from: "src/cli/index.ts readline block"
      to: "prompt-only branch"
      via: "createInterface must be unreachable when a routing flag is passed"
      pattern: "createInterface"
---

<objective>
Add `--company <name>` and `--no-company` so cvgen can run non-interactively in CI, scripts, and any piped context (Linear STC-230).

Purpose: the v1.1 interactive routing prompt makes the CLI unusable anywhere stdin is not a human terminal. Flags bypass both questions; when neither flag is passed and stdin is not a TTY, the CLI fails fast with an actionable error instead of blocking on a question nobody can answer.

Output: a pure `resolveCompanyRouting()` decision helper in `src/lib/render.ts`, the two flags wired into the Commander command in `src/cli/index.ts`, unit + subprocess tests, and updated README usage docs.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@CLAUDE.md

@src/cli/index.ts
@src/lib/render.ts
@src/cli/index.test.ts
@src/lib/render.test.ts
@README.md

<interfaces>
<!-- Contracts already in the codebase. Use these directly — no exploration needed. -->

From src/lib/render.ts (existing, unchanged by this plan):
```typescript
export function toCompanySlug(company: string): string;   // "Acme Corp" -> "Acme-Corp"; "AT&T" -> "ATT"; "!!!" -> ""
export function toNameSlug(name: string): string;
export function resolveOutputPaths(
  candidateName: string, outputDir: string, companySlug?: string, date?: string,
): { designed: string; ats: string };
```

From src/cli/index.test.ts (existing subprocess harness — reuse, do not rewrite):
```typescript
function runCli(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = projectRoot,
  input?: string,
): { stdout: string; stderr: string; status: number };
function envWithDummyKey(): NodeJS.ProcessEnv;   // fake key, never reaches Anthropic successfully
```

New contract this plan introduces in src/lib/render.ts:
```typescript
export type CompanyRouting =
  | { kind: "company"; slug: string }   // route to output/<slug>/
  | { kind: "bare" }                    // route to output/
  | { kind: "prompt" }                  // fall through to the v1.1 interactive readline path
  | { kind: "error"; message: string }; // caller prints "error: {message}" and exits 1

export function resolveCompanyRouting(flags: {
  company?: string;      // raw --company value; undefined when the flag was absent
  noCompany: boolean;    // true when --no-company was present
  stdinIsTty: boolean;
}): CompanyRouting;
```
</interfaces>

<verified_facts>
Confirmed by reading the repo before planning — treat as ground truth, do not re-derive:

1. **Commander 15 negated-option events are distinct.** `node_modules/commander/lib/command.js` emits `option:${option.name()}` (lines 1811/1821/1824/1840/1843/1856), and `lib/option.js` sets `name()` from the raw long flag while `attributeName()` strips the `no-` prefix (lines 217-218). So `--company` emits `option:company` and `--no-company` emits `option:no-company`, but **both write to the same `options.company` key**. That shared key is why `.conflicts()` cannot separate them and why `options.company` alone cannot detect "both flags passed" (`--company Acme --no-company` -> `false`; reversed order -> `"Acme"`). The two `option:` listeners are the detection mechanism.
2. **Step ordering must not change.** The routing decision stays at Step D.5 — after the `ANTHROPIC_API_KEY` guard (Step B), the file read (Step C), and preflight (Step D). Existing Test 3 spawns with a pipe (non-TTY) and no flags and asserts the *key-guard* error; moving routing validation earlier would break it.
3. **Early-exit pattern is established.** `writeSync(process.stderr.fd, msg)` + `process.exitCode = 1` + `process.stdin.destroy()` + `return` — never `process.exit()` inside the async Commander action handler (v1.1 retrospective lesson 2: `process.exit()` there yields exit code 13 and drops buffered stderr).
4. **Existing Tests 9 and 10 answer the prompts through a pipe** (`input: "n\n"` / `"y\n!!!\n"`). The non-TTY guard makes that input path an error by design, so those two tests are replaced in Task 2 — this is an intended, issue-mandated behavior change, not a regression to work around.
5. **`output/` is created at Step D.5+**, after routing and before the Claude call (`mkdir(outputDir, { recursive: true })`, skipped under `--validate-only`/`--dry-run`). Asserting on the created directory therefore proves routing worked without needing a live API key.
6. Test runner is `tsx --test src/**/*.test.ts` (single runner, `npm test`). No `.claude/skills/` or `.agents/skills/` directory exists in this repo.
</verified_facts>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add resolveCompanyRouting pure helper with unit tests</name>
  <files>src/lib/render.ts, src/lib/render.test.ts</files>
  <behavior>
    Add to the existing `describe` block region near `toCompanySlug` in `src/lib/render.test.ts` (pure-function section, no Puppeteer). Write these tests first, watch them fail, then implement:
    - `{ company: "Acme Corp", noCompany: false, stdinIsTty: false }` -> `{ kind: "company", slug: "Acme-Corp" }`
    - `{ company: "AT&T", noCompany: false, stdinIsTty: false }` -> `{ kind: "company", slug: "ATT" }`
    - `{ company: "  Acme Corp  ", noCompany: false, stdinIsTty: false }` -> `{ kind: "company", slug: "Acme-Corp" }` (whitespace trimmed before slugging)
    - `{ company: "", noCompany: false, stdinIsTty: false }` -> `kind: "error"`, message contains "at least one letter or digit"
    - `{ company: "!!!", noCompany: false, stdinIsTty: false }` -> same error as the empty case
    - `{ company: "Acme", noCompany: true, stdinIsTty: false }` -> `kind: "error"`, message contains "cannot be used together" (conflict wins over every other rule)
    - `{ company: "", noCompany: true, stdinIsTty: false }` -> conflict error, NOT the empty-name error (proves rule ordering)
    - `{ company: undefined, noCompany: true, stdinIsTty: false }` -> `{ kind: "bare" }`
    - `{ company: undefined, noCompany: false, stdinIsTty: true }` -> `{ kind: "prompt" }`
    - `{ company: undefined, noCompany: false, stdinIsTty: false }` -> `kind: "error"`, message contains both "--company" and "--no-company"
  </behavior>
  <action>
Export a `CompanyRouting` discriminated union and a `resolveCompanyRouting(flags)` function from `src/lib/render.ts`, placed in the "Output path helper" section immediately after `toCompanySlug` (it is the only consumer of that helper). Signature exactly as given in the `<interfaces>` block above.

Evaluate the rules in this order — ordering is part of the contract:
  1. `company !== undefined && noCompany` -> error, message: `--company and --no-company cannot be used together.`
  2. `company !== undefined` -> `toCompanySlug(company)`; empty result -> error, message: `Company name must contain at least one letter or digit.` (reuse this exact wording — it is what the existing interactive empty-slug guard prints, and keeping one string keeps flag and prompt paths consistent). Non-empty -> `{ kind: "company", slug }`.
  3. `noCompany` -> `{ kind: "bare" }`
  4. `stdinIsTty` -> `{ kind: "prompt" }`
  5. otherwise -> error, message: `Cannot prompt for company routing: stdin is not a terminal. Pass --company "Acme Corp" to route output to output/Acme-Corp/, or --no-company to write to output/.`

Messages carry no `error: ` prefix and no trailing newline — the CLI caller owns both, so this stays a pure string-in/string-out function with no I/O and no process access. Keep the function free of `process`, `fs`, and `console` references so it remains unit-testable without a subprocess.

Follow the file's existing JSDoc style (see `toCompanySlug` / `resolveOutputPaths`): one short block comment naming the decision rules, no inline narration of individual lines.
  </action>
  <verify>
    <automated>npx tsx --test src/lib/render.test.ts</automated>
    <automated>npm run typecheck &amp;&amp; npm run lint</automated>
  </verify>
  <done>All ten routing branches assert green in `src/lib/render.test.ts`; `resolveCompanyRouting` is exported from `src/lib/render.ts` and references no Node I/O globals; typecheck and Biome both clean.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Wire --company / --no-company into the CLI and replace the piped-prompt tests</name>
  <files>src/cli/index.ts, src/cli/index.test.ts, README.md</files>
  <behavior>
    In `src/cli/index.test.ts`, delete the two existing tests inside `describe("Step D.5 interactive prompt")` (Test 9 `'n'` answer, Test 10 `'y'` + `!!!`) — both feed prompt answers through a pipe, which this task makes an error by design (see verified fact 4). Replace that describe block with `describe("Step D.5 company routing flags")` containing, all via the existing `runCli` harness with `envWithDummyKey()` and a fresh `mkdtempSync` cwd:
    - Test 9: `[fixturePath, "--company", "Acme Corp"]` -> `existsSync(join(tmpCwd, "output", "Acme-Corp"))` is true; stdout does NOT contain "tailored for a specific company"; stderr does NOT contain "ANTHROPIC_API_KEY is not set". (Exit is non-zero — the dummy key is rejected at Step E — same shape as the old Test 9.)
    - Test 10: `[fixturePath, "--no-company"]` -> `existsSync(join(tmpCwd, "output"))` is true, `existsSync(join(tmpCwd, "output", "Acme-Corp"))` is false; stdout contains no prompt text.
    - Test 11: `[fixturePath, "--company", ""]` -> exit 1; combined stdout+stderr contains "at least one letter or digit"; `existsSync(join(tmpCwd, "output"))` is false (failed before mkdir).
    - Test 12: `[fixturePath, "--company", "Acme", "--no-company"]` -> exit 1; combined output contains "cannot be used together"; no `output/` directory created.
    - Test 13: `[fixturePath]` with no routing flag and no `input` (spawnSync pipe = non-TTY) -> exit 1; combined output contains both "--company" and "--no-company"; no `output/` directory created. A hang regression surfaces here as the harness's 15s timeout.
    - Test 14 (source-level): read `src/cli/index.ts` as a string and assert it still contains `lineBuffer`, `waitingResolver`, and `rl.on("line"` — a standing guard on the v1.1 pre-buffering fix, which is now only reachable on a TTY and so cannot be covered by a subprocess test.
    Assert error text against `stdout + stderr` combined, matching the existing Test 10 convention (Commander can route errors through either stream).
  </behavior>
  <action>
**`src/cli/index.ts`** — import `resolveCompanyRouting` alongside the existing named imports from `../lib/render.js`.

Declare two module-scope capture variables above `const program = new Command()`:
  - `let companyFlagValue: string | undefined;`
  - `let noCompanyFlagSeen = false;`

Add both options to the main command chain, immediately after `--dry-run`:
  - `--company <name>` — description: "route output to output/<Company-Slug>/ without prompting"
  - `--no-company` — description: "write output to bare output/ without prompting"

After the option chain and before `parseAsync`, register two Commander listeners that populate the capture variables: `option:company` (receives the raw value) and `option:no-company`. Per verified fact 1, both flags share the `options.company` attribute, so the parsed options object cannot distinguish "both flags passed" — the listeners are the only reliable presence signal. Add one short comment stating that constraint so the indirection is not mistaken for accidental complexity; leave the action handler's `options` type annotation as-is, since routing is read from the listeners rather than from `options`.

Rewrite Step D.5 as: resolve routing first, then branch.
  - Call `resolveCompanyRouting({ company: companyFlagValue, noCompany: noCompanyFlagSeen, stdinIsTty: process.stdin.isTTY === true })`.
  - `kind === "error"` -> `writeSync(process.stderr.fd, \`error: ${routing.message}\n\`)`, `process.exitCode = 1`, `process.stdin.destroy()`, `return` (verified fact 3 — do not use `process.exit()` or `program.error()` here).
  - `kind === "company"` -> `companySlug = routing.slug`, `outputDir = join(process.cwd(), "output", routing.slug)`.
  - `kind === "bare"` -> `outputDir = join(process.cwd(), "output")`.
  - `kind === "prompt"` -> run the existing interactive block.

**Critical:** move the `createInterface({ input: process.stdin, output: process.stdout })` call, the `lineBuffer` / `waitingResolver` queue, the `line` and `close` listeners, the `ask()` helper, and the `try { ... } finally { rl.close() }` body **inside the `prompt` branch, byte-for-byte unchanged**. Two reasons: a flag run must never attach a reader to stdin (that is the anti-hang guarantee), and the pre-buffering queue is the v1.1 fix for `readline`'s abandoned-promise-on-EOF race (retrospective lesson 1) — it must survive this refactor intact. The existing `emptySlug` guard stays inside that branch with its current wording and its current `writeSync`/`exitCode`/`destroy` exit.

Everything downstream of Step D.5 (`mkdir`, Steps E-H, `resolveOutputPaths(data.contact.name, outputDir, companySlug, today)`) is unchanged — `outputDir` and `companySlug` mean exactly what they meant before. Do not touch PDF rendering, the Zod schema, or Claude extraction.

Extend `.addHelpText("after", ...)` with two examples: `cvgen ./my-resume.md --company "Acme Corp"` and `cvgen ./my-resume.md --no-company`.

**`README.md`** — add both flags to the Usage code fence, and rewrite the prompt paragraph at lines 37-42 so it states that the prompts only appear on an interactive terminal, that `--company "Acme Corp"` and `--no-company` skip them, and that a non-interactive run without either flag exits 1 with an error rather than hanging.
  </action>
  <verify>
    <automated>npm test</automated>
    <automated>npm run typecheck &amp;&amp; npm run lint</automated>
    <automated>printf '' | npx tsx src/cli/index.ts fixtures/sample-resume.md --company "" ; test $? -eq 1</automated>
  </verify>
  <done>Tests 1-8 still pass untouched; Tests 9-14 cover both flag paths, both flag-error paths, the non-TTY guard, and the pre-buffering source guard; `npm test` is green with no test exceeding the 15s harness timeout; `createInterface` appears only inside the prompt branch; README documents both flags and the non-interactive failure.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Confirm the interactive TTY path is unchanged</name>
  <files>none — verification only, no edits</files>
  <action>Present the verification steps below and stop. Do not attempt to run them: an agent-spawned subprocess never gets a TTY, so `process.stdin.isTTY` is false and the CLI would take the non-interactive error path instead of exercising the prompt. Wait for the human's resume signal.</action>
  <what-built>Both routing flags, the both-flags conflict error, the empty-name error, and a fail-fast error when stdin is not a terminal and neither flag is passed. The v1.1 interactive prompt now runs only on a real TTY, which no automated subprocess test can allocate — so its behavior needs one human pass.</what-built>
  <how-to-verify>
From the repo root in a normal interactive terminal, with `ANTHROPIC_API_KEY` exported:

1. `npx tsx src/cli/index.ts <your-resume.md>` — both questions must appear as they did in v1.1. Answer `y`, then `Acme Corp`. Expect both PDFs in `output/Acme-Corp/`.
2. Run it again and answer `n`. Expect both PDFs in bare `output/`.
3. Run it again, answer `y`, then enter `!!!`. Expect exit 1 with "Company name must contain at least one letter or digit."
4. `npx tsx src/cli/index.ts <your-resume.md> --company "Acme Corp"` — no questions, PDFs land in `output/Acme-Corp/`.
5. `npx tsx src/cli/index.ts <your-resume.md> --no-company` — no questions, PDFs land in `output/`.
6. `npx tsx src/cli/index.ts <your-resume.md> < /dev/null` — must exit 1 immediately naming both flags, with no hang and no `output/` directory created.

Step 1 and step 3 are the ones that matter most: they prove the pre-buffered readline queue still works where it is actually used.
  </how-to-verify>
  <resume-signal>Type "approved", or describe which step misbehaved</resume-signal>
  <verify>
    <human-check>All six steps above behave as described, with steps 1 and 3 matching v1.1 exactly.</human-check>
  </verify>
  <done>Human replies "approved" — the interactive TTY prompt, its empty-slug guard, both flag paths, and the non-TTY fail-fast are all confirmed by hand.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| shell argv -> CLI | `--company` value is attacker/user-supplied text that becomes a filesystem path segment |
| stdin -> CLI | interactive answers, now reachable only on a TTY |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick230-01 | Tampering | `--company` value -> `join(cwd, "output", slug)` | mitigate | `toCompanySlug` strips everything outside `[a-zA-Z0-9 ]` before slugging, so `../`, `/`, and NUL cannot survive into the path; `resolveCompanyRouting` rejects any value that slugs to empty, so no bare-`output/` write can be smuggled in via `--company "../"` |
| T-quick230-02 | Denial of Service | Step D.5 prompt | mitigate | non-TTY runs without a routing flag exit 1 instead of blocking forever on an unanswerable question — this is the issue's core fix |
| T-quick230-03 | Information Disclosure | error output | accept | error strings name only flags and the offending company name the caller already supplied; no key, path, or environment material is echoed |
| T-quick230-SC | Tampering | npm/pip/cargo installs | mitigate | not applicable — this plan adds zero dependencies; `package.json` is untouched |
</threat_model>

<verification>
- `npm test` green — 44 pre-existing tests minus the 2 intentionally replaced, plus the 10 new `resolveCompanyRouting` unit tests and 6 new CLI tests.
- `npm run typecheck` and `npm run lint` clean.
- `rg -n "createInterface" src/cli/index.ts` returns exactly one hit, inside the `prompt` branch.
- `rg -n "lineBuffer|waitingResolver" src/cli/index.ts` still returns the v1.1 pre-buffering queue.
- `git diff --stat` touches only the five files in `files_modified`; `package.json` is unchanged.
- Human checkpoint (Task 3) approved.
</verification>

<success_criteria>
- `--company "Acme Corp"` writes to `output/Acme-Corp/` with no prompt; `--no-company` writes to `output/`.
- `--company ""` and `--company "!!!"` exit 1 with the letter-or-digit message and create no directory.
- The two flags together exit 1 with a conflict message, in either argv order.
- No routing flag + non-TTY stdin exits 1 naming both flags, within the harness timeout.
- No routing flag + TTY stdin behaves exactly as v1.1, including the `!!!` empty-slug guard.
- PDF rendering, the Zod schema, and Claude extraction are untouched; no new dependencies.
</success_criteria>

<output>
Create `.planning/quick/260820-mct-stc-230-add-company-and-no-company-flags/260820-mct-SUMMARY.md` when done.
</output>
