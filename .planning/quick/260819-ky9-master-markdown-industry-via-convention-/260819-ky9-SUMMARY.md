---
quick_id: 260819-ky9
date: 2026-08-19
status: complete
commits: 898ff4d, edcc0ff, 3a20ff2
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

## Follow-up decisions (resolved 2026-08-19)

1. **Industry labels verified and corrected by Patrick.** RESOLVED. Four of the
   eight were rewritten in the master:
   - Vividly: "CPG trade promotion" -> "Trade promotion management"
   - Signafire: "Intelligence analytics" -> "Data analytics"
   - Dataminr: "Risk & crisis intelligence" -> "Event, threat & risk
     intelligence" (verbatim from Dataminr's own positioning)
   - Wellhub: "Corporate wellness" -> "Corporate wellbeing platform"

   Note on Wellhub: the label describes the company as it is today. During
   Patrick's 2019-2020 tenure it was Gympass, closer to a corporate gym benefit;
   the rebrand and the broader wellbeing expansion both came in 2024. Chosen
   deliberately, since the master lists the company under its current name.

   Case convention: sentence case, matching the approved render. Confirmed and
   left as-is 2026-08-19 — the company name beside it is already distinguished
   by size, weight, and colour, so sentence case keeps the industry reading as a
   description rather than part of the name. Title case is reserved for section
   headers and rail labels.
2. **Full month names confirmed as the standard.** No code change needed, the
   master already spells them out. The committed acceptance fixture did not, so
   it was guarding output nobody ships; all 18 of its date values and the
   en-dash assertion were expanded to match (edcc0ff). Still exactly 2 pages.
3. **Hyphenated phone accepted** as-is. No change.
4. **`type` and `caseStudy` removed entirely** (3a20ff2). Neither could be
   populated from markdown, and both carried schema weight plus template
   branches for nothing. `type` was redundant with `via`; `caseStudy` was
   redundant with the header-level `selectedWork`. CaseStudySchema survives
   because selectedWork uses it. Re-verified end to end after removal.
