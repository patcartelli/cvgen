// src/schema/validate.ts
import type { ResumeData } from "./resume.js";
import { ResumeSchema } from "./resume.js";

function formatZodErrors(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): string {
  return issues
    .map((issue) => {
      const path = issue.path
        .map((p, i) =>
          typeof p === "number" ? `[${p}]` : i === 0 ? String(p) : `.${String(p)}`,
        )
        .join("");
      return `  ${path || "(root)"}: ${issue.message}`;
    })
    .join("\n");
}

export function validateResume(data: unknown): ResumeData {
  const result = ResumeSchema.safeParse(data);
  if (!result.success) {
    const formatted = formatZodErrors(result.error.issues);
    throw new Error(`Resume validation failed:\n${formatted}`);
  }
  return result.data;
}
