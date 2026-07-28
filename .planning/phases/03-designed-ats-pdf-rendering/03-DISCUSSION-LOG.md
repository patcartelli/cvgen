# Phase 3: Designed & ATS PDF Rendering - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-28
**Phase:** 3-Designed & ATS PDF Rendering
**Areas discussed:** Designed PDF visual style, ATS-clean output character, Output file placement & slug, Rendering test strategy

---

## Designed PDF Visual Style

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal / modern | Clean whitespace, geometric sans-serif, one subtle accent color | ✓ |
| Classic / editorial | Serif body font, strong typographic hierarchy, no color accents | |
| Hybrid | Sans-serif headers, serif or neutral body, minimal accent use | |

**User's choice:** Minimal / modern

| Option | Description | Selected |
|--------|-------------|----------|
| System fonts only | Use system-ui / -apple-system / Helvetica Neue / Arial | |
| Google Fonts via @import | Load font from Google's CDN; Puppeteer fetches at render time | ✓ |
| Locally-bundled web font | Bundle a .woff2 file in the repo; zero network dependency | |

**User's choice:** Google Fonts via @import

| Option | Description | Selected |
|--------|-------------|----------|
| Inter | De facto modern sans-serif — Linear, Vercel, Stripe; weights 300–700 | ✓ |
| DM Sans | Slightly warmer/softer than Inter | |
| You decide | Any well-hinted sans-serif from Google Fonts | |

**User's choice:** Inter

| Option | Description | Selected |
|--------|-------------|----------|
| One subtle accent — Claude picks | Muted color on name and/or section headers; Claude selects | ✓ |
| Strict black-on-white | No color; typographic weight and spacing do all the work | |
| I have a specific color | User would specify hex or color name | |

**User's choice:** One subtle accent — Claude picks the color

---

## ATS-clean Output Character

| Option | Description | Selected |
|--------|-------------|----------|
| Clean but structured | System-safe font, bold section headers, generous spacing, black only | ✓ |
| Pure plaintext styling | No bold, no indent, ALL CAPS section headers — maximum ATS compatibility | |
| You decide | Claude picks austerity level that satisfies RENDER-02 and criterion #3 | |

**User's choice:** Clean but structured

| Option | Description | Selected |
|--------|-------------|----------|
| Arial | Most widely recognized ATS-safe; available everywhere | ✓ |
| Times New Roman | Traditional resume font; good ATS compatibility but dated | |
| You decide | Claude picks from standard ATS-safe font stack | |

**User's choice:** Arial

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — clearly different | Different font, no accent, plainer layout; immediately distinguishable | ✓ |
| Subtly different | Same structure, just no colors; may be hard to tell apart | |

**User's choice:** Yes — clearly different from designed PDF at a glance

---

## Output File Placement & Slug

| Option | Description | Selected |
|--------|-------------|----------|
| Same directory as input .md file | Output lands next to the source note in ~/vault/ | ✓ |
| Current working directory (CWD) | PDFs land wherever cvgen was invoked from | |
| Fixed ./output/ folder | Creates ./output/ relative to CWD; easy to gitignore | |

**User's choice:** Same directory as input .md file

| Option | Description | Selected |
|--------|-------------|----------|
| Input filename stem | my-resume.md → my-resume-resume.pdf / my-resume-resume-ats.pdf | ✓ |
| contact.name from extracted JSON | alex-rivera-resume.pdf; requires extraction to succeed first | |
| You decide | Claude picks a sensible slug strategy satisfying RENDER-03 | |

**User's choice:** Input filename stem

---

## Rendering Test Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Automated test using pdf-parse | Vitest test: render ATS PDF, extract text, assert content in order | ✓ |
| Manual verification step in plan | Human step: pdftotext + visual inspection; no automated test | |
| You decide | Claude picks approach with least friction given test setup | |

**User's choice:** Automated test using pdf-parse

| Option | Description | Selected |
|--------|-------------|----------|
| ATS PDF only | Designed PDF correctness verified manually (visual) | ✓ |
| Both | Add smoke test for designed PDF (file non-empty + correct filename) | |
| You decide | Claude picks coverage level balancing confidence with complexity | |

**User's choice:** ATS PDF only — designed PDF verified manually

---

## Claude's Discretion

- Specific accent color hex for the designed PDF (tasteful, muted)
- Page margins, line heights, and section spacing for both PDFs
- HTML template structure (template literal function preferred for co-location)
- Puppeteer launch options and PDF print settings (format, `printBackground`, margins)
- Exact function signatures for `renderDesigned` and `renderAts` exports

## Deferred Ideas

None — discussion stayed within phase scope.
