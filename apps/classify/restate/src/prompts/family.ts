/**
 * Family assignment prompts and schemas
 */

import { z } from "zod";

export const familyAssignmentSchema = z.object({
  family: z.enum([
    "physical-fundamental",
    "numeric-measurement",
    "price-value",
    "change-movement",
    "composite-derived",
    "temporal",
    "qualitative",
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

export function createFamilyAssignmentPrompt(input: {
  name: string;
  description?: string;
  timeBasis: string;
  scale: string;
  isCurrency: boolean;
  sampleValues?: Array<{ date: string; value: number }>;
  sourceName?: string;
  categoryGroup?: string;
  dataset?: string;
  topic?: string;
}): string {
  // Analyze sample values if available
  let valueAnalysis = "N/A";
  if (input.sampleValues && input.sampleValues.length > 0) {
    const values = input.sampleValues.map((s) => s.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const hasNegatives = values.some((v) => v < 0);
    const allIntegers = values.every((v) => Number.isInteger(v));

    // Calculate volatility (coefficient of variation)
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0;

    valueAnalysis =
      `Range: [${min.toFixed(2)} to ${max.toFixed(2)}], Mean: ${
        mean.toFixed(2)
      }, ` +
      `Volatility: ${cv.toFixed(1)}% CV, ${
        hasNegatives ? "Has negatives" : "All positive"
      }, ` +
      `${allIntegers ? "Integers" : "Decimals"}`;
  }

  return `Indicator: ${input.name}
Description: ${input.description || "N/A"}
Source: ${input.sourceName || "N/A"}
Category Group: ${input.categoryGroup || "N/A"}
Dataset: ${input.dataset || "N/A"}
Topic: ${input.topic || "N/A"}
Time basis: ${input.timeBasis}
Scale: ${input.scale}
Currency: ${input.isCurrency ? "yes" : "no"}
Value patterns: ${valueAnalysis}

CLASSIFICATION GUIDANCE:

Examine the indicator characteristics and assign to the most appropriate family:

1. physical-fundamental: Physical stocks/flows/balances/capacity
   - Examples: GDP, Trade Balance, Reserves, Production Volume
   - Often: Currency-denominated economic aggregates or physical quantities
   - Look for: Balance/stock/flow terms, measures of economic activity or capacity

2. numeric-measurement: Counts/percentages/ratios/shares
   - Examples: Unemployment Rate, Population Count, Debt-to-GDP Ratio
   - Often: Percentages (0-100), ratios, counts (integers), shares
   - Look for: "Rate" as percentage, ratio terms, demographic counts

3. price-value: Prices/yields/interest rates/returns
   - Examples: Interest Rate, Bank Lending Rate, Policy Rate, Stock Price, Bond Yield, Exchange Rate
   - Often: Small positive values, decimal precision, relatively stable levels
   - Look for: "Rate" as price/cost, yield, return, price level terms, lending/borrowing/deposit rates
   - IMPORTANT: All interest rates, lending rates, borrowing rates, and policy rates belong here
   - These are PRICES for money/capital, NOT measures of change

4. change-movement: Growth rates/volatility/gaps/changes
   - Examples: GDP Growth Rate, Inflation Rate, Volatility Index
   - Often: Can be negative, shows change/movement over time
   - Look for: "Growth", "Change", volatility, gaps, percentage change
   - Note: This is for rates OF CHANGE, not price rates

5. composite-derived: Indices/scores/correlations/elasticities
   - Examples: Consumer Confidence Index, Stock Market Index
   - Often: Rebased to 100, composite measures, derived calculations
   - Look for: Index, composite, confidence, correlation terms

6. temporal: Durations/probabilities/thresholds
   - Examples: Time to Maturity, Default Probability
   - Look for: Time periods, probability measures, threshold values

7. qualitative: Sentiment/allocations/classifications
   - Examples: Credit Rating, Portfolio Allocation
   - Look for: Categorical data, sentiment, allocation percentages

CRITICAL DISTINCTIONS:

CURRENCY DENOMINATION CONSTRAINT:
If Currency = "yes", the indicator MUST be either:
• physical-fundamental (economic flows/stocks in monetary units, e.g., GDP, Trade Balance)
• price-value (prices in monetary units, e.g., Stock Price, Exchange Rate)
It CANNOT be numeric-measurement, change-movement, or composite-derived (these are dimensionless)

NOTE: Interest rates are percentages (not currency-denominated), but still belong in price-value

The word "Rate" appears in multiple families - distinguish carefully:
• "Bank Lending Rate", "Interest Rate", "Policy Rate" → price-value (price for capital)
  - These are percentages expressing the PRICE of borrowing/lending
  - Currency: no (they're percentages), but Family: price-value (they're prices)
• "GDP Growth Rate", "Inflation Rate" → change-movement (measures of change)
  - These are percentages expressing CHANGE over time
• "Unemployment Rate" → numeric-measurement (percentage of labor force)
  - This is a percentage expressing a RATIO/share

Key principle for "Rate" classification:
1. Contains "Lending/Borrowing/Interest/Policy/Deposit" → price-value (price of capital)
2. Contains "Growth/Change/Inflation" → change-movement (rate of change)
3. Is a demographic/economic ratio → numeric-measurement (percentage/ratio)

Example: "10% lending rate" = price, "10% GDP growth" = change, "10% unemployment" = ratio

Use the value patterns to validate your choice:
- High volatility + negatives often indicates change-movement
- Small positive decimals often indicates price-value rates
- 0-100 range often indicates numeric-measurement percentages
- Large values with currency often indicates physical-fundamental flows

⚠️ FLEXIBILITY FOR COUNTRY-SPECIFIC VARIATIONS:

While indicator NAMES provide strong patterns, countries may report the SAME indicator differently:

Example - "Wages":
- Most countries: physical-fundamental (currency-denominated wages paid)
- Some countries: composite-derived (wage index, not currency)
→ Let the actual units/description determine the family!

Example - "Employment":
- Most countries: numeric-measurement (count or percentage)
- Some countries: composite-derived (employment index)
→ If units say "index" or "2015=100", use composite-derived!

DECISION PROCESS:
1. Start with indicator NAME pattern as your hypothesis
2. Examine units, description, currency status, and sample values
3. If the data contradicts the pattern, OVERRIDE based on actual characteristics
4. Document: "Typically X family, but this country reports as Y because..."

The goal is ACCURACY for this specific country's reporting method, not rigid pattern adherence.

Provide your answer.`;
}
