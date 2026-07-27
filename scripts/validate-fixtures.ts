import { readFileSync } from "fs";
import { ResumeSchema } from "../src/schema/resume.js";

const valid = JSON.parse(readFileSync("fixtures/sample-resume.json", "utf8"));
const malformed = JSON.parse(readFileSync("fixtures/sample-resume-malformed.json", "utf8"));

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
console.log("Validation errors:", malformedResult.error.format());
