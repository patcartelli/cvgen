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

const ExperienceSchema = z.object({
  role: z.string(),
  company: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  type: z.enum(["full-time", "contract"]).optional(),
  bullets: z.array(z.string()),
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
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  skills: z.array(SkillGroupSchema),
});

export type ResumeData = z.infer<typeof ResumeSchema>;
