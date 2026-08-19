---
quick_id: 260819-ky9
date: 2026-08-19
status: complete
commit: 898ff4d
scope: handoff steps 3-5
---

# Summary — 260819-ky9

Steps 3-5 done. Extraction now works end to end from the master markdown.

## The headline finding: extraction was broken before this task

The first run against the live API failed with `Schema is too complex` — a 400
that takes roughly 30 seconds to come back. This was not a pre-existing
condition; the schema work in 260819-kkx pushed it over the limit. It would have
blocked any real use of cvgen.

Two distinct API limits are in play, and both cost a live 400 to discover:

| Error | Cause |
|---|---|
| `Schema is too complex.` | Total schema weight |
| `Grammar compilation timed out.` | Too many **optional** properties — each multiplies the constrained-decoding grammar |

The second was the real driver. Making `role` required (empty-string convention,
as the original schema had it) was what finally got a request through.

## What changed

**Schema split** (`src/schema/resume.ts`) — `ResumeSchema` remains the full
contract for validation, typing, and rendering. New `ExtractionResumeSchema` is
a lean twin sent to the API, dropping `type` and `caseStudy`. Both are optional
in `ResumeSchema`, so extraction output still validates. Nothing was deleted
from the product; hand-authored JSON can still use those fields.

**Required-with-empty-string** for `role`, `industry`, `via`, `location` in the
extraction schema. This fixed two problems at once: it shrank the grammar, and
it fixed recall. As optional fields the model returned **none** of them across
two full runs — it simply skips optionals. Empty string is falsy, so the
templates' `exp.industry ? ... : ""` checks treat it exactly like absent.

**System prompt** (`src/lib/extract.ts`) — descriptions alone were not enough.
The prompt now explains how to split the pipe-separated meta line into dates,
location, and the `Industry:` label; that parentheticals fill `via` without
their dates; and that career breaks with no role and no bullets are still
entries. Before that last rule, Parental Leave was dropped from the output.

**Master markdown** — Norton's two bullets added; `Industry:` labels added to
all eight entries that have one; parenthetical casing aligned to the approved
render (`Client engagement`, `Advisory engagements`, `Concurrent contracts`).

**Complexity-budget test** (`src/lib/extract.test.ts`) — asserts `$defs <= 12`,
bytes `<= 4000`, and that the four fields stay required. The next added field
now fails locally instead of against a live 400 thirty seconds in.

## Verification

| Gate | Result |
|---|---|
| Extraction completes | PASS |
| Experience entries | 8/8, source order |
| Nesting (no double-dipping) | PASS — both engagements under Studio Cartelli |
| Bullet counts vs fixture | PASS, all entries |
| industry/via/location vs fixture | 15/15 after the casing fix |
| headline, selectedWork | PASS |
| Designed PDF | 2 pages, 0 em dashes, 10 en dashes |
| ATS PDF | 2 pages, 0 em dashes, 10 en dashes |
| Test suite | 66/66 |

## Open items for Patrick

1. **Two industry labels were never line-item verified.** The handoff flagged
   Vividly = "CPG trade promotion" and Signafire = "Intelligence analytics" as
   session inferences. They are now written into the master and will print on
   every resume. Worth a read.
2. **Dates print as full month names** ("January 2026 – Present") because the
   master spells them out, while the approved render used abbreviations
   ("Jan 2026"). Still 2 pages either way. Changing it means editing the master.
3. **Phone renders as `+1-555-010-1234`** (hyphens, from the frontmatter) where
   the approved render showed spaces. The master's own contact line uses spaces;
   extraction takes the frontmatter value.
4. `type` and `caseStudy` are now unreachable by extraction. They still validate
   and render from hand-authored JSON, but no markdown convention feeds them.
