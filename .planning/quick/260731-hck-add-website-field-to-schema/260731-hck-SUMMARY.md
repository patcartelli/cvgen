---
quick_id: 260731-hck
slug: add-website-field-to-schema
status: complete
date: 2026-07-31
commit: 8d42e68
---

# Quick Task 260731-hck: Add website field to contact schema

## What was done

Added `website` as an optional field to `ContactSchema`. It is not required by preflight (no breaking change to existing resumes). When present:
- Designed PDF: appears in row 2 alongside linkedin/github as a clickable link
- ATS PDF: included in the contact line (plain text)
- `cvgen init` template: shows `website: yoursite.com` example

## Files changed

- `src/schema/resume.ts` — `website: z.string().optional()`
- `src/lib/render.ts` — website in designed row 2 + ATS contact line
- `src/cli/index.ts` — website example in init template

21/21 tests pass.
