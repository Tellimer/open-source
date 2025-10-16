/**
 * Currency check prompts and schemas
 */

import { z } from "zod";

export const currencyCheckSchema = z.object({
  isCurrencyDenominated: z.boolean(),
  detectedCurrency: z.string().nullable(),
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
  reasoning: z.string(),
});

export function createCurrencyCheckPrompt(input: {
  name: string;
  units?: string;
  parsedCurrency: string | null;
}): string {
  return `Indicator: ${input.name}
Units: ${input.units || "N/A"}
Parsed currency: ${input.parsedCurrency || "N/A"}

Is this denominated in currency?
If yes, provide the currency code (USD, EUR, GBP, etc.)
If no, set detectedCurrency to null.

Provide your answer.`;
}
