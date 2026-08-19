import { z } from "zod";

const ContactSchema = z.object({
  name: z.string(),
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

const EngagementSchema = z
  .object({
    client: z
      .string()
      .describe(
        "Name of a nested client engagement under this employer (e.g. 'Bluefish AI'). This is not a separate job and must not also appear as a top-level experience entry.",
      ),
    role: z
      .string()
      .describe("Role at the client. Empty string if the source has no role on this engagement."),
    startDate: z.string(),
    endDate: z.string().optional(),
    bullets: z
      .array(z.string())
      .describe(
        "Only bullets written under this engagement in the source. Empty array if none. Never invent bullets.",
      ),
  })
  .describe(
    "A client engagement nested inside a consultancy or studio. Bold or indented blocks under an employer belong here, not as sibling experience entries.",
  );

const ExperienceSchema = z.object({
  role: z.string().describe("Job title. Empty string for non-role entries such as Parental Leave."),
  company: z.string(),
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
