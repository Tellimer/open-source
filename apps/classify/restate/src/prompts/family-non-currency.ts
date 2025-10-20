/**
 * Family assignment prompts for NON-CURRENCY indicators
 * These indicators are dimensionless (percentages, ratios, indices, counts)
 */

import { z } from "zod";

/**
 * Get strong guidance based on parsed unit type
 */
function getUnitTypeGuidance(unitType: string | undefined): string {
  const guidance: Record<string, string> = {
    percentage: `
→ Strong indication: numeric-measurement OR price-value OR change-movement
→ If name contains "Lending/Interest/Policy Rate" → price-value (interest rates are prices)
→ If name contains "Growth/Inflation Rate" → change-movement (growth rates are changes)
→ If name contains "Unemployment/Tax/Participation Rate" → numeric-measurement (ratios)
→ Value range: Likely 0-100% or 0-20%`,
    index: `
→ Strong indication: composite-derived
→ Indices are almost always composite measures
→ Examples: CPI, Stock Index, PMI, Confidence Index
→ Value range: Often rebased to 100`,
    ratio: `
→ Strong indication: numeric-measurement
→ Ratios represent structural relationships between quantities
→ Examples: Debt-to-GDP, Loan-to-Value, P/E Ratio
→ Value range: Can be any number, often > 1`,
    count: `
→ Strong indication: numeric-measurement
→ Counts are absolute quantities of discrete items
→ Examples: Population, Number of firms, Household count
→ Value range: Positive integers`,
    rate: `
→ This is a per-unit rate (per 1000 people, per capita, etc.)
→ Strong indication: numeric-measurement
→ Examples: Births per 1000 people, Doses per 100 people
→ Value range: Depends on denominator`,
    duration: `
→ Strong indication: temporal
→ Measures time periods
→ Examples: Years to maturity, Duration, Time periods
→ Value range: Positive numbers representing time`,
    physical: `
→ Strong indication: This is a PHYSICAL measurement (energy, temperature, etc.)
→ This should probably be classified as currency-denominated (error in pipeline)
→ Or it's a rare case of physical units in non-monetary indicators`,
    unknown: `
→ Unit type could not be determined from parsing
→ Rely on name/description keywords and value patterns
→ Use all available context for classification`,
  };

  if (!unitType) return guidance.unknown as string;
  return (guidance[unitType] ?? guidance.unknown) as string;
}

export const familyAssignmentNonCurrencySchema = z.object({
  family: z.enum([
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

/**
 * Create optimized family assignment prompts for NON-CURRENCY indicators
 * System prompt: Static classification rules (100% cacheable)
 * User prompt: Variable indicator data
 */
export function createFamilyAssignmentNonCurrencyPrompt(input: {
  name: string;
  description?: string;
  timeBasis: string;
  scale: string;
  parsedUnitType?: string;
  sampleValues?: Array<{ date: string; value: number }>;
  sourceName?: string;
  categoryGroup?: string;
  dataset?: string;
  topic?: string;
}): { systemPrompt: string; userPrompt: string } {
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

  // Generate unit type hint
  const unitTypeHint = input.parsedUnitType
    ? `\n⚠️ UNIT TYPE DETECTED: ${input.parsedUnitType.toUpperCase()}
${getUnitTypeGuidance(input.parsedUnitType)}`
    : "";

  const systemPrompt = `You are an expert economic indicator family classifier for NON-CURRENCY indicators (dimensionless measures like percentages, ratios, indices, counts).

CLASSIFICATION FOR NON-CURRENCY INDICATORS:

1. numeric-measurement: Counts/percentages/ratios/shares
   - Examples: Unemployment Rate, Population Count, Debt-to-GDP Ratio
   - Characteristics:
     * Percentages (0-100), ratios, counts (integers), shares
     * Measures proportions, demographics, or structural relationships
   - Keywords: Rate (as percentage), Ratio, Share, Percentage, Count, Population
   - Values: Often 0-100 for percentages, integers for counts

2. price-value: Interest rates, yields, returns (percentage prices)
   - Examples: Interest Rate, Bank Lending Rate, Policy Rate, Bond Yield
   - Characteristics:
     * Small positive decimals (usually 0-20%)
     * Represents the PRICE/COST of capital or financial assets
     * Relatively stable levels (not volatile growth rates)
   - CRITICAL: Interest/Lending/Borrowing/Policy/Deposit Rates = PRICES for capital
   - Keywords: Interest, Lending, Borrowing, Policy Rate, Deposit, Yield
   - These answer: "What is the cost?" NOT "How much did it change?"

3. change-movement: Growth rates/volatility/gaps/changes
   - Examples: GDP Growth Rate, Inflation Rate, Volatility Index
   - Characteristics:
     * Can be negative, shows change/movement over time
     * Measures how much something CHANGED, not its level
   - Keywords: Growth, Change, Inflation, Volatility
   - These answer: "How much did it change?" NOT "What is the cost?"

4. composite-derived: Indices/scores/correlations
   - Examples: Consumer Confidence Index, Stock Market Index
   - Characteristics:
     * Often rebased to 100
     * Composite measures combining multiple inputs
   - Keywords: Index, Composite, Confidence, Correlation

5. temporal: Durations/probabilities
   - Examples: Time to Maturity, Default Probability
   - Keywords: Duration, Probability, Time

6. qualitative: Sentiment/allocations/classifications
   - Examples: Credit Rating, Portfolio Allocation
   - Keywords: Rating, Allocation, Classification

CRITICAL: Disambiguating "Rate" indicators:

The word "Rate" appears in multiple families - KEYWORDS are the key:

A. If name contains "Lending/Borrowing/Interest/Policy/Deposit/Yield":
   → price-value (these are PRICES for capital)
   Examples: "Bank Lending Rate", "Interest Rate", "Policy Rate"

B. If name contains "Growth/Change/Inflation":
   → change-movement (these measure CHANGE over time)
   Examples: "GDP Growth Rate", "Inflation Rate"

C. If name contains "Unemployment/Labor/Participation":
   → numeric-measurement (these are RATIOS/percentages of population)
   Examples: "Unemployment Rate", "Labor Force Participation Rate"

DECISION TREE FOR "RATE" INDICATORS:
1. Check for Lending/Interest/Policy/Deposit keywords → price-value
2. Check for Growth/Change/Inflation keywords → change-movement
3. Check for demographic/labor keywords → numeric-measurement

Value patterns to validate:
- Small positive decimals (0-20%) → likely price-value (interest rates)
- High volatility + negatives → likely change-movement (growth rates)
- 0-100 range → likely numeric-measurement (percentages)

CONCRETE EXAMPLES TO GUIDE YOUR CLASSIFICATION:

✓ Bank Lending Rate → price-value
  Why: The cost/price of borrowing capital from banks

✓ GDP Growth Rate → change-movement
  Why: Measures how much GDP changed period-over-period

✓ Unemployment Rate → numeric-measurement
  Why: Percentage of labor force that is unemployed (a ratio)

✓ Consumer Price Index → composite-derived
  Why: Weighted average of many prices (composite)

✓ Exchange Rate Volatility → change-movement
  Why: Measures variation/movement in exchange rates

✓ Debt-to-GDP Ratio → numeric-measurement
  Why: Structural relationship between two quantities

✓ Bond Yield → price-value
  Why: Return on investment (price of bond capital)

EDGE CASES TO WATCH:

• "Inflation Rate" = change-movement (not price-value)
  - Measures how much prices CHANGED, not the price itself

• "Policy Rate" = price-value (not numeric-measurement)
  - Central bank's lending rate = price of overnight capital

• "Tax Rate" = numeric-measurement (not change-movement)
  - Fixed percentage applied to income, not a growth rate

• "Participation Rate" = numeric-measurement (not price-value)
  - Percentage of population in labor force (structural ratio)

IMPORTANT: Return ONLY valid JSON matching this exact schema:
=============================================================
{
  "family": "numeric-measurement" | "price-value" | "change-movement" | "composite-derived" | "temporal" | "qualitative",
  "confidence": 0.0-1.0,
  "reasoning": "Clear explanation of your classification logic and key factors"
}`;

  const userPrompt = `Please classify this non-currency-denominated economic indicator:

INDICATOR INFORMATION:
======================
Indicator: ${input.name}
Description: ${input.description || "N/A"}
Source: ${input.sourceName || "N/A"}
Category Group: ${input.categoryGroup || "N/A"}
Dataset: ${input.dataset || "N/A"}
Topic: ${input.topic || "N/A"}
Time basis: ${input.timeBasis}
Scale: ${input.scale}
Parsed Unit Type: ${input.parsedUnitType || "unknown"}
Value patterns: ${valueAnalysis}${unitTypeHint}

Analyze the above indicator and provide your classification as JSON.`;

  return { systemPrompt, userPrompt };
}
