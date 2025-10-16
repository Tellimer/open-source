/**
 * Type classification prompts and schemas
 */

import { z } from "zod";

export const typeClassificationSchema = z.object({
  indicatorType: z.enum([
    "stock",
    "flow",
    "balance",
    "capacity",
    "volume",
    "count",
    "percentage",
    "ratio",
    "spread",
    "share",
    "price",
    "yield",
    "rate",
    "volatility",
    "gap",
    "index",
    "correlation",
    "elasticity",
    "multiplier",
    "duration",
    "probability",
    "threshold",
    "sentiment",
    "allocation",
    "other",
  ]),
  temporalAggregation: z.enum([
    "point-in-time",
    "period-rate",
    "period-cumulative",
    "period-average",
    "period-total",
    "not-applicable",
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

export function createTypeClassificationPrompt(input: {
  name: string;
  family: string;
  timeBasis: string;
  scale: string;
}): string {
  const familyTypesList = getFamilySpecificTypes(input.family);

  return `Indicator: ${input.name}
Family: ${input.family}
Time basis: ${input.timeBasis}
Scale: ${input.scale}

Classify type:
${familyTypesList}

Also determine temporal aggregation:
- point-in-time: Snapshot value
- period-rate: Rate during period
- period-cumulative: Cumulative total
- period-average: Average over period
- period-total: Sum over period
- not-applicable: No temporal aspect

Provide your answer.`;
}

function getFamilySpecificTypes(family: string): string {
  const typesByFamily: Record<string, string[]> = {
    "physical-fundamental": ["stock", "flow", "balance", "capacity", "volume"],
    "numeric-measurement": ["count", "percentage", "ratio", "spread", "share"],
    "price-value": ["price", "yield", "rate"],
    "change-movement": ["rate", "volatility", "gap"],
    "composite-derived": ["index", "correlation", "elasticity", "multiplier"],
    temporal: ["duration", "probability", "threshold"],
    qualitative: ["sentiment", "allocation"],
  };

  const types = typesByFamily[family] || ["other"];
  return types.map((t) => `- ${t}`).join("\n");
}
