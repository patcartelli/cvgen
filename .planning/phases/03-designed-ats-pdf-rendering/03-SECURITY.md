---
phase: 03
slug: designed-ats-pdf-rendering
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-30
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Resume string fields → HTML template | Candidate-authored strings (bullets, company names) interpolated into HTML | Resume text (low sensitivity, user's own data) |
| Puppeteer → Google Fonts CDN | Outbound network call from headless Chrome during designed render | CSS URL only (no resume data) |
| npm registry → local machine | puppeteer + pdf-parse execute install-time code; puppeteer downloads Chromium binary | Package code (supply chain) |
| Rendered ATS PDF bytes → pdf-parse | Test consumes PDF bytes from our own renderer | Extracted text (functional check) |
| Test process → Puppeteer / Chromium | Same-process trust boundary as plan 01 | No new exposure |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-03-01 | Tampering | HTML template interpolation in designedHtmlTemplate / atsHtmlTemplate | mitigate | `escapeHtml()` called 24 times in render.ts; 0 raw `${data.*}` / `${resume.*}` interpolations detected. All resume string values routed through 5-replacement helper (`&` first). | closed |
| T-03-02 | Information Disclosure | Google Fonts CDN fetch | accept | See Accepted Risks Log | closed |
| T-03-03 | Denial of Service | Puppeteer launch failing on Chromium missing | mitigate | Full `puppeteer@25.4.0` installed (not puppeteer-core); postinstall downloads matched Chromium. Verified: `npm ls puppeteer` reports 25.4.0. | closed |
| T-03-SC | Tampering | npm install supply chain (puppeteer + pdf-parse) | accept | See Accepted Risks Log | closed |
| T-03-04 | Tampering | ATS template producing text out of reading order | mitigate | render.test.ts contains 5 `indexOf` ordering assertions across section anchors (name → email → experience → education → skills). A regression that reorders ATS HTML fails tests loudly. | closed |
| T-03-05 | Information Disclosure | Hidden / near-invisible text in ATS PDF | accept | See Accepted Risks Log | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-02 | Loading Inter from fonts.googleapis.com is locked decision D-D02. Only data leaked is the CSS URL itself (no resume data). Acceptable for a personal CLI. Fallback (self-hosted Inter) deferred to v2. | pat (per PLAN.md disposition) | 2026-07-28 |
| AR-03-02 | T-03-SC | puppeteer (13yr, 11.4M weekly downloads) and pdf-parse (8yr, 6.7M weekly downloads) are well-known packages. Slopcheck was unavailable at research time. No blocking checkpoint required for these widely-documented packages. | pat (per PLAN.md disposition) | 2026-07-28 |
| AR-03-03 | T-03-05 | Hidden text detection requires OCR + font-color analysis — not automatable at Phase 3 scope. Human checkpoint (Task 2 step 4) confirmed no hidden text tricks present via visual review of ATS PDF. | pat (per PLAN.md disposition + UAT approval 2026-07-28) | 2026-07-28 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-30 | 6 | 6 | 0 | gsd-secure-phase (automated grep verification) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-30
