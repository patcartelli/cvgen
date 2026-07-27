# Phase 1: Scaffold, Schema & Secret Hygiene - Context

**Gathered:** 2026-07-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Lock the Zod resume data schema (the contract every later phase depends on) and establish public-repo secret hygiene before any Claude-API code is written. Deliverables: TypeScript + Biome scaffold, a validated Zod schema with fixture data, gitleaks pre-commit hook, and `.gitignore` / `.env.example`.

</domain>

<decisions>
## Implementation Decisions

### Obsidian Note Structure — Input Convention

The markdown input format is designed fresh here. The fixture (`fixtures/sample-resume.json`) and the init scaffold (`cvgen init`) must match this convention exactly.

- **D-01:** Contact info lives in YAML frontmatter with exactly these field names (all lowercase, all required): `name`, `email`, `phone`, `location`, `linkedin`, `github`
- **D-02:** Experience entries use `### Role at Company` as the heading, with a `Month Year – Month Year · Location` line immediately below (or `Month Year – Present` for current roles), then bullet lines for outcomes
- **D-03:** Education entries use `### Degree at Institution` as the heading, with the graduation year on the line below
- **D-04:** Skills section uses grouped categories: `**Category:** item1, item2, item3` — one line per group, category name is free text (not an enum)
- **D-05:** Core Competencies section is a single flat comma-separated line of keywords — user writes these manually per target JD for ATS keyword matching; the CLI just parses and renders them as-is
- **D-06:** Professional Summary is optional; Core Competencies, Experience, Education, and Skills are expected sections
- **D-07:** No Projects section — off the resume entirely
- **D-08:** Section ordering is fixed: `## Professional Summary` (optional) → `## Core Competencies` → `## Experience` → `## Education` → `## Skills`

Full note shape:
```markdown
---
name: Pat Cartelli
email: pat@example.com
phone: (555) 000-0000
location: San Francisco, CA
linkedin: linkedin.com/in/patcartelli
github: github.com/patcartelli
---

## Professional Summary
Optional paragraph here.

## Core Competencies
TypeScript, Systems Design, API Design, Team Leadership, ...

## Experience
### Senior Engineer at Acme Corp
Jan 2022 – Present · San Francisco, CA
- Outcome bullet
- Outcome bullet

## Education
### B.S. Computer Science at UCLA
2019

## Skills
**Design:** Figma, CSS
**AI/ML:** Claude API, PyTorch
**Tools:** Docker, Git, Postgres
```

### Zod Schema Shape

- **D-09:** Contact schema: all six fields required — `name: z.string()`, `email: z.string()`, `phone: z.string()`, `location: z.string()`, `linkedin: z.string()`, `github: z.string()`
- **D-10:** Experience schema: `{ role: string, company: string, startDate: string, endDate: string, type?: 'full-time' | 'contract', bullets: string[] }` — bullets are the outcome statements
- **D-11:** Education schema: `{ degree: string, institution: string, year: string }`
- **D-12:** Skills schema: `{ category: string, items: string[] }[]` — category is a free string, not an enum
- **D-13:** Core Competencies schema: `string[]` (flat keyword list), marked optional
- **D-14:** Summary schema: `string`, marked optional

Top-level `ResumeSchema` shape:
```typescript
{
  contact: ContactSchema,          // all fields required
  summary?: z.string(),
  coreCompetencies?: z.array(z.string()),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  skills: z.array(SkillGroupSchema),
}
```

### Secret Hygiene Tooling

- **D-15:** Use **gitleaks** for pre-commit secret scanning — Go binary, built-in patterns for Anthropic keys, zero runtime dependencies beyond the binary
- **D-16:** Use **simple-git-hooks** to wire the pre-commit hook — config lives in `package.json` under `"simple-git-hooks"`, no separate config files or `.husky/` directory
- **D-17:** Pre-commit hook runs: `biome check --write` (lint + format) then `gitleaks protect --staged` (secret scan); commit is blocked if either fails

### Claude's Discretion

- Exact `tsconfig.json` strictness flags and compiler options — follow CLAUDE.md stack guidance (`NodeNext` module resolution, strict mode, ESM)
- Exact gitleaks config (`.gitleaks.toml`) if custom patterns are needed beyond the built-in Anthropic ruleset
- File naming and directory structure for `src/lib/`, `src/cli.ts`, `fixtures/`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements & Goals
- `.planning/ROADMAP.md` — phase goal, success criteria (4 criteria for Phase 1), dependency chain across all 4 phases
- `.planning/REQUIREMENTS.md` — SCHEMA-01 is the only requirement mapped to Phase 1; traceability table shows what phases cover which requirements
- `.planning/PROJECT.md` — core value, constraints, key decisions (especially the Next.js/Vercel drop and why)

### Technology Stack
- `CLAUDE.md` — **primary stack reference**: pinned versions for all dependencies (TypeScript 6.0.3, Biome 2.5.5, Commander 15.0.0, Zod 4.4.3, tsx 4.23.1, @anthropic-ai/sdk 0.115.0, Puppeteer 25.4.0), ESM-only rationale, what NOT to use and why, Claude structured-output pattern, env var pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield repo. No `src/` directory exists yet.

### Established Patterns
- None yet — this phase establishes the patterns all later phases inherit.

### Integration Points
- Phase 2 (parsing) depends on the `ResumeSchema` Zod object exported from this phase — the schema file path and export name matter
- Phase 3 (rendering) depends on the same schema to type-check fixture data — built and tested against `fixtures/sample-resume.json` from this phase
- Phase 4 (CLI wiring) depends on the `package.json` structure and `bin` entry established here

</code_context>

<specifics>
## Specific Ideas

- Core Competencies is explicitly for ATS keyword targeting — user writes it manually per job application. The CLI never generates or modifies it. Render it visually distinct (e.g., smaller, lighter) to signal it's a targeting artifact, not the main resume voice.
- `type` on experience entries ('full-time' | 'contract') allows the renderer to distinguish staff from contract roles — e.g., a small "(Contract)" label next to the role title.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Scaffold, Schema & Secret Hygiene*
*Context gathered: 2026-07-27*
