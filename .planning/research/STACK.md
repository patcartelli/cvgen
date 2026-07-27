# Stack Research

**Domain:** Node/TypeScript CLI — markdown-to-PDF resume generator (Claude API parsing + Puppeteer rendering)
**Researched:** 2026-07-27
**Confidence:** HIGH (all core picks verified against live npm registry metadata + Context7 SDK docs; ecosystem-trend claims verified with 2+ sources)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | `>=22.12.0` (develop on 24 LTS) | Runtime | Puppeteer 25.x's `engines.node` floor is `22.12.0`. Node 24 ("Krypton") is the current Active LTS line as of mid-2026; Node 22 is in maintenance until April 2027. Target `>=22.12.0` in `package.json.engines` for the widest supported floor, develop/CI on 24. |
| TypeScript | `6.0.3` (NOT 7.x — see caveat) | Language / type-checking | TypeScript 7.0 GA'd July 8 2026 as a from-scratch Go-native port ("Project Corsa", 10x faster builds). It is real and current, but **its programmatic compiler API is not shipping until 7.1**, so `typescript-eslint` closed TS7 support as "not planned" on GA day and pins `typescript: ">=4.8.4 <6.1.0"` as a peer dependency. If you pick ESLint + typescript-eslint (see below), pin TypeScript to the latest 6.x. If you pick Biome instead, TS7 is safe to use immediately because Biome has its own type synthesizer and never calls into the TS compiler API. |
| Commander | `15.0.0` | CLI argument parsing | Zero runtime dependencies, ~50M weekly downloads, the de facto standard for small/medium Node CLIs (Vue CLI, create-react-app). cvgen's surface is a single command (`cvgen <path-to-md>` plus a couple of flags) — Commander's minimal, programmatic API is a direct fit. Yargs (18.1.0) is heavier (3 deps) and its strengths (fluent chaining, middleware, rich subcommand trees, shell completion generation) solve problems cvgen doesn't have. |
| `@anthropic-ai/sdk` | `0.115.0` | Claude API client | Official TypeScript SDK. Ships dual ESM/CJS (`exports` map has both `.mjs` and `.js`+`require`), so it works cleanly regardless of your module format. Reads `ANTHROPIC_API_KEY` from `process.env` automatically — no config wiring needed beyond making sure the var is set (see env var section). |
| Puppeteer | `25.4.0` | Headless Chromium PDF rendering | This is a **locally-run CLI**, not a serverless function — use the full `puppeteer` package (bundles a matched Chromium build), not `puppeteer-core`. See packaging section below for why. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | `4.4.3` | Runtime schema validation + TS types for the parsed resume JSON | Define one `ResumeSchema` (contact, summary, experience[], education[], skills[]) with Zod, then pass it straight into `zodOutputFormat()` from `@anthropic-ai/sdk/helpers/zod` (see Claude structured-output pattern below). One schema, two benefits: compile-time types via `z.infer<>` and runtime validation of whatever Claude returns. |
| `tsx` | `4.23.1` | Run TypeScript directly in dev, no build step | `tsx src/cli.ts <path>` during development. Built on esbuild — transpiles only, no type-checking, starts in tens of ms. This is the de facto `ts-node` replacement in 2026. |
| `@types/node` | matching your Node major (`^24` if developing on 24) | Type defs for Node built-ins (`process`, `fs`, `path`) | Always, as a dev dependency. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Biome | `2.5.5` | Lint + format, single tool/single config | **Primary recommendation.** One dependency, one `biome.json`, replaces ESLint+Prettier+typescript-eslint. Crucially for this project: Biome does NOT depend on the TypeScript compiler API for its type-aware rules (it has its own type synthesizer), so it has no TS-version compatibility ceiling — you can adopt TypeScript 7.0 immediately without a linting conflict. 10-20x faster than ESLint on typical repos; for a small CLI codebase that speed doesn't matter much, but the zero-conflict TS7 story does. |
| TypeScript (`tsc`) | Type-checking + build | Run `tsc --noEmit` in CI/pre-commit for type-checking, and plain `tsc` (no bundler) to emit `dist/`. See build section for why no tsup/esbuild bundling step is needed here. |
| Vitest | Unit tests (if/when you add them) | Not in original question but natural default for a 2026 TS project — esbuild-based, fast, Jest-compatible API. Only pull in if a phase needs unit tests around the markdown-parsing contract or schema validation. |

## Installation

```bash
# Core
npm install commander @anthropic-ai/sdk puppeteer zod

# Dev dependencies
npm install -D typescript@^6 tsx @types/node @biomejs/biome

# Pin TypeScript below 7 explicitly in package.json if you ever add ESLint later:
# "typescript": "^6.0.3"
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Commander | yargs (18.1.0) | You outgrow a single command — e.g. add `cvgen render`, `cvgen preview`, `cvgen init` subcommands with shared middleware, or want auto-generated shell completions. |
| Biome | ESLint 10 + typescript-eslint 8.65 + Prettier 3.9 | You need a specific ESLint rule/plugin with no Biome equivalent, or you want the most mature type-aware rule set (`noFloatingPromises` etc. — Biome currently catches ~75% of the cases typescript-eslint's full-coverage rule catches). If you go this route, pin `typescript@^6.0.3` — do not adopt TS7 alongside typescript-eslint, it's an explicit unsupported combination as of this writing. |
| Plain `tsc` build (no bundler) | `tsup` (8.5.1) | You need a single-file bundled output (e.g. for a `npx cvgen` zero-install experience where you don't want `node_modules` shipped) or you need dual ESM+CJS builds because other packages `require()` you as a library. cvgen is consumed only via its `bin` entry, never `import`ed by other code, so bundling buys nothing and adds risk (see pitfall below on bundling Puppeteer). |
| `puppeteer` (full) | `puppeteer-core` + `@sparticuz/chromium` (149.0.0) | You deploy the renderer to AWS Lambda/Vercel serverless functions, where bundle-size limits make a full Chromium download impractical. Not applicable here — PROJECT.md explicitly scopes v1 as local-only with no server component. |
| Native `process.loadEnvFile()` / `--env-file` | `dotenv` (17.4.2) | Your `.env` needs variable expansion (`FULL_URL=${BASE_URL}/v1`) or you need to support Node <20.6. cvgen has exactly one secret (`ANTHROPIC_API_KEY`), no expansion need, and targets Node ≥22 anyway — native loading is strictly simpler. |
| ESM only (`"type": "module"`) | CJS or dual ESM/CJS | You're publishing a library other packages will `require()`. Not the case here — Commander 15, Puppeteer 25, and Zod 4 are all ESM-first/ESM-only in 2026 already, so CJS would mean fighting your own dependencies. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Next.js / Vercel deployment | PROJECT.md's original STC-138 decision named Next.js, but v1's actual output surface is two local PDF files with zero web routes to serve. A framework's App Router, React runtime, and deploy pipeline add toolchain weight with no user-facing benefit for a tool that runs once on a developer's machine. **Confirmed sound** — revisit only if/when a genuinely-scoped v2 web UI starts (per PROJECT.md's own "Out of Scope" note). | Plain TypeScript CLI (this document) |
| `ts-node` | Superseded in practice by `tsx` — slower cold start, more config friction with ESM + `NodeNext` module resolution, effectively unmaintained relative to tsx's adoption curve. | `tsx` for dev-run |
| TypeScript 7.0 + typescript-eslint together | `typescript-eslint` peer-dependency range is `>=4.8.4 <6.1.0` — explicitly excludes TS7. GitHub issue for TS7 support was closed "not planned" on TS7's GA day; ESLint core's own TS7 tracking issue is blocked behind it. Using both today means a broken/impossible install, not just a warning. | Either pin `typescript@^6.0.3` (if you want ESLint), or use Biome (if you want TS7 now) |
| `puppeteer-core` + manually-managed Chromium | Full `puppeteer` already solves this correctly for a local CLI: it downloads a version-matched Chromium at install time and Just Works. Manually wiring `puppeteer-core` to a system Chrome install (to save disk space) reintroduces version-skew risk between your dev machine and anyone else who clones the repo — a real cost for a portfolio piece meant to run cleanly for strangers. | `puppeteer` (full) |
| `@sparticuz/chromium` | Purpose-built for AWS Lambda/Vercel serverless cold-start constraints. cvgen has no serverless component in v1 — including this dependency adds a config surface (custom `executablePath`, `args` tuning) for a deployment target that doesn't exist. | `puppeteer` (full) |
| Bundling Puppeteer with `tsup`/esbuild | Puppeteer ships native download hooks, worker/preload scripts, and a `.local-chromium` binary reference that a bundler will not resolve correctly — bundling it is a well-known source of "Could not find Chromium" runtime errors. | Leave `puppeteer` as an unbundled `node_modules` dependency; only bundle (if you bundle at all) your own `src/` code |
| `dotenv` as a default include | Adds a dependency and an explicit `import 'dotenv/config'` for a problem Node 22+ solves natively via `process.loadEnvFile()`. | `process.loadEnvFile('.env')` wrapped in try/catch at CLI entry (see pattern below) |

## Stack Patterns by Variant

**If you want to publish to the npm registry (in addition to being a GitHub portfolio repo):**
- Add `"files": ["dist"]`, a `bin` field pointing at `dist/cli.js` with a `#!/usr/bin/env node` shebang, and `"exports"` matching just the CLI entry.
- Run `npm pack --dry-run` before first publish to sanity-check contents; consider `publint` as a pre-publish lint for export-map mistakes.
- Still no need for tsup/dual-format — a CLI-only package has one consumption path (`npx cvgen` / global bin), not an `import`/`require` library surface.

**If you keep it GitHub-only / npm-link local install (matches PROJECT.md's actual v1 scope — "personal tool... doubles as a portfolio piece"):**
- Skip the npm-publish ceremony above entirely. `npm link` from the cloned repo, or a documented `npm install -g .` in the README, is sufficient.
- Still build with `tsc` to `dist/` rather than requiring users to run `tsx` themselves — a portfolio repo should demonstrate a real build step.

**If you later add the v2 web UI (explicitly out of scope for v1 per PROJECT.md):**
- Revisit Next.js/Vercel then, as a separate concern from this CLI — don't retrofit a framework onto the CLI's `src/`. The Claude-parsing and Puppeteer-rendering logic in `src/lib/` should be framework-agnostic from day one so a v2 web UI can import it without a rewrite.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `typescript@^6.0.3` | `typescript-eslint@8.65.0`, `eslint@^9 \|\| ^10` | Required pairing if you choose the ESLint route — do not upgrade TypeScript past 6.1 while using typescript-eslint. |
| `typescript@7.0.2` | `@biomejs/biome@2.5.5`, `tsx@4.23.1` (esbuild-based, TS-version-agnostic for transpile), `puppeteer@25.4.0` | Safe combination if you skip ESLint entirely. `tsc --noEmit` still works fine as a type-checker in CI; you just lose typescript-eslint's editor/lint integration until TS 7.1 ships a programmatic API. |
| `puppeteer@25.4.0` | Node `>=22.12.0` | Hard floor via `engines.node` — do not target Node 20 or earlier. |
| `commander@15.0.0` | ESM only (`"type": "module"`) | Commander 15 has no CJS build; a CJS project would need `commander@^11` instead. Not a concern here since we're recommending ESM anyway. |
| `@anthropic-ai/sdk@0.115.0` | Node 22/24, ESM or CJS | Dual-published; works either way, no forcing function on module format from this dependency. |

## Claude Structured-Output Pattern (verified via Context7)

The SDK has a purpose-built structured-output API — use it instead of hand-rolling JSON-mode prompting or tool-use hacks:

```ts
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

const ResumeSchema = z.object({
  contact: z.object({ name: z.string(), email: z.string(), phone: z.string().optional() }),
  summary: z.string(),
  experience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    dates: z.string(),
    bullets: z.array(z.string()),
  })),
  education: z.array(z.object({ institution: z.string(), credential: z.string(), dates: z.string() })),
  skills: z.array(z.string()),
});

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from process.env automatically

const message = await client.messages.parse({
  model: 'claude-sonnet-5',
  max_tokens: 4096,
  messages: [{ role: 'user', content: markdownContent }],
  output_config: { format: zodOutputFormat(ResumeSchema) },
});

const resume = message.parsed_output; // typed as z.infer<typeof ResumeSchema>, already validated
```

This gives you compile-time types and runtime validation from one schema, and Claude's response is guaranteed to match the shape (the SDK enforces this server-side via the schema, not just a prompt instruction).

## Env Var Pattern (native, no dotenv)

```ts
// at CLI entry, before anything else runs
try {
  process.loadEnvFile('.env');
} catch {
  // .env is optional — the var may already be set in the shell/CI env
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY. Set it in your shell or a local .env file.');
  process.exit(1);
}
```

`process.loadEnvFile()` (Node ≥20.12) has no variable-expansion support and only honors leading `#` for comments — irrelevant here since cvgen only needs one flat key. `.env` must be gitignored (this is a public repo).

## Puppeteer PDF Rendering Pattern

```ts
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.emulateMediaType('print'); // activates @media print CSS
await page.pdf({
  path: outputPath,
  format: 'Letter', // or 'A4' — confirm target ATS/recruiter locale
  printBackground: true, // needed for any background colors/borders in the designed variant
  margin: { top: '0.5in', bottom: '0.5in', left: '0.6in', right: '0.6in' },
});
await browser.close();
```

Key points verified across sources: `emulateMediaType('print')` must be called before `page.pdf()` for `@media print` CSS to take effect; `printBackground: true` is required or background colors/shading silently disappear in output; use `page-break-inside: avoid` CSS on experience-entry blocks to stop Chromium splitting a single job entry across a page boundary — relevant for both PDF variants since v1 is single-column with no images (per PROJECT.md constraint), so page-break control is the main layout risk, not multi-column complexity.

## Sources

- `/anthropics/anthropic-sdk-typescript` (Context7) — install, basic usage, `zodOutputFormat`/`jsonSchemaOutputFormat` structured-output helpers, `messages.parse` — HIGH confidence
- npm registry `npm view` metadata (live, 2026-07-27) for exact current versions of commander, yargs, @anthropic-ai/sdk, puppeteer, puppeteer-core, @sparticuz/chromium, tsx, tsup, typescript, eslint, prettier, @biomejs/biome, dotenv, zod, typescript-eslint — HIGH confidence (primary source of truth, not training data)
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) — GA date, Go-native rewrite, programmatic API delayed to 7.1 — HIGH confidence
- [TypeScript 7.0 Support · typescript-eslint#12518](https://github.com/typescript-eslint/typescript-eslint/issues/12518) and [eslint#21070](https://github.com/eslint/eslint/issues/21070) — closed "not planned" on TS7 GA day, peer dep range confirmed via `npm view typescript-eslint peerDependencies` — HIGH confidence
- [Why Your TypeScript 7 Upgrade Broke ESLint, ts-jest, and ts-morph](https://dev.to/dev_encyclopedia/why-your-typescript-7-upgrade-broke-eslint-ts-jest-and-ts-morph-385k) — practical workaround pattern (pin 6.x for programmatic-API-dependent tools) — MEDIUM confidence, single-source but consistent with the two GitHub issues above
- [Biome type-aware linter issue #3187](https://github.com/biomejs/biome/issues/3187) and related 2026 coverage — Biome's own type synthesizer avoids TS compiler API dependency, `noFloatingPromises` ~75% coverage vs typescript-eslint — MEDIUM confidence (community summaries, not Biome's own docs, but multiple independent sources agree)
- [Node.js Evolving the Release Schedule](https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule) + [endoflife.date/nodejs](https://endoflife.date/nodejs) — Node 24 Active LTS, Node 22 maintenance-until-2027, Node 26 current — HIGH confidence
- [Should You Still Use dotenv in 2025?](https://infisical.com/blog/stop-using-dotenv-in-nodejs-v20.6.0+) + [You Don't Need dotenv Anymore](https://typescript.tv/best-practices/you-dont-need-dotenv-anymore/) — `process.loadEnvFile()` / `--env-file` native support, expansion limitation — MEDIUM confidence, corroborated by 2+ independent sources
- Puppeteer packaging comparison (`puppeteer` vs `puppeteer-core` vs `@sparticuz/chromium`) — MEDIUM confidence, WebSearch-sourced community comparisons, consistent across multiple articles and matches `@sparticuz/chromium`'s own stated purpose (serverless-specific)
- [Page.pdf() official API docs](https://pptr.dev/api/puppeteer.page.pdf) referenced via search — print-media pattern, `printBackground`, page-break CSS — MEDIUM confidence

---
*Stack research for: Node/TypeScript CLI — Obsidian-native resume generator*
*Researched: 2026-07-27*
