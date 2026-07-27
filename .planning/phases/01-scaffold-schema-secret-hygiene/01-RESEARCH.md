# Phase 1: Scaffold, Schema & Secret Hygiene - Research

**Researched:** 2026-07-27
**Domain:** TypeScript ESM CLI scaffold — Zod schema authoring, Biome configuration, tsconfig NodeNext ESM, gitleaks pre-commit hook, simple-git-hooks
**Confidence:** HIGH

## Summary

Phase 1 is a pure scaffolding phase: create the repo skeleton, author the Zod resume schema that every downstream phase imports, wire up Biome for lint/format, establish a gitleaks pre-commit hook via simple-git-hooks, and verify secret hygiene before any Claude API code is written. The entire stack is locked in CONTEXT.md and CLAUDE.md — research is focused on the exact configuration patterns for each tool, not on alternative tool selection.

The critical path is: `package.json` (ESM, engines, scripts, bin) → `tsconfig.json` (NodeNext/strict) → `biome.json` (lint + format) → `src/schema/resume.ts` (the Zod contract) → `fixtures/sample-resume.json` + `fixtures/sample-resume-malformed.json` → `.gitleaks.toml` (if needed — built-ins cover Anthropic keys) → simple-git-hooks pre-commit → `.gitignore` / `.env.example`. Each step is independently verifiable before moving to the next.

The one operational surprise: `gitleaks protect --staged` was deprecated from the help menu in v8.19.0 but remains functional in v8.30.1 (current stable). The official `pre-commit.py` script distributed with gitleaks still uses `gitleaks protect -v --staged`, confirming it is the correct command to use in a simple-git-hooks pre-commit script. No custom `.gitleaks.toml` is needed for this project — the built-in ruleset includes both `anthropic-api-key` and `anthropic-admin-api-key` patterns.

**Primary recommendation:** Follow locked decisions verbatim. All tool choices are settled. Research value here is the exact configuration for each tool so the planner can specify file contents, not just file names.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Contact info lives in YAML frontmatter: `name`, `email`, `phone`, `location`, `linkedin`, `github` (all lowercase, all required)
**D-02:** Experience entries: `### Role at Company` heading, `Month Year – Month Year · Location` line, then bullets
**D-03:** Education entries: `### Degree at Institution` heading, graduation year on line below
**D-04:** Skills: `**Category:** item1, item2, item3` — one line per group, category is free text
**D-05:** Core Competencies: single flat comma-separated line of keywords (ATS targeting — CLI parses as-is)
**D-06:** Summary is optional; Core Competencies, Experience, Education, Skills are expected
**D-07:** No Projects section
**D-08:** Section ordering fixed: Summary (optional) → Core Competencies → Experience → Education → Skills

**D-09:** Contact schema: all six fields required — `name: z.string()`, `email: z.string()`, `phone: z.string()`, `location: z.string()`, `linkedin: z.string()`, `github: z.string()`
**D-10:** Experience schema: `{ role: string, company: string, startDate: string, endDate: string, type?: 'full-time' | 'contract', bullets: string[] }`
**D-11:** Education schema: `{ degree: string, institution: string, year: string }`
**D-12:** Skills schema: `{ category: string, items: string[] }[]`
**D-13:** Core Competencies schema: `string[]`, marked optional
**D-14:** Summary schema: `string`, marked optional

**D-15:** Use gitleaks for pre-commit secret scanning (Go binary, built-in Anthropic patterns)
**D-16:** Use simple-git-hooks to wire the pre-commit hook (`package.json` `"simple-git-hooks"` key, no `.husky/` directory)
**D-17:** Pre-commit hook runs: `biome check --write` then `gitleaks protect --staged`; commit blocked if either fails

### Claude's Discretion

- Exact `tsconfig.json` strictness flags and compiler options (follow CLAUDE.md: NodeNext module resolution, strict mode, ESM)
- Exact gitleaks config (`.gitleaks.toml`) if custom patterns needed beyond built-in Anthropic ruleset
- File naming and directory structure for `src/lib/`, `src/cli.ts`, `fixtures/`

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHEMA-01 | A Zod schema defines the structured resume data contract (contact, summary, experience, education, skills) that parsing and both renderers depend on | Zod v4 API confirmed: `z.object()`, `.optional()`, `z.array()`, `z.enum()`, `z.infer<typeof>`, `safeParse()` all stable. Export pattern: `export const ResumeSchema = z.object({...})` + `export type ResumeData = z.infer<typeof ResumeSchema>`. Schema shape fully specified in D-09 through D-14. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schema definition (Zod) | `src/schema/` | — | Zero-dependency module; all other modules import from here, never vice versa |
| Type exports (`ResumeData`) | `src/schema/resume.ts` | — | Single source of truth — importable as value (for `zodOutputFormat`) and as type (for renderers) |
| Fixture data (sample JSON) | `fixtures/` | — | Lives outside `src/` — test/dev data, not shipped code; must pass schema validation |
| CLI entrypoint stub | `src/cli/index.ts` | — | Placeholder only in Phase 1; Phase 4 adds real logic |
| Lint + format | Biome (`biome.json`) | — | Replaces ESLint + Prettier; no TS compiler API dependency |
| Type-checking | `tsc --noEmit` | — | Pure type-check pass; `dist/` emit is for later phases |
| Secret scanning | gitleaks (pre-commit) | — | Run at commit time, before code enters history |
| Git hook wiring | simple-git-hooks | — | Configured via `package.json`; activates after `npm install` |

## Standard Stack

### Core (Phase 1 scope only)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | `6.0.3` (pinned `^6.0.3`) | Language + type-checking | Biome is used (not ESLint), so TS7 is safe, but CLAUDE.md explicitly pins 6.0.3 — match it |
| Zod | `4.4.3` | Resume data schema + TS types | ESM-first, `z.infer<>` drives compile-time types, `safeParse` drives runtime validation |
| `@biomejs/biome` | `2.5.5` | Lint + format | Single tool replaces ESLint+Prettier+typescript-eslint; no TS compiler API dependency |
| `tsx` | `4.23.1` | Run TS files directly in dev | dev-only; `tsx src/cli/index.ts` during development |
| `@types/node` | `^24` | Node built-in type defs | Dev dep; match Node major (Node 26 is on machine, `^24` is the documented target) |

### Supporting (secret hygiene tooling)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `simple-git-hooks` | `2.13.1` | Wire git hooks via `package.json` | Required; zero-dep, ~1.7k stars, used by PostCSS/Nano ID/VitePress |
| `gitleaks` | `8.30.1` | Pre-commit secret scanning | Go binary; install via `brew install gitleaks`; no npm package |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `simple-git-hooks` | `husky` (9.x) | Husky requires a separate `.husky/` directory and more config files; simple-git-hooks is fully in `package.json`, matching D-16 |
| `gitleaks` (Go binary) | `detect-secrets` (Python) or `trufflehog` | gitleaks has native Anthropic key patterns built in; Go binary means no Python runtime dependency; D-15 locked it |
| `@biomejs/biome` | ESLint + Prettier | Would require pinning TS to `^6.x` (already the case), but adds 3 deps vs 1 and separate config files |

**Installation (Phase 1 deps):**
```bash
# Runtime (zod is the only runtime dep in Phase 1; others come in Phase 2+)
npm install zod

# Dev dependencies
npm install -D typescript@^6.0.3 tsx @types/node@^24 @biomejs/biome simple-git-hooks

# After installing, activate git hooks:
npx simple-git-hooks

# gitleaks — Go binary, install separately:
brew install gitleaks
```

**Version verification (live npm registry, 2026-07-27):**
```
zod@4.4.3
@biomejs/biome@2.5.5
typescript@7.0.2 (latest), 6.x latest = 6.0.3 (pinned per CLAUDE.md)
tsx@4.23.1
simple-git-hooks@2.13.1
gitleaks@8.30.1 (brew, not npm)
```

## Package Legitimacy Audit

> slopcheck was not available in this environment. All npm packages are marked [ASSUMED] and manually verified via npm registry metadata + official sources.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `zod` | npm | ~5 yrs (2020) | ~20M+/wk | github.com/colinhacks/zod | N/A (slopcheck unavailable) | [ASSUMED] Approved — canonical schema validation library |
| `@biomejs/biome` | npm | ~2 yrs (2023) | 5M+/wk | github.com/biomejs/biome | N/A | [ASSUMED] Approved — official Biome package |
| `typescript` | npm | ~12 yrs | 50M+/wk | github.com/microsoft/TypeScript | N/A | [ASSUMED] Approved — Microsoft-maintained |
| `tsx` | npm | ~3 yrs (2022) | 5M+/wk | github.com/privatenumber/tsx | N/A | [ASSUMED] Approved — de facto ts-node replacement |
| `@types/node` | npm | ~9 yrs | 50M+/wk | github.com/DefinitelyTyped/DefinitelyTyped | N/A | [ASSUMED] Approved — official DefinitelyTyped |
| `simple-git-hooks` | npm | ~4 yrs (2021-03) | 400k+/wk | github.com/toplenboren/simple-git-hooks | N/A | [ASSUMED] Approved — used by PostCSS, Nano ID, VitePress, VueUse; 1.7k stars |

**Postinstall script note:** `simple-git-hooks` has a `postinstall: 'node ./postinstall.js'` script. Per source review, this script installs git hooks from `package.json` into `.git/hooks/` — it writes to `.git/` only, no network calls, no filesystem access outside project directory. This is the intended behavior and is documented. [ASSUMED — based on GitHub source review, not direct code audit in this session]

**Packages removed due to slopcheck [SLOP] verdict:** none (slopcheck unavailable; no packages removed)
**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time. Planner should note that packages are [ASSUMED] — human verification of versions before install is advised but not blocking for this well-known stack.*

## Architecture Patterns

### System Architecture Diagram

Phase 1 establishes the schema contract. No data flows through the pipeline in this phase — the diagram shows what Phase 1 creates and what downstream phases will connect to.

```
[fixtures/sample-resume.json]    [fixtures/sample-resume-malformed.json]
         │                                        │
         ▼                                        ▼
[src/schema/resume.ts]  ─── validate() ──→  [pass / fail assertion]
  ResumeSchema (Zod)
  ResumeData (type)
         │
         │  imported by (downstream, Phases 2-4):
         ├──→ parser/extract.ts (zodOutputFormat — Phase 2)
         ├──→ renderers/designed/template.ts (type only — Phase 3)
         ├──→ renderers/ats/template.ts (type only — Phase 3)
         └──→ schema/validate.ts (safeParse wrapper — Phase 2)

[pre-commit hook]
  biome check --write  →  [lint + format gate]
  gitleaks protect --staged  →  [secret scan gate]
         │
         ▼
  commit allowed / blocked
```

### Recommended Project Structure

```
cvgen/
├── src/
│   ├── cli/
│   │   └── index.ts         # stub entrypoint (bin target); Phase 4 fills this out
│   ├── schema/
│   │   ├── resume.ts        # ResumeSchema (Zod) + export type ResumeData
│   │   └── validate.ts      # safeParse wrapper (stub; Phase 2 fills this out)
│   └── parser/              # empty placeholder dirs for Phase 2
│       ├── clean.ts
│       └── extract.ts
├── fixtures/
│   ├── sample-resume.json           # valid, fictional resume matching ResumeSchema
│   └── sample-resume-malformed.json # deliberately invalid (e.g., missing required field)
├── biome.json
├── tsconfig.json
├── .gitleaks.toml                   # optional; needed only for allow-listing
├── .gitignore
├── .env.example
└── package.json
```

**Note on stub files:** Phase 1 creates `src/cli/index.ts`, `src/parser/clean.ts`, and `src/parser/extract.ts` as stubs so `tsc` has something to compile and the project structure is established. Stubs can be as minimal as a single exported comment or empty export.

### Pattern 1: Zod schema as single source of truth

**What:** One file (`src/schema/resume.ts`) defines the Zod schema object and derives the TypeScript type from it via `z.infer`. All other modules import from this file — never define inline types that duplicate schema fields.

**When to use:** Any time a type is shared between an LLM output constraint and a rendering/processing consumer.

**Example:**
```typescript
// src/schema/resume.ts
// Source: Zod v4 official docs (zod.dev)
import { z } from "zod";

const ContactSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  linkedin: z.string(),
  github: z.string(),
});

const ExperienceSchema = z.object({
  role: z.string(),
  company: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  type: z.enum(["full-time", "contract"]).optional(),
  bullets: z.array(z.string()),
});

const EducationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  year: z.string(),
});

const SkillGroupSchema = z.object({
  category: z.string(),
  items: z.array(z.string()),
});

export const ResumeSchema = z.object({
  contact: ContactSchema,
  summary: z.string().optional(),
  coreCompetencies: z.array(z.string()).optional(),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  skills: z.array(SkillGroupSchema),
});

export type ResumeData = z.infer<typeof ResumeSchema>;
```

### Pattern 2: tsconfig.json for NodeNext ESM strict mode

**What:** `module: "NodeNext"` + `moduleResolution: "NodeNext"` means TypeScript enforces `.js` extensions on relative imports in source (since Node resolves `.js` in ESM, not `.ts`). `verbatimModuleSyntax: true` forces `import type` for type-only imports — prevents importing a type as a value and then having the runtime crash when the value doesn't exist.

**Example:**
```json
// tsconfig.json
// Source: typescriptlang.org/tsconfig + totaltypescript.com/tsconfig-cheat-sheet
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "esModuleInterop": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**NodeNext import extension requirement:** In ESM TypeScript with `NodeNext`, relative imports must use `.js` extensions in source (TypeScript resolves them to `.ts` at compile time, emits `.js`):
```typescript
import { ResumeSchema } from "../schema/resume.js";  // correct
import { ResumeSchema } from "../schema/resume";      // error with NodeNext
```

### Pattern 3: biome.json minimal configuration

**What:** Single config file replacing ESLint + Prettier. `biome check --write` both lints and formats.

**Example:**
```json
// biome.json
// Source: biomejs.dev/reference/configuration
{
  "$schema": "https://biomejs.dev/schemas/2.5.5/schema.json",
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  },
  "files": {
    "ignore": ["dist", "node_modules", "fixtures"]
  }
}
```

### Pattern 4: simple-git-hooks pre-commit configuration

**What:** `simple-git-hooks` reads `"simple-git-hooks"` key in `package.json` to install hooks into `.git/hooks/`. The `postinstall` script runs automatically on `npm install`. The hook script runs sequentially: Biome first, then gitleaks.

**Example (package.json excerpt):**
```json
{
  "simple-git-hooks": {
    "pre-commit": "npx biome check --write . && gitleaks protect -v --staged"
  }
}
```

**Hook behavior:**
- `npx biome check --write .` — lints and auto-formats staged + unstaged files. If Biome modifies files, the commit is blocked (git sees unstaged changes); user must `git add` the auto-formatted files and recommit. This is the standard Biome pre-commit UX.
- `gitleaks protect -v --staged` — scans only staged changes for secrets. Blocks commit if Anthropic key pattern matched.

**Activating the hook after install:**
```bash
npm install
npx simple-git-hooks   # re-runs postinstall hook install step; needed if hooks ever need refresh
```

### Pattern 5: gitleaks pre-commit usage

**What:** gitleaks v8.30.1 (current stable) ships built-in rules for `anthropic-api-key` (`sk-ant-api03-...`) and `anthropic-admin-api-key` (`sk-ant-admin01-...`). No custom `.gitleaks.toml` is needed for this project. The command `gitleaks protect -v --staged` scans staged files. [VERIFIED: gitleaks/config/gitleaks.toml in main branch]

**When `.gitleaks.toml` IS needed:** If the pre-commit hook generates false positives on fixture data or test strings that look like API keys. In that case, add an `[allowlist]` section:

```toml
# .gitleaks.toml — only needed if false positives occur
[allowlist]
  paths = [
    '''fixtures/.*''',
  ]
```

**Built-in Anthropic patterns confirmed:**
- Rule `anthropic-api-key`: regex `sk-ant-api03-[a-zA-Z0-9_\-]{93}AA`, entropy 4.0
- Rule `anthropic-admin-api-key`: regex `sk-ant-admin01-[a-zA-Z0-9_\-]{93}AA`, entropy 4.0

### Pattern 6: `.gitignore` and `.env.example`

**`.gitignore` minimum entries for this project:**
```
# Dependencies
node_modules/

# Build output
dist/

# Environment secrets — NEVER commit
.env
.env.local
.env.*.local

# OS noise
.DS_Store
Thumbs.db

# Editor noise
.vscode/
.idea/

# Puppeteer Chromium cache (added in Phase 2 when puppeteer is installed)
.cache/
```

**`.env.example`:**
```
# Copy to .env and fill in your key. Never commit .env.
ANTHROPIC_API_KEY=your_api_key_here
```

### Anti-Patterns to Avoid

- **Importing from `schema/resume.ts` with no `.js` extension:** With `NodeNext` module resolution, `import { ResumeSchema } from "../schema/resume"` is a compile error. Always use `.js` extension in source — TypeScript resolves it to the `.ts` file at compile time.
- **Using `import { z } from "zod/mini"`:** Zod v4 ships a `zod/mini` tree-shakable variant with a functional API where `.optional()` becomes `z.optional(schema)`. Do not use this variant — the standard `zod` import is correct here, and the two APIs are not interchangeable.
- **Placing fixtures inside `src/`:** Fixtures are test/dev data, not source code. They should live in `fixtures/` at repo root so `tsc` doesn't try to compile or include them.
- **Running `biome check` (no `--write`) in the pre-commit hook:** Without `--write`, Biome will report errors but not fix them, requiring a second commit cycle. With `--write`, it auto-fixes and the user just needs to `git add` the changes.
- **Forgetting to call `npx simple-git-hooks` after editing the hook config:** Editing `package.json`'s `simple-git-hooks` section does not auto-update `.git/hooks/pre-commit`. Re-run `npx simple-git-hooks` to sync.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Runtime type validation of resume JSON | Manual field-by-field `if` checks | `ResumeSchema.safeParse()` (Zod) | Zod generates TypeScript types from the same definition; hand-rolled validation diverges from types over time |
| Secret detection patterns for API keys | Regex in a shell script | `gitleaks` built-in rules | Anthropic key patterns are in gitleaks' default config; entropy + regex combo reduces false negatives vs pure regex |
| Git hook wiring | `.git/hooks/pre-commit` file edited manually | `simple-git-hooks` | Manual `.git/hooks/` edits are not committed to source — any team member (or future you) who clones the repo gets no hooks |
| Lint + format configuration | ESLint config + Prettier config + typescript-eslint | `biome.json` | One file, one command, no TS compiler API version coupling |

**Key insight:** The two most common DIY mistakes in this phase are (1) hand-writing git hooks directly into `.git/hooks/` (invisible to git, not portable) and (2) hand-rolling Anthropic key detection in a shell script (pattern drift, missed entropy check). Both are solved by the locked tool choices.

## Common Pitfalls

### Pitfall 1: `.js` extension missing in NodeNext imports

**What goes wrong:** `tsc` emits error `TS2835: Relative import paths need explicit file extensions` on every relative import.
**Why it happens:** `NodeNext` module resolution enforces Node.js ESM rules — Node resolves `.js` files, not `.ts`. TypeScript's NodeNext mode requires you to write what Node will see at runtime.
**How to avoid:** Always write `import { X } from "./module.js"` in source. TypeScript resolves `.js` → `.ts` at compile time transparently.
**Warning signs:** First `tsc --noEmit` run on new files immediately fails with TS2835.

### Pitfall 2: simple-git-hooks postinstall not running in CI or fresh clone

**What goes wrong:** Contributor clones repo, runs `npm install`, attempts to commit — pre-commit hook is not present in `.git/hooks/`.
**Why it happens:** `postinstall` scripts are sometimes blocked by npm config (`ignore-scripts`) or the repo is cloned into an environment that doesn't support them.
**How to avoid:** Add `"prepare": "simple-git-hooks"` to `package.json` scripts as a fallback — `prepare` runs after `npm install` in npm 7+ for local packages. Document `npx simple-git-hooks` as the manual fallback in README.
**Warning signs:** Secrets reach git history despite the pre-commit hook existing in `package.json`.

### Pitfall 3: gitleaks false positive on fixture data

**What goes wrong:** A fixture file contains a string that matches the Anthropic key pattern (e.g., a placeholder string like `sk-ant-api03-EXAMPLE...`), blocking the commit.
**Why it happens:** gitleaks uses both regex and entropy checks — high-entropy strings matching the prefix pattern will trip it.
**How to avoid:** Use obviously fake, low-entropy placeholder strings in fixtures (e.g., `"ANTHROPIC_API_KEY_HERE"` or `"sk-ant-FAKE"`). If false positives still occur, add an `[allowlist]` in `.gitleaks.toml` scoped to `fixtures/`.
**Warning signs:** Pre-commit hook blocks a commit on a non-secret fixture file.

### Pitfall 4: biome pre-commit modifies files, then blocks commit

**What goes wrong:** Developer commits; Biome auto-formats files; commit is blocked because working tree is now dirty (the formatted files are unstaged).
**Why it happens:** `biome check --write` modifies files that were already added to the index. Git sees unstaged changes and aborts (or the post-modification state isn't staged).
**How to avoid:** This is expected Biome pre-commit behavior. Document it: "If pre-commit blocks, run `git add -p` and recommit." Some teams use `biome check --write --staged` to limit to staged files only — valid alternative if the UX is too disruptive.
**Warning signs:** Developers complain that pre-commit "always fails on first try."

### Pitfall 5: Zod v4 `z.string().email()` vs `z.email()`

**What goes wrong:** Schema uses `z.string().email()` expecting Zod v3 chaining, gets unexpected behavior in v4.
**Why it happens:** Zod v4 deprecated chained format validators like `.email()`, `.url()` in favor of top-level `z.email()`, `z.url()`.
**How to avoid:** For this project's schema, all string fields are plain `z.string()` — no format validators needed (email is just stored as a string, not validated for format). This pitfall only matters if you add `z.string().email()` later. If you do, use `z.email()` in v4.
**Warning signs:** Zod emits a deprecation warning or TypeScript flags `.email()` as not existing on the returned type.

## Code Examples

Verified patterns from official sources:

### package.json structure for ESM CLI

```json
{
  "name": "cvgen",
  "version": "0.1.0",
  "type": "module",
  "engines": {
    "node": ">=22.12.0"
  },
  "bin": {
    "cvgen": "dist/cli/index.js"
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "format": "biome format --write .",
    "check": "biome check --write .",
    "prepare": "simple-git-hooks",
    "dev": "tsx src/cli/index.ts"
  },
  "simple-git-hooks": {
    "pre-commit": "npx biome check --write . && gitleaks protect -v --staged"
  },
  "dependencies": {
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.5.5",
    "@types/node": "^24",
    "simple-git-hooks": "^2.13.1",
    "tsx": "^4.23.1",
    "typescript": "^6.0.3"
  }
}
```

Note: `commander`, `@anthropic-ai/sdk`, `puppeteer` are added in later phases. Phase 1 keeps `zod` as the only runtime dep because the schema is the only runtime artifact this phase creates.

### Minimal CLI stub (src/cli/index.ts)

```typescript
// src/cli/index.ts
// Phase 1 stub — Phase 4 replaces this with real Commander wiring
#!/usr/bin/env node
console.log("cvgen stub — not yet implemented");
```

Note: The shebang `#!/usr/bin/env node` must be the very first line of the emitted `dist/cli/index.js`. With `tsc`, you can add it as the first line of `src/cli/index.ts`; tsc will preserve it (it treats it as a comment).

### Fixture: sample-resume.json (fictional data, matches D-01 through D-08)

```json
{
  "contact": {
    "name": "Alex Rivera",
    "email": "alex@example.com",
    "phone": "(555) 000-0000",
    "location": "San Francisco, CA",
    "linkedin": "linkedin.com/in/alexrivera",
    "github": "github.com/alexrivera"
  },
  "summary": "Senior software engineer with 10 years building distributed systems.",
  "coreCompetencies": ["TypeScript", "Systems Design", "API Design", "Team Leadership"],
  "experience": [
    {
      "role": "Senior Engineer",
      "company": "Acme Corp",
      "startDate": "Jan 2022",
      "endDate": "Present",
      "type": "full-time",
      "bullets": [
        "Reduced API latency by 40% through query optimization.",
        "Led a team of 5 engineers to deliver project on time."
      ]
    }
  ],
  "education": [
    {
      "degree": "B.S. Computer Science",
      "institution": "UCLA",
      "year": "2014"
    }
  ],
  "skills": [
    { "category": "Languages", "items": ["TypeScript", "Python", "Go"] },
    { "category": "Tools", "items": ["Docker", "Git", "Postgres"] }
  ]
}
```

### Fixture: sample-resume-malformed.json (missing required field)

```json
{
  "contact": {
    "name": "Alex Rivera",
    "email": "alex@example.com"
  },
  "experience": [],
  "education": [],
  "skills": []
}
```

Missing `phone`, `location`, `linkedin`, `github` from `contact` — `ResumeSchema.safeParse()` must return `success: false` with errors naming the missing fields.

### Schema validation smoke test script

```typescript
// scripts/validate-fixtures.ts  (or inline in a test)
// Source: Zod v4 safeParse API (zod.dev)
import { readFileSync } from "fs";
import { ResumeSchema } from "../src/schema/resume.js";

const valid = JSON.parse(readFileSync("fixtures/sample-resume.json", "utf8"));
const malformed = JSON.parse(readFileSync("fixtures/sample-resume-malformed.json", "utf8"));

const validResult = ResumeSchema.safeParse(valid);
if (!validResult.success) {
  console.error("sample-resume.json failed validation:", validResult.error.format());
  process.exit(1);
}
console.log("sample-resume.json: VALID");

const malformedResult = ResumeSchema.safeParse(malformed);
if (malformedResult.success) {
  console.error("sample-resume-malformed.json unexpectedly passed validation");
  process.exit(1);
}
console.log("sample-resume-malformed.json: correctly INVALID");
console.log("Validation errors:", malformedResult.error.format());
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ts-node` for dev-run TypeScript | `tsx` (esbuild-based) | ~2022 | Faster cold-start, no ESM config friction |
| Husky + `.huskyrc` for git hooks | `simple-git-hooks` (package.json) | ~2021 | Zero extra config files |
| ESLint + Prettier (2-3 deps, separate configs) | Biome (1 dep, 1 config) | 2023 | No TS compiler API version coupling |
| `dotenv` for env var loading | `process.loadEnvFile()` (Node native) | Node 20.6 (2023) | One less dependency |
| Zod v3 `.string().email()` chaining | Zod v4 `z.email()` top-level | Zod 4.0 (2025) | Cleaner API; chained format validators deprecated |
| `gitleaks detect` / `gitleaks protect` commands | `gitleaks git` (new primary) + protect hidden-but-functional | v8.19.0 (2024) | `protect --staged` still works; `gitleaks git` is the new canonical |

**Deprecated/outdated:**
- `gitleaks detect`: hidden from help in v8.19.0, use `gitleaks git` for scanning commits
- `gitleaks protect`: hidden from help in v8.19.0, but `protect -v --staged` still works for pre-commit and is used in the official `pre-commit.py` script
- Zod `z.string().email()`, `z.string().url()`: deprecated in v4 in favor of `z.email()`, `z.url()` top-level validators

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `simple-git-hooks` postinstall script writes only to `.git/` and makes no network calls | Package Legitimacy Audit | Low — package has 1.7k stars, used by PostCSS/Nano ID; source reviewed on GitHub. If wrong: unexpected filesystem writes at install time |
| A2 | `gitleaks protect -v --staged` remains functional in v8.30.1 despite being hidden from help menu | Pattern 5 | Medium — if gitleaks removes it in a future patch, the pre-commit hook silently succeeds without scanning. Mitigation: test the hook with a dummy API-key-shaped string before shipping Phase 1 |
| A3 | Zod v4 `z.string().optional()` is still valid (chained, not wrapping) | Code Examples | Low — Zod v4 only deprecated format validators like `.email()`; basic `.optional()` chaining is unchanged per official v4 docs |
| A4 | `npm view simple-git-hooks` download count of `400k+/wk` is accurate | Package Legitimacy Audit | Low — this is an approximation from registry signal; exact counts require npm API call |

**If this table is empty:** Not empty — 4 assumptions documented.

## Open Questions

1. **Should `biome check --write .` in the pre-commit hook modify all files or only staged files?**
   - What we know: `biome check --write .` formats all files in the project. `biome check --write --staged` would format only staged files (if Biome supports this flag — not confirmed).
   - What's unclear: Whether Biome 2.5.5 supports a `--staged` flag.
   - Recommendation: Use `biome check --write .` for now (simple, documented). If the UX of modifying unstaged files is disruptive, revisit.

2. **Should `scripts/validate-fixtures.ts` be committed as a runnable script, or baked into `package.json` scripts?**
   - What we know: The Phase 1 success criteria require demonstrating that the schema validates the valid fixture and rejects the malformed one.
   - What's unclear: Whether this should be a `npm run validate` script or a one-off verification step.
   - Recommendation: Add `"validate-fixtures": "tsx scripts/validate-fixtures.ts"` to package.json scripts. Keep the script for Phase 2+ use.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All TypeScript execution | ✓ | v26.4.0 | — |
| npm | Package installation | ✓ | 11.17.0 | — |
| Homebrew | gitleaks installation | ✓ | (available — `brew info gitleaks` succeeded) | Manual binary download from github.com/gitleaks/gitleaks/releases |
| gitleaks | Secret scanning | ✗ (not yet installed) | — | `brew install gitleaks` (Homebrew confirmed available) |
| TypeScript (`tsc`) | Type-checking | ✗ (not yet installed) | — | `npm install -D typescript@^6.0.3` |
| Biome | Lint + format | ✗ (not yet installed) | — | `npm install -D @biomejs/biome` |

**Missing dependencies with no fallback:** None — all missing tools have straightforward install paths.

**Missing dependencies with fallback:**
- gitleaks: not installed, but Homebrew is available. Plan must include `brew install gitleaks` as an early task.
- tsc, biome: installed via npm in the scaffold tasks.

**Node version note:** Machine has Node v26.4.0, which exceeds the `>=22.12.0` minimum. No compatibility concern.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — (no auth in Phase 1) |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | Yes (partial) | Zod schema validates fixture JSON; full validation at trust boundary is Phase 2 |
| V6 Cryptography | No | — |
| V7 Error Handling | No | — (Phase 4) |
| V14 Configuration | Yes | `.env` gitignored, `.env.example` committed, `ANTHROPIC_API_KEY` never in source |

### Known Threat Patterns for this Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key committed to public repo | Information Disclosure | gitleaks pre-commit hook blocks commit; `.gitignore` excludes `.env`; `.env.example` documents the pattern |
| Secrets in git history (prior commits) | Information Disclosure | gitleaks is a pre-commit hook — it stops new additions, but cannot retroactively clean history. If a key is committed accidentally, it must be revoked immediately at the provider. Scope: prevention only, not remediation |
| Supply chain: malicious npm postinstall | Tampering | simple-git-hooks postinstall writes only to `.git/hooks/` (reviewed); no network calls. Package has 1.7k stars, used by PostCSS/Nano ID |

## Sources

### Primary (HIGH confidence)
- `gitleaks/config/gitleaks.toml` (main branch, GitHub) — confirmed `anthropic-api-key` and `anthropic-admin-api-key` built-in rules with exact regex patterns
- `gitleaks/scripts/pre-commit.py` (main branch, GitHub) — confirmed `gitleaks protect -v --staged` as the current pre-commit command
- `brew info gitleaks` (live, 2026-07-27) — confirmed stable version 8.30.1
- npm registry live metadata (2026-07-27): `zod@4.4.3`, `@biomejs/biome@2.5.5`, `typescript@6.0.3` (6.x pinned per CLAUDE.md), `tsx@4.23.1`, `simple-git-hooks@2.13.1`
- typescriptlang.org/tsconfig + totaltypescript.com cheat sheet — NodeNext tsconfig pattern

### Secondary (MEDIUM confidence)
- zod.dev/v4 — Zod v4 breaking changes: `.email()` chaining deprecated, `import * as z from "zod"` unchanged, `.optional()` still valid chain method
- biomejs.dev/reference/configuration — biome.json schema reference
- github.com/toplenboren/simple-git-hooks README — postinstall behavior, `prepare` script pattern, usage in PostCSS/Nano ID/VitePress

### Tertiary (LOW confidence)
- gitleaks wiki pre-commit page — noted `protect` deprecation in v8.19.0; superseded by PRIMARY finding that official script still uses it

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all npm versions verified live; gitleaks version verified via brew; tool choices locked in CONTEXT.md
- Architecture: HIGH — phase scope is fully specified; directory structure follows prior architecture research
- Schema patterns: HIGH — Zod v4 API verified; schema fields locked in D-09 through D-14
- gitleaks protect --staged: MEDIUM — deprecated from help but confirmed in official pre-commit.py; flagged as assumption A2

**Research date:** 2026-07-27
**Valid until:** 2026-08-27 (stable tooling; npm versions should be re-verified before execution if more than 30 days pass)
