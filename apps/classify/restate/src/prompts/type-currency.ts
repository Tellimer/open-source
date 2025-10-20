/**
 * Type classification prompts for CURRENCY-DENOMINATED indicators
 * Only applicable types for monetary values
 */

import { z } from "zod";

export const typeClassificationCurrencySchema = z.object({
  indicatorType: z.enum([
    // physical-fundamental types (in currency)
    "stock", // e.g., Foreign Reserves, Government Debt
    "flow", // e.g., GDP, Trade flows, Capital flows
    "balance", // e.g., Trade Balance, Current Account Balance
    "capacity", // e.g., Productive capacity (rarely used - GDP is flow, not capacity!)
    "volume", // e.g., Transaction volume in currency
    // price-value types (in currency)
    "price", // e.g., Stock Price, Commodity Price
    "rate", // e.g., Exchange Rate (price of currency)
  ]),
  temporalAggregation: z.enum([
    "point-in-time", // Stock/balance at a point (e.g., reserves on Dec 31)
    "period-total", // Total flow during period (e.g., quarterly trade)
    "period-cumulative", // YTD/cumulative accumulation (e.g., YTD GDP)
    "period-average", // Average during period (e.g., average exchange rate)
    "not-applicable", // For prices that are snapshots
  ]),
  heatMapOrientation: z.enum([
    "higher-is-positive", // Higher values are better (e.g., GDP, Exports, Reserves)
    "lower-is-positive", // Lower values are better (e.g., Debt, Trade Deficit)
    "neutral", // Neither direction inherently positive (e.g., Exchange Rate)
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
 * Create optimized type classification prompts for CURRENCY-DENOMINATED indicators
 * System prompt: Static classification rules (100% cacheable)
 * User prompt: Variable indicator data
 */
export function createTypeClassificationCurrencyPrompt(input: {
  name: string;
  description?: string;
  family: string;
  timeBasis: string;
  scale: string;
  detectedCurrency?: string | null;
  isCumulative?: boolean;
  cumulativePatternType?: string;
  cumulativeConfidence?: number;
  sampleValues?: Array<{ date: string; value: number }>;
  sourceName?: string;
  longName?: string;
  categoryGroup?: string;
  dataset?: string;
  topic?: string;
  aggregationMethod?: string;
  currencyCode?: string;
}): { systemPrompt: string; userPrompt: string } {
  // Analyze sample values if available
  let valueAnalysis = "N/A";
  if (input.sampleValues && input.sampleValues.length > 0) {
    const values = input.sampleValues.map((s) => s.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const hasNegatives = values.some((v) => v < 0);

    valueAnalysis =
      `Range: [${min.toFixed(2)} to ${max.toFixed(2)}], Mean: ${
        mean.toFixed(2)
      }, ` +
      `${
        hasNegatives
          ? "Has negatives (can be positive/negative)"
          : "All positive"
      }`;
  }

  // Generate cumulative pattern detection context
  const cumulativeContext = input.isCumulative !== undefined
    ? `

⚠️ CUMULATIVE PATTERN DETECTION (DATA-DRIVEN ANALYSIS):

Time series analysis detected: ${
      input.isCumulative ? "CUMULATIVE PATTERN" : "NON-CUMULATIVE PATTERN"
    }
- Pattern Type: ${input.cumulativePatternType || "unknown"}
- Confidence: ${
      input.cumulativeConfidence !== undefined
        ? (input.cumulativeConfidence * 100).toFixed(0) + "%"
        : "N/A"
    }

${
      input.isCumulative && input.cumulativePatternType === "ytd"
        ? `✅ YTD PATTERN DETECTED:
- Values accumulate within each year (Q1 < Q2 < Q3 < Q4)
- Values reset at year boundaries (Q4 → next Q1 drops significantly)
- This is strong evidence for temporal_aggregation: "period-cumulative"

⚠️ IMPORTANT: YTD patterns can ONLY occur with flow indicator types!
- If this is a flow (e.g., GDP, Exports) → USE temporal_aggregation: "period-cumulative"
- Stocks, balances, prices CANNOT be cumulative by definition
- Example: Armenia GDP reported quarterly but accumulates YTD (Q1=3, Q2=6, Q3=9, Q4=12 months of output)
- This means each value represents the cumulative total from the start of the year to that date`
        : input.isCumulative && input.cumulativePatternType === "running_total"
        ? `✅ RUNNING TOTAL PATTERN DETECTED:
- Values continuously accumulate without reset
- No year boundary resets observed
- This suggests the indicator represents a cumulative total

⚠️ IMPORTANT: Running totals can ONLY occur with flow indicator types!`
        : input.cumulativePatternType === "periodic"
        ? `✅ PERIODIC PATTERN DETECTED:
- Values do NOT accumulate over time
- Each period represents discrete/independent values
- This confirms temporal_aggregation: "period-total" (discrete periods, not cumulative)`
        : ""
    }

${
      input.isCumulative && (input.cumulativeConfidence || 0) > 0.8
        ? `🚨 HIGH CONFIDENCE (${
          (input.cumulativeConfidence! * 100).toFixed(0)
        }%) - MUST USE "period-cumulative" FOR TEMPORAL AGGREGATION

This data-driven analysis OVERRIDES generic name-based rules when:
1. The indicator type is "flow" (flows can be cumulative, e.g., YTD GDP)
2. The pattern is clear and confidence is high (>80%)

🔴 REQUIRED ACTION FOR HIGH-CONFIDENCE YTD:
- indicator_type: "flow" (flows can accumulate)
- temporal_aggregation: "period-cumulative" (NOT "period-total")
- Reasoning must explicitly mention: "Data analysis detected YTD pattern with ${
          (input.cumulativeConfidence! * 100).toFixed(0)
        }% confidence. Values accumulate within year and reset at year boundaries."

Example Correct Classification:
- Indicator: Armenia GDP
- Pattern detected: Clear YTD (Q1 < Q2 < Q3 < Q4, then drops to next Q1)
- CORRECT: indicator_type: "flow", temporal_aggregation: "period-cumulative"
- Reasoning: "Armenia reports quarterly GDP as year-to-date accumulation. Each quarterly value represents cumulative output from January 1st to the end of that quarter. Data analysis confirms ${
          (input.cumulativeConfidence! * 100).toFixed(0)
        }% confidence in YTD pattern with clear year boundary resets."`
        : ""
    }
`
    : "";

  // Create type-specific guidance for system prompt (family-dependent but static rules)
  const typeGuidancePhysical = `
TYPES FOR PHYSICAL-FUNDAMENTAL (currency-denominated):

- stock: A quantity held at a point in time
  Examples: Foreign Exchange Reserves, Government Debt Outstanding
  Temporal: point-in-time

- flow: Movement/transactions over a period, OR total economic output
  Examples: GDP, GNI, GDP by sector (Manufacturing, Services, etc.), Exports, Imports, Capital Inflows, Foreign Direct Investment
  Temporal: period-total
  ⚠️ CRITICAL: ALL GDP indicators (including sectoral like "GDP from Manufacturing") are flows, NOT capacity!

- balance: Net difference between flows
  Examples: Trade Balance, Current Account Balance, Budget Balance
  Temporal: period-total (net flow)

- capacity: Productive capacity (RARELY USED - do not use for GDP!)
  Examples: Theoretical maximum production capacity
  Temporal: period-total
  ⚠️ NOTE: GDP is a FLOW (actual output), not capacity (potential output)!

- volume: Total transactions/activity in currency
  Examples: Trading Volume, Transaction Value
  Temporal: period-total
`;

  const typeGuidancePrice = `
TYPES FOR PRICE-VALUE (currency-denominated):

- price: Cost/value per unit in currency
  Examples: Stock Price, Commodity Price ($/barrel), Real Estate Price
  Temporal: point-in-time (snapshot price)

- rate: Exchange rate (price of one currency in another)
  Examples: USD/EUR Exchange Rate, Currency Cross Rate
  Temporal: point-in-time or period-average
`;

  const systemPrompt = `You are an expert economic indicator type classifier for CURRENCY-DENOMINATED indicators (measured in monetary units).

${input.family === "physical-fundamental" ? typeGuidancePhysical : typeGuidancePrice}

TEMPORAL AGGREGATION:

- point-in-time: Value at a specific moment (stocks, balances, prices)
- period-total: Sum over the period (flows, volumes) - discrete periods
- period-cumulative: Year-to-date or cumulative accumulation (YTD flows)
- period-average: Average over the period (exchange rates)
- not-applicable: For standalone values without temporal context

⚠️ CRITICAL DISTINCTION: period-total vs period-cumulative
- period-total: Each value is the total for THAT PERIOD ONLY (e.g., Q1 exports, Q2 exports as separate values)
- period-cumulative: Each value is CUMULATIVE from start of year (e.g., Q1 = Jan-Mar, Q2 = Jan-Jun, Q3 = Jan-Sep, Q4 = full year)

HEAT MAP ORIENTATION (whether higher/lower is positive):

- higher-is-positive: Higher values indicate better economic outcomes
  Examples: GDP, Exports, Foreign Reserves, Trade Surplus, Foreign Direct Investment, Tourist Arrivals

- lower-is-positive: Lower values indicate better outcomes
  Examples: External Debt, Government Debt, Trade Deficit, Fiscal Deficit

- neutral: Neither direction is inherently good/bad, context-dependent
  Examples: Exchange Rate (competitiveness vs stability tradeoffs),
           Government Spending levels (welfare vs fiscal balance),
           Prices (depends on buyer/seller perspective)

DECISION HINTS:

Name contains "Balance" → balance + period-total
Name contains "Reserves/Debt/Stock" → stock + point-in-time
Name contains "Exports/Imports/Investment" → flow + period-total
Name contains "GDP" (ANY variation) → flow + period-total
  - "GDP" alone → flow
  - "GDP per Capita" → flow (per-person output, NOT capacity!)
  - "GDP per Capita PPP" → flow (PPP-adjusted per-person output, NOT capacity!)
  - "GDP from [Sector]" → flow (sectoral output, NOT capacity!)
  - ALL other GDP variations → flow (NO EXCEPTIONS!)
Name contains "Price" → price + point-in-time
Name contains "Exchange Rate" → rate + point-in-time or period-average

CONCRETE EXAMPLES (✅ = VERIFIED FROM REFERENCE DATA):

✅ Trade Balance ($5B) → balance + period-total + neutral
  Why: Net flow (exports - imports) over a period. Impact depends on trade position and context.

✅ Foreign Exchange Reserves ($120B) → balance + point-in-time + higher-is-positive
  Why: Stock positions that can theoretically be positive or negative use 'balance' in taxonomy. More reserves = more stability.

✅ Exports ($50B) → flow + period-total + higher-is-positive
  Why: Total value of goods sold abroad during period. Higher exports = better.

✅ GDP ($2T) → flow + period-total + higher-is-positive
  Why: Total economic output during period (flow, not capacity). Higher GDP = larger economy.

✅ GDP per Capita ($50,000) → flow + period-total + higher-is-positive
  Why: Per-person economic output during period (STILL a flow, just normalized per capita). NOT productive capacity!

✅ GDP per Capita PPP ($60,000) → flow + period-total + higher-is-positive
  Why: PPP-adjusted per-person output during period (STILL a flow, just adjusted for purchasing power). NOT capacity!

✓ Stock Price ($150) → price + point-in-time + neutral
  Why: Cost per share at a specific moment. Direction depends on investor perspective.

✓ Exchange Rate (1.2 USD/EUR) → rate + point-in-time + neutral
  Why: Price of one currency in another. Impact depends on trade position.

✅ Government Debt ($1T) → stock + point-in-time + lower-is-positive
  Why: Total outstanding debt on a specific date. Lower debt = less burden.

✅ Foreign Direct Investment ($10B) → flow + period-total + higher-is-positive
  Why: Investment inflows during the period (flow, not balance). More investment = economic growth.

✅ External Debt ($500B) → stock + point-in-time + lower-is-positive
  Why: Monetary stock position held at a point in time. Lower debt = less burden.

✅ Consumer Spending ($800B) → flow + period-total + higher-is-positive
  Why: Total spending during period (flow, not balance). Higher consumption indicates economic activity.

⚠️ VERIFIED PATTERNS FROM REFERENCE DATA (109 human-verified classifications):

❌ COMMON MISTAKES TO AVOID:

1. GDP and Economic Output (ALL GDP VARIATIONS - NO EXCEPTIONS):
   ❌ WRONG: indicator_type: capacity
   ✅ CORRECT: indicator_type: flow
   Examples:
     - GDP, GNI (Total economic output)
     - GDP per Capita, GDP per Capita PPP (Per-person economic output - STILL A FLOW!)
     - GDP from Agriculture, GDP from Construction, GDP from Manufacturing, GDP from Services, GDP from Transport, GDP from Utilities (Sectoral output)
     - Real GDP, Nominal GDP, GDP Growth, GDP Constant Prices (All variations)

   Reasoning: "Economic output is a FLOW during the period, not capacity. ALL GDP indicators measure actual output flows, regardless of normalization (per capita, PPP-adjusted, etc.) or sector."

   KEY PATTERNS:
   - "GDP" anywhere in name = flow (NO EXCEPTIONS!)
   - "GDP from X" = flow (actual output from sector X during period)
   - "GDP per Capita" = flow (per-person output during period, NOT per-person capacity!)
   - "GDP per Capita PPP" = flow (PPP-adjusted per-person output, NOT capacity!)

   WRONG INTERPRETATIONS:
   - "GDP from X" = capacity (potential output from sector X)
   - "GDP per Capita" = capacity (per-person productive capacity)
   - "GDP per Capita PPP" = capacity (PPP-adjusted productive capacity)

2. Flows vs Balances:
   ❌ WRONG: Consumer Spending = balance, FDI = balance, Exports = balance, Imports = balance
   ✅ CORRECT: These are all flows (period-total)
   Exception: Trade Balance, Current Account Balance are truly balances (can be positive/negative)

3. Reserves and Financial Stocks:
   ❌ WRONG: indicator_type: stock
   ✅ CORRECT: indicator_type: balance
   Examples: Foreign Exchange Reserves, Official Reserves
   Reasoning: "Stock positions that can theoretically be positive or negative use 'balance' in taxonomy"

4. Money Supply:
   ✅ CORRECT: indicator_type: stock
   Examples: Money Supply M0, M1, M2, M3
   Reasoning: "Monetary stocks use 'stock' type"

EDGE CASES:

• "Budget Balance" = balance (not stock)
  Even though it's a government metric, it's the NET of revenues - expenditures

• "Current Account Balance" = balance (not flow)
  It's the NET of multiple flows, reported as a balance

• "Market Capitalization" = stock (not price)
  Total value of all shares, not price per share

• "GDP" = flow (NOT capacity!)
  Total economic output during period

• "Foreign Exchange Reserves" = balance (NOT stock!)
  Stock positions that can be positive or negative

REMEMBER: Focus on indicator NAME patterns, but VERIFY with actual data characteristics.

PATTERN-BASED CLASSIFICATION (Default Approach):
The same indicator name USUALLY has consistent core classification across countries:
- "GDP" (ALL VARIATIONS) → ALWAYS flow + period-total (NO EXCEPTIONS!)
- "Trade Balance" → typically balance + period-total
- "Foreign Exchange Reserves" → typically balance + point-in-time

⚠️ CRITICAL: GDP is SPECIAL - NO country-specific variations!
ALL GDP indicators (including "GDP per Capita", "GDP per Capita PPP", "GDP from [Sector]") are ALWAYS flows.
If you see anything that looks like a "GDP" indicator, it is a flow. PERIOD.

HOWEVER - For NON-GDP indicators, Country-Specific Variations DO Exist:
⚠️ For non-GDP indicators, examine the metadata and let the DATA override the pattern when necessary.

Examples of legitimate country-specific variations (NOT GDP!):
1. **Consumer Spending**:
   - Most countries: flow + period-total (spending during period)
   - Some countries: balance + period-total (net consumption position)
   → If it's explicitly measuring net position, use balance!

2. **Reserves**:
   - Most countries: balance + point-in-time (reserve position at date)
   - Some countries: flow + period-total (reserve accumulation during period)
   → If measuring "reserve accumulation" or "change in reserves", use flow!

DECISION PROCESS:
1. Start with the indicator NAME pattern
2. ⚠️ IF NAME CONTAINS "GDP" → ALWAYS flow + period-total (STOP HERE, NO OVERRIDE!)
3. For non-GDP: Check description, units, and context for contradictory evidence
4. If the actual data clearly indicates different characteristics, OVERRIDE the pattern
5. Document your reasoning: "Typically X, but this country reports as Y because..."

Example Decision (NON-GDP):
- Indicator: "Foreign Reserves"
- Pattern suggests: balance + point-in-time
- BUT description says: "Monthly change in foreign currency holdings"
- AND units confirm: "Net accumulation during month"
- DECISION: Override to flow + period-total
- Reasoning: "Although reserves typically are balance at a point, this country reports the monthly accumulation flow"

IMPORTANT: Return ONLY valid JSON matching this exact schema:
=============================================================
{
  "indicatorType": "stock" | "flow" | "balance" | "capacity" | "volume" | "price" | "rate",
  "temporalAggregation": "point-in-time" | "period-total" | "period-cumulative" | "period-average" | "not-applicable",
  "heatMapOrientation": "higher-is-positive" | "lower-is-positive" | "neutral",
  "confidence": 0.0-1.0,
  "reasoning": "Clear explanation of your classification logic and key factors"
}`;

  const userPrompt = `Please classify this currency-denominated economic indicator:

INDICATOR INFORMATION:
======================
Indicator: ${input.name}
Description: ${input.description || "N/A"}
Long Name: ${input.longName || "N/A"}
Source: ${input.sourceName || "N/A"}
Category: ${input.categoryGroup || "N/A"}
Dataset: ${input.dataset || "N/A"}
Topic: ${input.topic || "N/A"}
Aggregation Method: ${input.aggregationMethod || "N/A"}
Family: ${input.family}
Time basis: ${input.timeBasis}
Scale: ${input.scale}
Currency: ${input.detectedCurrency || input.currencyCode || "Unknown"}
Value patterns: ${valueAnalysis}
${cumulativeContext}

Analyze the above indicator and provide your classification as JSON.`;

  return { systemPrompt, userPrompt };
}
