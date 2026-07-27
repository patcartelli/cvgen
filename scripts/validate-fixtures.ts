import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ResumeSchema } from "../src/schema/resume.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const valid = JSON.parse(readFileSync(join(root, "fixtures/sample-resume.json"), "utf8"));
const malformed = JSON.parse(
  readFileSync(join(root, "fixtures/sample-resume-malformed.json"), "utf8"),
);

const validResult = ResumeSchema.safeParse(valid);
if (!validResult.success) {
  console.error("sample-resume.json failed validation:", validResult.error.format());
  process.exit(1);
}
console.log("sample-resume.json: VALID");

const malformedResult = ResumeSchema.safeParse(malformed);
if (malformedResult.success) {
  console.error("sample-resume-malformed.json unexpectedly passed validation");
  process.exit(1);
}
console.log("sample-resume-malformed.json: correctly INVALID");
if (!malformedResult.success) {
  console.log("Validation errors:", malformedResult.error.format());
}
