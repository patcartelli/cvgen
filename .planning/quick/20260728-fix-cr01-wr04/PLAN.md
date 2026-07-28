---
slug: fix-cr01-wr04
created: "2026-07-28T23:26:42Z"
status: complete
files_modified:
  - src/lib/extract.ts
  - package.json
  - package-lock.json
---

# Fix CR-01 + WR-04 from Phase 04 code review

## CR-01
Change ExtractResult.rawResponse from `Message` to `ParsedMessage<ResumeData>`.
ParsedMessage extends Message and adds `parsed_output` as an enumerable property,
so JSON.stringify(rawResponse) in --verbose includes it.

## WR-04
Remove vitest from devDependencies and delete vitest.config.ts.
Consolidate on tsx --test (Node built-in runner) which all tests already use.
