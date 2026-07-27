// src/schema/validate.ts
// Phase 1 stub — Phase 2 implements full validation with error formatting
import type { ResumeData } from "./resume.js";
import { ResumeSchema } from "./resume.js";

export function validateResume(data: unknown): ResumeData {
  const result = ResumeSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid resume data: ${result.error.message}`);
  }
  return result.data;
}
