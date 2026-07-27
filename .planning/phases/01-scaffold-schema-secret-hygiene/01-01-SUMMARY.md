---
phase: 01-scaffold-schema-secret-hygiene
plan: "01"
subsystem: scaffold
tags:
  - typescript
  - biome
  - esm
  - nodenext
  - scaffold
  - zod
  - simple-git-hooks
dependency_graph:
  requires: []
  provides:
    - package.json (ESM CLI manifest, pinned deps, bin, scripts, simple-git-hooks config)
    - tsconfig.json (NodeNext strict ESM TypeScript config)
    - biome.json (Biome 2.5.5 lint + format config)
    - .gitignore (environment secret hygiene)
    - .env.example (ANTHROPIC_API_KEY documentation)
    - src/schema/resume.ts (ResumeSchema + ResumeData type exports)
    - src/schema/validate.ts (validateResume stub)
    - src/cli/index.ts (bin stub)
  affects: []
tech_stack:
  added:
    - typescript@6.0.3
    - "@biomejs/biome@2.5.5"
    - zod@4.4.3
    - tsx@4.23.1
    - simple-git-hooks@2.13.1
    - "@types/node@24.13.3"
    - gitleaks@8.30.1 (brew binary)
  patterns:
    - NodeNext ESM with .js extension imports in TypeScript source
    - Zod schema as single source of truth for resume data type
    - verbatimModuleSyntax forcing import type for type-only imports
    - simple-git-hooks pre-commit hook declared in package.json
key_files:
  created:
    - package.json
    - tsconfig.json
    - biome.json
    - .gitignore
    - .env.example
    - package-lock.json
    - src/cli/index.ts
    - src/schema/resume.ts
    - src/schema/validate.ts
  modified:
    - biome.json (Biome 2.5.5 schema migration applied during verification)
decisions:
  - "biome.json required migration from Biome 2.x schema (rules.recommended deprecated, files.ignore renamed to files.includes with negation patterns)"
  - "Added .claude and .planning to Biome includes exclusion list to prevent formatting planning artifacts"
  - "Installed gitleaks@8.30.1 via brew in Task 2 (plan originally deferred to Plan 03 but pre-commit hook was active and blocking commits)"
  - "Created src/ stub files (cli/index.ts, schema/resume.ts, schema/validate.ts) to satisfy tsc non-empty include requirement"
metrics:
  duration: "5 minutes"
  completed: "2026-07-27T20:01:25Z"
  tasks_completed: 2
  files_created: 11
---

# Phase 01 Plan 01: Repo Scaffold Summary

**One-liner:** ESM TypeScript CLI scaffold with NodeNext strict config, Biome 2.5.5 lint/format, Zod schema stub, and secret hygiene via gitignore + pre-commit hook.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write repo config files | 44bf51c | package.json, tsconfig.json, biome.json, .gitignore, .env.example |
| 2 | Install deps and verify empty-tree tsc + biome pass | 4857d26 | package-lock.json, biome.json (updated), src/cli/index.ts, src/schema/resume.ts, src/schema/validate.ts |

## What Was Built

The complete TypeScript CLI project scaffold for cvgen:

- **package.json**: ESM-only (`"type": "module"`), Node >=22.12.0 engine floor, bin entry at `dist/cli/index.js`, all 8 scripts (`build`, `typecheck`, `lint`, `format`, `check`, `prepare`, `dev`, `validate-fixtures`), `simple-git-hooks` pre-commit config declaring `biome check --write && gitleaks protect -v --staged`, runtime dep `zod@^4.4.3`, dev deps for TypeScript/Biome/tsx/simple-git-hooks/@types/node.

- **tsconfig.json**: `module: NodeNext`, `moduleResolution: NodeNext`, `strict: true`, `verbatimModuleSyntax: true`, `noUncheckedIndexedAccess: true`, `moduleDetection: force`, `declaration: true`, `esModuleInterop: true`. Emits to `dist/`, sources from `src/`.

- **biome.json**: Biome 2.5.5 schema with `indentStyle: space`, `indentWidth: 2`, `lineWidth: 100`, `quoteStyle: double`, `semicolons: always`, `trailingCommas: all`. Excludes `dist`, `node_modules`, `fixtures`, `.claude`, `.planning`.

- **src/schema/resume.ts**: Full Zod v4 ResumeSchema matching D-09 through D-14 (ContactSchema, ExperienceSchema, EducationSchema, SkillGroupSchema, ResumeSchema), plus `export type ResumeData = z.infer<typeof ResumeSchema>`.

- **src/schema/validate.ts**: Phase 1 stub exporting `validateResume(data: unknown): ResumeData`.

- **src/cli/index.ts**: Phase 1 stub with `#!/usr/bin/env node` shebang.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Biome 2.5.5 config schema changed from documented patterns**

- **Found during:** Task 2 (running `npm run lint`)
- **Issue:** Biome 2.5.5 deprecated `linter.rules.recommended: true` in favor of `linter.rules.preset: "recommended"`, and renamed `files.ignore` to `files.includes` with negation patterns. The plan specified the older schema documented in RESEARCH.md (researched against the published docs, not the installed binary behavior).
- **Fix:** Ran `npx biome migrate --write` to apply Biome's own migration tool. Then ran `npm run check` to apply additional formatting. Added `!.claude` and `!.planning` exclusions to prevent Biome from formatting planning artifacts.
- **Files modified:** biome.json
- **Commit:** 4857d26

**2. [Rule 3 - Blocking] tsc TS18003 on empty src/ directory**

- **Found during:** Task 2 (running `npm run typecheck` after creating empty src/)
- **Issue:** `tsc --noEmit` with `include: ["src"]` and an empty src/ directory errors with TS18003 "No inputs were found." The plan's action step said "create an empty src/ directory" but tsc requires at least one TypeScript file in the include path.
- **Fix:** Created Phase 1 stubs (`src/cli/index.ts`, `src/schema/resume.ts`, `src/schema/validate.ts`) per PATTERNS.md and RESEARCH.md Code Examples, which were already planned for this phase.
- **Files created:** src/cli/index.ts, src/schema/resume.ts, src/schema/validate.ts
- **Commit:** 4857d26

**3. [Rule 3 - Blocking] gitleaks not installed, pre-commit hook blocking commits**

- **Found during:** Task 2 (attempting first commit after npm install)
- **Issue:** The pre-commit hook was immediately active after `npm install` (simple-git-hooks wired it during `prepare`). The hook runs `gitleaks protect -v --staged` which exited with "command not found". Plan 03 was supposed to handle gitleaks installation, but the hook was already blocking Task 2's commit.
- **Fix:** Installed `gitleaks@8.30.1` via `arch -arm64 brew install gitleaks`. This matches the version documented in RESEARCH.md and satisfies the D-15 decision. The Rosetta 2 flag was needed because the machine's brew defaults to x86_64.
- **Impact on Plan 03:** Plan 03 can skip the gitleaks installation step; the binary is already available. Plan 03 should still verify the hook's behavior with a test secret.
- **Commit:** gitleaks installed via brew (not a code commit)

## Known Stubs

| File | Line | Stub | Future Plan |
|------|------|------|-------------|
| src/cli/index.ts | 3 | `console.log("cvgen stub — not yet implemented")` | Plan 03 (Phase 2 wires Commander CLI) |
| src/schema/validate.ts | 7-11 | `validateResume` throws generic error without formatting | Plan 02 (adds full validation with Zod error formatting) |

These stubs do not prevent this plan's goal (toolchain scaffold + passing tsc/biome) but are intentionally incomplete pending downstream plans.

## Verification Results

- `npm run typecheck` exits 0
- `npm run lint` exits 0
- `cat package.json | jq '.type'` returns `"module"`
- `cat tsconfig.json | jq '.compilerOptions.module'` returns `"NodeNext"`
- `cat biome.json | jq '.files.includes'` contains `!**/fixtures`
- `.gitignore` contains bare `.env` line (gitignores the secrets file)
- `.env.example` contains `ANTHROPIC_API_KEY=your_api_key_here` (low-entropy placeholder)
- All six dep versions match pinned ranges: TS 6.0.3, Biome 2.5.5, Zod 4.4.3, tsx 4.23.1, simple-git-hooks 2.13.1, @types/node 24.13.3

## Threat Flags

No new threat surface identified. The T-01-01, T-01-02, and T-01-SC mitigations from the plan's threat model are fully implemented:
- `.env` is gitignored before any commit (T-01-01)
- `.env.example` uses `your_api_key_here` (low-entropy, not `sk-ant-`-shaped) (T-01-02)
- `simple-git-hooks` postinstall wires `.git/hooks/pre-commit` (T-01-SC)

## Self-Check: PASSED

All created files verified to exist on disk. Both task commits verified in git log.
