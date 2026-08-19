// src/lib/extract.ts

import type { ParsedMessage } from "@anthropic-ai/sdk";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod.js";
import type { ResumeData } from "../schema/resume.js";
import { ExtractionResumeSchema } from "../schema/resume.js";

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
    system: [
      "Extract the resume data from this markdown document.",
      "Use only content present in the source. Never invent bullets, job titles, or employment types.",
      "",
      "Each experience entry has a meta line beneath its heading with pipe-separated parts:",
      "a date range, optionally a work location such as 'Remote', and optionally 'Industry: <label>'.",
      "Split that line: the date range fills startDate and endDate, the location fills location,",
      "and the text after the 'Industry:' prefix fills industry. A meta line may carry any subset",
      "of the three, in any order. Never put the industry label or the location into the dates.",
      "",
      "Relationship notes in parentheses on a heading or bold sub-heading, such as",
      "'(client engagement, April - June 2026)', '(advisory engagements, ...)' or",
      "'(Concurrent Contracts)', fill via. Capture only the relationship words, never the dates",
      "that may sit alongside them in the same parentheses.",
      "",
      "Bold sub-headings beneath an employer are that employer's client engagements: put them in",
      "that entry's engagements array and never repeat them as top-level experience entries.",
      "",
      "Every heading in the Experience section is an entry, including career breaks such as",
      "'Parental Leave' that carry no job title and no bullets. Keep them, in source order, with",
      "role set to an empty string and bullets set to an empty array. Never drop an entry just",
      "because it has no role or no bullets.",
    ].join("\n"),
    messages: [{ role: "user", content: markdown }],
    output_config: { format: zodOutputFormat(ExtractionResumeSchema) },
  });

  if (response.parsed_output === null) {
    throw new Error(
      "Claude returned a response that could not be parsed as structured resume data.",
    );
  }

  return { data: response.parsed_output, rawResponse: response };
}
