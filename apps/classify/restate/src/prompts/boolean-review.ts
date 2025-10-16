/**
 * Boolean review prompts and schemas
 */

import { z } from "zod";

export const booleanReviewSchema = z.object({
  isCorrect: z.boolean(),
  incorrectFields: z.array(z.string()),
  reasoning: z.string(),
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

export function createBooleanReviewPrompt(input: {
  name: string;
  timeBasis: string;
  scale: string;
  isCurrency: boolean;
  family: string;
  type: string;
  temporalAgg: string;
}): string {
  return `Review classification:

Indicator: ${input.name}
Time basis: ${input.timeBasis}
Scale: ${input.scale}
Currency: ${input.isCurrency ? "yes" : "no"}
Family: ${input.family}
Type: ${input.type}
Temporal aggregation: ${input.temporalAgg}

Is this correct?
If no, which fields are incorrect? Provide field names in incorrectFields array.

Provide your answer.`;
}
