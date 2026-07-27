# Requirements: cvgen (Resume Generator)

**Defined:** 2026-07-27
**Core Value:** Running the CLI against a markdown resume note reliably produces a portfolio-quality PDF and a separate ATS-safe PDF — without the user touching a template or text editor.

## v1 Requirements

### CLI

- [ ] **CLI-01**: User can run `cvgen <path-to-markdown-file>` and get both output PDFs written to disk
- [ ] **CLI-02**: CLI validates the input file path exists and is readable, failing with a clear human-readable message (not a raw stack trace) if not
- [ ] **CLI-03**: CLI exits with code 0 on success and non-zero on any failure path
- [ ] **CLI-04**: `cvgen --help` prints usage and an example invocation

### Schema

- [ ] **SCHEMA-01**: A Zod schema defines the structured resume data contract (contact, summary, experience, education, skills) that parsing and both renderers depend on

### Parsing

- [ ] **PARSE-01**: CLI parses the markdown resume via Claude's structured-output API into JSON conforming to the schema
- [ ] **PARSE-02**: Extracted JSON is validated against the schema in code before rendering (not just trusted from the API response)
- [ ] **PARSE-03**: When required sections are missing or malformed, the user gets a human-readable error naming the specific missing/malformed section

### Rendering

- [ ] **RENDER-01**: CLI renders a designed single-column typographic PDF from the validated JSON (no images, no multi-column layout)
- [ ] **RENDER-02**: CLI renders a simplified single-column ATS-clean PDF from the same validated JSON — system-safe fonts, no layout tables, no hidden/near-invisible text, real selectable text
- [ ] **RENDER-03**: Output files use predictable, non-destructive names (e.g. `<slug>-resume.pdf` / `<slug>-resume-ats.pdf`) so re-running doesn't silently clobber differently-named prior output

### Secrets

- [ ] **SEC-01**: Claude API key is read only from an environment variable; CLI fails clearly if it's unset and never prompts for or persists the key

### Developer Experience

- [ ] **DEVX-01**: `--validate-only`/`--dry-run` flag runs parsing and validation and prints the extracted JSON without rendering PDFs
- [ ] **DEVX-02**: `--verbose`/`--debug` flag dumps the raw Claude response alongside the validated JSON
- [ ] **DEVX-03**: `cvgen init` generates an example Obsidian note demonstrating the expected frontmatter/heading convention

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Rendering

- **RENDER-V2-01**: Config file for render preferences (margins, page size, ATS-safe font choice)

### Trust

- **TRUST-V2-01**: Section-level parse-confidence/provenance flags (e.g. "inferred `education` from an untitled block")

### Product Direction

- **DIR-V2-01**: Web UI (deferred per STC-138 until clearly scoped)
- **DIR-V2-02**: Job-posting-targeted tailoring

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multi-column layout | ATS research confirms multi-column is a leading cause of parsers reading resume content out of order or skipping sections |
| Image/headshot embedding | User doesn't want images in the resume; also avoids a second render-pipeline concern |
| Job-posting-targeted tailoring | Turns v1 from parse-and-render into reason-about-a-second-document-and-rewrite — a materially larger product |
| Web UI | No web routes exist in v1's output surface; STC-138 locked CLI-only for v1 |
| Hidden/white/near-invisible text keyword stuffing | Modern ATS platforms detect and penalize this; increasingly treated as a prompt-injection vector against AI resume screening |
| Decorative/custom webfonts in the ATS-clean output | Risks unpredictable glyph fallback and broken text extraction; contradicts "ATS-clean" |
| Tables used for resume layout | Confirmed pitfall: ATS parsers can read table cells out of order or skip them even when visually fine |
| Interactive API key prompt or local persistence | Conflicts with the locked env-var-only constraint; a public repo raising this risk even once is a real incident |
| Telemetry/analytics/phone-home behavior | No stated need; adds privacy/scope surface to a personal tool with public source |
| Content invention/embellishment/rewriting by the model | v1's Core Value is parse-and-render, not ghostwrite; altering claims about the user's own work history erodes trust |
| Additional output formats (DOCX, plain-text, HTML export) | Each format is its own render pipeline with its own quirks; not requested, no validated need yet |
| Next.js / Vercel deployment | v1 ships no web routes; a plain TypeScript CLI is sufficient and avoids unneeded toolchain weight (revises STC-138's original stack note) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLI-01 | TBD | Pending |
| CLI-02 | TBD | Pending |
| CLI-03 | TBD | Pending |
| CLI-04 | TBD | Pending |
| SCHEMA-01 | TBD | Pending |
| PARSE-01 | TBD | Pending |
| PARSE-02 | TBD | Pending |
| PARSE-03 | TBD | Pending |
| RENDER-01 | TBD | Pending |
| RENDER-02 | TBD | Pending |
| RENDER-03 | TBD | Pending |
| SEC-01 | TBD | Pending |
| DEVX-01 | TBD | Pending |
| DEVX-02 | TBD | Pending |
| DEVX-03 | TBD | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 0 (pending roadmap creation)
- Unmapped: 15 ⚠️ (expected — roadmapper fills this in next)

---
*Requirements defined: 2026-07-27*
*Last updated: 2026-07-27 after initial definition*
