// scripts/smoke-render.ts
// Manual smoke driver: renders both designed and ATS PDFs from fixtures/sample-resume.json
// via a single shared Puppeteer Browser instance, writes ATS html/txt/md, and verifies
// all five files exist on disk.
// Run via: npm run smoke-render
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { serializeAtsMd, serializeAtsTxt } from "../src/lib/ats-text.js";
import {
  atsHtmlTemplate,
  renderAts,
  renderDesigned,
  resolveOutputPaths,
} from "../src/lib/render.js";
import type { ResumeData } from "../src/schema/resume.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load fixture data — optionally accept a path as the first CLI arg
const fixturePath = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(__dirname, "../fixtures/sample-resume.json");
const data = JSON.parse(await readFile(fixturePath, "utf8")) as ResumeData;

// Create a temp directory for output (not cleaned up — lets operator open files for inspection)
const tmp = await mkdtemp(join(tmpdir(), "cvgen-smoke-"));

const { designed, ats, atsHtml, atsTxt, atsMd } = resolveOutputPaths(data.contact.name, tmp);

// Launch Puppeteer with a single shared Browser instance
const browser = await puppeteer.launch({ headless: true });
try {
  await renderDesigned(data, designed, browser);
  await renderAts(data, ats, browser);
} finally {
  await browser.close();
}

await writeFile(atsHtml, atsHtmlTemplate(data), "utf8");
await writeFile(atsTxt, serializeAtsTxt(data), "utf8");
await writeFile(atsMd, serializeAtsMd(data), "utf8");

// Verify PDFs exist and are non-empty (> 1000 bytes — a valid PDF is well over 1KB)
const designedStat = await stat(designed);
const atsStat = await stat(ats);
const atsHtmlStat = await stat(atsHtml);
const atsTxtStat = await stat(atsTxt);
const atsMdStat = await stat(atsMd);

if (designedStat.size <= 1000) {
  throw new Error(`Designed PDF too small (${designedStat.size} bytes): ${designed}`);
}
if (atsStat.size <= 1000) {
  throw new Error(`ATS PDF too small (${atsStat.size} bytes): ${ats}`);
}
if (atsHtmlStat.size <= 0) {
  throw new Error(`ATS HTML empty: ${atsHtml}`);
}
if (atsTxtStat.size <= 0) {
  throw new Error(`ATS TXT empty: ${atsTxt}`);
}
if (atsMdStat.size <= 0) {
  throw new Error(`ATS MD empty: ${atsMd}`);
}

console.log("Designed PDF:", designed);
console.log("ATS PDF:     ", ats);
console.log("ATS HTML:    ", atsHtml);
console.log("ATS TXT:     ", atsTxt);
console.log("ATS MD:      ", atsMd);
console.log(
  `Sizes: designed=${designedStat.size} bytes, ats=${atsStat.size} bytes, html=${atsHtmlStat.size} bytes, txt=${atsTxtStat.size} bytes, md=${atsMdStat.size} bytes`,
);
console.log("smoke-render: OK");
