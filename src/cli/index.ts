#!/usr/bin/env node
// src/cli/index.ts
// Phase 2 CLI entry: env load + key guard + argv parse + preflight + extract + output routing
// Phase 4 replaces argv parsing with full Commander argument parsing (D-M02).

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { extractResume } from "../lib/extract.js";
import { preflightCheck } from "../lib/preflight.js";

async function main(): Promise<void> {
  // Step A — env load (.env is optional; ANTHROPIC_API_KEY may already be in environment)
  try {
    process.loadEnvFile(".env");
  } catch {
    // .env missing or unreadable — not an error; key may come from the shell environment
  }

  // Step C — argv parse first (D-M02, DEVX-01): show usage before key guard so `cvgen` with no
  // args gives helpful output regardless of whether the key is set.
  const args = process.argv.slice(2);
  const isValidateOnly = args.includes("--validate-only") || args.includes("--dry-run");
  const filePath = args.find((a) => !a.startsWith("--"));

  if (!filePath) {
    console.error("Usage: cvgen <path-to-markdown-file> [--validate-only | --dry-run]");
    process.exit(1);
  }

  // Step B — key guard (SEC-01): fail fast if ANTHROPIC_API_KEY is not set
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "Error: ANTHROPIC_API_KEY is not set. Export it before running cvgen:\n" +
        "  export ANTHROPIC_API_KEY=your-key-here\n" +
        "Or add ANTHROPIC_API_KEY=... to a .env file in the project root.",
    );
    process.exit(1);
  }

  // Step D — read markdown (ENOENT bubbles to main().catch → stderr + exit 1)
  const markdown = await readFile(resolve(filePath), "utf8");

  // Step E — preflight (D-E01 layer 1, PARSE-03): check before burning API tokens
  const preflightErrors = preflightCheck(markdown);
  if (preflightErrors.length > 0) {
    for (const err of preflightErrors) {
      console.error(err.message);
    }
    process.exit(1);
  }

  // Step F — extract (delegates to extractResume which owns the Anthropic client)
  const data = await extractResume(markdown);

  // Step G — output routing (DEVX-01)
  if (isValidateOnly) {
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  }

  console.log("Rendering not yet implemented (Phase 3).");
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
