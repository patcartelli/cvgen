---
slug: fix-cr01-wr04
status: complete
completed: "2026-07-28T23:26:42Z"
---

# Fix CR-01 + WR-04 — Complete

**CR-01** — Changed `rawResponse: Message` → `rawResponse: ParsedMessage<ResumeData>` in `ExtractResult`. Import updated from `@anthropic-ai/sdk/resources/messages.js` to `@anthropic-ai/sdk` root. `parsed_output` is now enumerable on the type, so `--verbose` JSON.stringify output is complete.
Commit: `9ba6e1d`

**WR-04** — Ran `npm uninstall vitest`, deleted `vitest.config.ts`. Single test runner: `tsx --test`. 38/38 tests pass.
Commit: `fc9a507`
