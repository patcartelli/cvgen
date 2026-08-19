import { z } from "zod";

// IMPORTANT: always write `.describe(...).optional()`, never
// `.optional().describe(...)`. The SDK's zodOutputFormat hoists the latter into
// a `$defs` entry AND silently drops the description, so the extraction model
// never sees the guidance — and enough of them together trip the API's
// "Schema is too complex" limit. Descriptions are the only prompt signal
// extract.ts sends, so losing them silently breaks extraction quality.

const ContactSchema = z.object({
  name: z.string(),
  headline: z
    .string()
    .describe("Headline line under the name, e.g. 'Senior Product Designer'. Not a job entry.")
    .optional(),
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
  role: z.string().describe("Job title. Omit for non-role entries like Parental Leave.").optional(),
  company: z.string(),
  industry: z
    .string()
    .describe("Value after the 'Industry:' prefix in the meta line. Omit if absent.")
    .optional(),
  via: z
    .string()
    .describe(
      "Relationship words from a parenthetical, e.g. 'client engagement', 'advisory engagements', 'Concurrent Contracts'. Source wording, no dates.",
    )
    .optional(),
  location: z.string().describe("Where performed, e.g. 'Remote'. Omit if absent.").optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  bullets: z
    .array(z.string())
    .describe("Only this employer's own bullets, not a nested client's. Never invent."),
};

// Deliberately a SUBSET of experienceBase, not all of it. Duplicating every
// field into the nested object pushes the generated JSON schema past the
// structured-output API's complexity limit ("Schema is too complex", a 400 that
// arrives ~30s into the request). `location` is dropped because no engagement has
// ever carried one; industry and via are kept because the acceptance fixture
// needs both on Bluefish AI.
const EngagementSchema = z
  .object({
    role: experienceBase.role,
    company: experienceBase.company,
    industry: experienceBase.industry,
    via: experienceBase.via,
    startDate: experienceBase.startDate,
    endDate: experienceBase.endDate,
    bullets: experienceBase.bullets,
  })
  .describe(
    "Client engagement nested in a consultancy. `company` is the client. Never also a top-level experience entry.",
  );

const ExperienceSchema = z.object({
  ...experienceBase,
  engagements: z
    .array(EngagementSchema)
    .describe(
      "Nested client engagements from bold sub-blocks. Omit them from the top-level experience array.",
    )
    .optional(),
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
  selectedWork: CaseStudySchema.describe(
    "Header-level portfolio link with optional password.",
  ).optional(),
  experience: z.array(ExperienceSchema),
  additionalExperience: z.array(z.string()).optional(),
  education: z.array(EducationSchema),
  skills: z.array(SkillGroupSchema),
});

// ---------------------------------------------------------------------------
// Extraction schema
// ---------------------------------------------------------------------------
// The structured-output API rejects ResumeSchema with "Schema is too complex"
// (a 400 that can take ~30s to come back). ResumeSchema stays the full contract
// for validation, typing, and rendering; extraction sends this leaner twin.
//
// Every field it omits relative to ResumeSchema is optional, so anything this
// schema produces still satisfies ResumeSchema.
//
// If you add a field here, re-check the complexity limit — it is close.

const extractionBase = {
  // Required here, unlike ResumeSchema. Every optional property multiplies the
  // constrained-decoding grammar the API compiles, and too many of them fail the
  // request with "Grammar compilation timed out". The empty-string convention
  // keeps the grammar small; ResumeSchema still accepts an absent role.
  role: z.string().describe("Job title. Empty string for non-role entries like Parental Leave."),
  company: experienceBase.company,
  // industry/via/location are REQUIRED here with an empty-string convention,
  // unlike ResumeSchema where they are optional. Two reasons, both learned the
  // hard way: the model silently skips optional fields (two full runs returned
  // none of these), and every optional property enlarges the constrained-decoding
  // grammar until the request fails with "Grammar compilation timed out".
  // Empty string means "not in the source" and is falsy, so the templates that
  // test `exp.industry ? ... : ""` treat it exactly like an absent value.
  industry: z
    .string()
    .describe(
      "Text after the 'Industry:' prefix in the entry's meta line. Always fill this when that prefix is present. Empty string only if it is absent.",
    ),
  via: z
    .string()
    .describe(
      "Relationship words from a parenthetical on the heading, copied verbatim with the source's own capitalization (e.g. 'Client engagement', 'Advisory engagements'). Words only, never the dates beside them. Empty string if there is no such note.",
    ),
  location: z
    .string()
    .describe(
      "Work location from the meta line, e.g. 'Remote'. Empty string if the meta line has none.",
    ),
  startDate: experienceBase.startDate,
  endDate: experienceBase.endDate,
  bullets: experienceBase.bullets,
};

const ExtractionEngagementSchema = z
  .object({
    role: extractionBase.role,
    company: extractionBase.company,
    industry: extractionBase.industry,
    via: extractionBase.via,
    startDate: extractionBase.startDate,
    endDate: extractionBase.endDate,
    bullets: extractionBase.bullets,
  })
  .describe(
    "Client engagement nested in a consultancy. `company` is the client. Never also a top-level experience entry.",
  );

export const ExtractionResumeSchema = z.object({
  contact: ContactSchema,
  summary: z.string().optional(),
  coreCompetencies: z.array(z.string()).optional(),
  selectedWork: CaseStudySchema.describe(
    "Header-level portfolio link with optional password.",
  ).optional(),
  experience: z.array(
    z.object({
      ...extractionBase,
      engagements: z
        .array(ExtractionEngagementSchema)
        .describe(
          "Nested client engagements from bold sub-blocks. Omit them from the top-level experience array.",
        )
        .optional(),
    }),
  ),
  additionalExperience: z.array(z.string()).optional(),
  education: z.array(EducationSchema),
  skills: z.array(SkillGroupSchema),
});

export type ResumeData = z.infer<typeof ResumeSchema>;
