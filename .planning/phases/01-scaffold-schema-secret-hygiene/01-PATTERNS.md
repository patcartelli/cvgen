# Phase 1: Scaffold, Schema & Secret Hygiene - Pattern Map

**Mapped:** 2026-07-27
**Files analyzed:** 11 new files (greenfield — no src/ exists)
**Analogs found:** 0 / 11 (greenfield project; all patterns sourced from RESEARCH.md verified references)

---

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `package.json` | config | request-response | none | no-analog |
| `tsconfig.json` | config | — | none | no-analog |
| `biome.json` | config | — | none | no-analog |
| `.gitignore` | config | — | none | no-analog |
| `.env.example` | config | — | none | no-analog |
| `.gitleaks.toml` | config | — | none | no-analog |
| `src/schema/resume.ts` | model | transform | none | no-analog |
| `src/schema/validate.ts` | utility | transform | none | no-analog |
| `src/cli/index.ts` | utility | request-response | none | no-analog |
| `fixtures/sample-resume.json` | config | — | none | no-analog |
| `fixtures/sample-resume-malformed.json` | config | — | none | no-analog |
| `scripts/validate-fixtures.ts` | utility | transform | none | no-analog |

---

## Pattern Assignments

### `package.json` (config)

**Analog:** none — sourced from RESEARCH.md Pattern 4 + Code Examples, verified against npm registry 2026-07-27

**Core pattern:**
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
    "dev": "tsx src/cli/index.ts",
    "validate-fixtures": "tsx scripts/validate-fixtures.ts"
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

**Key decisions:**
- `"type": "module"` — ESM-only; Commander 15, Zod 4, Puppeteer 25 are all ESM-first
- `"prepare": "simple-git-hooks"` — runs after `npm install` in npm 7+, ensuring hooks are wired in fresh clones
- `"validate-fixtures"` script — enables `npm run validate-fixtures` for Phase 1 smoke test
- `commander`, `@anthropic-ai/sdk`, `puppeteer` are NOT in Phase 1 — added in later phases
- `typescript` pinned to `^6.0.3` (not 7.x) because project uses Biome, but CLAUDE.md explicitly pins 6.0.3

---

### `tsconfig.json` (config)

**Analog:** none — sourced from RESEARCH.md Pattern 2 (typescriptlang.org/tsconfig + totaltypescript.com cheat sheet)

**Core pattern:**
```json
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

**Critical constraint — NodeNext import extensions:**
All relative imports in `src/` must use `.js` extension (not `.ts`). TypeScript resolves `.js` → `.ts` at compile time, but Node ESM needs `.js` at runtime:
```typescript
// CORRECT
import { ResumeSchema } from "../schema/resume.js";

// WRONG — TS2835 compile error with NodeNext
import { ResumeSchema } from "../schema/resume";
```

**Why `verbatimModuleSyntax: true`:** Forces `import type` for type-only imports, preventing runtime crashes from importing a type as a value.

---

### `biome.json` (config)

**Analog:** none — sourced from RESEARCH.md Pattern 3 (biomejs.dev/reference/configuration)

**Core pattern:**
```json
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

**Note:** `fixtures/` is in the ignore list — fixture JSON files are dev/test data, not source code, and should not be reformatted by Biome.

---

### `.gitignore` (config)

**Analog:** none — sourced from RESEARCH.md Pattern 6

**Core pattern:**
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

# Puppeteer Chromium cache (Phase 2+)
.cache/
```

---

### `.env.example` (config)

**Analog:** none — sourced from RESEARCH.md Pattern 6

**Core pattern:**
```
# Copy to .env and fill in your key. Never commit .env.
ANTHROPIC_API_KEY=your_api_key_here
```

**Security note:** `.env.example` is committed. `.env` is gitignored. The gitleaks pre-commit hook provides a second layer of protection (scans staged files for Anthropic key patterns before any commit is allowed).

---

### `.gitleaks.toml` (config)

**Analog:** none — sourced from RESEARCH.md Pattern 5 (gitleaks/config/gitleaks.toml on GitHub main branch)

**Decision:** No `.gitleaks.toml` is needed initially. The built-in gitleaks ruleset already includes:
- Rule `anthropic-api-key`: regex `sk-ant-api03-[a-zA-Z0-9_\-]{93}AA`, entropy 4.0
- Rule `anthropic-admin-api-key`: regex `sk-ant-admin01-[a-zA-Z0-9_\-]{93}AA`, entropy 4.0

**Only create `.gitleaks.toml` if false positives occur on fixture data.** If needed:
```toml
# .gitleaks.toml — only add if gitleaks falsely flags fixture files
[allowlist]
  paths = [
    '''fixtures/.*''',
  ]
```

**Fixture data rule:** Use obviously low-entropy fake strings in fixtures (e.g., `"ANTHROPIC_API_KEY_HERE"`), not real-key-shaped placeholders. This avoids needing `.gitleaks.toml` entirely.

---

### `src/schema/resume.ts` (model, transform)

**Analog:** none — sourced from RESEARCH.md Pattern 1 (zod.dev/v4 official docs) + D-09 through D-14 in CONTEXT.md

This is the most critical file in Phase 1. Every downstream phase imports from here. The schema is fully specified by decisions D-09 through D-14.

**Imports pattern:**
```typescript
import { z } from "zod";
```

**Core pattern — full schema definition:**
```typescript
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

**Export contract (critical for downstream phases):**
- `ResumeSchema` — exported as a value; Phase 2 passes it to `zodOutputFormat()` from `@anthropic-ai/sdk/helpers/zod`
- `ResumeData` — exported as a type; Phase 3 renderers use it to type-check template inputs

**Zod v4 anti-pattern to avoid:**
```typescript
// WRONG — z.string().email() is deprecated in Zod v4
email: z.string().email()

// CORRECT — plain string is sufficient for this schema (no format validation needed)
email: z.string()

// If format validation IS ever needed in v4:
email: z.email()  // top-level, not chained
```

---

### `src/schema/validate.ts` (utility, transform)

**Analog:** none — Phase 1 stub; Phase 2 fills out the full implementation

**Core pattern — stub with safeParse wrapper shape:**
```typescript
// src/schema/validate.ts
// Phase 1 stub — Phase 2 implements full validation with error formatting
import type { ResumeData } from "./resume.js";
import { ResumeSchema } from "./resume.js";

export function validateResume(data: unknown): ResumeData {
  const result = ResumeSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid resume data: ${result.error.message}`);
  }
  return result.data;
}
```

**Note:** The stub exports `validateResume` so Phase 2 can replace the body without changing the import contract in cli/index.ts.

---

### `src/cli/index.ts` (utility, request-response)

**Analog:** none — Phase 1 stub; Phase 4 replaces with Commander wiring

**Core pattern — minimal stub with shebang:**
```typescript
#!/usr/bin/env node
// src/cli/index.ts
// Phase 1 stub — Phase 4 replaces with Commander argument parsing and pipeline wiring
console.log("cvgen stub — not yet implemented");
```

**Critical:** The shebang `#!/usr/bin/env node` must be the very first line. TypeScript treats it as a comment and preserves it in emitted `dist/cli/index.js`. The `package.json` `bin` field points to `dist/cli/index.js`.

---

### `fixtures/sample-resume.json` (config — test data)

**Analog:** none — sourced from RESEARCH.md Code Examples, shaped to match D-01 through D-08

**Core pattern — valid fixture (must pass `ResumeSchema.safeParse()`):**
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

**Key:** Use fictional data (not real person's contact details). All six contact fields must be present (D-09 requires all required). Include one contract-type experience entry in a second phase of the fixture to exercise the optional `type` field.

---

### `fixtures/sample-resume-malformed.json` (config — test data)

**Analog:** none — sourced from RESEARCH.md Code Examples

**Core pattern — invalid fixture (must fail `ResumeSchema.safeParse()`):**
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

**What makes it malformed:** Missing `phone`, `location`, `linkedin`, `github` from `contact`. `ResumeSchema.safeParse()` must return `{ success: false }` with error messages naming the missing fields. The smoke test script asserts this.

---

### `scripts/validate-fixtures.ts` (utility, transform)

**Analog:** none — sourced from RESEARCH.md Code Examples (Zod safeParse pattern)

**Imports pattern:**
```typescript
import { readFileSync } from "fs";
import { ResumeSchema } from "../src/schema/resume.js";
```

**Core pattern — smoke test for both fixtures:**
```typescript
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

**Run via:** `npm run validate-fixtures` (wired in `package.json` scripts as `tsx scripts/validate-fixtures.ts`)

---

## Shared Patterns

### NodeNext ESM Relative Import Convention
**Apply to:** All files in `src/` that import from other `src/` files
**Rule:** Always use `.js` extension on relative imports in TypeScript source. TypeScript resolves `.js` → `.ts` at compile time; Node ESM needs `.js` at runtime.
```typescript
// Every relative import in src/ follows this pattern:
import { ResumeSchema } from "../schema/resume.js";
import type { ResumeData } from "../schema/resume.js";
```

### Type-only Import Convention
**Source:** `tsconfig.json` `verbatimModuleSyntax: true`
**Apply to:** All files that import types but not values from another module
```typescript
// Import type separately when only the type is needed:
import type { ResumeData } from "../schema/resume.js";

// Import value when used at runtime:
import { ResumeSchema } from "../schema/resume.js";
```

### Single Export Source for Schema
**Apply to:** Phase 2 (`parser/extract.ts`), Phase 3 renderers, Phase 4 CLI wiring
**Rule:** All modules import `ResumeSchema` and `ResumeData` exclusively from `src/schema/resume.ts`. Never define inline types that duplicate schema fields.
```typescript
// CORRECT — single source of truth
import { ResumeSchema } from "../schema/resume.js";
import type { ResumeData } from "../schema/resume.js";

// WRONG — never duplicate schema fields inline
type Resume = { contact: { name: string; email: string; ... }; ... };
```

### safeParse over parse
**Apply to:** Any code that validates external/untrusted data against ResumeSchema
**Rule:** Use `safeParse()` (returns `{ success, data, error }`) rather than `parse()` (throws on failure). `parse()` is appropriate only in tests where a throw is the desired assertion.
```typescript
// CORRECT for production/CLI code
const result = ResumeSchema.safeParse(data);
if (!result.success) { /* handle error */ }

// CORRECT for test assertion (intentional throw)
ResumeSchema.parse(data);
```

---

## No Analog Found

This is a greenfield project. No source files exist in the repo yet. All 11 files have no codebase analog and must be written from scratch using the patterns documented above.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `package.json` | config | — | Greenfield — no existing package.json |
| `tsconfig.json` | config | — | Greenfield — no TypeScript config exists |
| `biome.json` | config | — | Greenfield — no linter config exists |
| `.gitignore` | config | — | No project-level .gitignore exists |
| `.env.example` | config | — | Greenfield |
| `.gitleaks.toml` | config | — | Greenfield; may not be needed if no false positives |
| `src/schema/resume.ts` | model | transform | Greenfield; this IS the foundational pattern for the project |
| `src/schema/validate.ts` | utility | transform | Greenfield stub |
| `src/cli/index.ts` | utility | request-response | Greenfield stub |
| `fixtures/sample-resume.json` | config | — | Greenfield |
| `fixtures/sample-resume-malformed.json` | config | — | Greenfield |
| `scripts/validate-fixtures.ts` | utility | transform | Greenfield |

**Planner instruction:** Use RESEARCH.md Code Examples and the Pattern Assignments above as the definitive source for file contents. All patterns in this document are sourced from official documentation verified 2026-07-27.

---

## Metadata

**Analog search scope:** `/Users/pcartelli/dev/cvgen/src/` (does not exist — greenfield)
**Files scanned:** 3 (CLAUDE.md, LICENSE, README.md — none are source analogs)
**Pattern extraction date:** 2026-07-27
**Source authority:** RESEARCH.md (verified against npm registry, official tool documentation, and gitleaks GitHub main branch)
