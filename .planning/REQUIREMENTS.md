# Requirements: cvgen (Resume Generator)

**Defined:** 2026-07-30
**Milestone:** v1.1 Typography & Workflow Improvements
**Core Value:** Running the CLI against a markdown resume note reliably produces a portfolio-quality PDF and a separate ATS-safe PDF — without the user touching a template or text editor.

## v1.1 Requirements

### Typography (Designed PDF)

- [x] **TYPO-01**: Designed PDF summary text renders at body-small size (visually smaller than body copy) — closed 2026-07-30
- [x] **TYPO-02**: Designed PDF bullet points are styled with subtle accent color (#2d4a6b) — closed 2026-07-30
- [x] **TYPO-03**: All section headers in the designed PDF have consistent bottom margin (matching the spacing already present under Experience) — closed 2026-07-30

### Output Directory

- [ ] **OUTPUT-01**: CLI asks the user whether the resume is tailored for a specific company; if yes, prompts for the company name
- [ ] **OUTPUT-02**: Both PDFs are written to `output/` (not tailored) or `output/<Company-Name>/` (tailored), relative to cwd, creating the directory if needed

### Quality & Workflow

- [x] **QUAL-01**: `rawResponse` in `ExtractResult` is typed as `ParsedMessage<ResumeData>` so `--verbose` output is complete (CR-01) — closed 2026-07-28
- [x] **QUAL-02**: Test suite runs under a single test runner with no conflicting scripts in package.json (WR-04) — closed 2026-07-28
- [ ] **QUAL-03**: User can install and run `cvgen` as a global command via `npm install -g` or `npm link`

## Future Requirements

### Typography

- Self-hosted Inter font (remove Google Fonts CDN dependency) — v2

### Output

- Non-interactive mode flag (e.g. `--company "Acme"`) to skip prompts in CI/scripts — v2

## Out of Scope

| Feature | Reason |
|---------|--------|
| Web UI | Deferred to v2 per STC-138; v1.x is CLI-only |
| Job-posting-targeted tailoring | Out of scope for v1.x; one note in, two files out |
| Multi-column layouts or images | Keeps ATS PDF machine-readable |
| ATS PDF visual polish | ATS output is intentionally plain; visual changes would undermine machine-readability |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TYPO-01 | Phase 5 | Complete — 2026-07-30 |
| TYPO-02 | Phase 5 | Complete — 2026-07-30 |
| TYPO-03 | Phase 5 | Complete — 2026-07-30 |
| OUTPUT-01 | Phase 6 | Pending |
| OUTPUT-02 | Phase 6 | Pending |
| QUAL-01 | Phase 7 | Complete — 2026-07-28 |
| QUAL-02 | Phase 7 | Complete — 2026-07-28 |
| QUAL-03 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-07-30*
*Last updated: 2026-07-30 — phase assignments added (Phases 5–7)*
