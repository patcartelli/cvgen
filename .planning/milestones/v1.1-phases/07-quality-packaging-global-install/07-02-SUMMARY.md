---
phase: 07-quality-packaging-global-install
plan: "02"
subsystem: packaging
tags:
  - packaging
  - npm
  - cli
  - documentation
dependency_graph:
  requires:
    - "07-01 (Biome CI and test fixes — must pass before packaging verification)"
  provides:
    - "prepack lifecycle hook ensuring dist/ rebuilt before npm pack/publish"
    - "accurate README Usage section reflecting Phase 06 output routing"
  affects:
    - "npm publish / npm pack workflow (future)"
    - "new-user onboarding experience via README"
tech_stack:
  added: []
  patterns:
    - "npm prepack lifecycle hook for build-before-pack"
key_files:
  created: []
  modified:
    - "package.json"
    - "README.md"
decisions:
  - "Insert prepack between build and typecheck in scripts block (alphabetic adjacency rule from 07-PATTERNS.md)"
  - "prepack calls npm run build (not tsc directly) to honour any future build script changes"
  - "README output-path prose rewritten verbatim per plan spec; no other sections touched"
metrics:
  duration_seconds: 95
  completed_date: "2026-07-30"
  tasks_completed: 2
  tasks_total: 3
  files_changed: 2
requirements:
  - QUAL-03
---

# Phase 07 Plan 02: Packaging Safeguard and README Accuracy Summary

One-liner: Added `prepack: npm run build` packaging safeguard and rewrote README Usage output-path prose to reflect Phase 06 `output/<Company-Slug>/` routing.

## Tasks Completed

### Task 1: Add prepack script to package.json

- Inserted `"prepack": "npm run build"` immediately after `"build": "tsc"` and before `"typecheck":` in the scripts block
- `prepare` script (`simple-git-hooks`) left unchanged — critical constraint honored
- Verified via `node -e require(...)` that all three critical scripts have correct values
- `npm run build` exits 0, `dist/cli/index.js` emits with `#!/usr/bin/env node` on line 1
- Commit: bd04ef5

### Task 2: Rewrite README Usage output-path section

- Replaced stale "Output files are written alongside the input file" paragraph and pre-Phase-06 filenames
- New prose describes the tailored-prompt flow: answer `n` → `output/`, answer `y` → `output/<Company-Slug>/`
- Auto-directory-creation sentence added
- All six section headings (`## Prerequisites`, `## Install`, `## Usage`, `## Environment`, `## Development`, `## License`) verified unchanged
- All six automated grep checks passed
- Commit: e3caeab

### Task 3: Human-verify global install (CHECKPOINT — awaiting human)

All automated pre-steps completed successfully:

1. `npm run build` — exit 0, `dist/cli/index.js` emitted
2. `head -n 1 dist/cli/index.js` — `#!/usr/bin/env node` confirmed
3. `npm link` — exit 0, 1 package added, 0 vulnerabilities
4. `which cvgen` — `/opt/homebrew/bin/cvgen` (non-empty path)
5. `ls -la $(which cvgen)` — `lrwxr-xr-x /opt/homebrew/bin/cvgen -> ../lib/node_modules/cvgen/dist/cli/index.js`; target file is `-rwxr-xr-x`
6. `cvgen --help` from temp dir — exit 0, stdout (first 15 lines):

```
Usage: cvgen [options] [command] <file>

Turn an Obsidian markdown resume note into two polished PDFs

Arguments:
  file             path to Obsidian markdown resume note

Options:
  -V, --version    output the version number
  --verbose        dump raw Claude API response and validated JSON to stderr
  --validate-only  extract and validate JSON, skip PDF rendering
  --dry-run        alias for --validate-only
  -h, --help       display help for command
```

Human verification of the seven steps in `<how-to-verify>` is pending.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. The `prepack` script invokes existing `tsc` tooling only; README changes are documentation-only.

## Self-Check: PASSED

- package.json exists at worktree root: FOUND
- README.md exists at worktree root: FOUND
- dist/cli/index.js exists after build: FOUND
- Commit bd04ef5 (Task 1): FOUND
- Commit e3caeab (Task 2): FOUND
- `pkg.scripts.prepack === "npm run build"`: CONFIRMED
- `pkg.scripts.prepare === "simple-git-hooks"`: CONFIRMED (unchanged)
- README no longer contains "alongside the input file": CONFIRMED
- README contains "output/<Company-Slug>/": CONFIRMED
- All 6 automated pre-checkpoint steps for Task 3: PASSED
