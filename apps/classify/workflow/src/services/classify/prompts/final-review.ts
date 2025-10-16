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
}): string {
  return `Previous review flagged incorrect fields: ${
    input.incorrectFields.join(
      ", ",
    )
  }
Review reasoning: ${input.reviewReasoning}

Current values:
${JSON.stringify(input.currentValues, null, 2)}

Does the review make sense?
If yes, provide corrections for the incorrect fields in correctionsApplied object.
If no, explain why in finalReasoning and leave correctionsApplied empty.

Provide your answer.`;
}
