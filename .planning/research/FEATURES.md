# Feature Research

**Domain:** AI-assisted resume-generator / markdown-to-PDF CLI pipeline
**Researched:** 2026-07-27
**Confidence:** MEDIUM-HIGH (CLI UX conventions and Claude structured-outputs capability are HIGH/official-source; ATS-parsing behavior and competitor feature sets are MEDIUM, sourced from career-advice sites and README skims rather than ATS vendor internals)

## Feature Landscape

### Table Stakes (Users Expect These)

Features a user (in this case, the tool's own author, running it against their live job-search resume) assumes exist. Missing these makes the tool untrustworthy to run unattended.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| File-path argument with existence/readability check | Any CLI that takes a file must fail fast and clearly if the path is wrong — this is the very first interaction | LOW | Exit non-zero, human-readable message ("Cannot find resume note at <path>"), not a raw ENOENT stack trace |
| Defined structured-data schema (contact, summary, experience, education, skills at minimum) | Both PDF renderers need one contract to render against; without it "structured JSON" is undefined and untestable | MEDIUM | JSON Resume (jsonresume.org) is the closest existing open standard — `basics`, `work`, `education`, `skills`, `projects` sections map almost directly to this project's needs. Recommend adopting/adapting it rather than inventing a schema from scratch |
| Markdown → structured JSON via Claude, validated against the schema (not just "trust the model") | An LLM parse step that silently produces malformed or partial JSON is worse than no tool — it fails hidden, not loud | MEDIUM | Claude's Structured Outputs feature (docs.claude.com) constrains generation to a supplied JSON Schema/Zod schema at sampling time — use this rather than free-text-then-regex-parse. Still validate the result in code (Zod `.parse()`) since schema-conformant JSON can still be semantically incomplete (e.g. valid but empty `work: []`) |
| Human-readable error messages for missing/malformed required sections | The input is a free-form Obsidian note with no fixed convention yet — malformed/missing sections (no contact info, no work history) are the expected failure mode, not an edge case | MEDIUM | Message must name the missing section and point at what's expected (e.g. "No email found in contact section — add one under `## Contact`"), not a Zod stack trace |
| Designed PDF output (typographic, single-column, real selectable text) | This is the primary stated Core Value output | MEDIUM | Must still avoid rendering text as flattened images even in the "pretty" version — keeps the file inspectable/copyable, and Puppeteer's default text rendering already gives this for free as long as no canvas/image tricks are used |
| ATS-clean PDF output, visually and structurally distinct from the designed PDF | This is the second stated Core Value output; a single shared design that's merely "less styled" doesn't satisfy the ATS-safety goal | MEDIUM-HIGH | Must differ from the designed PDF on: fonts (system-safe stack — Arial/Helvetica/Times-class — not a decorative webfont), no `display:none`/near-white-on-white/zero-opacity text, no CSS tables/multi-column layout for structure, no header/footer running content Puppeteer would place outside the reading order, no icons/graphics standing in for text |
| Env-var-only API key handling, clear failure when missing | Repo is public; committing/prompting for a key is a real security incident, not a style nit | LOW | Read `process.env.ANTHROPIC_API_KEY` (or similar), fail with a clear message + exit code if unset — never fall back to prompting interactively or writing it to a local config file |
| `--help` output with usage + example invocation | Baseline CLI citizenship; also the primary "documentation" a portfolio visitor cloning the repo will read first | LOW | Standard commander/yargs/oclif `--help` output covers this without custom work |
| Correct process exit codes (0 success, non-zero on any failure) | Anything that always exits 0 corrupts scripting/CI usage and hides failures from the user running it manually | LOW | Distinguish failure classes if easy (e.g. 1 = generic, 2 = usage/missing file, 3 = parse/validation failure) — even a flat 1-for-all-errors is acceptable for v1, just never 0-on-failure |
| Predictable, non-destructive output file naming | User must be able to tell which PDF is which without opening both, and re-running must not silently clobber a differently-named prior output | LOW | e.g. `<slug>-resume.pdf` and `<slug>-resume-ats.pdf` written next to the input or to a declared output dir |

### Differentiators (Competitive/Portfolio Advantage)

Not required for v1 usability, but valuable given the "no existing schema" constraint and the portfolio-piece framing. All of these stay CLI-only per locked scope.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `--validate-only` / `--dry-run` flag: run the parse step, print the extracted structured JSON, skip PDF rendering | Since the input schema is being invented as the project goes, the highest-value thing the CLI can do is let the user inspect exactly what Claude extracted before committing to a render — this is the single most valuable non-required feature given the free-form-note constraint | LOW-MEDIUM | Directly addresses the "unstructured markdown note, no fixed schema yet" risk called out in the question — lets the schema get battle-tested against real notes without generating PDFs each iteration |
| Staged progress output (parsing → validating → rendering designed PDF → rendering ATS PDF) | Both PDF generations plus an API round-trip take a few seconds each; silent CLIs feel broken past ~100ms per clig.dev guidance | LOW | stderr for status/progress, stdout reserved for any data output (e.g. `--validate-only` JSON dump) — keeps the tool pipeable |
| `--verbose`/`--debug` flag dumping the raw Claude response alongside the validated JSON | When parsing fails or produces something wrong, seeing the raw model output (vs. only the post-validation error) is the fastest way to debug a bad extraction | LOW | Useful specifically because there's no fixed schema yet — early iterations will need this to tune the extraction prompt |
| `cvgen init` scaffold generating an example Obsidian note with the expected frontmatter/headings | Solves the chicken-and-egg problem: there's no existing note convention, so giving the user (and portfolio visitors) a canonical example is more valuable than documentation prose alone | MEDIUM | Should be built *after* the schema stabilizes from real use, not before — premature scaffolding would lock in an untested convention |
| Config file for render preferences (margins, page size, font choice within the ATS-safe set) | Nice normalisation once the user wants to tweak visual output repeatedly rather than accept fixed defaults | MEDIUM | Genuinely a v1.x feature — v1 fixed defaults are simpler and sufficient to validate the concept |
| Section-level parse-confidence flags (e.g. "inferred `education` from an untitled block") | Because the note has no fixed schema, the model will sometimes guess at section boundaries; surfacing "I inferred X" vs "explicitly labeled X" builds trust in the extraction over time | MEDIUM-HIGH | High value, but meaningfully harder to implement well (requires the extraction prompt to emit provenance, not just data) — good v1.x/v2 candidate, not v1 |

### Anti-Features (Explicitly Out of Scope)

Confirms the already-locked exclusions from PROJECT.md and adds domain-specific ones surfaced by this research.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Multi-column layout *(already locked out of scope)* | Looks more "designed"/space-efficient | Confirmed by ATS research: multi-column layouts are a leading cause of ATS parsers reading resume content out of order or skipping sections entirely | Single-column flow for both outputs, confirmed correct by this research |
| Image/headshot embedding *(already locked out of scope)* | Common in "pretty" resume templates | Bloats file size, adds a second render pipeline concern (image sizing/placement), and the user explicitly doesn't want it | None needed — already excluded by design |
| Job-posting-targeted tailoring *(already locked out of scope)* | Obvious "AI resume tool" feature (tailor bullets to a JD) | Turns v1 from "parse and render" into "parse, reason about a second document, and rewrite content" — a different, much larger product | Straight parse-and-render for v1; revisit as a clearly-scoped v2 feature if ever |
| Web UI *(already locked out of scope, deferred to v2 per STC-138)* | Broader reach, nicer demo for portfolio visitors | No web routes exist in v1's actual output surface (two PDFs); building one now is toolchain weight with no user-facing benefit yet | CLI-only for v1; revisit only when a v2 web UI is actually scoped |
| Hidden/white/near-invisible text keyword stuffing in the ATS PDF | Superficially "more keywords = better ATS match" | Modern ATS platforms (Workday, Greenhouse, etc.) actively detect font-color-vs-background mismatches and flag/reject on it; increasingly also treated as an LLM prompt-injection vector against AI-based resume screening, with real accounts of blacklisting | Only emit real, visible, honestly-labeled keywords the candidate actually has — the structured `skills`/`keywords` fields already give the ATS parser clean, legitimate signal without needing hidden tricks |
| Decorative/custom webfonts in the ATS-clean output | Matches the designed PDF's visual identity | Non-system fonts risk falling back to unpredictable glyphs or breaking text extraction/kerning in some ATS parsers; directly contradicts "ATS-clean" | Restrict the ATS renderer to a small, explicit system-safe font allowlist (e.g. Arial/Helvetica, Times-class serif); the designed PDF is where custom typography lives |
| Tables used for resume *layout* (even if visually clean) | Tables are a natural way to align dates/locations next to job titles | Confirmed pitfall: ATS parsers can read table cells out of intended order or skip them, even when the table looks fine visually | Use plain heading/paragraph/list flow with consistent text markers (e.g. "Company — Title — Dates" as one line) instead of tabular alignment, in both outputs but especially the ATS one |
| Interactive prompt for the API key, or writing it to a local config/cache file | Some CLIs offer a "first run setup wizard" that asks for and stores a key | Directly conflicts with the locked constraint that the key must come from an environment variable and never be prompted for or persisted — a public portfolio repo raising this risk even once is a real incident | Read from env var only; fail with a clear, actionable message (which env var name, where to set it) when absent |
| Any telemetry/analytics/phone-home behavior | Common in CLI tooling to understand usage | No stated need, adds a privacy/scope surface to a personal tool whose source is public, and clig.dev explicitly warns against phoning home without explicit opt-in | None — omit entirely |
| The tool inventing, embellishing, or rephrasing the user's actual resume content beyond structuring it | "AI resume writer" framing is common in this space (auto-improve bullet points, add impact metrics) | v1's Core Value is *parse-and-render*, not *ghostwrite*; a tool that silently alters claims about the user's own work history erodes trust in exactly the tool meant to represent them professionally, and is a different (and much riskier) product | Claude's role stays strictly extraction/structuring of what's already in the note — no content generation or rewriting |
| Additional output formats beyond the two PDFs (DOCX, plain-text, HTML export, etc.) | Looks like low-effort extra value ("just export more formats") | Each format is its own render pipeline with its own layout quirks; not requested, and multiplies surface area with no validated need yet | Two PDFs only for v1; reconsider only if a specific need for e.g. DOCX surfaces later |

## Feature Dependencies

```
[Structured-data schema definition]
    └──requires──> nothing (first artifact; everything else depends on it)

[Markdown → JSON parsing via Claude structured outputs]
    └──requires──> [Structured-data schema definition]
    └──requires──> [Env-var API key handling]

[Validation + human-readable error messages]
    └──requires──> [Structured-data schema definition]
    └──requires──> [Markdown → JSON parsing via Claude structured outputs]

[Designed PDF renderer] ──parallel-with──> [ATS-clean PDF renderer]
    (both) └──requires──> [Validated structured JSON]

[--validate-only / --dry-run flag] ──enhances──> [Markdown → JSON parsing]
    (does not block PDF rendering; can ship after v1 core works)

[--verbose/--debug flag] ──enhances──> [Validation + error messages]

[cvgen init scaffold] ──enhances──> [Markdown → JSON parsing]
    (should follow schema stabilization, not precede it)

[Hidden-text/keyword-stuffing] ──conflicts──> [ATS-clean PDF renderer]
[Tables-for-layout] ──conflicts──> [ATS-clean PDF renderer]
[Custom webfonts] ──conflicts──> [ATS-clean PDF renderer]
```

### Dependency Notes

- **Both PDF renderers require the validated structured JSON, not the raw markdown or raw Claude output.** This is the core architectural insight from the "designed vs. ATS-clean" research: the two renderers should be two presentation layers over one shared data contract, not two independent parse-and-render pipelines. Divergence between them (e.g. one picking up a section the other missed) is a bug class to design out from the start.
- **Validation cannot be built before the schema exists.** The schema is the single upstream artifact everything else — parsing, error messages, both renderers — depends on. It should be the first thing locked in the roadmap, even though PROJECT.md correctly notes it's being designed fresh.
- **The three ATS anti-features (hidden text, layout tables, custom fonts) are conflicts with the ATS-clean renderer specifically**, not general resume anti-patterns to police in the designed PDF, where a table for something like a skills matrix or a decorative font might be acceptable design choices.
- **`--validate-only` enhances rather than blocks the core pipeline** — it can ship in the same phase as parsing or slightly after, since it exercises the exact same parse step with the render step skipped.

## MVP Definition

### Launch With (v1)

Directly matches PROJECT.md's Active requirements; nothing here should require new architecture beyond what's already scoped.

- [ ] File-path CLI argument with existence/readability validation — first interaction, must fail clearly
- [ ] Structured-data schema definition (contact, summary, experience, education, skills — JSON Resume's `basics`/`work`/`education`/`skills` as a starting reference) — the contract everything else depends on
- [ ] Markdown → JSON parsing via Claude structured outputs, validated against the schema — the core "AI-assisted" value
- [ ] Human-readable errors for missing/malformed required sections — essential given the free-form input has no existing convention to lean on
- [ ] Designed single-column typographic PDF renderer
- [ ] ATS-clean single-column PDF renderer (system-safe fonts, no layout tables, no hidden text, real selectable text)
- [ ] Env-var-only API key handling with clear failure messaging — non-negotiable given the public repo
- [ ] `--help` with usage and an example invocation
- [ ] Correct exit codes on all failure paths

### Add After Validation (v1.x)

Add once the schema has been battle-tested against the user's actual note and the core pipeline is proven reliable.

- [ ] `--validate-only`/`--dry-run` flag — add once real-note edge cases (missing sections, ambiguous headings) show the schema needs iteration without a full render each time
- [ ] `--verbose`/`--debug` flag dumping raw Claude output — add once parse-failure debugging becomes a routine need rather than a one-off
- [ ] `cvgen init` scaffold with an example note — add once the schema has stabilized enough to be worth codifying as a starter template
- [ ] Config file for render preferences (margins, page size, ATS-safe font choice) — add once there's a real desire to tweak output repeatedly rather than accept fixed v1 defaults

### Future Consideration (v2+)

- [ ] Web UI — explicitly deferred per STC-138 until clearly scoped
- [ ] Job-posting-targeted tailoring — explicitly deferred; a materially larger and riskier feature (content rewriting, second input document)
- [ ] Parse-confidence/provenance flags (inferred vs. explicit sections) — valuable but meaningfully harder; revisit once the extraction prompt is mature

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Structured-data schema definition | HIGH | MEDIUM | P1 |
| Claude-based markdown→JSON parsing + validation | HIGH | MEDIUM | P1 |
| Human-readable error messages for malformed input | HIGH | MEDIUM | P1 |
| Designed PDF renderer | HIGH | MEDIUM | P1 |
| ATS-clean PDF renderer | HIGH | MEDIUM-HIGH | P1 |
| Env-var API key handling | HIGH | LOW | P1 |
| `--help` + exit codes | MEDIUM | LOW | P1 |
| `--validate-only`/`--dry-run` | HIGH | LOW-MEDIUM | P2 |
| `--verbose`/`--debug` raw-output dump | MEDIUM | LOW | P2 |
| `cvgen init` scaffold | MEDIUM | MEDIUM | P2 |
| Render-preference config file | LOW-MEDIUM | MEDIUM | P3 |
| Parse-confidence/provenance flags | MEDIUM | HIGH | P3 |
| Web UI | MEDIUM | HIGH | P3 (v2) |
| Job-posting tailoring | MEDIUM | HIGH | P3 (v2) |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | codysnider/resume (Go, ATS-focused) | JSON Resume ecosystem (schema + `resumed` CLI + themes) | nietaki/markdown-resume (pandoc-based) | cvgen's Approach |
|---------|--------------------------------------|-----------------------------------------------------------|------------------------------------------|-------------------|
| Input format | Freeform `RESUME.md`, no fixed frontmatter documented | Strict `resume.json` conforming to the open schema | Vanilla markdown, pandoc-templated | Freeform Obsidian markdown note, parsed by Claude into a defined JSON schema — bridges the freeform-input gap the other two tools sit on opposite ends of |
| Structured schema | None described — markdown is rendered fairly directly | Yes — the de facto open standard (`basics`, `work`, `education`, `skills`, `projects`, etc.) | None — pandoc templating, not a data schema | Adopt/adapt JSON Resume's shape as the internal contract, but derive it from an unstructured note via LLM rather than requiring the user to hand-author JSON |
| ATS vs. designed output distinction | Yes — this is the tool's entire premise (real text, safe fonts, no columns/images) | No built-in ATS-specific theme distinction; themes vary widely in ATS-safety | No — single themed output, not explicitly ATS-differentiated | Two explicit, structurally different renderers from one shared JSON — neither competitor analyzed produces both a designed and an ATS-safe output from a single source |
| Validation/error messages | Not documented in the README (undetermined from research) | JSON Schema gives free structural validation, but error messages are schema-validator-generic, not resume-domain-specific | Not documented (undetermined) | Domain-specific, human-readable messages naming the missing resume section — a clear differentiation opportunity given none of the three competitors clearly do this well |
| Secrets/API key handling | N/A — no AI parsing step, so no key to manage | N/A — same | N/A — same | Only cvgen has this concern, since it's the only tool in this set using an LLM parse step; env-var-only handling is the correct baseline given the public-repo constraint |

## Sources

- [codysnider/resume — ATS-Friendly Markdown-to-PDF Resume Generator](https://github.com/codysnider/resume) — MEDIUM confidence (README-derived via WebFetch, code not inspected directly)
- [nietaki/markdown-resume](https://github.com/nietaki/markdown-resume), [davidbradway/resume](https://github.com/davidbradway/resume), [there4/markdown-resume](https://github.com/there4/markdown-resume), [c0bra/markdown-resume-js](https://github.com/c0bra/markdown-resume-js), [irvj/resume-generator](https://github.com/irvj/resume-generator) — LOW-MEDIUM confidence (surfaced via WebSearch, not individually verified beyond search summaries)
- [JSON Resume Schema](https://jsonresume.org/schema) — HIGH confidence (official schema documentation, fetched directly)
- [JSON Resume Documentation](https://docs.jsonresume.org/schema) — HIGH confidence (official docs, referenced in search)
- [Claude API — Structured Outputs](https://docs.claude.com/en/docs/build-with-claude/structured-outputs) — HIGH confidence (official Anthropic documentation)
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev) — HIGH confidence (widely-cited canonical CLI UX reference, fetched directly)
- ATS-friendliness research (fonts, single-column, tables, hidden text): [Jobscan — Anatomy of an ATS Friendly Resume Format](https://www.jobscan.co/blog/20-ats-friendly-resume-templates/), [Jobscan — Resume Keyword Stuffing](https://www.jobscan.co/blog/resume-keyword-stuffing/), [Scale.jobs — PDF vs Word Resume](https://scale.jobs/blog/pdf-vs-word-resume-format-ats-reads-correctly), [Cangrade — White Fonting](https://www.cangrade.com/blog/talent-acquisition/white-fonting-what-it-is-why-its-risky-and-how-employers-should-respond/), [Yotru — Hidden Text in Resumes / AI Prompt Injection](https://yotru.com/blog/hidden-text-resume-prompt-injection-ats) — MEDIUM confidence (career-advice/vendor-blog sources, consistent across multiple independent sources, no primary ATS-vendor technical documentation found)
- Puppeteer PDF rendering gotchas: [Latenode — Puppeteer HTML to PDF Style Configuration](https://latenode.com/blog/converting-html-to-pdf-with-puppeteer-style-configuration-and-pagination), [DEV Community — Page Break Nightmare](https://dev.to/resumemind/htmlcss-to-pdf-how-i-solved-the-page-break-nightmare-mdg) — MEDIUM confidence (community/blog sources, consistent with general Puppeteer PDF documentation)
- CLI secrets/env-var handling: [GitHub Community Discussion — API keys in public repos](https://github.com/orgs/community/discussions/169652), [dwyl/learn-environment-variables](https://github.com/dwyl/learn-environment-variables) — MEDIUM confidence, consistent with clig.dev's own configuration guidance (HIGH)

---
*Feature research for: AI-assisted resume-generator CLI (cvgen)*
*Researched: 2026-07-27*
