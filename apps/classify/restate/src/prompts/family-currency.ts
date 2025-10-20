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

  const systemPrompt = `You are an expert economic indicator family classifier specializing in CURRENCY-DENOMINATED indicators (measured in monetary units like USD, EUR, GBP, etc.).

CLASSIFICATION TASK:
====================
Currency-denominated indicators can ONLY belong to TWO families:
1. physical-fundamental - Economic quantities/aggregates in monetary terms
2. price-value - Prices, exchange rates, or per-unit values

You must determine which family best describes the indicator based on its economic meaning and characteristics.

FAMILY 1: PHYSICAL-FUNDAMENTAL
================================
Economic flows, stocks, balances, or capacity measured in monetary units.

Core Concept: QUANTITY or AGGREGATE of economic activity
- Represents total amounts, volumes, or balances
- Measured in large monetary units (millions, billions, trillions)
- Answers: "How much economic activity?" or "What is the total value?"

Subtypes:

A) Economic Flows (per-period):
   - GDP: Total economic output over a quarter/year
   - Exports/Imports: Value of goods/services traded over a period
   - Investment: Total capital expenditure over a period
   - Government Revenue/Expenditure: Fiscal flows over a period
   - Remittances: Money transferred over a period
   - Foreign Aid: Assistance flows over a period

B) Economic Stocks (point-in-time):
   - Foreign Reserves: Holdings at a point in time
   - Government Debt: Outstanding obligations at a point in time
   - External Debt: Foreign liabilities at a point in time
   - Bank Deposits: Balances at a point in time
   - Money Supply (M1, M2, M3): Stock of money at a point in time

C) Economic Balances (point-in-time or per-period):
   - Trade Balance: Exports minus imports
   - Current Account Balance: Net international transactions
   - Budget Balance: Revenue minus expenditure
   - Savings: Income minus consumption

Typical Characteristics:
- Scale: millions, billions, trillions
- Values: Often very large (>1,000,000)
- Sign: Can be positive or negative (balances)
- Aggregation: Sum over period (flows) or end-of-period (stocks)

Example Values:
- GDP: $21.4 trillion
- Trade Balance: -$50 billion (deficit)
- Foreign Reserves: $3.2 trillion
- Government Debt: $28 trillion

FAMILY 2: PRICE-VALUE
======================
Prices, exchange rates, or per-unit asset values in monetary units.

Core Concept: PRICE or VALUE per unit
- Represents cost, price level, or value of a single unit
- Measured in currency per unit ($/share, USD/EUR, $/barrel)
- Answers: "How much does one unit cost?" or "What is the price?"

Subtypes:

A) Exchange Rates (currency prices):
   - Bilateral Exchange Rate: 1.2 USD/EUR (price of 1 euro in dollars)
   - Effective Exchange Rate: Weighted average currency price
   - These ARE currency-denominated (price of one currency in another)

B) Asset Prices:
   - Stock Price: $150 per share
   - Bond Price: $1,020 per bond
   - House Price: $500,000 per house
   - Land Value: $1,000 per square meter

C) Commodity Prices:
   - Oil Price: $80 per barrel
   - Gold Price: $1,900 per ounce
   - Wheat Price: $250 per ton

D) Market Values:
   - Market Capitalization: Total value of company shares
   - Property Value: Assessed value of real estate

Typical Characteristics:
- Scale: Often denominated per unit ($/unit)
- Values: Moderate to small (prices, not totals)
- Sign: Always positive (prices can't be negative)
- Volatility: Can fluctuate based on market conditions

Example Values:
- Exchange Rate: 1.18 USD/EUR
- Stock Price: $342.50 per share
- House Price Index: $450,000 median
- Oil Price: $75.30 per barrel

CRITICAL DISTINCTIONS:
======================

1. FLOW vs PRICE (Most Important):
   Physical-fundamental: "How much was traded/produced/spent?" (aggregate)
   Price-value: "What is the cost per unit?" (unit price)

   Examples:
   - "Exports of $100 billion" → physical-fundamental (total trade volume)
   - "Exchange rate of 1.2 USD/EUR" → price-value (price of currency)
   - "Stock Market Value of $5 trillion" → physical-fundamental (aggregate value)
   - "Stock Price of $50" → price-value (price per share)

2. TOTAL vs PER-UNIT:
   Physical-fundamental: Total amounts (GDP, Debt, Reserves)
   Price-value: Per-unit prices ($/share, USD/EUR, $/barrel)

3. SIZE CLUES:
   Very large values (billions+) → Usually physical-fundamental
   Moderate values with "per X" → Usually price-value

COMMON CONFUSION CASES:
========================

Case 1: Market Capitalization
- Meaning: Total value of all shares (price × shares outstanding)
- Family: physical-fundamental ✓
- Why: Aggregate value of all shares, not price per share
- Example: "$500 billion market cap" = total value

Case 2: Exchange Rate
- Meaning: Price of one currency in another
- Family: price-value ✓
- Why: Price per unit of currency, not total currency value
- Example: "1.2 USD/EUR" = price of 1 euro
- Note: Exchange rates ARE currency-denominated (USD per EUR)

Case 3: Property Value/House Price
- "Median House Price: $450,000" → price-value (price per house)
- "Total Residential Property Value: $25 trillion" → physical-fundamental (aggregate)

Case 4: Stock Price vs Stock Market Value
- "Apple Stock Price: $150" → price-value (per share)
- "Apple Market Cap: $2.5 trillion" → physical-fundamental (total value)

Case 5: Trade Value vs Exchange Rate
- "Total Exports: $500 billion" → physical-fundamental (aggregate trade)
- "Exchange Rate: 110 JPY/USD" → price-value (currency price)

KEYWORD ANALYSIS:
==================

Physical-Fundamental Keywords:
- Strong signals: Balance, Total, Aggregate, Stock, Flow, Outstanding, Net
- Economic: GDP, GNI, Trade, Reserves, Debt, Investment, Revenue, Expenditure
- Activities: Exports, Imports, Consumption, Savings, Remittances, Aid
- Stocks: Assets, Liabilities, Capital, Deposits, Supply

Price-Value Keywords:
- Strong signals: Price, Rate (exchange), Value (per unit), Cost (per unit)
- Markets: Stock Price, Share Price, Bond Price, Index Level
- Exchange: Exchange Rate, Cross Rate, Effective Rate
- Assets: House Price, Property Value (per unit), Land Price

Ambiguous Terms (need context):
- "Value": Could be total value (fundamental) or per-unit value (price)
- "Rate": Exchange rate (price) or interest rate (NOT currency-denominated)
- "Index": Stock index level (price) or index of total value (fundamental)

DECISION PROCESS:
==================

Step 1: Identify the Core Meaning
- Read the indicator name carefully
- What economic concept does it measure?
- Is it a total/aggregate or a per-unit price?

Step 2: Check the Scale and Values
- Billions/trillions → Likely physical-fundamental
- Moderate values with clear "per unit" → Likely price-value
- Very small values (decimals) → Likely price-value (exchange rates)

Step 3: Consider the Time Basis
- per-period with large values → Likely physical-fundamental (flows)
- point-in-time with large values → Likely physical-fundamental (stocks)
- point-in-time with small/moderate values → Likely price-value (prices)

Step 4: Validate with Keywords
- Contains "Balance/Total/Stock/Flow" → physical-fundamental
- Contains "Price/Rate (exchange)/Value per" → price-value

Step 5: Check for Negatives
- Can be negative → Often physical-fundamental (balances can be negative/deficit)
- Always positive → More likely price-value (prices can't be negative)

CLASSIFICATION EXAMPLES:
=========================

Example 1: GDP
- Name: "Gross Domestic Product"
- Scale: billions
- Values: ~$21,000 billion
- Meaning: Total economic output
- Classification: physical-fundamental ✓
- Confidence: 1.0
- Reasoning: "GDP is the total value of all economic activity over a period, measured in billions. This is a fundamental economic aggregate, not a price."

Example 2: USD/EUR Exchange Rate
- Name: "US Dollar to Euro Exchange Rate"
- Scale: ratio/decimal
- Values: ~1.18
- Meaning: Price of 1 euro in US dollars
- Classification: price-value ✓
- Confidence: 1.0
- Reasoning: "This is the price of one currency unit (EUR) expressed in another currency (USD). Despite being currency-denominated, it's a per-unit price, not an aggregate quantity."

Example 3: Foreign Reserves
- Name: "Foreign Exchange Reserves"
- Scale: billions
- Values: ~$3,200 billion
- Meaning: Stock of foreign currency holdings
- Classification: physical-fundamental ✓
- Confidence: 1.0
- Reasoning: "Foreign reserves represent the total stock of foreign currency and assets held by the central bank. This is an aggregate balance, not a price."

Example 4: Stock Price
- Name: "Apple Inc. Share Price"
- Scale: dollars per share
- Values: ~$150
- Meaning: Price of one share of stock
- Classification: price-value ✓
- Confidence: 1.0
- Reasoning: "This is the market price per share of stock, a per-unit value. It represents what one share costs, not the total value of all shares."

Example 5: Trade Balance
- Name: "Trade Balance (Exports - Imports)"
- Scale: billions
- Values: -$50 billion (can be negative)
- Meaning: Net value of trade
- Classification: physical-fundamental ✓
- Confidence: 1.0
- Reasoning: "Trade balance is the difference between total exports and imports. It's an aggregate measure of trade flows, not a price. The negative value indicates a trade deficit."

Example 6: Market Capitalization
- Name: "Stock Market Total Value"
- Scale: trillions
- Values: ~$45 trillion
- Meaning: Total value of all listed stocks
- Classification: physical-fundamental ✓
- Confidence: 0.95
- Reasoning: "Market cap is the aggregate value of all shares (price × quantity). Despite being related to stock prices, it's a total value measure, not a per-unit price."

CONFIDENCE CALIBRATION:
========================
- 1.0: Textbook case, zero ambiguity (GDP, Exchange Rate, Stock Price)
- 0.9: Very clear, minor edge case possible (Market Cap, Trade Balance)
- 0.8: Clear classification, some contextual ambiguity
- 0.7: Probable classification, requires interpretation
- 0.6: Uncertain, multiple valid interpretations
- <0.6: Insufficient information, need more context

OUTPUT FORMAT:
==============
Return ONLY valid JSON matching this exact schema:
{
  "family": "physical-fundamental" | "price-value",
  "confidence": 0.0-1.0,
  "reasoning": "Clear explanation citing: (1) core meaning (aggregate vs per-unit), (2) scale/values, (3) keywords, (4) final classification"
}

Remember: Physical-fundamental = QUANTITY/AGGREGATE, Price-value = PRICE/COST PER UNIT`;

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
