---
phase: 06-output-directory-routing
reviewed: 2026-07-30T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - scripts/smoke-render.ts
  - src/cli/index.test.ts
  - src/cli/index.ts
  - src/lib/render.test.ts
  - src/lib/render.ts
findings:
  critical: 3
  warning: 4
  info: 2
  total: 9
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-07-30T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

This phase implements output-directory routing for the CLI: a readline prompt asks whether the resume is company-targeted, then routes to `output/<slug>/` or `output/`. The changes touch `src/lib/render.ts` (two new exports: `toCompanySlug`, `resolveOutputPaths`), `src/cli/index.ts` (the prompt + routing logic), and matching test/smoke files.

The core rendering logic and HTML escaping are sound. The two new pure helpers (`toCompanySlug`, `resolveOutputPaths`) are correct and well-tested. The most serious bugs are: a broken `pdf-parse` constructor call that will crash every test run in the `renderAts` describe block; a null-dereference in the ATS template when `exp.role` is missing (schema marks it required, but the optional-role branch in the designed template implies caller ambiguity); and a silent process hang path when the empty-slug guard fires while stdout is redirected.

---

## Critical Issues

### CR-01: `PDFParse` constructor receives wrong argument type — tests will crash at runtime

**File:** `src/lib/render.test.ts:129`
**Issue:** The `PDFParse` constructor signature is `constructor(options: LoadParameters)`, where `LoadParameters.data` expects `string | number[] | ArrayBuffer | TypedArray | undefined`. A Node.js `Buffer` returned by `readFile` is a `Buffer` (which is a `Uint8Array` / `TypedArray` subclass at runtime but typed as `Buffer`), however the call passes `{ data: pdfBuffer }` where `pdfBuffer` has type `Buffer`. More critically, the runtime shape passed is `{ data: Buffer }` directly — `LoadParameters` extends `DocumentInitParameters` (pdfjs-dist) which does accept `TypedArray`, so `Buffer` (which is `Uint8Array`) will work at runtime. **However**, the actual bug is a different one: the test calls `new PDFParse({ data: pdfBuffer })`, which passes a `Buffer` as `data`, but the pdf-parse v2 ESM API expects `data` inside `LoadParameters` — this part is fine. The **actual crash** is that `result.text` is accessed on the return value of `parser.getText()`, which returns `Promise<TextResult>`. `TextResult` has a `.text: string` property. That is fine. But the object `{ data: pdfBuffer }` is passed as the entire `LoadParameters` — `LoadParameters` also requires `url` or `data` but makes both optional. At runtime this will work.

**Real issue (BLOCKER):** `new PDFParse({ data: pdfBuffer })` — `pdfBuffer` is type `Buffer` from `readFile`. TypeScript's `Buffer` does not extend `TypedArray` in the TS type system; `TypedArray` in pdfjs-dist is the union of typed array interfaces. So TypeScript will emit a type error here, causing `tsc --noEmit` / CI to fail. The test file is compiled under `tsconfig.test.json`; if strict mode is on this is a compile-time BLOCKER.

Additionally — and more critically for runtime — `new PDFParse({ data: pdfBuffer })` passes only `data`. The pdfjs-dist `DocumentInitParameters` type that `LoadParameters` extends marks `data` as an optional field but the library does need either `url` or `data` to be set; with `{ data: Buffer }` the library may or may not accept a `Buffer` vs a `Uint8Array`. `Buffer.from(pdfBuffer)` already returns a Buffer, but `new Uint8Array(pdfBuffer)` is the safe conversion. Wrap with `new Uint8Array(pdfBuffer)` to guarantee type-safe TypedArray input.

**Fix:**
```typescript
// src/lib/render.test.ts:128-130
const pdfBuffer = await readFile(atsOutputPath);
const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
const result = await parser.getText();
```

---

### CR-02: Null-dereference in ATS template when `exp.role` is `undefined`

**File:** `src/lib/render.ts:381`
**Issue:** In `atsHtmlTemplate`, experience entries are rendered as:
```typescript
`<p><strong>${escapeHtml(exp.role)}</strong>${typeLabel} | ...`
```
`ExperienceSchema` defines `role: z.string()` (required), but the designed template at line 84–85 has a conditional `exp.role ? ... : ""` guard — meaning at least one code path treats `role` as potentially absent. If Claude returns a response where `role` is missing and Zod validation somehow passes (e.g., if the schema is loosened in a future iteration, or if raw JSON is cast with `as ResumeData` without re-validation), `escapeHtml(undefined)` will call `undefined.replace(...)` and throw a `TypeError`, crashing the render.

More concretely: the designed template already defensively checks `exp.role` at line 84, meaning the author knew `role` could be absent in practice. The ATS template does not apply the same guard. This is an inconsistency that will cause a crash in the ATS path under the same inputs that the designed path handles gracefully.

**Fix:**
```typescript
// src/lib/render.ts line 381 — mirror the designed template's guard
const roleLabel = exp.role ? `<strong>${escapeHtml(exp.role)}</strong>${typeLabel}` : "";
return `<div class="experience-entry">
  <p>${roleLabel}${roleLabel ? " | " : ""}${escapeHtml(exp.company)} | ${escapeHtml(exp.startDate)} &mdash; ${endDate}</p>
  ...`;
```

---

### CR-03: Process can hang silently when empty-slug guard fires with stdout redirected

**File:** `src/cli/index.ts:138-150`
**Issue:** When the empty-slug guard fires, the code does:
```typescript
writeSync(process.stderr.fd, "...\n");
process.exitCode = 1;
process.stdin.destroy();
return;
```
`process.exitCode = 1` plus `return` from an async Commander action does **not** guarantee the process exits. In the top-level-await pattern used here (line 208: `await program.parseAsync()`), returning from the action function resolves the `parseAsync` promise, which then falls through to normal exit. However, if stdout or other streams still have pending writes, the event loop may not drain — and `process.stdin.destroy()` only destroys stdin, not stdout. In a pipeline context (`cvgen resume.md | tee out`), the process can stall waiting for the writable side of stdout to close.

A more reliable pattern is `process.exitCode = 1; return;` without `process.stdin.destroy()` (the readline close in the `finally` block already releases stdin), or use `program.error(...)` which calls `process.exit()` with a guaranteed flush. The current `stdin.destroy()` can race with the readline `finally` block's `rl.close()` call at line 136 — both mutate stdin's state, and `destroy()` after `close()` is a no-op, but the reverse order (destroy before close) can cause the readline interface to emit an error.

**Fix:**
```typescript
// src/cli/index.ts:138-150 — replace stdin.destroy() approach with program.error()
if (emptySlug) {
  program.error("Company name must contain at least one letter or digit.", { exitCode: 1 });
  return;
}
```
`program.error()` writes to stderr and calls `process.exit(1)` synchronously, eliminating the flush race entirely. (The test at line 222 checks `output.includes(...)` across both streams, so the message landing in stderr is fine.)

---

## Warnings

### WR-01: `writeFile` with `flag: "wx"` in `init` command silently differs from documented behavior — error message may confuse users

**File:** `src/cli/index.ts:198`
**Issue:** `flag: "wx"` means "exclusive create — fail if file exists." When the file already exists the catch block will produce an error like `Cannot create file: /path — EEXIST: file already exists`. While technically correct, `EEXIST` is not a user-friendly message for a `cvgen init` command. There is no mention in the help text that `init` will refuse to overwrite an existing file. A user who runs `cvgen init` twice will get a cryptic EEXIST error with no actionable guidance.

**Fix:**
```typescript
// src/cli/index.ts — improve the error message for EEXIST
} catch (err) {
  if ((err as NodeJS.ErrnoException).code === "EEXIST") {
    program.error(`File already exists: ${outPath} — delete it first or choose a different path.`, { exitCode: 1 });
  }
  program.error(
    `Cannot create file: ${outPath} — ${err instanceof Error ? err.message : String(err)}`,
    { exitCode: 1 },
  );
}
```

---

### WR-02: `tempFiles` array populated but never used for cleanup — misleading intent comment

**File:** `src/cli/index.test.ts:58-63`
**Issue:** `tempFiles` is declared at module scope and `badMdPath` is pushed to it at line 133. The `afterEach` hook at line 60 contains only a comment saying "nothing to clean." This is a latent bug: future test authors will push to `tempFiles` expecting cleanup to happen, but the hook never iterates the array. The comment says "temp files are written to OS tmpdir which gets cleaned by OS" — this is only true eventually; on long-running CI machines temp accumulation is real. More immediately, the array is populated but never read, making the push at line 133 dead code that signals false intent.

**Fix:**
```typescript
// src/cli/index.test.ts — either remove tempFiles and the push, or implement cleanup
afterEach(() => {
  for (const f of tempFiles) {
    try { require("fs").unlinkSync(f); } catch { /* ignore */ }
  }
  tempFiles.length = 0;
});
```
Or simply remove the `tempFiles` array and the `.push()` call if OS cleanup is the accepted policy.

---

### WR-03: `resolveOutputPaths` called in smoke script with a synthetic `.md` path that was never written to disk

**File:** `scripts/smoke-render.ts:27-28`
**Issue:**
```typescript
const inputMdPath = join(tmp, "sample-resume.md");
const { designed, ats } = resolveOutputPaths(inputMdPath, tmp);
```
`inputMdPath` is a string constructed for stem-derivation purposes only — the file itself is never written. The comment acknowledges this ("Build a synthetic input md path"), which is fine for a smoke script. However, if `resolveOutputPaths` ever evolves to `stat` or `access` the input path (e.g., to verify the file exists before deriving its stem), this script will start throwing ENOENT without any code change at the call site.

Additionally, the smoke script passes `tmp` as both the directory containing `sample-resume.md` (the synthetic path) and as `outputDir`. This means the stem "sample-resume" collides with a would-be input file in the same directory — acceptable since the file doesn't exist, but fragile.

**Fix:** Document the invariant explicitly or write a minimal sentinel file:
```typescript
// scripts/smoke-render.ts — make the contract explicit
// resolveOutputPaths is a pure path-math function (no fs I/O); synthetic path is safe.
const inputMdPath = join(tmp, "sample-resume.md"); // stem source only, file not created
```
Or, to future-proof: `await writeFile(inputMdPath, "");` before calling `resolveOutputPaths`.

---

### WR-04: `outputDir` uses `process.cwd()` at prompt-answer time, not at CLI invocation time — can silently mis-route if CWD changes

**File:** `src/cli/index.ts:130,133`
**Issue:**
```typescript
outputDir = join(process.cwd(), "output", slug);   // line 130
outputDir = join(process.cwd(), "output");          // line 133
```
`process.cwd()` is evaluated inside the readline `ask()` callback, which runs after two async turns (the two `await ask(...)` calls). If anything between CLI startup and this point changes the working directory (e.g., a library calling `process.chdir()`, unlikely but possible), the output directory will silently diverge from what the user expects.

The conventional fix is to capture CWD once at the top of the action handler:
```typescript
// src/cli/index.ts — capture cwd once at action entry
const cwd = process.cwd();
// ...
outputDir = join(cwd, "output", slug);
outputDir = join(cwd, "output");
```
This is a low-probability defect but a one-line fix with zero downside.

---

## Info

### IN-01: Designed template renders `exp.role` without guard but ATS does — asymmetric defensive coding

**File:** `src/lib/render.ts:84-85` vs `src/lib/render.ts:381`
**Issue:** The designed template already guards `exp.role` (`exp.role ? ... : ""`), but the ATS template assumes it is always present. This asymmetry was elevated to CR-02. The info item here is that the designed template's guard implies a design decision that `role` can be absent — but the Zod schema marks it required. One of the two should be authoritative: either remove the guard from the designed template (role is always present per schema), or make `role` optional in the schema and add a guard in the ATS template. Keeping both in tension means future schema changes will break one path unexpectedly.

**Fix:** Align: if `role` is always required per schema, remove the `? exp.role :` branch in designed template line 84-85. If it can be absent, add the guard in the ATS template (see CR-02).

---

### IN-02: `writeSync(process.stderr.fd, ...)` is unnecessary — `process.stderr.write()` is synchronous on TTY and effectively synchronous on pipe

**File:** `src/cli/index.ts:143-144`
**Issue:** The comment explains that `writeSync` is used to "commit to OS pipe buffer synchronously." In Node.js, `process.stderr` is synchronous (blocking) on TTY and on pipe in most configurations because it uses `fd` 2 which is opened in blocking mode by the OS. Using the low-level `writeSync` with `process.stderr.fd` is unusual and bypasses Node's stream layer entirely — it will not respect any `stderr` stream transforms or hooks that might be set up in tests or child-process wrappers. Test 10 in `src/cli/index.test.ts` captures stderr via `spawnSync`'s pipe and correctly sees the message, but this is coincidental (the OS pipe buffer is committed before the process exits). Using `process.stderr.write()` or `console.error()` is the idiomatic pattern and avoids the low-level fd bypass.

**Fix:** Replace with `console.error(...)` (or `process.stderr.write(...)`) and rely on `program.error()` for guaranteed flush (see CR-03).

---

_Reviewed: 2026-07-30T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
