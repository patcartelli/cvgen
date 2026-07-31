---
phase: 07-quality-packaging-global-install
reviewed: 2026-07-30T00:00:00Z
depth: quick
files_reviewed: 2
files_reviewed_list:
  - package.json
  - README.md
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-07-30
**Depth:** quick
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Two files changed in Phase 7: `package.json` gained a `prepack` script and `README.md` had its Usage section updated to document the output-routing behavior introduced in Phase 6. No hardcoded secrets, dangerous function calls, debug artifacts, or empty catch blocks were found. Three findings were identified: two warnings with meaningful shipping risk and one informational item.

## Warnings

### WR-01: `prepare` runs `simple-git-hooks` on every `npm install` — conflicts with `prepack` on CI/CD and clean environments

**File:** `package.json:21`
**Issue:** `"prepare": "simple-git-hooks"` runs unconditionally after every `npm install`, including in environments where `simple-git-hooks` is not installed (e.g., `npm install --omit=dev` for a published package, or any CI that installs just production deps). When `devDependencies` are absent, `simple-git-hooks` is not available on `PATH`, so `prepare` exits non-zero, making `npm install` fail for any consumer who installs the package globally or in production mode. This is a known ecosystem pitfall with `prepare` + dev-only tooling. The new `prepack` hook is correctly placed and does not exacerbate this, but both hooks run during `npm publish` (`prepare` first, then `prepack`) — if `prepare` fails in the publish environment, `prepack` never runs and the publish aborts.

**Fix:** Guard `prepare` so it only runs when `simple-git-hooks` is actually available:
```json
"prepare": "simple-git-hooks || true"
```
Or, more precisely, check for the binary before invoking:
```json
"prepare": "node -e \"try{require('simple-git-hooks')}catch(e){process.exit(0)}\" && simple-git-hooks"
```
The simplest safe pattern widely used in the ecosystem is `|| true` (silently no-ops when dev deps are absent). This is harmless in development (hooks still install when deps are present) and stops breaking clean installs.

---

### WR-02: `bin` entry points at `dist/cli/index.js` but `tsconfig.json` maps `rootDir: src` to `outDir: dist` — verify the source path exists

**File:** `package.json:12`
**Issue:** `"bin": { "cvgen": "dist/cli/index.js" }` means tsc must emit a file from `src/cli/index.ts`. The `tsconfig.json` confirms `rootDir: "src"` and `outDir: "dist"`, so `src/cli/index.ts` → `dist/cli/index.js` is the correct mapping. The structural risk: if the source entrypoint is ever renamed or moved (e.g., to `src/index.ts` — the `dev` script uses `src/cli/index.ts` so these are aligned now), the `bin` entry silently points to a missing file and global install succeeds but `cvgen` invocations throw `MODULE_NOT_FOUND` at runtime. There is no `npm pack --dry-run` step documented anywhere to catch this before publish.

**Fix:** Add a `prepublishOnly` (or amend `prepack`) to verify the built bin entry exists:
```json
"prepack": "npm run build && node --input-type=module -e \"import('./dist/cli/index.js').catch(()=>{process.stderr.write('bin entry missing after build\\n');process.exit(1)})\""
```
A simpler approach matching the CLAUDE.md recommendation: document `npm pack --dry-run` in the README's publish checklist, and check that `dist/cli/index.js` appears in the pack output before any `npm publish`.

---

## Info

### IN-01: README omits the `--output-dir` / `--company` flag if one exists; output-routing description assumes interactive prompt only

**File:** `README.md:37-42`
**Issue:** The Usage section correctly documents the interactive prompt behavior (answering y/n, company name). However, if Phase 6 also added `--output-dir` or `--company` CLI flags (non-interactive path), they are not documented here. If the CLI only supports the interactive path, this is not a bug — but the README should explicitly note that the prompt is always triggered (i.e., there is no flag to bypass it), so users integrating cvgen into shell pipelines know to expect stdin interaction.
**Fix:** If no bypass flag exists, add a note: "The company prompt always requires interactive input; non-interactive / piped use is not supported in v1." If a flag does exist, document it in the Usage block.

---

_Reviewed: 2026-07-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
