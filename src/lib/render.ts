// src/lib/render.ts
import { basename, join } from "node:path";
import type { Browser } from "puppeteer";
import type { ResumeData } from "../schema/resume.js";

// ---------------------------------------------------------------------------
// Output path helper
// ---------------------------------------------------------------------------

/**
 * Pure helper: converts a company name string to a Title-Case-Hyphen directory slug.
 * D-01: spaces → hyphens, casing preserved. D-02: special chars stripped without replacement.
 * Examples: "Acme Corp" → "Acme-Corp", "AT&T" → "ATT", "Goldman Sachs & Partners" → "Goldman-Sachs-Partners"
 */
export function toCompanySlug(company: string): string {
  return company
    .replace(/[^a-zA-Z0-9 ]/g, "") // D-02: strip ampersands, dots, commas, etc.
    .trim()
    .replace(/\s+/g, "-"); // D-01: collapse space runs to hyphens, preserve case
}

/**
 * Pure helper: derives the two PDF output paths from an explicit output directory.
 * Stem is derived from the input .md basename; directory is caller-supplied.
 *   resolveOutputPaths("/path/my-resume.md", "/out/Acme-Corp")
 *   → { designed: "/out/Acme-Corp/my-resume-resume.pdf",
 *        ats:      "/out/Acme-Corp/my-resume-resume-ats.pdf" }
 */
export function resolveOutputPaths(
  inputMdPath: string,
  outputDir: string,
): { designed: string; ats: string } {
  const stem = basename(inputMdPath, ".md");
  return {
    designed: join(outputDir, stem + "-resume.pdf"),
    ats: join(outputDir, stem + "-resume-ats.pdf"),
  };
}

// ---------------------------------------------------------------------------
// HTML safety
// ---------------------------------------------------------------------------

/** Escape user-supplied strings before interpolating into HTML (T-03-01). */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// Designed PDF template (D-D01: minimal/modern, D-D02: Inter via Google Fonts,
// D-D03: muted accent color #2d4a6b on name and section headers)
// ---------------------------------------------------------------------------

function designedHtmlTemplate(data: ResumeData): string {
  const { contact, summary, coreCompetencies, experience, education, skills } = data;

  const competenciesHtml =
    coreCompetencies && coreCompetencies.length > 0
      ? `<p class="competencies">${coreCompetencies.map((c) => escapeHtml(c)).join(", ")}</p>`
      : "";

  const summaryHtml = summary
    ? `<section>
      <h2 class="section-header">Summary</h2>
      <p>${escapeHtml(summary)}</p>
    </section>`
    : "";

  const experienceHtml = experience
    .map((exp) => {
      const endDate = exp.endDate ? escapeHtml(exp.endDate) : "Present";
      const typeBadge = exp.type
        ? ` <span class="type-badge">(${escapeHtml(exp.type)})</span>`
        : "";
      const bulletsHtml = exp.bullets
        .map((b) => `<li>${escapeHtml(b)}</li>`)
        .join("\n            ");
      return `<div class="experience-entry">
        <div class="exp-main">
          <div class="exp-title">${escapeHtml(exp.company)}${exp.role ? ` — ${escapeHtml(exp.role)}${typeBadge}` : ""}</div>
          <ul>
            ${bulletsHtml}
          </ul>
        </div>
        <div class="exp-date">${escapeHtml(exp.startDate)} – ${endDate}</div>
      </div>`;
    })
    .join("\n    ");

  const educationHtml = education
    .map(
      (edu) =>
        `<div class="edu-entry">
        <div class="edu-main">
          <div class="degree">${escapeHtml(edu.degree)}</div>
          <div class="institution">${escapeHtml(edu.institution)}</div>
        </div>
        <div class="edu-year">${escapeHtml(edu.year)}</div>
      </div>`,
    )
    .join("\n    ");

  const skillsHtml = skills
    .map(
      (sg) =>
        `<div class="skill-group">
        <span class="skill-category">${escapeHtml(sg.category)}</span>
        <span class="skill-items">${sg.items.map((i) => escapeHtml(i)).join(", ")}</span>
      </div>`,
    )
    .join("\n    ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    :root {
      --accent: #FEAC03;
      --text: #232323;
      --muted: #555555;
      --border: #e0e0e0;
      --bullet: #2d4a6b;
    }

    body {
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      line-height: 21px;
      color: var(--text);
    }

    .container {
      max-width: 100%;
    }

    /* Contact block — accent appears once as a thin bottom rule */
    .contact-block {
      padding-bottom: 1.2em;
      border-bottom: 1px solid var(--accent);
    }

    .candidate-name {
      font-size: 20px;
      line-height: 26px;
      font-weight: 400;
      color: var(--text);
      margin-bottom: 16px;
    }

    .contact-details {
      font-size: 12px;
      line-height: 21px;
      color: var(--muted);
    }

    .sep {
      margin: 0 4px;
    }

    /* Section headers — 48px above, 4px below (uniform gap to first content element) */
    .section-header {
      font-size: 14px;
      line-height: 21px;
      font-weight: 400;
      color: var(--text);
      margin-top: 48px;
      margin-bottom: 4px;
      break-after: avoid;
      break-inside: avoid;
    }

    .section-header + .experience-entry {
      margin-top: 0;
    }

    /* Summary paragraph — body-small size; spacing comes from .section-header margin-bottom */
    section > p {
      margin-top: 0;
      font-size: 12px;
      color: var(--muted);
    }

    /* Core Competencies — comma-separated body/small */
    .competencies {
      font-size: 12px;
      line-height: 21px;
      color: var(--muted);
      margin-top: 0;
    }

    /* Experience — two-column grid: content left, date right */
    .experience-entry {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0 1.5em;
      margin-top: 24px;
      margin-bottom: 0;
      break-inside: avoid;
      align-items: start;
    }

    .exp-date {
      font-size: 12px;
      line-height: 21px;
      color: var(--muted);
      white-space: nowrap;
      text-align: right;
    }

    .exp-title {
      font-size: 14px;
      line-height: 21px;
      font-weight: 400;
      color: var(--text);
      margin-bottom: 0.1em;
    }

    .type-badge {
      font-size: 12px;
      line-height: 21px;
      color: var(--muted);
    }

    ul {
      padding-left: 1.2em;
      margin: 0;
    }

    li {
      font-size: 12px;
      line-height: 18px;
      color: var(--muted);
      margin-bottom: 0.1em;
      orphans: 3;
      widows: 3;
    }

    li::marker {
      color: var(--bullet);
    }

    p {
      orphans: 3;
      widows: 3;
    }

    /* Education — two-column grid matching experience: content left, year right */
    .edu-entry {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0 1.5em;
      margin-bottom: 0.5em;
      break-inside: avoid;
      align-items: start;
    }

    .edu-year {
      font-size: 12px;
      line-height: 21px;
      color: var(--muted);
      white-space: nowrap;
      text-align: right;
    }

    .degree {
      font-size: 14px;
      line-height: 21px;
      font-weight: 400;
    }

    .institution {
      font-size: 12px;
      line-height: 21px;
      color: var(--muted);
    }

    /* Skills — two-column grid matching experience */
    .skill-group {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 0 1.5em;
      margin-bottom: 0.3em;
      font-size: 12px;
      line-height: 21px;
    }

    .skill-category {
      font-size: 12px;
      line-height: 21px;
      color: var(--muted);
    }

    .skill-items {
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="contact-block">
      <div class="candidate-name">${escapeHtml(contact.name)}</div>
      <div class="contact-details">${[contact.email, contact.phone, contact.location, contact.linkedin, contact.github].filter(Boolean).map(escapeHtml).join('<span class="sep">|</span>')}</div>
    </div>

    ${summaryHtml}

    ${
      competenciesHtml
        ? `<section>
      <h2 class="section-header">Core Competencies</h2>
      ${competenciesHtml}
    </section>`
        : ""
    }

    <section>
      <h2 class="section-header">Experience</h2>
      ${experienceHtml}
    </section>

    <section>
      <h2 class="section-header">Education</h2>
      ${educationHtml}
    </section>

    <section>
      <h2 class="section-header">Skills</h2>
      ${skillsHtml}
    </section>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// ATS PDF template (D-A01: black only, D-A02: Arial, D-A03: visually distinct)
// No tables, no images, no color, no @import
// ---------------------------------------------------------------------------

function atsHtmlTemplate(data: ResumeData): string {
  const { contact, summary, coreCompetencies, experience, education, skills } = data;

  const summaryHtml = summary
    ? `<section>
      <h2>Summary</h2>
      <p>${escapeHtml(summary)}</p>
    </section>`
    : "";

  const competenciesHtml =
    coreCompetencies && coreCompetencies.length > 0
      ? `<section>
      <h2>Core Competencies</h2>
      <p>${coreCompetencies.map((c) => escapeHtml(c)).join(" | ")}</p>
    </section>`
      : "";

  const experienceHtml = experience
    .map((exp) => {
      const endDate = exp.endDate ? escapeHtml(exp.endDate) : "Present";
      const typeLabel = exp.type ? ` (${escapeHtml(exp.type)})` : "";
      const bulletsHtml = exp.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("\n        ");
      return `<div class="experience-entry">
      <p><strong>${escapeHtml(exp.role)}</strong>${typeLabel} | ${escapeHtml(exp.company)} | ${escapeHtml(exp.startDate)} &mdash; ${endDate}</p>
      <ul>
        ${bulletsHtml}
      </ul>
    </div>`;
    })
    .join("\n    ");

  const educationHtml = education
    .map(
      (edu) =>
        `<p>${escapeHtml(edu.degree)} | ${escapeHtml(edu.institution)} | ${escapeHtml(edu.year)}</p>`,
    )
    .join("\n    ");

  const skillsHtml = skills
    .map(
      (sg) =>
        `<p><strong>${escapeHtml(sg.category)}:</strong> ${sg.items.map((i) => escapeHtml(i)).join(", ")}</p>`,
    )
    .join("\n    ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: #000;
      line-height: 1.5;
    }

    h1 {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 0.2em;
    }

    h2 {
      font-size: 11pt;
      font-weight: bold;
      border-bottom: 1px solid #000;
      margin-top: 0.9em;
      margin-bottom: 0.4em;
      padding-bottom: 0.1em;
    }

    .contact-details {
      font-size: 10pt;
      margin-bottom: 0.5em;
    }

    section {
      margin-bottom: 0.3em;
    }

    .experience-entry {
      margin-bottom: 0.6em;
    }

    p {
      margin-bottom: 0.2em;
      orphans: 3;
      widows: 3;
    }

    ul {
      padding-left: 1.5em;
      margin: 0.2em 0;
    }

    li {
      margin-bottom: 0.1em;
      orphans: 3;
      widows: 3;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(contact.name)}</h1>
  <div class="contact-details">
    ${escapeHtml(contact.email)} | ${escapeHtml(contact.phone)} | ${escapeHtml(contact.location)} | ${escapeHtml(contact.linkedin)} | ${escapeHtml(contact.github)}
  </div>

  ${summaryHtml}

  ${competenciesHtml}

  <section>
    <h2>Experience</h2>
    ${experienceHtml}
  </section>

  <section>
    <h2>Education</h2>
    ${educationHtml}
  </section>

  <section>
    <h2>Skills</h2>
    ${skillsHtml}
  </section>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Public render functions
// ---------------------------------------------------------------------------

/**
 * Renders the designed single-column typographic PDF.
 * Uses Inter (via Google Fonts), muted accent color, and print-color-adjust for
 * correct color reproduction.
 *
 * @param data - Structured resume data
 * @param outputPath - Absolute path where the PDF will be written
 * @param browser - Shared Puppeteer Browser instance (caller owns lifecycle)
 */
export async function renderDesigned(
  data: ResumeData,
  outputPath: string,
  browser: Browser,
): Promise<void> {
  const page = await browser.newPage();
  try {
    const html = designedHtmlTemplate(data);
    // Use 'load' for setContent (Puppeteer 25.x excludes networkidle0/2 from
    // SetContentWaitForOptions); then explicitly gate on network idle to ensure
    // the Google Fonts CDN @import finishes before page.pdf() is called.
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForNetworkIdle();
    await page.pdf({
      path: outputPath,
      format: "Letter",
      printBackground: true,
      margin: { top: "0.75in", right: "0.75in", bottom: "0.75in", left: "0.75in" },
    });
  } finally {
    await page.close();
  }
}

/**
 * Renders the ATS-clean single-column PDF.
 * Uses Arial, black-only text, no tables, no images, no decorative color.
 *
 * @param data - Structured resume data
 * @param outputPath - Absolute path where the PDF will be written
 * @param browser - Shared Puppeteer Browser instance (caller owns lifecycle)
 */
export async function renderAts(
  data: ResumeData,
  outputPath: string,
  browser: Browser,
): Promise<void> {
  const page = await browser.newPage();
  try {
    const html = atsHtmlTemplate(data);
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({
      path: outputPath,
      format: "Letter",
      printBackground: false,
      margin: { top: "0.75in", right: "0.75in", bottom: "0.75in", left: "0.75in" },
    });
  } finally {
    await page.close();
  }
}
