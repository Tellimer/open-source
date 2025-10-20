/**
 * Family assignment prompts for CURRENCY-DENOMINATED indicators
 * These indicators are measured in monetary units (USD, EUR, etc.)
 */

import { z } from "zod";

export const familyAssignmentCurrencySchema = z.object({
  family: z.enum([
    "physical-fundamental",
    "price-value",
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
 * Create optimized family assignment prompts for CURRENCY-DENOMINATED indicators
 * System prompt: Static classification rules (100% cacheable)
 * User prompt: Variable indicator data
 */
export function createFamilyAssignmentCurrencyPrompt(input: {
  name: string;
  description?: string;
  timeBasis: string;
  scale: string;
  detectedCurrency: string | null;
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
      }`;
  }

  const systemPrompt = `You are an expert economic indicator family classifier for CURRENCY-DENOMINATED indicators (measured in monetary units).

CLASSIFICATION RULE FOR CURRENCY-DENOMINATED INDICATORS:

You must choose between ONLY these two families:

1. physical-fundamental: Economic flows, stocks, balances, or capacity
   - Examples: GDP, Trade Balance, Foreign Reserves, Government Debt, Investment
   - Characteristics:
     * Large absolute values (millions/billions/trillions)
     * Represents real economic quantities in money terms
     * Measures stock (balance) or flow (transactions) of economic activity
   - Keywords: GDP, Trade, Balance, Reserves, Debt, Investment, Revenue, Expenditure
   - Time basis often: per-period (flows) or point-in-time (stocks)

2. price-value: Prices, exchange rates, or asset values
   - Examples: Stock Price, Exchange Rate, Asset Value, Commodity Price
   - Characteristics:
     * Smaller values (price per unit)
     * Represents the COST or VALUE of something
     * Market-determined prices
   - Keywords: Price, Rate (exchange), Value, Cost
   - Time basis often: point-in-time (price levels)

DECISION LOGIC:

Ask yourself: "What does this number represent?"
• If it's a quantity/volume/total of economic activity → physical-fundamental
  Example: "Trade Balance of $5 billion" = total value of trade
• If it's a price/cost/value per unit → price-value
  Example: "Exchange Rate of 1.2 USD/EUR" = price of one currency in another

Size hints:
• Very large values (millions+) → usually physical-fundamental (aggregates)
• Moderate/small values → usually price-value (unit prices)

COMMON PATTERNS:

Physical-fundamental keywords:
  - Balance, Trade, Reserves, Debt, GDP, GNI, Investment, Revenue, Expenditure
  - Exports, Imports, Flows, Transactions, Remittances, Aid
  - Assets, Liabilities, Capital, Savings, Consumption

Price-value keywords:
  - Price, Exchange Rate, Asset Value, Stock Price, House Price
  - Cost (per unit), Value (per unit), Rate (exchange only)

CRITICAL DISAMBIGUATION:

❌ "Interest Rate" in currency? NO - Interest rates are percentages, not currency-denominated
   (These should NOT reach this prompt - they should be classified as non-currency)

✓ "Exchange Rate" in currency? YES - Exchange rates ARE prices of one currency in another
   Example: 1.2 USD/EUR means $1.20 per euro → price-value

✓ "Trade Balance" in currency? YES - Total net trade value → physical-fundamental

IMPORTANT: Return ONLY valid JSON matching this exact schema:
=============================================================
{
  "family": "physical-fundamental" | "price-value",
  "confidence": 0.0-1.0,
  "reasoning": "Clear explanation of your classification logic and key factors"
}`;

  const userPrompt = `Please classify this currency-denominated economic indicator:

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
Detected Currency: ${input.detectedCurrency || "Unknown"}
Value patterns: ${valueAnalysis}

Analyze the above indicator and provide your classification as JSON.`;

  return { systemPrompt, userPrompt };
}
