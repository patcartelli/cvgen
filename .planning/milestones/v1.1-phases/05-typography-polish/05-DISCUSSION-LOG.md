# Phase 5: Typography Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-30
**Phase:** 5-typography-polish
**Areas discussed:** Bullet color scope, Summary header spacing, Summary font size

---

## Bullet Color Scope

### Q1: Color scope — marker or full text?

| Option | Description | Selected |
|--------|-------------|----------|
| Marker only (li::marker) | Colored disc, text stays muted gray. Subtler — the color accent is the dot, not the content. | ✓ |
| Full text (li) | Both disc and text go navy. More prominent. | |
| You decide | Claude picks the option that best matches the existing design system tone. | |

**User's choice:** Marker only (`li::marker`) — subtle accent on the disc, gray text.

### Q2: CSS variable or hardcoded?

| Option | Description | Selected |
|--------|-------------|----------|
| CSS variable (--bullet: #2d4a6b) | Consistent with existing --accent, --text, --muted, --border pattern. | ✓ |
| Hardcoded inline | Simpler diff — just li::marker { color: #2d4a6b }. | |

**User's choice:** CSS variable `--bullet: #2d4a6b` in `:root`.
**Notes:** Follows the existing variable convention.

---

## Summary Header Spacing

### Q1: All headers at 24px or Summary stays at 4px?

| Option | Description | Selected |
|--------|-------------|----------|
| All headers — Summary too (24px everywhere) | Strict reading of 'every section header.' | |
| Content sections only (Summary stays 4px) | Summary's prose benefits from tight spacing. | |
| You decide | Claude applies whichever creates most consistent rhythm. | |

**User's choice (freeform):** "The section header should have 4px space between that and the next content" — clarified that 4px is the target, not 24px. This means the fix TIGHTENS the Experience section gap (from 24px to 4px) AND adds the missing gap to Education and Skills.

### Q2: Confirm — 4px everywhere including tightening Experience?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — 4px everywhere, including Experience (tighten it) | Consistent and compact. | ✓ |
| No — 4px only where spacing is currently 0 | Keep Experience as-is. | |
| Clarify freeform | Implementation-specific. | |

**User's choice:** Yes — 4px everywhere.
**Notes:** Experience inter-entry spacing (24px between individual jobs) is unaffected. Only the gap between the section header and the first entry below it changes.

---

## Summary Font Size

### Q1: Target size for summary text?

| Option | Description | Selected |
|--------|-------------|----------|
| 12px — match other small elements | Consistent with existing scale: body=14px, small=12px. | ✓ |
| 13px — slightly smaller but more readable | Compromise for multi-sentence prose. | |
| Something else | Specify a different target. | |

**User's choice:** 12px — consistent with the existing "small" tier.

---

## Claude's Discretion

- **Summary line-height at 12px:** Whether to keep the inherited 21px (matching `.competencies`) or reduce to 18px (matching `li`). Either is acceptable; planner decides from visual output.

## Deferred Ideas

None — discussion stayed within phase scope.
