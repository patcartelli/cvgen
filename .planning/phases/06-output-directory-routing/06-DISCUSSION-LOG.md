# Phase 6: Output Directory Routing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-30
**Phase:** 6-output-directory-routing
**Areas discussed:** Company slug format

---

## Company Slug Format

| Option | Description | Selected |
|--------|-------------|----------|
| Title-Case-Hyphen | "Acme Corp" → Acme-Corp. Matches the success criteria example, readable in Finder/Explorer. | ✓ |
| lowercase-hyphen | "Acme Corp" → acme-corp. Conventional for filesystem paths and URLs. | |
| Verbatim (spaces → underscores) | "Acme Corp" → Acme_Corp. Preserves casing, underscores instead of hyphens. | |

**User's choice:** Title-Case-Hyphen
**Notes:** No additional notes provided.

---

## Special Character Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Strip them | "Goldman & Sachs" → Goldman-Sachs. Ampersands, commas, dots dropped. Always filesystem-safe. | ✓ |
| Replace & with "and" | "AT&T" → AT-and-T. More readable but adds complexity. | |
| Replace with hyphen | "AT&T" → AT-T. Consistent word separator, may look odd for known names. | |

**User's choice:** Strip special characters
**Notes:** No additional notes provided. Edge case (AT&T → ATT) was acknowledged; user indicated readiness to proceed without further discussion.

---

## Claude's Discretion

- **Prompt timing:** After preflight (Step D), before Claude extraction (Step E) — saves API cost if user aborts, while file is already validated
- **PDF filename:** Keep existing stem-based naming within `output/` — directory signals the company, filename stays consistent
- **Prompting library:** Node built-in `readline` — no new dependency

## Deferred Ideas

- `--company "Acme"` non-interactive flag — v2 item per REQUIREMENTS.md
- Configurable output root — not discussed, out of scope for this phase
