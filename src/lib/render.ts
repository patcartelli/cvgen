// src/lib/render.ts
import { basename, dirname, join } from "node:path";
import type { Browser } from "puppeteer";
import type { ResumeData } from "../schema/resume.js";

// ---------------------------------------------------------------------------
// Output path helper
// ---------------------------------------------------------------------------

/**
 * Pure helper: derives the two PDF output paths from an input .md path.
 * Per D-O01 (same directory) and D-O02 (stem-based naming):
 *   my-resume.md → my-resume-resume.pdf / my-resume-resume-ats.pdf
 */
export function resolveOutputPaths(inputMdPath: string): {
  designed: string;
  ats: string;
} {
  const stem = basename(inputMdPath, ".md");
  const dir = dirname(inputMdPath);
  return {
    designed: join(dir, stem + "-resume.pdf"),
    ats: join(dir, stem + "-resume-ats.pdf"),
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
      ? `<div class="competencies">
        ${coreCompetencies.map((c) => `<span class="chip">${escapeHtml(c)}</span>`).join("\n        ")}
      </div>`
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
      const typeBadge = exp.type ? `<span class="type-badge">${escapeHtml(exp.type)}</span>` : "";
      const bulletsHtml = exp.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("\n          ");
      return `<div class="experience-entry">
        <div class="exp-header">
          <span class="role">${escapeHtml(exp.role)}</span>
          <span class="dates">${escapeHtml(exp.startDate)} — ${endDate}</span>
        </div>
        <div class="exp-subheader">
          <span class="company">${escapeHtml(exp.company)}</span>
          ${typeBadge}
        </div>
        <ul>
          ${bulletsHtml}
        </ul>
      </div>`;
    })
    .join("\n    ");

  const educationHtml = education
    .map(
      (edu) =>
        `<div class="edu-entry">
        <span class="degree">${escapeHtml(edu.degree)}</span>
        <span class="institution">${escapeHtml(edu.institution)}</span>
        <span class="year">${escapeHtml(edu.year)}</span>
      </div>`,
    )
    .join("\n    ");

  const skillsHtml = skills
    .map(
      (sg) =>
        `<div class="skill-group">
        <span class="skill-category">${escapeHtml(sg.category)}:</span>
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
      --accent: #2d4a6b;
      --text: #1a1a1a;
      --muted: #555;
      --border: #e0e0e0;
    }

    body {
      font-family: 'Inter', sans-serif;
      font-size: 10.5pt;
      color: var(--text);
      line-height: 1.5;
    }

    .container {
      max-width: 100%;
    }

    /* Contact block */
    .contact-block {
      margin-bottom: 1.2em;
      border-bottom: 2px solid var(--accent);
      padding-bottom: 0.8em;
    }

    .candidate-name {
      font-size: 22pt;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: -0.02em;
      margin-bottom: 0.3em;
    }

    .contact-details {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3em 1.2em;
      font-size: 9pt;
      color: var(--muted);
    }

    /* Section headers */
    .section-header {
      font-size: 10pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.2em;
      margin-top: 1em;
      margin-bottom: 0.5em;
      break-after: avoid;
      break-inside: avoid;
    }

    /* Summary */
    section > p {
      color: var(--text);
      margin-bottom: 0.5em;
    }

    /* Core Competencies */
    .competencies {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3em 0.5em;
      margin-bottom: 0.3em;
    }

    .chip {
      background: #eef2f7;
      color: var(--accent);
      font-size: 8.5pt;
      font-weight: 500;
      padding: 0.15em 0.6em;
      border-radius: 3px;
    }

    /* Experience */
    .experience-entry {
      margin-bottom: 0.9em;
      break-inside: avoid;
    }

    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .role {
      font-weight: 600;
      font-size: 10.5pt;
    }

    .dates {
      font-size: 9pt;
      color: var(--muted);
      white-space: nowrap;
    }

    .exp-subheader {
      display: flex;
      align-items: center;
      gap: 0.5em;
      margin-bottom: 0.3em;
    }

    .company {
      font-size: 9.5pt;
      color: var(--muted);
    }

    .type-badge {
      font-size: 7.5pt;
      font-weight: 500;
      color: var(--muted);
      border: 1px solid var(--border);
      padding: 0.05em 0.4em;
      border-radius: 2px;
      text-transform: lowercase;
    }

    ul {
      padding-left: 1.2em;
      margin: 0;
    }

    li {
      font-size: 10pt;
      margin-bottom: 0.15em;
      orphans: 3;
      widows: 3;
    }

    p {
      orphans: 3;
      widows: 3;
    }

    /* Education */
    .edu-entry {
      display: flex;
      gap: 0.5em 1em;
      flex-wrap: wrap;
      align-items: baseline;
      margin-bottom: 0.3em;
    }

    .degree {
      font-weight: 600;
    }

    .institution {
      color: var(--muted);
    }

    .year {
      font-size: 9pt;
      color: var(--muted);
    }

    /* Skills */
    .skill-group {
      margin-bottom: 0.25em;
      font-size: 10pt;
    }

    .skill-category {
      font-weight: 600;
      margin-right: 0.3em;
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
      <div class="contact-details">
        <span>${escapeHtml(contact.email)}</span>
        <span>${escapeHtml(contact.phone)}</span>
        <span>${escapeHtml(contact.location)}</span>
        <span>${escapeHtml(contact.linkedin)}</span>
        <span>${escapeHtml(contact.github)}</span>
      </div>
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
