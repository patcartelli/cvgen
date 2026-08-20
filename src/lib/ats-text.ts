import type { ResumeData } from "../schema/resume.js";

function present(s: unknown): s is string {
  return typeof s === "string" && s.trim() !== "";
}

function joinPresent(parts: ReadonlyArray<string | undefined>, sep: string): string {
  return parts.filter(present).join(sep);
}

function asciiDateRange(start: string, end?: string): string {
  return `${start} - ${present(end) ? end : "Present"}`;
}

type ExperienceLike = ResumeData["experience"][number];

function experienceHeading(exp: ExperienceLike): string {
  return joinPresent(
    [
      exp.role,
      exp.company,
      exp.industry,
      exp.via,
      exp.location,
      asciiDateRange(exp.startDate, exp.endDate),
    ],
    " | ",
  );
}

function formatExperienceEntry(
  exp: ExperienceLike,
  wrapHeading: (heading: string) => string,
): string {
  const lines = [wrapHeading(experienceHeading(exp))];
  for (const bullet of exp.bullets) {
    if (present(bullet)) {
      lines.push(`- ${bullet}`);
    }
  }
  const parent = lines.join("\n");
  const engagements = (exp.engagements ?? []).map((eng) => formatExperienceEntry(eng, wrapHeading));
  if (engagements.length === 0) {
    return parent;
  }
  return [parent, ...engagements].join("\n\n");
}

function contactBlock(data: ResumeData, nameLine: string): string {
  const { contact } = data;
  const lines = [nameLine];
  if (present(contact.headline)) {
    lines.push(contact.headline);
  }
  const pipe = joinPresent(
    [
      contact.email,
      contact.phone,
      contact.location,
      contact.website,
      contact.linkedin,
      contact.github,
    ],
    " | ",
  );
  if (present(pipe)) {
    lines.push(pipe);
  }
  return lines.join("\n");
}

function selectedWorkLine(data: ResumeData): string | undefined {
  if (!data.selectedWork) {
    return undefined;
  }
  const password = present(data.selectedWork.password)
    ? ` (password: ${data.selectedWork.password})`
    : "";
  return `Selected work: ${data.selectedWork.url}${password}`;
}

function joinBlocks(blocks: string[]): string {
  return `${blocks.filter((b) => b.length > 0).join("\n\n")}\n`;
}

export function serializeAtsTxt(data: ResumeData): string {
  const blocks: string[] = [contactBlock(data, data.contact.name)];

  const selected = selectedWorkLine(data);
  if (selected) {
    blocks.push(selected);
  }

  if (present(data.summary)) {
    blocks.push(`SUMMARY\n${data.summary}`);
  }

  const competencies = (data.coreCompetencies ?? []).filter(present);
  if (competencies.length > 0) {
    blocks.push(`CORE COMPETENCIES\n${competencies.join(" | ")}`);
  }

  if (data.experience.length > 0) {
    const entries = data.experience.map((exp) => formatExperienceEntry(exp, (h) => h));
    blocks.push(`EXPERIENCE\n${entries.join("\n\n")}`);
  }

  const additional = (data.additionalExperience ?? []).filter(present);
  if (additional.length > 0) {
    blocks.push(`ADDITIONAL EXPERIENCE\n${additional.map((item) => `- ${item}`).join("\n")}`);
  }

  if (data.education.length > 0) {
    const lines = data.education.map((edu) =>
      joinPresent([edu.degree, edu.institution, edu.year], " | "),
    );
    blocks.push(`EDUCATION\n${lines.join("\n")}`);
  }

  if (data.skills.length > 0) {
    const lines = data.skills.map((sg) => `${sg.category}: ${sg.items.filter(present).join(", ")}`);
    blocks.push(`SKILLS\n${lines.join("\n")}`);
  }

  return joinBlocks(blocks);
}

export function serializeAtsMd(data: ResumeData): string {
  const blocks: string[] = [contactBlock(data, `# ${data.contact.name}`)];

  const selected = selectedWorkLine(data);
  if (selected) {
    blocks.push(selected);
  }

  if (present(data.summary)) {
    blocks.push(`## Summary\n${data.summary}`);
  }

  const competencies = (data.coreCompetencies ?? []).filter(present);
  if (competencies.length > 0) {
    blocks.push(`## Core Competencies\n${competencies.map((c) => `- ${c}`).join("\n")}`);
  }

  if (data.experience.length > 0) {
    const entries = data.experience.map((exp) => formatExperienceEntry(exp, (h) => `**${h}**`));
    blocks.push(`## Experience\n${entries.join("\n\n")}`);
  }

  const additional = (data.additionalExperience ?? []).filter(present);
  if (additional.length > 0) {
    blocks.push(`## Additional Experience\n${additional.map((item) => `- ${item}`).join("\n")}`);
  }

  if (data.education.length > 0) {
    const lines = data.education.map(
      (edu) => `**${joinPresent([edu.degree, edu.institution, edu.year], " | ")}**`,
    );
    blocks.push(`## Education\n${lines.join("\n")}`);
  }

  if (data.skills.length > 0) {
    const lines = data.skills.map(
      (sg) => `**${sg.category}:** ${sg.items.filter(present).join(", ")}`,
    );
    blocks.push(`## Skills\n${lines.join("\n")}`);
  }

  return joinBlocks(blocks);
}
