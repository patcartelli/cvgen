// src/lib/extract.ts

import type { ParsedMessage } from "@anthropic-ai/sdk";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod.js";
import type { ResumeData } from "../schema/resume.js";
import { ResumeSchema } from "../schema/resume.js";

export interface ExtractResult {
  data: ResumeData;
  rawResponse: ParsedMessage<ResumeData>;
}

export async function extractResume(markdown: string): Promise<ExtractResult> {
  const client = new Anthropic();
  // SDK reads ANTHROPIC_API_KEY from process.env at construction time

  const response = await client.messages.parse({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    system:
      "Extract the resume data from this markdown document. Use only content present in the source. Never invent bullets, job titles, or employment types.",
    messages: [{ role: "user", content: markdown }],
    output_config: { format: zodOutputFormat(ResumeSchema) },
  });

  if (response.parsed_output === null) {
    throw new Error(
      "Claude returned a response that could not be parsed as structured resume data.",
    );
  }

  return { data: response.parsed_output, rawResponse: response };
}
