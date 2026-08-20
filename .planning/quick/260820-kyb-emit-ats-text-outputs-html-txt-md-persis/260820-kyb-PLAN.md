---
phase: quick-260820-kyb
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/ats-text.ts
  - src/lib/ats-text.test.ts
  - src/lib/render.ts
  - src/lib/render.test.ts
  - src/cli/index.ts
  - src/cli/index.test.ts
  - scripts/smoke-render.ts
autonomous: true
requirements:
  - STC-144
must_haves:
  truths:
    - "CLI write of a resume produces five files in the resolved output dir: designed PDF, ATS PDF, ATS HTML, ATS TXT, ATS MD"
    - "ATS HTML on disk is exactly atsHtmlTemplate(data); designedHtmlTemplate and atsHtmlTemplate markup are unchanged except exporting atsHtmlTemplate"
    - "ATS TXT is single-column ASCII: hyphen bullets, ASCII hyphen date ranges, no tabs, no box-drawing, no glyph bullets"
    - "ATS MD uses # name, ## section headers, - bullets, no tables, no HTML passthrough or HTML entities"
    - "Optional/empty fields never produce empty headers, empty lists, dangling | separators, or empty bold/header fragments (Parental Leave empty role/bullets)"
    - "resolveOutputPaths returns designed, ats, atsHtml, atsTxt, atsMd with the existing ATS filename family"
  artifacts:
    - path: src/lib/ats-text.ts
      provides: "serializeAtsTxt and serializeAtsMd pure serializers"
      exports: ["serializeAtsTxt", "serializeAtsMd"]
    - path: src/lib/ats-text.test.ts
      provides: "node:test coverage for three fixtures plus empty-section skip"
    - path: src/lib/render.ts
      provides: "exported atsHtmlTemplate plus five-key resolveOutputPaths"
      exports: ["atsHtmlTemplate", "resolveOutputPaths"]
    - path: src/cli/index.ts
      provides: "Step H writes HTML/TXT/MD and logs Written: for all five paths"
  key_links:
    - from: src/cli/index.ts
      to: src/lib/ats-text.ts
      via: "writeFile(paths.atsTxt, serializeAtsTxt(data)) and writeFile(paths.atsMd, serializeAtsMd(data))"
      pattern: "serializeAts(Txt|Md)"
    - from: src/cli/index.ts
      to: src/lib/render.ts
      via: "writeFile(paths.atsHtml, atsHtmlTemplate(data)) and resolveOutputPaths five keys"
      pattern: "atsHtmlTemplate"
    - from: src/lib/render.ts
      to: resolveOutputPaths return
      via: "atsHtml/atsTxt/atsMd join the same suffix as ats.pdf with swapped extensions"
      pattern: "atsHtml"
---

<objective>
Close STC-144: persist the existing ATS HTML and add ResumeData → .txt / .md serializers, then write all three next to the two PDFs through resolveOutputPaths and the CLI.

Purpose: STC-139 already decided ATS outputs are semantic HTML + txt + md (no docx). atsHtmlTemplate() is correct but never lands on disk; renderAts() only writes a PDF. This plan persists HTML and adds the two missing text formats without changing either PDF template.

Output: src/lib/ats-text.ts serializers, exported atsHtmlTemplate, five-key resolveOutputPaths, CLI + smoke-render writes, unit tests against the three fixtures.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@src/lib/render.ts
@src/schema/resume.ts
@src/cli/index.ts
@src/lib/render.test.ts
@scripts/smoke-render.ts
@fixtures/sample-resume.json
@fixtures/ez-cater-tailored.json
@fixtures/two-column-acceptance.json

Locked from Linear STC-144 / STC-139:
- Persist existing atsHtmlTemplate() as .html. Export it if needed. Do not change designedHtmlTemplate or atsHtmlTemplate markup (export-only exception).
- Keep rendering the ATS PDF (fourth/fifth output alongside designed PDF). No .docx.
- New module src/lib/ats-text.ts for serializeAtsTxt + serializeAtsMd. Do not grow render.ts (~622 lines) with serializers.
- Route all three text paths through resolveOutputPaths. Extend return shape from {designed, ats} to also include atsHtml, atsTxt, atsMd.
- Filename family: {nameSlug}-resume{optional -company}{optional -date}-ats.{pdf,html,txt,md}
- ASCII hyphen " - " in both txt and md date ranges (discretion: same glyph-free punctuation in both text formats).
- CLI Step H currently writes only two PDFs; this task MUST writeFile the three text files and log Written: lines. Update smoke-render.ts similarly.

<interfaces>
From src/schema/resume.ts — ResumeData (z.infer ResumeSchema). Optional/empty-prone fields the serializers must handle:

contact.headline?: string
contact.website?: string
summary?: string
coreCompetencies?: string[]
selectedWork?: { url: string; password?: string }
experience[].role?: string   // empty string in fixtures = Parental Leave
experience[].industry?: string
experience[].via?: string
experience[].location?: string
experience[].endDate?: string
experience[].bullets: string[]   // may be []
experience[].engagements?: { company, role?, industry?, via?, startDate, endDate?, bullets }[]
additionalExperience?: string[]
education: array (required; skip section if empty)
skills: array (required; skip section if empty)

From src/lib/render.ts (current contracts — update in Task 2):

export function resolveOutputPaths(
  candidateName: string,
  outputDir: string,
  companySlug?: string,
  date?: string,
): { designed: string; ats: string };

function atsHtmlTemplate(data: ResumeData): string;  // currently unexported
export async function renderAts(data, outputPath, browser): Promise<void>;  // keep calling atsHtmlTemplate; still writes PDF

Target resolveOutputPaths return (Task 2):

{ designed, ats, atsHtml, atsTxt, atsMd }

All five share join(outputDir, `${nameSlug}-resume${suffix}…`) where suffix is `-${companySlug}` and/or `-${date}` as today. designed stays `.pdf` with no -ats. The four ATS family files use `-ats.pdf` / `-ats.html` / `-ats.txt` / `-ats.md`.

From src/cli/index.ts Step H today: resolveOutputPaths → renderDesigned + renderAts → two Written: logs. writeFile is already imported (init command).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: serializeAtsTxt and serializeAtsMd</name>
  <files>src/lib/ats-text.ts, src/lib/ats-text.test.ts</files>
  <behavior>
    - present(value) is true only for non-empty trimmed strings; undefined and "" are absent
    - serializeAtsTxt(sample-resume.json) contains "Alex Rivera", a contact line with " | " joins, "SUMMARY", hyphen bullets starting "- ", and ASCII "Jan 2022 - Present"
    - serializeAtsMd(sample-resume.json) starts with "# Alex Rivera", uses "## Summary" / "## Experience" / "## Education" / "## Skills", uses "- " bullets, contains no "&lt;" / "&amp;" / "&gt;" entities and no "&lt;table"
    - Empty-string role (Parental Leave in two-column-acceptance.json and ez-cater-tailored.json) emits the company name and date range without an empty bold/header fragment and without an empty list
    - Missing optional sections (no summary / no coreCompetencies / no selectedWork / no additionalExperience) omit those headers entirely
    - two-column-acceptance.json txt/md include headline, website, industry, via, location, nested engagements, selectedWork URL and password
    - txt contains no tab, no •, no en-dash, no em-dash, no box-drawing characters introduced by the serializer
  </behavior>
  <action>
    Create src/lib/ats-text.ts exporting serializeAtsTxt(data: ResumeData): string and serializeAtsMd(data: ResumeData): string. Import ResumeData from ../schema/resume.js only. Do not import puppeteer, escapeHtml, or anything from render.ts. Do not emit HTML entities in either serializer (no escapeHtml). Do not pass through or generate raw HTML in markdown.

    Shared helpers (module-private): present(s) is typeof s === "string" && s.trim() !== "". joinPresent(parts, sep) filters with present then joins. asciiDateRange(start, end?) returns start + " - " + (present(end) ? end : "Present") using U+002D hyphen-minus only, never U+2013 or U+2014. Treat whitespace-only the same as absent.

    Contact block, both formats: first line is contact.name. If present(contact.headline), it is the next line as plain text (not a heading, not in the pipe line). Then one contact line joining present fields in this order with " | ": email, phone, location, website, linkedin, github. Skip missing/empty. Do not put the name or headline on the pipe line.

    selectedWork: if absent, skip entirely (no header). If present, one line: Selected work: {url} and append " (password: {password})" only when present(password).

    Skip these sections entirely when absent or empty: summary, coreCompetencies, additionalExperience, selectedWork. education and skills are required arrays on the schema; still skip the section header if the array length is 0.

    Experience entries: heading parts joined with " | " from present(role), company, present(industry), present(via), present(location), asciiDateRange(startDate, endDate). Empty-string role (Parental Leave) must drop out so the line starts with the company, never " | Parental Leave" and never "** |" / empty strong. If bullets length is 0, emit no list and no stray "- " line. Nested engagements render after the parent with one extra blank line between parent and engagement (and between engagements). Do not use tabs or CSS-style indent. Include via/industry/location on engagements only when present — do not invent a synthetic "Client engagement" label when via is absent (atsHtmlTemplate does that; text formats must not).

    additionalExperience: own section after Experience when the array is non-empty (ADDITIONAL EXPERIENCE / ## Additional Experience), hyphen/- bullets. Not nested as an h3 inside Experience (HTML template stays as-is).

    TXT specifics: section headers in plain caps — SUMMARY, CORE COMPETENCIES, EXPERIENCE, ADDITIONAL EXPERIENCE, EDUCATION, SKILLS. Core competencies as one pipe-joined line (match ATS HTML). Skills as Category: item, item. Education as degree | institution | year. Bullets are "- " + text. Single column. No glyph bullets (U+2022 or similar), no box-drawing, no tabs.

    MD specifics: "# " + name. Headline remains a plain paragraph line. Section headers are ## Summary, ## Core Competencies, ## Experience, ## Additional Experience, ## Education, ## Skills. Experience/education headings may use **joined parts** for the entry line. Bullets are "- " + text. Core competencies as a markdown list (one "- " item each), not a table. Skills as **Category:** item, item. No tables. If a field contains markdown-significant characters, leave them as plain text; do not HTML-escape them. Dates still use ASCII " - ".

    Blank lines: one blank line between major blocks; no trailing dangling " | "; no consecutive empty headers. End the file with a single trailing newline.

    Tests in src/lib/ats-text.test.ts with node:test (same style as src/lib/render.test.ts: assert from node:assert/strict, describe/it, readFile + JSON.parse + ResumeSchema.parse for fixtures). Load fixtures/sample-resume.json, fixtures/ez-cater-tailored.json, fixtures/two-column-acceptance.json. Do not launch Puppeteer.

    Cover: (1) all three fixtures serialize in both formats without empty section headers or dangling separators; (2) txt has no tab/box-drawing/glyph-bullet/en-dash/em-dash characters in serializer-owned punctuation (scan the output for \t, U+2022, U+2013, U+2014, U+2500-U+257F); source copy such as a middot inside an industry string may remain; (3) md has # name, ## sections, - bullets, and no "<table" / "<img"; (4) two-column-acceptance includes headline "Senior Product Designer", website studiocartelli.com, industry "Product and design consultancy", via "Client engagement", location "Remote", nested "Bluefish AI" after "Studio Cartelli", "Selected work:" + url + password; (5) Parental Leave in two-column-acceptance and ez-cater-tailored: company and dates present, no empty list after it, no empty bold/header fragment — assert the serialized string does not match /\*\*\s*\*\*/ and does not contain a line that is only "| " / " |"; (6) a mutated copy of sample-resume with summary/coreCompetencies deleted and education/skills = [] omits SUMMARY/## Summary, CORE COMPETENCIES/## Core Competencies, EDUCATION/## Education, SKILLS/## Skills; (7) empty bullets array does not emit an empty "- " item.
  </action>
  <verify>
    <automated>npx tsx --test src/lib/ats-text.test.ts</automated>
  </verify>
  <done>serializeAtsTxt and serializeAtsMd are pure functions covering every optional schema field; three fixtures plus empty-section cases pass; no Puppeteer in this test file.</done>
</task>

<task type="auto">
  <name>Task 2: Export atsHtmlTemplate and extend resolveOutputPaths</name>
  <files>src/lib/render.ts, src/lib/render.test.ts</files>
  <action>
    In src/lib/render.ts change function atsHtmlTemplate to export function atsHtmlTemplate. Do not edit designedHtmlTemplate. Do not change atsHtmlTemplate markup, CSS, section order, or interpolation — export only. renderAts must keep calling atsHtmlTemplate and writing the ATS PDF.

    Extend resolveOutputPaths return type to { designed: string; ats: string; atsHtml: string; atsTxt: string; atsMd: string }. Keep designed and ats PDF paths byte-identical to today. Add the three ATS-family paths with the same nameSlug-resume${suffix}-ats stem and extensions .html / .txt / .md. Update the JSDoc example to list all five paths.

    In src/lib/render.test.ts, keep every existing designed/ats assertion. In each resolveOutputPaths it() also assert the new keys: Test 1 atsHtml/atsTxt/atsMd are /some/output/dir/pat_cartelli-resume-ats.html|.txt|.md; Test 2 basenames alex_rivera-resume-Acme-Corp-ats.html|.txt|.md and same dirname as designed; Test 4 pat_cartelli-resume-EZCater-2026-07-31-ats.html|.txt|.md; Test 5 date-only pat_cartelli-resume-2026-07-31-ats.html|.txt|.md. Add one it() that imports atsHtmlTemplate, runs it on all three fixtures (ResumeSchema.parse), and asserts: includes contact.name; no "&lt;table" and no "&lt;img"; two-column-acceptance HTML includes "Patrick Cartelli" and "Senior Product Designer". Do not add Puppeteer to these new assertions.
  </action>
  <verify>
    <automated>npx tsx --test src/lib/render.test.ts src/lib/ats-text.test.ts</automated>
  </verify>
  <done>atsHtmlTemplate is exported without markup changes; resolveOutputPaths returns five paths; existing PDF path tests still pass; HTML persist-shape tests pass without Puppeteer.</done>
</task>

<task type="auto">
  <name>Task 3: CLI and smoke-render write the three text files</name>
  <files>src/cli/index.ts, src/cli/index.test.ts, scripts/smoke-render.ts</files>
  <action>
    src/cli/index.ts Step H: after the existing renderDesigned/renderAts PDF pair (keep both), write the three text files with writeFile (already imported) as UTF-8: paths.atsHtml from atsHtmlTemplate(data), paths.atsTxt from serializeAtsTxt(data), paths.atsMd from serializeAtsMd(data). Import atsHtmlTemplate from ../lib/render.js alongside the existing render imports. Import serializeAtsTxt and serializeAtsMd from ../lib/ats-text.js. Log five Written: lines (designed, ats, atsHtml, atsTxt, atsMd). Do not skip the ATS PDF. Do not add .docx. mkdir(outputDir) already runs before Step H — reuse it; the text files share that directory.

    src/cli/index.test.ts: add a source-level it() that readFileSync src/cli/index.ts and asserts the source contains serializeAtsTxt, serializeAtsMd, atsHtmlTemplate, writeFile(paths.atsHtml, writeFile(paths.atsTxt, writeFile(paths.atsMd, and Written: ${paths.atsHtml} (plus atsTxt and atsMd). Do not spawn a live Claude extract for this.

    scripts/smoke-render.ts: call resolveOutputPaths(data.contact.name, tmp) so the first argument is the candidate name (current first arg is a leftover synthetic .md path). Destructure designed, ats, atsHtml, atsTxt, atsMd. After the PDF renders (keep both), writeFile the three text outputs using atsHtmlTemplate / serializeAtsTxt / serializeAtsMd. stat all five files; PDFs remain size > 1000; text files size > 0. Console-log all five paths. Do not add a fifth Puppeteer render.
  </action>
  <verify>
    <automated>npx tsx --test src/cli/index.test.ts src/lib/ats-text.test.ts src/lib/render.test.ts && npm run typecheck</automated>
  </verify>
  <done>A normal CLI run writes five files and five Written: lines; smoke-render writes and stats the same five; ATS PDF rendering is unchanged.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| ResumeData → text files on disk | Validated JSON (already schema-checked) is serialized to local HTML/TXT/MD beside the PDFs |
| ResumeData → atsHtmlTemplate HTML | Untrusted resume strings interpolated into HTML (existing T-03-01 surface; persist as-is) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-144-01 | Information Disclosure | writeFile of .html/.txt/.md | accept | Local CLI writing the user's own resume next to PDFs they already requested; no network exfil |
| T-144-02 | Tampering / XSS | atsHtmlTemplate persist | mitigate | Do not rewrite HTML; persist atsHtmlTemplate output which already runs every ResumeData string through module-local escapeHtml before interpolation |
| T-144-03 | Tampering | serializeAtsTxt / serializeAtsMd | mitigate | Do not call escapeHtml (entities would appear as literal &amp; in ATS parsers). Do not emit raw HTML tags. Leave field text as plain text |
| T-144-04 | Elevation of Privilege | resolveOutputPaths | accept | Paths stay under caller-supplied outputDir with existing toNameSlug/toCompanySlug; no new path inputs |
| T-144-SC | Tampering | npm/pip/cargo installs | accept | No new packages |
</threat_model>

<verification>
npx tsx --test src/lib/ats-text.test.ts src/lib/render.test.ts src/cli/index.test.ts
npm run typecheck
Confirm designedHtmlTemplate body is untouched and atsHtmlTemplate differs only by the export keyword.
Confirm src/lib/ats-text.ts does not import puppeteer or escapeHtml.
</verification>

<success_criteria>
- resolveOutputPaths returns designed, ats, atsHtml, atsTxt, atsMd with the locked filename family
- atsHtmlTemplate is exported; its markup is otherwise unchanged; renderAts still writes the ATS PDF
- serializeAtsTxt / serializeAtsMd handle every optional schema field, skip empty sections, and omit empty Parental Leave role/list fragments
- CLI Step H and smoke-render write the three text files and surface their paths
- Unit tests cover the three fixtures without Puppeteer on the new serializers
- No .docx
</success_criteria>

<output>
Create `.planning/quick/260820-kyb-emit-ats-text-outputs-html-txt-md-persis/260820-kyb-SUMMARY.md` when done
</output>
