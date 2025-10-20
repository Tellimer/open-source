/**
 * Final review prompts and schemas
 */

import { z } from "zod";

export const finalReviewSchema = z.object({
  reviewMakesSense: z.boolean(),
  correctionsApplied: z.record(z.unknown()),
  finalReasoning: z.string(),
  confidence: z
    .number()
    .min(0)
    .max(100) // Allow both 0-1 and 0-100 formats
    .transform((val) => {
      // Normalize to 0-1 range
      if (val > 1) {
        return Math.min(val / 100, 1);
      }
      return Math.min(val, 1);
    }),
});

export function createFinalReviewPrompt(input: {
  incorrectFields: string[];
  reviewReasoning: string;
  currentValues: Record<string, unknown>;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert economic indicator classification final reviewer.

Your task is to evaluate a previous review that flagged certain fields as incorrect, and determine if the review makes sense.

If the review is valid:
- Set reviewMakesSense to true
- Provide corrections for the incorrect fields in the correctionsApplied object
- Explain your reasoning in finalReasoning

If the review is NOT valid (the original classification was actually correct):
- Set reviewMakesSense to false
- Leave correctionsApplied as an empty object {}
- Explain why the original classification was correct in finalReasoning

IMPORTANT: Return ONLY valid JSON matching this exact schema:
=============================================================
{
  "reviewMakesSense": boolean,
  "correctionsApplied": object,  // Corrections for incorrect fields, or {} if review doesn't make sense
  "finalReasoning": "Clear explanation of your decision",
  "confidence": 0.0-1.0
}`;

  const userPrompt = `Please perform a final review of a classification that was flagged as incorrect:

FLAGGED FIELDS:
===============
Incorrect fields: ${input.incorrectFields.join(", ")}

REVIEW REASONING:
=================
${input.reviewReasoning}

CURRENT VALUES:
===============
${JSON.stringify(input.currentValues, null, 2)}

Does the review make sense? If yes, provide corrections. If no, explain why the original was correct.
Provide your final review as JSON.`;

  return { systemPrompt, userPrompt };
}
