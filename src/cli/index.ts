#!/usr/bin/env node

import { writeSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { Command } from "commander";
import puppeteer from "puppeteer";
import { serializeAtsMd, serializeAtsTxt } from "../lib/ats-text.js";
import { extractResume } from "../lib/extract.js";
import { preflightCheck } from "../lib/preflight.js";
import {
  atsHtmlTemplate,
  renderAts,
  renderDesigned,
  resolveOutputPaths,
  toCompanySlug,
} from "../lib/render.js";

const INIT_TEMPLATE = `---
name: Your Name
email: you@example.com
phone: (555) 000-0000
location: City, State
linkedin: linkedin.com/in/yourhandle
github: github.com/yourhandle
website: yoursite.com
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

      // Step D.5 — prompt for output routing (readline released in finally — prevents process hang)
      // Pre-buffers all arriving 'line' events so piped input (e.g. printf "y\nAcme Corp\n" | ...)
      // is never lost to a race between the 'close' event and the next ask() call.
      // In TTY mode, 'line' events fire only when the user presses Enter — same behaviour as before.
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const lineBuffer: string[] = [];
      let waitingResolver: ((line: string) => void) | null = null;
      rl.on("line", (line) => {
        if (waitingResolver !== null) {
          const res = waitingResolver;
          waitingResolver = null;
          res(line);
        } else {
          lineBuffer.push(line);
        }
      });
      rl.on("close", () => {
        if (waitingResolver !== null) {
          const res = waitingResolver;
          waitingResolver = null;
          res("");
        }
      });
      const ask = (prompt: string): Promise<string> => {
        process.stdout.write(prompt);
        if (lineBuffer.length > 0) return Promise.resolve(lineBuffer.shift() ?? "");
        return new Promise<string>((resolve) => {
          waitingResolver = resolve;
        });
      };
      let outputDir!: string; // assigned in all non-error try paths; emptySlug guard exits before use
      let companySlug: string | undefined;
      let emptySlug = false;
      try {
        const tailored = await ask("Is this resume tailored for a specific company? (y/n): ");
        if (tailored.trim().toLowerCase().startsWith("y")) {
          const company = await ask("Company name: ");
          const slug = toCompanySlug(company.trim());
          if (!slug) {
            emptySlug = true;
          } else {
            companySlug = slug;
            outputDir = join(process.cwd(), "output", slug);
          }
        } else {
          outputDir = join(process.cwd(), "output");
        }
      } finally {
        rl.close();
      }
      if (emptySlug) {
        // writeSync commits to OS pipe buffer synchronously (no stream flush race).
        // Destroying stdin lets the event loop drain so process.exitCode=1 takes effect cleanly
        // rather than forcing process.exit() from inside the top-level-await async context (which
        // emits "Unfinished Top-Level Await" exit code 13 and can drop buffered writes).
        writeSync(
          process.stderr.fd,
          "error: Company name must contain at least one letter or digit.\n",
        );
        process.exitCode = 1;
        process.stdin.destroy();
        return;
      }

      // mkdir only when PDFs will actually be written
      const isValidateOnly = options.validateOnly || options.dryRun;
      if (!isValidateOnly) {
        await mkdir(outputDir, { recursive: true });
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

      // Step G — validate-only routing  (isValidateOnly computed at Step D.5 — reuse it here)
      if (isValidateOnly) {
        console.log(JSON.stringify(data, null, 2));
        process.exit(0);
      }

      // Step H — render both PDFs and write ATS text outputs
      const today = new Date().toISOString().split("T")[0];
      const paths = resolveOutputPaths(data.contact.name, outputDir, companySlug, today);
      console.error("Rendering...");
      const browser = await puppeteer.launch({ headless: true });
      try {
        await renderDesigned(data, paths.designed, browser);
        await renderAts(data, paths.ats, browser);
      } finally {
        await browser.close();
      }

      await writeFile(paths.atsHtml, atsHtmlTemplate(data), "utf8");
      await writeFile(paths.atsTxt, serializeAtsTxt(data), "utf8");
      await writeFile(paths.atsMd, serializeAtsMd(data), "utf8");

      console.log(`Written: ${paths.designed}`);
      console.log(`Written: ${paths.ats}`);
      console.log(`Written: ${paths.atsHtml}`);
      console.log(`Written: ${paths.atsTxt}`);
      console.log(`Written: ${paths.atsMd}`);
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
