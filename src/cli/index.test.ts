// src/cli/index.test.ts
// Tests for the CLI entry point (src/cli/index.ts)
// Run with: npx tsx --test src/cli/index.test.ts
//
// Tests 1–5: subprocess behavior via spawnSync
// Tests 6–8: source-level structural assertions on src/cli/index.ts

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../..");
const cliSrcPath = resolve(projectRoot, "src/cli/index.ts");
const fixturePath = resolve(projectRoot, "fixtures/sample-resume.md");

/**
 * Spawn the CLI via tsx and capture stdout, stderr, and exit code.
 * env: override process.env (pass a copy with ANTHROPIC_API_KEY deleted or faked).
 */
function runCli(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = projectRoot,
  input?: string,
): { stdout: string; stderr: string; status: number } {
  const result = spawnSync("npx", ["tsx", cliSrcPath, ...args], {
    cwd,
    env,
    encoding: "utf8",
    timeout: 15000,
    ...(input !== undefined ? { input } : {}),
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}

/** Build a minimal env with ANTHROPIC_API_KEY deleted. */
function envWithoutKey(): NodeJS.ProcessEnv {
  const e = { ...process.env };
  delete e.ANTHROPIC_API_KEY;
  return e;
}

/** Build a minimal env with a fake ANTHROPIC_API_KEY (never reaches Anthropic). */
function envWithDummyKey(): NodeJS.ProcessEnv {
  return { ...process.env, ANTHROPIC_API_KEY: "dummy-key-for-test" };
}

// Temp files created during tests, cleaned up in afterEach
const tempFiles: string[] = [];

afterEach(() => {
  // nothing to clean — temp files are written to OS tmpdir which gets cleaned by OS
  // The tempFiles array is left for future explicit cleanup if needed
});

describe("CLI entry point (src/cli/index.ts)", () => {
  // ---------------------------------------------------------------------------
  // Test 1: No args → usage to stderr, exit 1
  // ---------------------------------------------------------------------------
  it("Test 1: no args → prints usage containing '--validate-only' and '--dry-run' to stderr, exits 1", () => {
    const { stdout, stderr, status } = runCli([], envWithoutKey());
    assert.equal(status, 1, `expected exit 1, got ${status}. stderr: ${stderr}`);
    assert.ok(stderr.includes("Usage:"), `stderr must contain "Usage:" — got: ${stderr}`);
    assert.ok(
      stderr.includes("--validate-only"),
      `stderr must contain "--validate-only" — got: ${stderr}`,
    );
    assert.ok(stderr.includes("--dry-run"), `stderr must contain "--dry-run" — got: ${stderr}`);
    assert.equal(stdout.trim(), "", `stdout must be empty — got: ${stdout}`);
  });

  // ---------------------------------------------------------------------------
  // Test 2: Only --validate-only flag, no file path → usage, exit 1
  // ---------------------------------------------------------------------------
  it("Test 2: only --validate-only flag (no file path) → usage to stderr, exits 1", () => {
    const { stdout, stderr, status } = runCli(["--validate-only"], envWithoutKey());
    assert.equal(status, 1, `expected exit 1, got ${status}. stderr: ${stderr}`);
    assert.ok(stderr.includes("Usage:"), `stderr must contain "Usage:" — got: ${stderr}`);
    assert.equal(stdout.trim(), "", `stdout must be empty — got: ${stdout}`);
  });

  // ---------------------------------------------------------------------------
  // Test 3: File path but ANTHROPIC_API_KEY unset → error naming the missing key, exit 1, no prompt
  // ---------------------------------------------------------------------------
  it("Test 3: file path but no ANTHROPIC_API_KEY → error mentions 'ANTHROPIC_API_KEY' and 'not set', exits 1", () => {
    // Use a temp cwd with no .env file so process.loadEnvFile(".env") cannot repopulate the key
    const noDotEnvDir = mkdtempSync(join(tmpdir(), "cvgen-no-env-"));
    const { stdout, stderr, status } = runCli(
      [fixturePath, "--validate-only"],
      envWithoutKey(),
      noDotEnvDir,
    );
    assert.equal(status, 1, `expected exit 1, got ${status}. stderr: ${stderr}`);
    assert.ok(
      stderr.includes("ANTHROPIC_API_KEY"),
      `stderr must mention "ANTHROPIC_API_KEY" — got: ${stderr}`,
    );
    assert.ok(stderr.includes("not set"), `stderr must include "not set" — got: ${stderr}`);
    assert.equal(stdout.trim(), "", `stdout must be empty — got: ${stdout}`);
  });

  // ---------------------------------------------------------------------------
  // Test 4: File path pointing to nonexistent file (key faked) → readable error, exit 1
  // ---------------------------------------------------------------------------
  it("Test 4: nonexistent file path → readable ENOENT error to stderr, exits 1", () => {
    const missingPath = resolve(projectRoot, "fixtures/does-not-exist-xyz.md");
    const { stdout, stderr, status } = runCli([missingPath, "--validate-only"], envWithDummyKey());
    assert.equal(status, 1, `expected exit 1, got ${status}. stderr: ${stderr}`);
    assert.ok(
      stderr.trim().length > 0,
      `stderr must be non-empty for a missing file — got: ${stderr}`,
    );
    assert.equal(stdout.trim(), "", `stdout must be empty — got: ${stdout}`);
  });

  // ---------------------------------------------------------------------------
  // Test 5: Preflight-failing markdown → each preflight error on stderr, exit 1, no API call
  // ---------------------------------------------------------------------------
  it("Test 5: preflight-failing markdown → per-error stderr lines, exits 1, no live API call", () => {
    // Write a minimal invalid markdown to a temp file
    const tempDir = mkdtempSync(join(tmpdir(), "cvgen-test-"));
    const badMdPath = join(tempDir, "bad-resume.md");
    writeFileSync(badMdPath, "no frontmatter here\n\nno required sections either\n", "utf8");
    tempFiles.push(badMdPath);

    const { stdout, stderr, status } = runCli([badMdPath, "--validate-only"], envWithDummyKey());

    assert.equal(status, 1, `expected exit 1, got ${status}. stderr: ${stderr}`);
    assert.ok(
      stderr.includes("Missing required frontmatter field:"),
      `stderr must contain "Missing required frontmatter field:" — got: ${stderr}`,
    );
    assert.ok(
      stderr.includes("Missing required section:"),
      `stderr must contain "Missing required section:" — got: ${stderr}`,
    );
    assert.equal(stdout.trim(), "", `stdout must be empty — got: ${stdout}`);
  });

  // ---------------------------------------------------------------------------
  // Test 6 (source-level): Shebang is on line 1
  // ---------------------------------------------------------------------------
  it("Test 6 (source-level): line 1 of src/cli/index.ts is exactly '#!/usr/bin/env node'", () => {
    const src = readFileSync(cliSrcPath, "utf8");
    const firstLine = src.split("\n")[0];
    assert.equal(
      firstLine,
      "#!/usr/bin/env node",
      `line 1 must be the shebang — got: ${JSON.stringify(firstLine)}`,
    );
  });

  // ---------------------------------------------------------------------------
  // Test 7 (source-level): process.loadEnvFile(".env") appears and no direct new Anthropic()
  // ---------------------------------------------------------------------------
  it("Test 7 (source-level): loadEnvFile appears before any Anthropic construction; file never calls new Anthropic() directly", () => {
    const src = readFileSync(cliSrcPath, "utf8");
    assert.ok(
      src.includes("loadEnvFile"),
      `src/cli/index.ts must call process.loadEnvFile — got src without it`,
    );
    assert.ok(
      !src.includes("new Anthropic"),
      `src/cli/index.ts must NOT construct new Anthropic() directly — delegates to extractResume`,
    );
  });

  // ---------------------------------------------------------------------------
  // Test 8 (source-level): imports commander and exports a Commander program
  // ---------------------------------------------------------------------------
  it("Test 8 (source-level): imports commander and exports a Commander program", () => {
    const src = readFileSync(cliSrcPath, "utf8");
    assert.ok(src.includes("commander"), "must import from 'commander'");
    assert.ok(src.includes("new Command()"), "must instantiate a Commander Command");
    assert.ok(src.includes("parseAsync"), "must call parseAsync");
    assert.ok(!src.includes("require("), "must not use require() — ESM only");
    assert.ok(!src.includes("inquirer"), "must not import inquirer");
    assert.ok(!src.includes("yargs"), "must not import yargs");
  });

  it("source-level: Step H writes ATS html/txt/md and logs all five Written paths", () => {
    const src = readFileSync(cliSrcPath, "utf8");
    assert.ok(src.includes("serializeAtsTxt"), "must call serializeAtsTxt");
    assert.ok(src.includes("serializeAtsMd"), "must call serializeAtsMd");
    assert.ok(src.includes("atsHtmlTemplate"), "must call atsHtmlTemplate");
    assert.ok(src.includes("writeFile(paths.atsHtml,"), "must write ATS HTML");
    assert.ok(src.includes("writeFile(paths.atsTxt,"), "must write ATS TXT");
    assert.ok(src.includes("writeFile(paths.atsMd,"), "must write ATS MD");
    assert.ok(src.includes(`Written: \${paths.atsHtml}`), "must log ATS HTML path");
    assert.ok(src.includes(`Written: \${paths.atsTxt}`), "must log ATS TXT path");
    assert.ok(src.includes(`Written: \${paths.atsMd}`), "must log ATS MD path");
  });

  // ---------------------------------------------------------------------------
  // Step D.5 interactive prompt tests
  // ---------------------------------------------------------------------------
  describe("Step D.5 interactive prompt", () => {
    // Test 9: "n" answer passes through prompt; failure is at Step E (API), not Step B (key guard)
    it("Test 9: 'n' answer at prompt routes to Step E — failure is API rejection, not missing-key error", () => {
      // Use a temp cwd so mkdir(output/) lands there, not in the project root
      const tmpCwd = mkdtempSync(join(tmpdir(), "cvgen-test-"));
      const { stderr, status } = runCli([fixturePath], envWithDummyKey(), tmpCwd, "n\n");
      assert.notEqual(
        status,
        0,
        `expected non-zero exit (API will reject dummy key) — got ${status}`,
      );
      assert.ok(
        !stderr.includes("ANTHROPIC_API_KEY is not set"),
        `stderr must NOT contain key-guard message — prompt was reached. stderr: ${stderr}`,
      );
    });

    // Test 10: "y" then all-special company name triggers the empty-slug guard before any API call
    it("Test 10: 'y' then all-special company name triggers empty-slug guard exit", () => {
      const tmpCwd = mkdtempSync(join(tmpdir(), "cvgen-test-"));
      const { stdout, stderr, status } = runCli(
        [fixturePath],
        envWithDummyKey(),
        tmpCwd,
        "y\n!!!\n",
      );
      assert.notEqual(status, 0, `expected non-zero exit from slug guard — got ${status}`);
      // Commander may route the error via process.exit (losing async stderr flush) so check
      // both streams — the message must appear somewhere in the combined output.
      const output = stdout + stderr;
      assert.ok(
        output.includes("Company name must contain at least one letter or digit"),
        `output must contain slug-guard message — got stdout: ${stdout} | stderr: ${stderr}`,
      );
    });
  });
});
