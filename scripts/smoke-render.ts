// scripts/smoke-render.ts
// Manual smoke driver: renders both designed and ATS PDFs from fixtures/sample-resume.json
// via a single shared Puppeteer Browser instance and verifies both files exist on disk.
// Run via: npm run smoke-render
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { renderAts, renderDesigned, resolveOutputPaths } from "../src/lib/render.js";
import type { ResumeData } from "../src/schema/resume.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load fixture data
const fixturePath = resolve(__dirname, "../fixtures/sample-resume.json");
const data = JSON.parse(await readFile(fixturePath, "utf8")) as ResumeData;

// Create a temp directory for output (not cleaned up — lets operator open PDFs for inspection)
const tmp = await mkdtemp(join(tmpdir(), "cvgen-smoke-"));

// Build a synthetic input md path inside the temp dir so resolveOutputPaths gives
// the expected output names: sample-resume-resume.pdf / sample-resume-resume-ats.pdf
const inputMdPath = join(tmp, "sample-resume.md");
const { designed, ats } = resolveOutputPaths(inputMdPath);

// Launch Puppeteer with a single shared Browser instance
const browser = await puppeteer.launch({ headless: true });
try {
  await renderDesigned(data, designed, browser);
  await renderAts(data, ats, browser);
} finally {
  await browser.close();
}

// Verify both PDFs exist and are non-empty (> 1000 bytes — a valid PDF is well over 1KB)
const designedStat = await stat(designed);
const atsStat = await stat(ats);

if (designedStat.size <= 1000) {
  throw new Error(
    `Designed PDF too small (${designedStat.size} bytes): ${designed}`,
  );
}
if (atsStat.size <= 1000) {
  throw new Error(`ATS PDF too small (${atsStat.size} bytes): ${ats}`);
}

console.log("Designed PDF:", designed);
console.log("ATS PDF:     ", ats);
console.log(`Sizes: designed=${designedStat.size} bytes, ats=${atsStat.size} bytes`);
console.log("smoke-render: OK");
