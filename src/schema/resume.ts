import { z } from "zod";

const ContactSchema = z.object({
  name: z.string(),
  headline: z
    .string()
    .optional()
    .describe(
      "Short professional headline shown directly under the name (e.g. 'Senior Product Designer'). This is the candidate's current title or positioning line, not a job entry.",
    ),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  linkedin: z.string(),
  github: z.string(),
  website: z.string().optional(),
});

const CaseStudySchema = z.object({
  url: z.string(),
  password: z.string().optional(),
});

// Fields shared by a top-level job and a nested client engagement. An engagement
// is exactly this shape; a top-level experience entry is this shape plus an
// optional `engagements` array. Nesting is one level deep only — an engagement
// can never itself contain engagements.
const experienceBase = {
  role: z
    .string()
    .optional()
    .describe(
      "Job title. Omit entirely for non-role entries such as Parental Leave or an unnamed advisory engagement.",
    ),
  company: z.string(),
  industry: z
    .string()
    .optional()
    .describe(
      "Short industry or sector label for this employer, rendered beside the company name (e.g. 'AI infrastructure', 'CPG trade promotion'). A few words at most, never a sentence. Omit if the source does not say.",
    ),
  via: z
    .string()
    .optional()
    .describe(
      "How this work was held, when the source says so (e.g. 'Client engagement', 'Advisory engagements', 'Concurrent contracts'). Use the source's own wording per entry; do not force consistent phrasing across entries. Omit if the source does not say.",
    ),
  location: z
    .string()
    .optional()
    .describe(
      "Where this role was performed (e.g. 'Remote', 'New York, NY'). Omit if the source does not say.",
    ),
  startDate: z.string(),
  endDate: z.string().optional(),
  type: z.enum(["full-time", "contract"]).optional(),
  bullets: z
    .array(z.string())
    .describe(
      "Only accomplishment bullets present in the source for this employer itself, not nested client work. Empty array if the source has none. Never invent bullets.",
    ),
  caseStudy: CaseStudySchema.optional().describe(
    "A case-study URL attached to this specific role. Do not put a header-level selected-work link here.",
  ),
};

const EngagementSchema = z
  .object(experienceBase)
  .describe(
    "A client engagement nested inside a consultancy or studio. Bold or indented blocks under an employer belong here, not as sibling experience entries. `company` is the client's name (e.g. 'Bluefish AI'). This is not a separate job and must not also appear as a top-level experience entry.",
  );

const ExperienceSchema = z.object({
  ...experienceBase,
  engagements: z
    .array(EngagementSchema)
    .optional()
    .describe(
      "Client engagements nested under this employer. If the markdown shows clients such as Bluefish AI under a studio or consultancy, put them here and omit them from the top-level experience array.",
    ),
});

const EducationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  year: z.string(),
});

const SkillGroupSchema = z.object({
  category: z.string(),
  items: z.array(z.string()),
});

export const ResumeSchema = z.object({
  contact: ContactSchema,
  summary: z.string().optional(),
  summaryHeading: z
    .string()
    .optional()
    .describe(
      "Heading shown above the summary. Defaults to 'Professional Summary' when the source does not name one.",
    ),
  coreCompetencies: z.array(z.string()).optional(),
  selectedWork: CaseStudySchema.optional().describe(
    "Header-level selected work or portfolio URL and optional password (e.g. 'Selected work: studiocartelli.com/work (password: ...)'). Not tied to a single job.",
  ),
  experience: z.array(ExperienceSchema),
  additionalExperience: z.array(z.string()).optional(),
  education: z.array(EducationSchema),
  skills: z.array(SkillGroupSchema),
});

export type ResumeData = z.infer<typeof ResumeSchema>;
