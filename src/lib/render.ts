// src/lib/render.ts
import { join } from "node:path";
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
 * Pure helper: converts a candidate name to a lowercase underscore file slug.
 * "Pat Cartelli" → "pat_cartelli", "J. Smith-Jones" → "j_smith-jones"
 */
export function toNameSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Pure helper: derives the two PDF output paths from candidate name + output directory.
 * Optional companySlug and date (YYYY-MM-DD) are appended to the filename when provided.
 *   resolveOutputPaths("Pat Cartelli", "/out/Acme-Corp", "Acme-Corp", "2026-07-31")
 *   → { designed: "/out/Acme-Corp/pat_cartelli-resume-Acme-Corp-2026-07-31.pdf",
 *        ats:      "/out/Acme-Corp/pat_cartelli-resume-Acme-Corp-2026-07-31-ats.pdf" }
 */
export function resolveOutputPaths(
  candidateName: string,
  outputDir: string,
  companySlug?: string,
  date?: string,
): { designed: string; ats: string } {
  const nameSlug = toNameSlug(candidateName);
  const suffix = [companySlug, date]
    .filter(Boolean)
    .map((s) => `-${s}`)
    .join("");
  return {
    designed: join(outputDir, `${nameSlug}-resume${suffix}.pdf`),
    ats: join(outputDir, `${nameSlug}-resume${suffix}-ats.pdf`),
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

/** Wrap a contact field in an anchor tag. Prepends https:// if no scheme present. */
function contactLink(value: string, type: "email" | "url"): string {
  const href =
    type === "email" ? `mailto:${value}` : value.startsWith("http") ? value : `https://${value}`;
  return `<a href="${escapeHtml(href)}" style="color:inherit;text-decoration:none;">${escapeHtml(value)}</a>`;
}

const EN_DASH = "\u2013";

function dateRange(startDate: string, endDate?: string): string {
  return `${escapeHtml(startDate)} ${EN_DASH} ${endDate ? escapeHtml(endDate) : "Present"}`;
}

function urlWithPassword(work: { url: string; password?: string }, asLink: boolean): string {
  const urlHtml = asLink ? contactLink(work.url, "url") : escapeHtml(work.url);
  const password = work.password ? ` (password: ${escapeHtml(work.password)})` : "";
  return `${urlHtml}${password}`;
}

// ---------------------------------------------------------------------------
// Designed PDF template — two-column layout approved 2026-08-19.
// Main column = experience. Right rail (232px) = core competencies, skills,
// education. Ported from handoff/2026-08-19-two-column/template-two-col.js;
// that file's CSS is the spec.
//
// Type system: one font (Inter), three sizes (20px name / 14px section headers
// and company names / one small size for everything else), line-height always
// 1.5x the font size, two greys (#232323 text, #555555 secondary), and one
// accent (#FEAC03) used exactly once on the header rule.
// ---------------------------------------------------------------------------

/** Render options for the designed template. `small` is the one small size. */
export interface DesignedOpts {
  small?: number;
}

/** A top-level experience entry or a nested client engagement — same shape. */
type ExperienceEntry = ResumeData["experience"][number];

function designedHtmlTemplate(data: ResumeData, opts: DesignedOpts = {}): string {
  const S = opts.small ?? 10;
  const SLH = S * 1.5; // line-height is always 1.5x the font size
  const {
    contact,
    summary,
    coreCompetencies,
    selectedWork,
    experience,
    additionalExperience,
    education,
    skills,
  } = data;

  // ---- main column: experience -------------------------------------------
  // renderEntry handles both a top-level job and a client engagement nested
  // inside one. Nesting is what keeps a consultancy's engagements from reading
  // as parallel jobs.
  function renderEntry(exp: ExperienceEntry, nested: boolean): string {
    // Employment type is only worth calling out when it is a contract.
    // Full-time is the assumed default and renders nothing. No parentheses.
    const typeBadge = exp.type === "contract" ? `<span class="type-badge">Contract</span>` : "";
    const industryChip = exp.industry
      ? `<span class="exp-industry">${escapeHtml(exp.industry)}</span>`
      : "";
    const via = exp.via ? `<span class="exp-via">${escapeHtml(exp.via)}</span>` : "";
    const metaParts = [
      exp.role ? escapeHtml(exp.role) : "",
      exp.location ? escapeHtml(exp.location) : "",
      via,
      typeBadge,
      dateRange(exp.startDate, exp.endDate),
    ].filter(Boolean);
    const bulletsHtml = (exp.bullets ?? [])
      .map((b) => `<li>${escapeHtml(b)}</li>`)
      .join("\n          ");
    const caseStudyHtml = exp.caseStudy
      ? `<div class="case-study">Case study: ${urlWithPassword(exp.caseStudy, true)}</div>`
      : "";
    // Industry sits beside the company name, not in the meta line.
    const companyIndustry = industryChip ? `<span class="dot">&middot;</span>${industryChip}` : "";
    const engagementsHtml = (exp.engagements ?? [])
      .map((eng) => renderEntry(eng, true))
      .join("\n        ");
    return `<div class="experience-entry${nested ? " nested" : ""}">
        <div class="exp-company">${escapeHtml(exp.company)}${companyIndustry}</div>
        <div class="exp-meta">${metaParts.join('<span class="dot">&middot;</span>')}</div>
        ${exp.bullets && exp.bullets.length > 0 ? `<ul>\n          ${bulletsHtml}\n        </ul>` : ""}
        ${caseStudyHtml}
        ${engagementsHtml}
      </div>`;
  }

  const experienceHtml = experience.map((exp) => renderEntry(exp, false)).join("\n      ");

  const additionalHtml =
    additionalExperience && additionalExperience.length > 0
      ? `<div class="additional-experience">
        <div class="additional-experience-label">Additional Experience</div>
        <ul>${additionalExperience.map((i) => `<li>${escapeHtml(i)}</li>`).join("\n        ")}</ul>
      </div>`
      : "";

  // ---- rail: competencies, skills, education ------------------------------
  const competenciesHtml =
    coreCompetencies && coreCompetencies.length > 0
      ? `<section class="rail-section">
        <h2 class="rail-header">Core Competencies</h2>
        <ul class="rail-list">${coreCompetencies
          .map((c) => `<li>${escapeHtml(c)}</li>`)
          .join("\n          ")}</ul>
      </section>`
      : "";

  const skillsHtml =
    skills && skills.length > 0
      ? `<section class="rail-section">
        <h2 class="rail-header">Skills</h2>
        ${skills
          .map(
            (sg) => `<div class="skill-group">
          <div class="skill-category">${escapeHtml(sg.category)}</div>
          <div class="skill-items">${sg.items.map((i) => escapeHtml(i)).join(", ")}</div>
        </div>`,
          )
          .join("\n        ")}
      </section>`
      : "";

  const educationHtml =
    education && education.length > 0
      ? `<section class="rail-section">
        <h2 class="rail-header">Education</h2>
        ${education
          .map(
            (edu) => `<div class="edu-entry">
          <div class="degree">${escapeHtml(edu.degree)}</div>
          <div class="institution">${escapeHtml(edu.institution)}</div>
          <div class="edu-year">${escapeHtml(edu.year)}</div>
        </div>`,
          )
          .join("\n        ")}
      </section>`
      : "";

  // The summary is headed like every other section. Its header shares a
  // baseline with the rail's first header, which is what makes the two
  // columns read as a deliberate grid. Wording follows the master's own
  // "## Professional Summary" heading (override via data.summaryHeading).
  const summaryHtml = summary
    ? `<section class="summary">
      <h2 class="section-header summary-header">${escapeHtml(data.summaryHeading || "Professional Summary")}</h2>
      <p>${escapeHtml(summary)}</p>
    </section>`
    : "";

  const row1 = [
    contact.email && contactLink(contact.email, "email"),
    contact.phone && escapeHtml(contact.phone),
    contact.location && escapeHtml(contact.location),
  ]
    .filter(Boolean)
    .join('<span class="sep">|</span>');
  const row2 = [
    contact.website && contactLink(contact.website, "url"),
    contact.linkedin && contactLink(contact.linkedin, "url"),
    contact.github && contactLink(contact.github, "url"),
  ]
    .filter(Boolean)
    .join('<span class="sep">|</span>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0;
      print-color-adjust: exact; -webkit-print-color-adjust: exact; }

  :root {
    --accent: #FEAC03;
    --text:   #232323;
    --muted:  #555555;
    --faint:  #555555;  /* merged with --muted; #555 wins on contrast (7.5:1) */
    --border: #e0e0e0;
    --bullet: #232323;  /* dots match text; no second accent hue */
    --rail:    232px;
    --gutter:  48px;
    /* Main column width, identical on both pages. Sized for ~72 characters
       at 10px: 672 (content box) - 232 (rail) - 48 (gutter). */
    --measure: 392px;
    --s:    ${S}px;   /* the one small size: body, meta, rail, contact */
    --s-lh: ${SLH}px;
  }

  body { font-family: 'Inter', sans-serif; font-size: 14px; line-height: 21px; color: var(--text); }
  /* Type rule: line-height = 1.5 x font size, at every size. */
  a { color: inherit; text-decoration: none; }
  p, li { orphans: 3; widows: 3; }

  /* ---- header: full width ---------------------------------------------- */
  .contact-block { padding-bottom: 16px; border-bottom: 1px solid var(--accent); }
  .candidate-name { font-size: 20px; line-height: 30px; letter-spacing: -0.01em;
                    font-weight: 400; margin-bottom: 8px; }
  .headline { font-size: var(--s); line-height: var(--s-lh); color: var(--text); margin-bottom: 6px; }
  .contact-details { font-size: var(--s); line-height: var(--s-lh); color: var(--muted); }
  .selected-work { font-size: var(--s); line-height: var(--s-lh); color: var(--faint); margin-top: 6px; }
  .sep { margin: 0 6px; color: var(--border); }

  /* ---- summary ---------------------------------------------------------
     Capped to the same measure as the main column so the line length never
     exceeds ~85 characters, on either page. -------------------------------- */
  .summary { margin-top: 16px; max-width: var(--measure); }
  .summary-header { margin-top: 0; margin-bottom: 4px; }
  .summary p { font-size: var(--s); line-height: var(--s-lh); color: var(--muted); }

  /* ---- the split -------------------------------------------------------
     The rail is a right float, so main-column text narrows beside it and
     reflows to full width once the rail ends. That is what keeps the rail on
     page one only without hard-coding a break. ---------------------------- */
  .rail {
    float: right;
    width: var(--rail);
    margin: 16px 0 24px var(--gutter);
  }
  .rail-section { break-inside: avoid; }
  .rail-section + .rail-section { margin-top: 32px; }
  .rail-header {
    font-size: 14px; line-height: 21px; font-weight: 400;
    color: var(--text); margin-bottom: 8px;
  }
  .rail-list { list-style: none; padding: 0; }
  .rail-list li { font-size: var(--s); line-height: var(--s-lh); color: var(--muted); margin-bottom: 4px; }
  .skill-group + .skill-group { margin-top: 8px; }
  .skill-category { font-size: var(--s); line-height: var(--s-lh); color: var(--text); }
  .skill-items { font-size: var(--s); line-height: var(--s-lh); color: var(--faint); }
  .edu-entry .degree { font-size: var(--s); line-height: var(--s-lh); color: var(--text); }
  .edu-entry .institution,
  .edu-entry .edu-year { font-size: var(--s); line-height: var(--s-lh); color: var(--faint); }

  /* ---- main column: experience ----------------------------------------- */
  main { max-width: var(--measure); }
  .section-header {
    font-size: 14px; line-height: 21px; font-weight: 400; color: var(--text);
    margin-top: 24px; margin-bottom: 4px;
    break-after: avoid; break-inside: avoid;
  }
  .experience-entry { margin-top: 20px; }
  /* A client engagement nested inside a consultancy: indented, one step down in
     size, so it never reads as a parallel job. */
  .experience-entry.nested { margin-left: 16px; margin-top: 16px; }
  .experience-entry.nested .exp-company { font-size: var(--s); line-height: var(--s-lh); font-weight: 500; }
  .exp-company { font-size: 14px; line-height: 21px; font-weight: 500; break-after: avoid; }
  .exp-meta {
    font-size: var(--s); line-height: var(--s-lh); color: var(--faint);
    margin-bottom: 2px; break-after: avoid;
  }
  .dot { margin: 0 6px; }
  .type-badge { color: var(--faint); }
  .exp-industry { font-size: var(--s); line-height: var(--s-lh); color: var(--faint); font-weight: 400; }
  .exp-via { color: var(--faint); }
  ul { padding-left: 16px; margin: 0; }
  li { font-size: var(--s); line-height: var(--s-lh); color: var(--muted); margin-bottom: 3px;
       break-inside: avoid; }
  li::marker { color: var(--bullet); }
  .case-study { font-size: var(--s); line-height: var(--s-lh); color: var(--faint); margin-top: 4px; }
  .additional-experience { margin-top: 20px; }
  .additional-experience-label { font-size: 14px; line-height: 21px; font-weight: 500; break-after: avoid; }

</style>
</head>
<body>
  <header class="contact-block">
    <div class="candidate-name">${escapeHtml(contact.name)}</div>
    ${contact.headline ? `<div class="headline">${escapeHtml(contact.headline)}</div>` : ""}
    <div class="contact-details">
      ${[row1 && `<div>${row1}</div>`, row2 && `<div>${row2}</div>`].filter(Boolean).join("\n      ")}
    </div>
    ${
      selectedWork
        ? `<div class="selected-work">Selected work: ${urlWithPassword(selectedWork, true)}</div>`
        : ""
    }
  </header>

  <aside class="rail">
    ${competenciesHtml}
    ${skillsHtml}
    ${educationHtml}
  </aside>

  ${summaryHtml}

  <main>
    <h2 class="section-header">Experience</h2>
    ${experienceHtml}
    ${additionalHtml}
  </main>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// ATS PDF template (D-A01: black only, D-A02: Arial, D-A03: visually distinct)
// No tables, no images, no color, no @import
// ---------------------------------------------------------------------------

function atsHtmlTemplate(data: ResumeData): string {
  const {
    contact,
    summary,
    coreCompetencies,
    selectedWork,
    experience,
    additionalExperience,
    education,
    skills,
  } = data;

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

  const selectedWorkHtml = selectedWork
    ? `<p class="selected-work">Selected work: ${urlWithPassword(selectedWork, false)}</p>`
    : "";

  const experienceHtml = experience
    .map((exp) => {
      // Employment type matches the designed template: full-time is the assumed
      // default and renders nothing, contract renders as plain text.
      const typeLabel = exp.type === "contract" ? "Contract" : "";
      const bulletsHtml = exp.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("\n        ");
      const caseStudyHtml = exp.caseStudy
        ? `<p class="case-study">Case study: ${urlWithPassword(exp.caseStudy, false)}</p>`
        : "";
      const headingParts = [
        exp.role ? `<strong>${escapeHtml(exp.role)}</strong>` : "",
        escapeHtml(exp.company),
        typeLabel,
        dateRange(exp.startDate, exp.endDate),
      ].filter(Boolean);
      const parentHtml = `<div class="experience-entry">
      <p>${headingParts.join(" | ")}</p>
      ${exp.bullets.length > 0 ? `<ul>\n        ${bulletsHtml}\n      </ul>` : ""}
      ${caseStudyHtml}
    </div>`;
      const engagementsHtml = (exp.engagements ?? [])
        .map((eng) => {
          const engBullets = eng.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("\n        ");
          const engHeading = [
            eng.via ? escapeHtml(eng.via) : "Client engagement",
            eng.role ? `<strong>${escapeHtml(eng.role)}</strong>` : "",
            escapeHtml(eng.company),
            dateRange(eng.startDate, eng.endDate),
          ]
            .filter(Boolean)
            .join(" | ");
          return `<div class="experience-entry">
      <p>${engHeading}</p>
      ${eng.bullets.length > 0 ? `<ul>\n        ${engBullets}\n      </ul>` : ""}
    </div>`;
        })
        .join("\n    ");
      return engagementsHtml ? `${parentHtml}\n    ${engagementsHtml}` : parentHtml;
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
      margin-top: 0.55em;
      margin-bottom: 0.3em;
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
      margin-bottom: 0.4em;
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
    ${[
      contact.email,
      contact.phone,
      contact.location,
      contact.website,
      contact.linkedin,
      contact.github,
    ]
      .filter((f): f is string => Boolean(f))
      .map(escapeHtml)
      .join(" | ")}
  </div>

  ${selectedWorkHtml}

  ${summaryHtml}

  ${competenciesHtml}

  <section>
    <h2>Experience</h2>
    ${experienceHtml}
    ${
      additionalExperience && additionalExperience.length > 0
        ? `<h3>Additional Experience</h3>
    <ul>${additionalExperience.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n    ")}</ul>`
        : ""
    }
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
  opts: DesignedOpts = {},
): Promise<void> {
  const page = await browser.newPage();
  try {
    const html = designedHtmlTemplate(data, opts);
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
      margin: { top: "0.6in", right: "0.6in", bottom: "0.6in", left: "0.6in" },
    });
  } finally {
    await page.close();
  }
}
