---
phase: 02
slug: markdown-to-structured-json-extraction
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-30
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| markdown file → extractResume | User-provided markdown crosses into API request body | Resume text (user's own data) |
| ANTHROPIC_API_KEY env var → Anthropic client | Secret loaded from process.env at client construction | API key (high sensitivity) |
| Claude API response → ResumeData return | Untrusted upstream response validated by zodOutputFormat + ResumeSchema | Structured JSON |
| process.argv → CLI | Untrusted CLI input (file paths, flags) crosses into the process | File path, flag strings |
| filesystem → CLI | User-provided markdown file read into memory | Resume text |
| Claude API response → stdout | Structured output printed via JSON.stringify for --validate-only mode | ResumeData JSON |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-01 | Tampering | Claude API response → return value in src/lib/extract.ts | mitigate | `zodOutputFormat(ResumeSchema)` validates response; `parsed_output === null` guard throws before returning malformed data. Verified: 2 matches each in extract.ts. | closed |
| T-02-02 | Information Disclosure | ANTHROPIC_API_KEY handling in src/lib/extract.ts | mitigate | `new Anthropic()` with no explicit key arg; SDK reads env at construction. Zero `console.log(process.env.*KEY*)` calls in extract.ts. | closed |
| T-02-03 | Tampering | User-provided markdown → Claude prompt (prompt injection) | accept | See Accepted Risks Log | closed |
| T-02-04 | Information Disclosure | Test fixtures committed to public repo | mitigate | `fixtures/sample-resume.md` uses fictional "Alex Rivera" persona with example.com email and (555) 000-0000 phone. No real PII. Verified: all three markers confirmed in fixture. | closed |
| T-02-SC | Tampering | npm install supply chain (Plans 01 & 02) | mitigate | No new dependencies added in either plan. @anthropic-ai/sdk@0.115.0 and zod@4.4.3 audited in Phase 2 research (RESEARCH.md Package Legitimacy Audit). | closed |
| T-02-05 | Information Disclosure | ANTHROPIC_API_KEY leakage via CLI logging in src/cli/index.ts | mitigate | Zero `console.log(process.env.*KEY*)` calls in cli/index.ts. Error messages reference variable name only, never value. `new Anthropic()` owned by extract.ts; cli/index.ts has no direct key handle. | closed |
| T-02-06 | Denial of Service | Unbounded markdown file read via readFile | accept | See Accepted Risks Log | closed |
| T-02-07 | Elevation of Privilege | User-provided filePath → resolve() path traversal | accept | See Accepted Risks Log | closed |
| T-02-08 | Tampering | preflightCheck bypass by malformed markdown | mitigate | Preflight is defense-in-depth per D-E01. Even if bypassed, zodOutputFormat + ResumeSchema catches invalid structure downstream (T-02-01 layered coverage). Verified: preflightCheck (2 calls in cli/index.ts) + zodOutputFormat (2 calls in extract.ts). | closed |
| T-02-09 | Repudiation | User claims they didn't run cvgen | accept | See Accepted Risks Log | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-03 | Resume is the user's own document (single-user CLI); output is schema-constrained (zodOutputFormat rejects out-of-schema responses); no downstream code execution based on Claude output. Content invention/rewriting is out-of-scope per REQUIREMENTS.md. Risk is low-value and residual. | pat (per PLAN.md disposition) | 2026-07-28 |
| AR-02-02 | T-02-06 | Single-user local CLI; the user reads their own resume file. Node's readFile errors naturally on files exceeding memory. Size cap adds friction with no security benefit for a personal tool per PROJECT.md scope. | pat (per PLAN.md disposition) | 2026-07-28 |
| AR-02-03 | T-02-07 | Local CLI running as the invoking user with existing filesystem permissions. resolve() normalizes but does not sandbox — sandboxing would break the legitimate use case. No privilege boundary is crossed. | pat (per PLAN.md disposition) | 2026-07-28 |
| AR-02-04 | T-02-09 | No audit/telemetry requirement per PROJECT.md ("Telemetry/analytics/phone-home" explicitly out-of-scope). Not applicable to a personal tool. | pat (per PLAN.md disposition) | 2026-07-28 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-30 | 10 | 10 | 0 | gsd-secure-phase (automated grep verification) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-30
