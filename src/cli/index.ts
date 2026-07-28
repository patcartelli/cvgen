#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Command } from "commander";
import puppeteer from "puppeteer";
import { extractResume } from "../lib/extract.js";
import { preflightCheck } from "../lib/preflight.js";
import { renderAts, renderDesigned, resolveOutputPaths } from "../lib/render.js";

const INIT_TEMPLATE = `---
name: Your Name
email: you@example.com
phone: (555) 000-0000
location: City, State
linkedin: linkedin.com/in/yourhandle
github: github.com/yourhandle
---

## Professional Summary
One to three sentences summarizing your background and areas of expertise.

## Core Competencies
Skill One, Skill Two, Skill Three, Skill Four

## Experience
### Job Title at Company Name
Jan 2023 – Present · City, State
- Accomplishment with measurable impact.
- Second bullet point about your contributions.

### Previous Title at Previous Company
Mar 2020 – Dec 2022 · City, State
- What you did and why it mattered.

## Education
### Degree at Institution
2018

## Skills
**Category:** Item, Item, Item
**Category:** Item, Item, Item
`;

const program = new Command();

program
  .name("cvgen")
  .description("Turn an Obsidian markdown resume note into two polished PDFs")
  .version("0.1.0")
  .showHelpAfterError(true)
  .argument("<file>", "path to Obsidian markdown resume note")
  .option("--verbose", "dump raw Claude API response and validated JSON to stderr")
  .option("--validate-only", "extract and validate JSON, skip PDF rendering")
  .option("--dry-run", "alias for --validate-only")
  .addHelpText(
    "after",
    `
Examples:
  cvgen ./my-resume.md
  cvgen ./my-resume.md --verbose
  cvgen ./my-resume.md --validate-only
  cvgen init ./my-resume.md`,
  )
  .action(
    async (file: string, options: { verbose: boolean; validateOnly: boolean; dryRun: boolean }) => {
      // Step A — env load (.env is optional; ANTHROPIC_API_KEY may already be in environment)
      try {
        process.loadEnvFile(".env");
      } catch {
        // .env missing or unreadable — not an error; key may come from the shell environment
      }

      // Step B — key guard
      if (!process.env.ANTHROPIC_API_KEY) {
        program.error(
          "Error: ANTHROPIC_API_KEY is not set. Export it before running cvgen:\n" +
            "  export ANTHROPIC_API_KEY=your-key-here\n" +
            "Or add ANTHROPIC_API_KEY=... to a .env file in the project root.",
        );
      }

      // Step C — read markdown file
      const absPath = resolve(file);
      let markdown: string;
      try {
        markdown = await readFile(absPath, "utf8");
      } catch (err) {
        program.error(
          `Cannot read file: ${absPath} — ${err instanceof Error ? err.message : String(err)}`,
          { exitCode: 1 },
        );
        return;
      }

      // Step D — preflight check
      const preflightErrors = preflightCheck(markdown);
      if (preflightErrors.length > 0) {
        for (const err of preflightErrors) {
          console.error(err.message);
        }
        program.error("Preflight checks failed.", { exitCode: 1 });
      }

      // Step E — extract via Claude
      const { data, rawResponse } = await extractResume(markdown);

      // Step F — verbose output (before validate-only routing)
      if (options.verbose) {
        console.error("--- raw Claude response ---");
        console.error(JSON.stringify(rawResponse, null, 2));
        console.error("--- validated JSON ---");
        console.error(JSON.stringify(data, null, 2));
      }

      // Step G — validate-only routing
      const isValidateOnly = options.validateOnly || options.dryRun;
      if (isValidateOnly) {
        console.log(JSON.stringify(data, null, 2));
        process.exit(0);
      }

      // Step H — render both PDFs
      const paths = resolveOutputPaths(absPath);
      console.error("Rendering...");
      const browser = await puppeteer.launch({ headless: true });
      try {
        await renderDesigned(data, paths.designed, browser);
        await renderAts(data, paths.ats, browser);
      } finally {
        await browser.close();
      }

      console.log(`Written: ${paths.designed}`);
      console.log(`Written: ${paths.ats}`);
    },
  );

program
  .command("init")
  .description("Generate an example Obsidian resume note with the expected frontmatter/headings")
  .argument("[output]", "path to write the example note", "./resume-example.md")
  .action(async (output: string) => {
    const outPath = resolve(output);
    try {
      await writeFile(outPath, INIT_TEMPLATE, { encoding: "utf8", flag: "wx" });
      console.log(`Created: ${outPath}`);
    } catch (err) {
      program.error(
        `Cannot create file: ${outPath} — ${err instanceof Error ? err.message : String(err)}`,
        { exitCode: 1 },
      );
    }
  });

await program.parseAsync().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
