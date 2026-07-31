# Phase 7: Quality, Packaging & Global Install - Pattern Map

**Mapped:** 2026-07-30
**Files analyzed:** 4 files modified; 0 files created
**Analogs found:** 4 / 4

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `package.json` | config | N/A (declarative) | `package.json` itself (self-analog — add `prepack` script) | exact |
| `README.md` | docs | N/A (prose) | `README.md` itself (self-analog — correct Usage/Output section) | exact |
| `.planning/REQUIREMENTS.md` | tracking doc | N/A (prose) | `.planning/REQUIREMENTS.md` itself (self-analog — mark QUAL-01/02 `[x]`) | exact |
| `.planning/PROJECT.md` | tracking doc | N/A (prose) | `.planning/PROJECT.md` itself (self-analog — move CR-01/WR-04 to Validated) | exact |

All four targets are modifications to existing files. Each file is its own closest analog. No new files are created in Phase 7.

---

## Pattern Assignments

### `package.json` (config — adding `prepack` script)

**Analog:** `package.json` itself

**Current scripts block** (`package.json` lines 14–25):
```json
"scripts": {
  "build": "tsc",
  "typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.scripts.json && tsc --noEmit -p tsconfig.test.json",
  "lint": "biome check .",
  "format": "biome format --write .",
  "check": "biome check --write .",
  "prepare": "simple-git-hooks",
  "dev": "tsx src/cli/index.ts",
  "validate-fixtures": "tsx scripts/validate-fixtures.ts",
  "smoke-render": "tsx scripts/smoke-render.ts",
  "test": "tsx --test src/**/*.test.ts"
}
```

**Target scripts block** — add `prepack` immediately after `build`, before `typecheck`:
```json
"scripts": {
  "build": "tsc",
  "prepack": "npm run build",
  "typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.scripts.json && tsc --noEmit -p tsconfig.test.json",
  ...
}
```

**Why `prepack` not `prepare`:** `prepare` already runs `simple-git-hooks`; overwriting it would break git hook installation. `prepack` fires only on `npm pack` and `npm publish` — exactly when dist/ must be current. It does NOT fire on `npm install` or `npm link`, so dev workflow is unchanged.

**Placement rule:** Insert `"prepack": "npm run build"` as the second script entry, directly after `"build": "tsc"`. This groups the two build-related scripts together and preserves the existing `prepare` entry unchanged.

---

### `README.md` (docs — correcting stale Usage/Output section)

**Analog:** `README.md` itself

**Current stale content** (`README.md` lines 22–40):
```markdown
## Usage

```bash
# Generate both PDFs from a markdown resume note
cvgen path/to/resume.md

# Print Claude API response and parsed JSON to stderr
cvgen path/to/resume.md --verbose

# Extract and validate JSON without rendering any PDFs
cvgen path/to/resume.md --validate-only

# Scaffold a starter resume note
cvgen init
cvgen init path/to/my-resume.md   # write to a specific path
```

Output files are written alongside the input file:

- `resume-resume.pdf` — portfolio-quality typographic PDF
- `resume-resume-ats.pdf` — simplified single-column ATS-safe PDF
```

**What needs to change:**
1. Replace "Output files are written alongside the input file" and the two stale bullet points with a description of Phase 6 behavior (prompt + output directory routing).
2. Add a note about the tailored-prompt interaction so new users know what to expect.

**Target replacement for the Output paragraph and bullets (after the closing ` ``` ` of the Usage block):**
```markdown
cvgen prompts whether the resume is tailored for a specific company:

- Answering **n** → both PDFs written to `output/` relative to the current directory
- Answering **y** → prompts for a company name; PDFs written to `output/<Company-Slug>/` relative to the current directory

The output directory is created automatically if it does not exist.
```

**Lines to preserve unchanged:** All lines in README.md outside the stale "Output files" paragraph and its two bullet lines (lines 37–40) remain unchanged.

---

### `.planning/REQUIREMENTS.md` (tracking doc — mark QUAL-01 and QUAL-02 complete)

**Analog:** `.planning/REQUIREMENTS.md` itself

**Current stale content** (lines 22–24):
```markdown
- [ ] **QUAL-01**: `rawResponse` in `ExtractResult` is typed as `ParsedMessage<ResumeData>` so `--verbose` output is complete (CR-01)
- [ ] **QUAL-02**: Test suite runs under a single test runner with no conflicting scripts in package.json (WR-04)
- [ ] **QUAL-03**: User can install and run `cvgen` as a global command via `npm install -g` or `npm link`
```

**Target content:**
```markdown
- [x] **QUAL-01**: `rawResponse` in `ExtractResult` is typed as `ParsedMessage<ResumeData>` so `--verbose` output is complete (CR-01) — closed 2026-07-28
- [x] **QUAL-02**: Test suite runs under a single test runner with no conflicting scripts in package.json (WR-04) — closed 2026-07-28
- [ ] **QUAL-03**: User can install and run `cvgen` as a global command via `npm install -g` or `npm link`
```

**Traceability table** (lines 53–55) — also update the Pending entries:
```markdown
| QUAL-01 | Phase 7 | Complete — 2026-07-28 |
| QUAL-02 | Phase 7 | Complete — 2026-07-28 |
| QUAL-03 | Phase 7 | Pending |
```

The existing `[x]` checkbox convention is established at lines 11–13 (TYPO-01/02/03 all use `[x]` with `— closed YYYY-MM-DD`). Copy that format exactly.

---

### `.planning/PROJECT.md` (tracking doc — move CR-01/WR-04 Active items to Validated)

**Analog:** `.planning/PROJECT.md` itself

**Current stale content in "Active (v1.1)" section** (lines 53–58 approximately):
```markdown
### Active (v1.1)

- [ ] Designed PDF: summary text scaled down to body-small size — v1.1
- [ ] Designed PDF: bullet points styled with subtle accent color (#2d4a6b) — v1.1
- [ ] Designed PDF: consistent bottom spacing under all section headers — v1.1
- [ ] Fix `rawResponse` type to `ParsedMessage<ResumeData>` for correct `--verbose` output (CR-01) — v1.1
- [ ] Remove vitest runner conflict — consolidate on one test runner (WR-04) — v1.1
- [ ] `npm publish` / `npm link` so `cvgen` can be run as a global command without `npx tsx` — v1.1
```

**Note:** The three TYPO entries and the three QUAL entries above must be evaluated separately. TYPO-01/02/03 were marked `[x]` in REQUIREMENTS.md (lines 11–13) but PROJECT.md still shows them as `[ ]` Active. Check whether prior phase plans moved them to Validated; if not, move all five items (TYPO-01/02/03 + CR-01 + WR-04) to Validated at the same time.

**Target — move these two items from Active to Validated (v1.1) section:**
```markdown
- [x] Fix `rawResponse` type to `ParsedMessage<ResumeData>` for correct `--verbose` output (CR-01) — Phase 7 (2026-07-28)
- [x] Remove vitest runner conflict — consolidate on one test runner (WR-04) — Phase 7 (2026-07-28)
```

**Current "Validated (v1.1 — in progress)" section** (lines 47–49):
```markdown
### Validated (v1.1 — in progress)

- [x] PDF output routed to `output/` or `output/<Company-Slug>/` relative to cwd based on interactive prompt — Phase 06 (2026-07-30)
- [x] `toCompanySlug` converts company name to Title-Case-Hyphen slug (D-01: spaces→hyphens, D-02: strip non-alphanumeric) — Phase 06 (2026-07-30)
```

The existing `[x]` + `— Phase XX (YYYY-MM-DD)` format (established at lines 48–49) is the established convention. Copy it exactly when adding the two new Validated entries.

---

## Shared Patterns

### No cross-cutting code patterns apply to Phase 7

Phase 7 contains no new source files and no new TypeScript patterns. The only changes are:
1. One JSON key-value pair added to `package.json`
2. One prose section replaced in `README.md`
3. Checkbox state changes in two `.planning/*.md` tracking documents

There are no auth guards, error handlers, validation schemas, or data-flow patterns to share across files in this phase.

---

## No Analog Found

No files in Phase 7 lack a codebase analog. All four modified files are their own closest analogs (self-modification).

---

## Confirmed Pre-Done Work (Do Not Re-Implement)

The following QUAL requirements were completed in quick tasks before Phase 7 began. The planner MUST NOT schedule implementation steps for these — only tracking updates.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| QUAL-01 (`rawResponse: ParsedMessage<ResumeData>`) | DONE — commit 9ba6e1d (2026-07-28) | `src/lib/extract.ts` line 3 imports `ParsedMessage`, line 11 declares `rawResponse: ParsedMessage<ResumeData>` |
| QUAL-02 (single test runner `tsx --test`) | DONE — commit fc9a507 (2026-07-28) | `package.json` line 24: `"test": "tsx --test src/**/*.test.ts"` — no vitest entry anywhere |

Only QUAL-03 (global install verification + `prepack` hook) requires implementation work in Phase 7.

---

## Metadata

**Analog search scope:** `/Users/pcartelli/dev/cvgen` — package.json, README.md, .planning/REQUIREMENTS.md, .planning/PROJECT.md, .planning/ROADMAP.md, src/lib/extract.ts
**Files scanned:** 6
**Pattern extraction date:** 2026-07-30
