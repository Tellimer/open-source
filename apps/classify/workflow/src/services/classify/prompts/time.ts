/**
 * Time inference prompts and schemas
 */

import { z } from "zod";

export const timeInferenceSchema = z.object({
  reportingFrequency: z.enum([
    "daily",
    "monthly",
    "quarterly",
    "annual",
    "point-in-time",
  ]),
  timeBasis: z.enum(["per-period", "point-in-time", "cumulative"]),
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
  sourceUsed: z.enum(["units", "periodicity", "time-series", "unknown"]),
});

export function createTimeInferencePrompt(input: {
  name: string;
  units?: string;
  periodicity?: string;
  timeSeriesFrequency?: string;
}): string {
  return `Indicator: ${input.name}
Units: ${input.units || "N/A"}
Periodicity: ${input.periodicity || "N/A"}
Time series analysis: ${
    input.timeSeriesFrequency || "N/A"
  } (detected from data points)

Determine reporting frequency:
1. Check units field for time indicators (per day, per year, annual, quarterly, etc.)
2. If not in units, use periodicity field
3. If neither has time info, use time series analysis
4. Validate: If periodicity conflicts with time series analysis, trust time series

Reporting frequency options:
- daily: Daily reporting
- monthly: Monthly reporting
- quarterly: Quarterly reporting
- annual: Annual/yearly reporting
- point-in-time: Snapshot (no regular frequency)

Time basis (how values accumulate):
- per-period: Rate/flow during period
- point-in-time: Snapshot at moment
- cumulative: Running total (YTD)

IMPORTANT: Return ONLY valid JSON matching this schema:
{
  "reportingFrequency": "daily" | "monthly" | "quarterly" | "annual" | "point-in-time",
  "timeBasis": "per-period" | "point-in-time" | "cumulative",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "sourceUsed": "units" | "periodicity" | "time-series" | "unknown"
}`;
}
