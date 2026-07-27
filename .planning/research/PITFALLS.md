# Pitfalls Research

**Domain:** Obsidian-native resume generator CLI (Claude-based markdown→JSON extraction, Puppeteer HTML→PDF rendering, public-repo secret handling, dual designed/ATS PDF output)
**Researched:** 2026-07-27
**Confidence:** MEDIUM-HIGH (Claude structured-output and secret-handling findings verified against official docs and GitHub issue threads; Puppeteer findings verified against maintainer issue threads; ATS-parsing findings are industry-consensus but no single authoritative spec exists since ATS internals are proprietary and vary by vendor)

## Critical Pitfalls

### Pitfall 1: Prompt-only JSON extraction ("please return JSON") silently breaks on real-world markdown

**What goes wrong:**
Claude returns near-JSON that isn't quite parseable: wrapped in a ```json code fence, prefixed with "Here is the extracted resume data:", trailing commas, or a value substituted for `null` as the string `"null"`. `JSON.parse()` throws, and because this is a CLI invoked directly by the user (not a service with retries and monitoring), the failure is a raw stack trace with no actionable message.

**Why it happens:**
Plain prompting ("respond only in JSON") is the weakest of the three reliability tiers Anthropic itself documents (prompt-only, prefill, tool-use/structured-outputs) and is explicitly called out as "prototype-only, least reliable for production." Developers reach for it first because it requires no schema/tool definition, and it appears to work in the first 5-10 manual tests against clean input.

**How to avoid:**
Use Claude's tool-use pattern with `tool_choice` forced to a single extraction tool, or the newer native Structured Outputs / JSON Schema mode, rather than prompt-only JSON. This constrains token generation to the schema (not just "ask nicely") and gets near-100% schema-valid output. Layer a runtime validator (Zod or similar) on the response as a second gate — schema-conformant JSON can still contain semantically wrong data (see Pitfall 2), so validate types/enums/required fields even when using structured outputs.

**Warning signs:**
Any code path that does `JSON.parse(response.trim())` with a regex strip of ```` ```json ```` fences, or that catches `SyntaxError` and just logs "failed to parse, try again" without capturing the raw response for debugging.

**Phase to address:**
Parsing/extraction phase (the phase that first calls the Claude API) — build the tool-use schema and validator before any rendering work depends on its output shape.

---

### Pitfall 2: Hallucinated or reformatted fields that are valid JSON but wrong data

**What goes wrong:**
Structured-outputs/tool-use guarantees *shape* compliance, not *content* accuracy. Claude may: normalize "Jan 2021 – Present" into an ISO date and silently invent a month for a year-only entry ("2021" → "2021-01"); merge two bullet points into one; drop a skill it judged "redundant"; or invent a job title variant that sounds more standard than what's actually in the note. Because the output still parses as valid JSON matching the schema, this class of error is invisible to schema validation and only shows up as wrong text on the rendered PDF.

**Why it happens:**
LLMs are optimized to produce plausible, well-formed output — when the source markdown is ambiguous (unlabeled date ranges, inconsistent bullet nesting, abbreviations), the model fills gaps with its best guess rather than surfacing the ambiguity. Developers test with a single clean personal resume and don't hit the edge cases (multiple date formats, an entry with no end date, nested sub-bullets) until much later.

**How to avoid:**
Design the Obsidian note's expected structure (frontmatter + heading conventions, per PROJECT.md's "designed fresh" decision) to be as unambiguous as possible — explicit `start`/`end` fields or a single consistent date format convention, documented in the note template itself. Keep the JSON schema close to the source structure (don't ask Claude to infer ISO dates from prose if you can instead ask it to extract the literal date string verbatim and normalize it in a small deterministic post-processing function in code, not in the prompt). Add a "verbatim extraction" instruction in the system prompt (extract text as written, do not paraphrase or summarize) and spot-check a rendered PDF against the source note before treating extraction as done.

**Warning signs:**
Rendered PDF text that reads slightly more polished/generic than the source note; dates that look suspiciously round; bullet counts that don't match between note and PDF.

**Phase to address:**
Parsing/extraction phase for the schema/prompt design; a later "verify" or manual QA step (even a simple diff-style CLI flag that prints extracted JSON next to source headings) should be considered before calling extraction "done."

---

### Pitfall 3: Full re-parse on every CLI invocation — cost, latency, and non-determinism compound

**What goes wrong:**
Every run of the CLI (including re-running just to tweak PDF styling, or running twice because the first PDF had a typo) re-sends the full resume markdown to the Claude API, incurring API cost and 2-10+ seconds of latency, and — because LLM output is not perfectly deterministic even at temperature 0 — the JSON can differ slightly between two runs against an unchanged source file, causing the PDF to shift for no visible reason.

**Why it happens:**
It's the simplest thing to build first: read file → call Claude → render. Caching/staleness logic feels like premature optimization for a "personal tool," so it's deferred and often never added.

**How to avoid:**
Cache the extracted JSON keyed on a hash of the source markdown content (and prompt/schema version). Skip the Claude call entirely when the hash matches the last run, and only re-parse when the note changed. This also makes rendering-only iterations (PDF styling changes) instant and free. Anthropic's prompt caching feature can additionally reduce cost/latency for the system-prompt/schema portion of the request on the (rarer) cases where re-parsing is genuinely needed. Store the cache alongside the generated output (e.g., a `.cvgen-cache.json` next to the PDFs) so `--force-reparse` is an explicit opt-in, not the default.

**Warning signs:**
Every `cvgen` invocation takes several seconds even when only iterating on PDF CSS; two consecutive runs on an unmodified note produce byte-different JSON or subtly different PDFs.

**Phase to address:**
Parsing/extraction phase should establish the cache-by-content-hash pattern as part of initial CLI wiring, not bolted on later — retrofitting a cache after the render pipeline already assumes "always re-parse" tends to require touching every call site.

---

### Pitfall 4: Puppeteer/Chromium install friction breaks "clone and run" for a portfolio-piece CLI

**What goes wrong:**
`puppeteer` bundles a full Chromium download on `npm install` (100+ MB), which fails or times out in restricted network environments, and Puppeteer's bundled Chromium version compatibility shifts across major versions (some versions moved from Chromium-based revisions to a "puppeteer-core + separately managed browser" model). A recruiter or visitor cloning the public portfolio repo to try it, on a machine with a locked-down npm registry mirror or M-series Mac without matching prebuilt binaries, hits an opaque `Failed to launch the browser process` error with no obvious fix.

**Why it happens:**
Puppeteer's default install behavior (auto-download a pinned Chromium build) is convenient for the author's own machine, where it's already cached, but this is exactly the kind of assumption that breaks for a fresh clone — and this project is explicitly a public portfolio artifact, so first-run experience for a stranger matters more here than for an internal tool.

**How to avoid:**
Pin the Puppeteer version explicitly (don't float on `^`) so the Chromium revision is reproducible. Document the expected Node version and that `npm install` needs network access to download Chromium (or provide a `PUPPETEER_SKIP_DOWNLOAD` + system-Chrome path as a documented fallback for restricted environments). Launch with `--disable-dev-shm-usage` (avoids a common crash on memory-constrained containers) and `--no-sandbox` only if actually needed for the target CI environment (document why, since disabling the sandbox is a real security tradeoff, not just boilerplate). Add a smoke-test script that just launches Chromium and exits, so install problems surface immediately as "browser won't launch" rather than deep inside a resume-rendering stack trace.

**Warning signs:**
`npm install` takes unusually long or fails silently on Chromium download; PDF generation fails only in CI or only on certain contributors' machines but works locally for the author.

**Phase to address:**
Rendering/PDF phase — establish the launch configuration and document install requirements in the README as part of first getting Puppeteer working, not after the renderer is "done."

---

### Pitfall 5: Font embedding and inconsistent rendering across OSes make the "designed PDF" look different than intended

**What goes wrong:**
Headless Chromium's PDF font embedding differs from what a human expects from a design tool: web fonts loaded via `@font-face`/Google Fonts may not have finished loading before `page.pdf()` fires, producing a fallback-font PDF; custom fonts can embed with subsetting quirks that some PDF viewers (notably Acrobat) render as blotchy or missing glyphs even though Chrome's own preview looks fine; and the exact same HTML/CSS can render with different font metrics/kerning on macOS vs. Linux CI because the system font fallback chain differs when the intended font isn't installed on the rendering machine.

**Why it happens:**
`page.pdf()` is called immediately after `page.setContent()`/navigation resolves, before the browser has actually finished fetching and applying webfonts — this is an async gap that doesn't show up in interactive testing (where you'd notice the flash of unstyled font) but silently ships a wrong-font PDF in an unattended CLI run. Additionally, developers test only on their own dev machine (one OS, one set of installed fonts) and never render from a clean container until much later, by which point the CSS is full of assumptions about a locally-installed font.

**How to avoid:**
Bundle the actual font files in the repo (as `@font-face` `url()` pointing at local files, or base64-inlined) rather than relying on system-installed fonts or a network fetch to Google Fonts — this makes rendering deterministic regardless of the machine running the CLI. Explicitly `await page.evaluateHandle('document.fonts.ready')` before calling `page.pdf()`. Test PDF output by opening the generated file in at least two viewers (e.g., macOS Preview and Chrome's own PDF viewer, or Acrobat if available) since font embedding bugs can be invisible in one renderer and obvious in another.

**Warning signs:**
PDF looks correct when the CLI author runs it, but a fresh clone / CI-generated PDF uses a visibly different (system fallback) font; text looks fine on-screen in Chrome's print preview but glyphs are missing/garbled when the PDF is opened in Acrobat.

**Phase to address:**
Rendering/PDF phase — decide on bundled local font files and the fonts-ready wait as part of the initial HTML/CSS template, since retrofitting font bundling after the CSS is written against system fonts means re-auditing every font-family reference.

---

### Pitfall 6: Page-break control is an afterthought, producing PDFs with orphaned headings or split bullet entries

**What goes wrong:**
Without explicit CSS print rules, Chromium's print pipeline will happily break a page mid-way through a job entry — leaving a company name and date alone at the bottom of page 1 with its bullet points starting on page 2, or splitting a single bullet's wrapped text across the page boundary. For a resume — a document reviewers skim in seconds — this reads as sloppy immediately.

**Why it happens:**
Standard web CSS has no print-pagination concerns baked in; developers write the layout CSS for on-screen appearance first (since that's what they see while iterating), and only notice page-break problems once they generate an actual multi-page PDF with real (longer) content — which may not happen until testing with the user's real, longer resume rather than a short placeholder.

**How to avoid:**
Use CSS `break-inside: avoid` (the modern equivalent of `page-break-inside: avoid`) on each logical resume entry (job block, education entry) so Chromium keeps them intact across a page boundary, and `break-after`/`break-before` on section headings paired with `orphans`/`widows` rules to avoid a heading stranded at the bottom of a page. Test page-break behavior specifically with a resume long enough to actually span 2 pages — a single-page test resume will never surface this class of bug.

**Warning signs:**
PDF looks fine for a short 1-page test resume but breaks badly once tested against the user's real (longer, multi-page) resume content.

**Phase to address:**
Rendering/PDF phase — add print-specific CSS (`break-inside`, `orphans`/`widows`) alongside the base layout CSS, and include a multi-page-length fixture in manual/automated testing.

---

### Pitfall 7: API key or personal resume data leaks into the public repo via commit history, examples, or committed test fixtures

**What goes wrong:**
Because this repo is public (per STC-147 / PROJECT.md constraints), a leaked Claude API key is immediately harvestable by scanners the moment it's pushed — GitHub's own secret-scanning and push-protection typically catch well-known key patterns within minutes, but a key doesn't have to be committed directly to leak: it can end up in a `.env` that was `git add -A`'d before `.gitignore` existed, in a shell history pasted into a commit message, in an example config file meant to show the *shape* of config but accidentally containing a real value, or in a Playwright/test fixture that records an actual API request/response including the `x-api-key` header. Separately (and specific to this project), the user's actual resume content — name, employer history, education — is exactly the kind of "test fixture" a developer reaches for when writing example markdown notes or committing a sample output PDF for the README, and once that's public it's permanently searchable.

**Why it happens:**
`.gitignore` is usually added after the first commit, not before, so an early `.env` or `.dev.vars`-style file is already tracked before it's ignored (adding to `.gitignore` does not untrack already-committed files). Test fixtures captured by recording a real API call (VCR-style cassettes, Playwright HAR files) are a very common accidental-secret vector because the developer's mental model is "this is just test data," not "this is a live credential."

**How to avoid:**
Add `.gitignore` (covering `.env`, `.env.*`, any `.dev.vars`-equivalent) as the very first commit in the scaffold phase, before any real config file is created. Commit a `.env.example` with placeholder values only. Enable GitHub secret scanning + push protection on the repo (on by default for public repos, but verify it's not been dismissed). Add a pre-commit hook (gitleaks or equivalent) so a leak is caught locally before it ever reaches GitHub, not after. For any committed example note or sample PDF, use clearly fictional data (a placeholder name/company), never the user's real resume content, even for "just a demo." If a key or real data is ever committed, treat `.gitignore`-after-the-fact as insufficient — the secret must be rotated (key) or the history rewritten (BFG/filter-branch) and force-pushed, since deleting the file in a later commit leaves it recoverable from history.

**Warning signs:**
`git log --all --full-history -- .env` (or equivalent) returns any hits; any committed file diff contains a string matching `sk-ant-` or similar key prefix; example/fixture files contain the user's real name/employer rather than obviously placeholder data.

**Phase to address:**
Scaffold phase — `.gitignore`, `.env.example`, and secret-scanning/pre-commit setup must exist before the first API-key-touching code is written, since this is a public repo from commit zero (no "make it private first, clean up later" grace period applies).

---

### Pitfall 8: The "ATS-clean" PDF silently reintroduces ATS-unfriendly formatting because it shares a renderer with the designed PDF

**What goes wrong:**
Both PDFs render from the same HTML/CSS system by design (one data model, two templates), which is efficient but means any print-time behavior that isn't explicitly template-specific bleeds across: a shared base stylesheet with `column-count` or CSS Grid used for the designed PDF's layout gets partially inherited by the ATS template if selectors aren't fully scoped; a decorative `<header>`/`<footer>` element (even one meant only for page numbers or a subtle rule line) ends up in the ATS DOM and, because ATS parsers frequently ignore or garble header/footer regions, causes real content placed near them to be dropped; or a "simplified" layout still uses a two-column CSS trick (e.g., `float` or `display: flex` with `flex-direction: row` for a date-on-the-right pattern) that looks single-column visually but produces out-of-order text when the underlying PDF text layer is extracted linearly (which is exactly how ATS parsers read it — not visually, but by extracting the text stream and attempting to reconstruct reading order from position).

**Why it happens:**
Developers verify the ATS PDF by *looking* at it (does it look plain and single-column?), not by extracting its text layer and checking read order — but ATS systems don't render the PDF visually, they parse the text stream, so a PDF that *looks* single-column can still have text objects positioned/ordered in a way that reconstructs wrong (this is the single most common gap between "looks ATS-safe" and "is ATS-safe"). Shared-template architecture (good for DRY) makes it easy to add a style meant for the designed PDF (a decorative rule, a subtle table for skills-in-columns) without registering that the ATS template inherits from the same base and now has the same issue.

**How to avoid:**
Verify the ATS PDF by extracting its actual text (e.g., `pdftotext` or `pdf-parse` in Node) and confirming the extracted text reads in the same linear order a human would read the resume — not just eyeballing the rendered page. Keep the ATS template's CSS in a separate, minimal stylesheet rather than "the designed stylesheet with some rules overridden" — an explicit allowlist of properties (font, size, color, margin) is safer than an inherited stylesheet with overrides, because overrides can miss a selector and silently leak a layout property through. Avoid any real HTML `<table>`, CSS `column-count`/`columns`, `float`, or multi-item `flex-direction: row` layout in the ATS template specifically — even a single "date right-aligned on the same line as job title" pattern is a common accidental two-column-equivalent that can extract out of order. Do not use HTML `<header>`/`<footer>` elements or Puppeteer's `headerTemplate`/`footerTemplate` PDF options in the ATS template for any content that carries real resume information (only acceptable use is empty/page-number-only, and confirm that doesn't swallow adjacent content). Confirm this per-render, not once at design time — a future styling tweak to "just the designed PDF" is exactly the kind of change likely to accidentally touch shared CSS.

**Warning signs:**
The ATS PDF *looks* single-column and plain but running a text-extraction tool on it produces jumbled/out-of-order text, merged fields (e.g., job title and date concatenated with no separator), or missing sections; any CSS selector in the ATS template's stylesheet is inherited from (rather than independently declared in) the designed template's stylesheet.

**Phase to address:**
Rendering/PDF phase, specifically the point where the ATS template is built as a sibling to the designed template — establish the "extract and read the text layer" verification step as part of that phase's definition of done, not as a late QA pass. Any later phase that touches shared rendering CSS (e.g., a future style refresh of the designed PDF) should explicitly re-run the ATS text-extraction check as a regression test.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|-----------------|
| Prompt-only "return JSON" instead of tool-use/structured-outputs | Faster to wire up, no schema to define | Non-JSON output crashes CLI on real-world markdown edge cases | Never for the shipped v1 — only acceptable for a first exploratory spike before the real parsing phase |
| Sharing one CSS file between designed and ATS templates with overrides | Less duplication, faster to build both at once | Layout properties silently leak between templates (Pitfall 8) | Never — keep ATS CSS minimal and independently declared |
| Re-parsing markdown via Claude on every CLI run (no cache) | Simplest possible implementation, always "fresh" | Recurring API cost + latency on every invocation, non-deterministic PDF diffs between identical runs | Acceptable only for the very first working prototype; must be replaced with hash-based caching before calling parsing "done" |
| Testing PDFs only with a short single-page placeholder resume | Fast iteration on layout CSS | Page-break bugs (Pitfall 6) and multi-page issues invisible until tested against the user's real, longer resume | Acceptable during initial CSS layout work, but must add a multi-page fixture before considering rendering phase complete |
| Skipping `.gitignore`/secret-scanning setup until "later, once it's working" | Slightly faster initial scaffold | A single early `git add -A` commits `.env`/`.dev.vars` permanently into public history | Never — this is a public repo from commit zero |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Claude API (Anthropic) | Prompt-only JSON parsing with regex fence-stripping | Tool-use with forced `tool_choice` or native Structured Outputs / JSON Schema mode, plus a runtime validator (Zod) |
| Claude API (Anthropic) | Re-sending the full resume + schema/system prompt on every run | Cache extracted JSON by content hash of source markdown; consider Anthropic prompt caching for the static schema/system-prompt portion if re-parsing frequency is genuinely high |
| Puppeteer / headless Chromium | Calling `page.pdf()` immediately after content is set, before webfonts finish loading | `await page.evaluateHandle('document.fonts.ready')` before printing |
| Puppeteer / headless Chromium | Relying on system-installed fonts or a live Google Fonts fetch for the "designed" PDF's typography | Bundle font files locally via `@font-face` `url()` so rendering is deterministic across machines/CI |
| GitHub (public repo) | Assuming `.gitignore` retroactively removes an already-committed `.env` | `.gitignore` only prevents *future* tracking; already-tracked secret files need `git rm --cached` + history rewrite + credential rotation |
| ATS resume parsers | Validating the "ATS-clean" PDF by visual inspection only | Extract the PDF's text layer (`pdftotext`/`pdf-parse`) and confirm linear reading order matches the resume's logical order |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| No content-hash cache on Claude extraction | Every CLI run costs API tokens + several seconds latency even for a pure styling tweak | Cache extracted JSON keyed on markdown content hash + prompt/schema version | Immediately noticeable once iterating on PDF CSS — every render-only change re-triggers a full LLM call |
| Puppeteer launching a fresh browser instance per PDF (designed + ATS) | Doubled Chromium startup cost per CLI invocation (2 launches instead of 1 browser, 2 pages) | Launch one `browser` instance, open two `page`s (or sequential reuse) for the two PDF variants | Not a correctness issue at this project's scale (single-user CLI), but adds a few seconds of unnecessary wall-clock time per run |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Committing `.env` or `.dev.vars`-equivalent before `.gitignore` exists | Live Claude API key harvested from a public repo within minutes of push | Add `.gitignore` as the first commit in the scaffold phase, before any config file is created |
| Committing a "real" API response as a Playwright/test fixture | The captured HTTP fixture may include the `x-api-key` request header or other identifying request metadata | Scrub/redact headers in any recorded fixture; prefer mocked responses over recorded real ones for a public repo |
| Using the user's actual resume (real name, employer, dates) as a demo/example note or sample output PDF committed to the repo | Permanently public personal data (employment history) searchable by anyone, indexed by search engines | Use obviously fictional placeholder data for any committed example note or sample rendered PDF |
| Assuming GitHub secret scanning is a complete safety net | Push protection only recognizes known key formats/patterns; a key issued in an unrecognized format, or a leak inside a base64-encoded blob, can slip through | Add a local pre-commit secret scanner (gitleaks) as a second, format-agnostic layer |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Non-JSON Claude response crashes the CLI with a raw stack trace | User has no idea whether the problem is their markdown, their API key, or a bug | Catch parse/validation failures and print the raw model response + a clear "extraction failed, here's what Claude returned" message |
| Silent hallucinated/paraphrased fields (Pitfall 2) | User doesn't notice their resume text was subtly altered until a recruiter reads the PDF | Offer a `--diff` or verbose mode that shows extracted JSON fields next to the source note for a quick sanity check |
| No indication that the CLI is re-calling the (slow, costly) Claude API vs. using a cache | User doesn't know why one run is instant and another takes 8 seconds, or worries the tool is broken | Print a short status line ("Parsing resume via Claude..." vs. "Using cached extraction, rendering only...") |
| ATS PDF looks visually identical/near-identical to the designed PDF, so user doesn't realize which one to submit where | User submits the wrong PDF to an ATS-gated application portal | Make the two outputs visually distinguishable at a glance (filename convention, and genuinely simplified visual styling, not just "same look, minor tweak") — already a stated requirement in PROJECT.md, worth treating as a hard acceptance check |

## "Looks Done But Isn't" Checklist

- [ ] **Claude extraction:** Often missing handling for markdown edge cases (year-only dates, missing end dates, nested bullets) — verify by testing against a deliberately messy note, not just a clean one
- [ ] **JSON parsing:** Often missing a runtime schema validator (Zod/similar) even when using tool-use/structured-outputs — verify a required field can't come back `null`/wrong-type silently
- [ ] **Designed PDF:** Often missing a `document.fonts.ready` wait before printing — verify by rendering on a clean checkout/container, not just the dev machine where fonts are already cached/installed
- [ ] **Designed PDF:** Often missing print-specific page-break CSS — verify against a genuinely multi-page resume, not a short placeholder
- [ ] **ATS PDF:** Often missing actual text-extraction verification — verify by running `pdftotext`/`pdf-parse` on the output and reading the extracted text order, not just viewing the PDF
- [ ] **Public repo hygiene:** Often missing `.gitignore` coverage added *before* the first real config file, and a pre-commit secret scanner — verify with `git log --all -- .env` (or equivalent) returning nothing
- [ ] **Cost/latency:** Often missing a content-hash cache on the Claude call — verify two consecutive runs on an unchanged note don't re-hit the API

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|-----------------|
| Non-JSON/invalid Claude output in production use | LOW | Add tool-use/structured-outputs + validator; retry loop on validation failure |
| Hallucinated/paraphrased field discovered after PDF sent to an employer | MEDIUM (user-facing, not code) | Add verbatim-extraction system prompt instruction + a diff/verify mode; re-run extraction with cache invalidated |
| API key leaked to public repo history | HIGH | Immediately rotate/revoke the key at the provider, then rewrite git history (BFG/filter-branch) and force-push; treat rotation as the priority step (history rewrite alone is not sufficient if the key was ever live in public) |
| ATS PDF found to extract out-of-order after users have already submitted it | MEDIUM | Rebuild the ATS template with an independent minimal stylesheet (no shared CSS with the designed template) and add the text-extraction regression check going forward |
| No cache, high cumulative API cost noticed later | LOW | Add content-hash cache; no data migration needed since cache is purely derived/regenerable |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|---------------|
| Prompt-only JSON extraction breaks on real input | Parsing/extraction phase | Feed a deliberately messy test note (mixed date formats, missing fields) through the extractor and confirm no parse failure |
| Hallucinated/reformatted fields pass schema validation | Parsing/extraction phase | Manually diff extracted JSON against source note fields for at least one real, non-trivial resume |
| No cache — full re-parse every run | Parsing/extraction phase (initial CLI wiring) | Run the CLI twice on an unchanged note; second run should skip the Claude API call |
| Puppeteer/Chromium install friction | Rendering/PDF phase (+ scaffold README) | Fresh `git clone` + `npm install` + first run on a clean machine/container succeeds without manual intervention |
| Font embedding / cross-OS rendering inconsistency | Rendering/PDF phase | Generate the PDF in CI (Linux) and locally (macOS); compare fonts render identically; open the CI-generated PDF in a second viewer besides Chrome |
| Page-break control missing | Rendering/PDF phase | Render a genuinely multi-page test resume and confirm no entry/heading splits awkwardly across a page boundary |
| Secret/personal-data leak to public repo | Scaffold phase | `.gitignore` + `.env.example` + pre-commit secret scanner exist before any real API key or personal note touches the repo; confirm with `git log --all -- .env`-style check |
| ATS PDF reintroduces unfriendly formatting via shared CSS | Rendering/PDF phase (ATS template build) | Run `pdftotext`/`pdf-parse` on the ATS output and confirm linear text order matches logical resume order; re-run this check any time shared rendering CSS changes |

## Sources

- [Increase output consistency — Claude Platform Docs](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency)
- [Structured outputs — Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Claude API Structured Output: Three Patterns for Guaranteed JSON](https://renezander.com/blog/claude-api-structured-output/)
- [Guaranteed JSON Every Time: Claude's Structured Outputs with JSON Schema](https://apito.ai/en/blog/dev-guides/claude-structured-outputs-json-schema-guide-2026/)
- [Headless Chrome Puppeteer generated PDF does not show some Unicode fonts on Acrobat — puppeteer/puppeteer#3668](https://github.com/puppeteer/puppeteer/issues/3668)
- [Headless PDF printing inconsistent page width and height — puppeteer/puppeteer#2278](https://github.com/puppeteer/puppeteer/issues/2278)
- [Inconsistent text rendering in headless mode — puppeteer/puppeteer#2410](https://github.com/puppeteer/puppeteer/issues/2410)
- [PDF rendering - OpenType font names were not embedded — puppeteer/puppeteer#7401](https://github.com/puppeteer/puppeteer/issues/7401)
- [How to fix Puppeteer font issues — browserless.io](https://www.browserless.io/blog/puppeteer-print)
- [Why HTML to PDF with Puppeteer Keeps Breaking on Serverless](https://html2img.com/articles/puppeteer-html-to-pdf-serverless/)
- [How does GitHub handle exposed secrets or credentials in public repos? — GitHub community discussion](https://github.com/orgs/community/discussions/161907)
- [How can I prevent secrets from being exposed in a public repository? — GitHub community discussion](https://github.com/orgs/community/discussions/187601)
- [Preventing Secret Leaks: GitHub Secret Scanning, Actions, & Best Practices — devactivity.com](https://devactivity.com/posts/development-integrations/beyond-gitignore-mastering-secret-management-for-secure-software-development/)
- [Are Tables ATS Friendly? Why They Break Parsing — Resumemate](https://www.resumemate.io/blog/are-tables-ats-friendly-why-they-break-parsing--5-safe-layouts/)
- [Can ATS Read Tables & Columns? We Tested 8 Systems — CVCraft](https://cvcraft.roynex.com/blog/can-ats-read-tables-columns-formatting-2026)
- [Why ATS Cannot Read Your Resume — loopcv.pro](https://www.loopcv.pro/guides/ats-resume-not-parsed/)

---
*Pitfalls research for: Obsidian-native resume generator CLI (cvgen)*
*Researched: 2026-07-27*
