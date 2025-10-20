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
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert economic indicator classification reviewer.

Your task is to review the classification of an economic indicator and determine if it is correct.

Review the following fields:
- Time basis (per-period, point-in-time, per-capita, etc.)
- Scale (millions, billions, percentage, etc.)
- Currency (whether the indicator is currency-denominated)
- Family (the high-level category of the indicator)
- Type (the specific type within the family)
- Temporal aggregation (how the data is aggregated over time)

IMPORTANT: Return ONLY valid JSON matching this exact schema:
=============================================================
{
  "isCorrect": boolean,
  "incorrectFields": string[],  // Array of field names that are incorrect (e.g., ["family", "type"])
  "reasoning": "Clear explanation of why the classification is correct or which fields are wrong",
  "confidence": 0.0-1.0
}`;

  const userPrompt = `Please review this economic indicator classification:

INDICATOR INFORMATION:
======================
Indicator: ${input.name}
Time basis: ${input.timeBasis}
Scale: ${input.scale}
Currency: ${input.isCurrency ? "yes" : "no"}
Family: ${input.family}
Type: ${input.type}
Temporal aggregation: ${input.temporalAgg}

Is this classification correct? If not, which fields are incorrect?
Provide your review as JSON.`;

  return { systemPrompt, userPrompt };
}
