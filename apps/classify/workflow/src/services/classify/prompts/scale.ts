/**
 * Scale inference prompts and schemas
 */

import { z } from "zod";

export const scaleInferenceSchema = z.object({
  scale: z.enum([
    "raw-units",
    "percent",
    "thousands",
    "millions",
    "billions",
    "index",
  ]),
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

export function createScaleInferencePrompt(input: {
  name: string;
  units?: string;
  parsedScale: string;
}): string {
  return `Indicator: ${input.name}
Units: ${input.units || "N/A"}
Parsed scale: ${input.parsedScale}

Confirm measurement scale:
- raw-units: Actual values
- percent: 0-100%
- thousands: ×1,000
- millions: ×1,000,000
- billions: ×1,000,000,000
- index: Base year = 100

Provide your answer.`;
}
