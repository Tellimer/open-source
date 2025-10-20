/**
 * Type classification prompts for NON-CURRENCY indicators
 * Dimensionless types (percentages, ratios, indices, counts)
 */

import { z } from "zod";

/**
 * Get type hint based on unit type and family
 */
function getTypeHintFromUnitType(unitType: string, family: string): string {
  const hints: Record<string, Record<string, string>> = {
    percentage: {
      "numeric-measurement": "Type: percentage or ratio",
      "price-value": "Type: rate (interest rate)",
      "change-movement": "Type: rate (growth rate)",
    },
    index: {
      "composite-derived": "Type: index",
    },
    ratio: {
      "numeric-measurement": "Type: ratio or spread",
    },
    count: {
      "numeric-measurement": "Type: count or share",
    },
    physical: {
      "numeric-measurement":
        "Type: rate (production rate with physical units - check for '/' in units like BBL/D)",
      "change-movement": "Type: rate (physical flow rate)",
    },
    rate: {
      "numeric-measurement": "Type: rate (per capita) or percentage",
    },
    duration: {
      "temporal": "Type: duration",
    },
  };

  return hints[unitType]?.[family] || "Use family guidance above";
}

export const typeClassificationNonCurrencySchema = z.object({
  indicatorType: z.enum([
    // numeric-measurement types
    "count", // e.g., Population, Number of firms
    "percentage", // e.g., Unemployment Rate, Tax Rate
    "ratio", // e.g., Debt-to-GDP, P/E Ratio
    "spread", // e.g., Yield Spread, Interest Rate Differential
    "share", // e.g., Market Share, Budget Share
    // price-value types (percentage prices)
    "rate", // e.g., Interest Rate, Lending Rate (price of capital)
    "yield", // e.g., Bond Yield, Dividend Yield
    // change-movement types
    "volatility", // e.g., VIX, Standard Deviation
    "gap", // e.g., Output Gap, Trade Gap (as %)
    // composite-derived types
    "index", // e.g., CPI, Stock Index
    "correlation", // e.g., Correlation coefficient
    "elasticity", // e.g., Price elasticity
    "multiplier", // e.g., Fiscal multiplier
    // temporal types
    "duration", // e.g., Time periods
    "probability", // e.g., Default probability
    "threshold", // e.g., Threshold values
    // qualitative types
    "sentiment", // e.g., Consumer confidence
    "allocation", // e.g., Asset allocation
    "other", // Fallback
  ]),
  temporalAggregation: z.enum([
    "point-in-time",
    "period-rate",
    "period-cumulative",
    "period-average",
    "period-total",
    "not-applicable",
  ]),
  heatMapOrientation: z.enum([
    "higher-is-positive", // Higher values are better (e.g., Growth Rate, Employment)
    "lower-is-positive", // Lower values are better (e.g., Unemployment, Debt)
    "neutral", // Neither direction inherently positive (e.g., Interest Rates, Inflation)
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
 * Create optimized type classification prompts for NON-CURRENCY indicators
 * System prompt: Static classification rules (100% cacheable)
 * User prompt: Variable indicator data
 */
export function createTypeClassificationNonCurrencyPrompt(input: {
  name: string;
  description?: string;
  family: string;
  timeBasis: string;
  scale: string;
  parsedUnitType?: string;
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
  const typesByFamily: Record<string, { types: string[]; guidance: string }> = {
    "numeric-measurement": {
      types: ["count", "percentage", "ratio", "spread", "share"],
      guidance: `
- count: Counts of discrete items OR continuous physical measurements in raw units
  Examples: Population (persons), Number of firms (count), Temperature (24.5 celsius), Precipitation (100 mm)
  KEY: Physical measurements like temperature, precipitation, wind speed are "counts" of their units (degrees, millimeters, km/h)
- percentage: Value expressed as 0-100% (Unemployment Rate, Tax Rate)
- ratio: Relationship between two quantities (Debt-to-GDP, Loan-to-Value)
- spread: Difference between two related values (Yield Spread, Rate Differential)
- share: Portion of a whole (Market Share, Budget Share as %)
`,
    },
    "price-value": {
      types: ["rate", "yield"],
      guidance: `
- rate: Interest/lending/borrowing rate (percentage PRICE of capital)
  Examples: Bank Lending Rate, Policy Rate, Deposit Rate, Prime Rate
  KEY: These are PRICES - the cost of borrowing money
  Pattern: "X Lending Rate", "X Interest Rate", "X Policy Rate"
  Values: Usually 0-20%, stable levels, not volatile

- yield: Return on investment (Bond Yield, Dividend Yield)
  KEY: Expected return as a percentage price
`,
    },
    "change-movement": {
      types: ["rate", "volatility", "gap"],
      guidance: `
- rate: Growth/inflation rate (percentage CHANGE over time)
  Examples: GDP Growth Rate, Inflation Rate, Employment Growth Rate
  KEY: These measure CHANGE - how much something grew/shrank
  Pattern: "X Growth Rate", "Inflation Rate", "Change in X"
  Values: Can be negative, more volatile than price-value rates

- volatility: Measure of variability (VIX, Standard Deviation)
  Examples: Stock Market Volatility, Exchange Rate Volatility

- gap: Deviation from trend/target (Output Gap as %, Trade Gap as %)
  Examples: Output Gap, Unemployment Gap
`,
    },
    "composite-derived": {
      types: ["index", "correlation", "elasticity", "multiplier"],
      guidance: `
- index: Composite measure (CPI, Stock Index, PMI)
- correlation: Statistical relationship (-1 to 1)
- elasticity: Responsiveness measure
- multiplier: Effect multiplier (Fiscal multiplier)
`,
    },
    temporal: {
      types: ["duration", "probability", "threshold"],
      guidance: `
- duration: Time period (Years to maturity, Duration)
- probability: Likelihood (0-1 or 0-100%)
- threshold: Critical value
`,
    },
    qualitative: {
      types: ["sentiment", "allocation"],
      guidance: `
- sentiment: Subjective measure (Consumer confidence, Business sentiment)
- allocation: Distribution (Asset allocation %, Portfolio weights)
`,
    },
  };

  const familyInfo = typesByFamily[input.family] || {
    types: ["other"],
    guidance: "- other: Type not covered by standard categories",
  };

  // Add unit type hint if available
  const unitTypeHint = input.parsedUnitType
    ? `\n⚠️ UNIT TYPE: ${input.parsedUnitType.toUpperCase()} → ${
      getTypeHintFromUnitType(input.parsedUnitType, input.family)
    }`
    : "";

  // Analyze sample values if available
  let valueAnalysis = "N/A";
  if (input.sampleValues && input.sampleValues.length > 0) {
    const values = input.sampleValues.map((s) => s.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const hasNegatives = values.some((v) => v < 0);
    const volatility = values.length > 1
      ? Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
          values.length,
      )
      : 0;

    valueAnalysis =
      `Range: [${min.toFixed(2)} to ${max.toFixed(2)}], Mean: ${
        mean.toFixed(2)
      }, StdDev: ${volatility.toFixed(2)}, ` +
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

⚠️ IMPORTANT: YTD patterns can ONLY occur with flow/count indicator types!
- If this is a count indicator → USE temporal_aggregation: "period-cumulative"
- Rates, stocks, indices CANNOT be cumulative by definition
- Example: Tourist Arrivals reported quarterly but accumulates YTD (Q1=3mo, Q2=6mo, Q3=9mo, Q4=12mo)
- This means each value represents the cumulative total from the start of the year to that date`
        : input.isCumulative && input.cumulativePatternType === "running_total"
        ? `✅ RUNNING TOTAL PATTERN DETECTED:
- Values continuously accumulate without reset
- No year boundary resets observed
- This suggests temporal_aggregation: "period-cumulative"

⚠️ IMPORTANT: Running totals can ONLY occur with flow/count indicator types!`
        : input.cumulativePatternType === "periodic"
        ? `✅ PERIODIC PATTERN DETECTED:
- Values do NOT accumulate over time
- Each period represents discrete/independent values
- This suggests temporal_aggregation: "period-total" or "point-in-time" depending on indicator type`
        : ""
    }

${
      input.isCumulative && (input.cumulativeConfidence || 0) > 0.8
        ? `🚨 HIGH CONFIDENCE (${
          (input.cumulativeConfidence! * 100).toFixed(0)
        }%) - MUST USE "period-cumulative" FOR TEMPORAL AGGREGATION

This data-driven analysis OVERRIDES generic name-based rules when:
1. The indicator type is "count" (counts can be cumulative, e.g., YTD Tourist Arrivals)
2. The pattern is clear and confidence is high (>80%)

🔴 REQUIRED ACTION FOR HIGH-CONFIDENCE YTD:
- indicator_type: "count" (counts can accumulate)
- temporal_aggregation: "period-cumulative" (NOT "period-total")
- Reasoning must explicitly mention: "Data analysis detected YTD pattern with ${
          (input.cumulativeConfidence! * 100).toFixed(0)
        }% confidence. Values accumulate within year and reset at year boundaries."

Example Correct Classification:
- Indicator: Tourist Arrivals
- Pattern detected: Clear YTD (Q1 < Q2 < Q3 < Q4, then drops to next Q1)
- CORRECT: indicator_type: "count", temporal_aggregation: "period-cumulative"
- Reasoning: "This country reports quarterly tourist arrivals as year-to-date accumulation. Each quarterly value represents cumulative arrivals from January 1st to the end of that quarter. Data analysis confirms ${
          (input.cumulativeConfidence! * 100).toFixed(0)
        }% confidence in YTD pattern with clear year boundary resets."`
        : ""
    }
`
    : "";

  const systemPrompt = `You are an expert economic indicator type classifier for NON-CURRENCY indicators (dimensionless measures).

CLASSIFICATION OVERVIEW:
========================
Non-currency indicators belong to six families (determined in previous stage):
1. numeric-measurement - Counts, percentages, ratios
2. price-value - Interest rates, yields (as percentages)
3. change-movement - Growth rates, changes, volatility
4. composite-derived - Indices, correlations, elasticities
5. temporal - Durations, probabilities, thresholds
6. qualitative - Sentiment, allocations

Your task: Classify the indicator into a SPECIFIC TYPE within its family and determine temporal aggregation and heat map orientation.

TYPES BY FAMILY:
================

FAMILY 1: NUMERIC-MEASUREMENT
-------------------------------
- count: Counts of discrete items OR continuous physical measurements in raw units
  Examples: Population (persons), Number of firms (count), Temperature (24.5 celsius), Precipitation (100 mm)
  KEY: Physical measurements like temperature, precipitation, wind speed are "counts" of their units (degrees, millimeters, km/h)

- percentage: Value expressed as 0-100%
  Examples: Unemployment Rate, Tax Rate, Labor Force Participation Rate

- ratio: Relationship between two quantities
  Examples: Debt-to-GDP, Loan-to-Value, Price-to-Earnings Ratio

- spread: Difference between two related values
  Examples: Yield Spread, Rate Differential, Interest Rate Spread

- share: Portion of a whole
  Examples: Market Share, Budget Share as %, Export Share

FAMILY 2: PRICE-VALUE (as percentages, not currency)
-----------------------------------------------------
- rate: Interest/lending/borrowing rate (percentage PRICE of capital)
  Examples: Bank Lending Rate, Policy Rate, Deposit Rate, Prime Rate, Interbank Rate
  KEY: These are PRICES - the cost of borrowing money
  Pattern: "X Lending Rate", "X Interest Rate", "X Policy Rate"
  Values: Usually 0-20%, stable levels, not volatile

- yield: Return on investment
  Examples: Bond Yield, Dividend Yield, Treasury Yield
  KEY: Expected return as a percentage price

FAMILY 3: CHANGE-MOVEMENT
--------------------------
- rate: Growth/inflation rate (percentage CHANGE over time)
  Examples: GDP Growth Rate, Inflation Rate, Employment Growth Rate
  KEY: These measure CHANGE - how much something grew/shrank
  Pattern: "X Growth Rate", "Inflation Rate", "Change in X"
  Values: Can be negative, more volatile than price-value rates

- volatility: Measure of variability
  Examples: Stock Market Volatility (VIX), Exchange Rate Volatility

- gap: Deviation from trend/target
  Examples: Output Gap (as %), Unemployment Gap, Trade Gap

FAMILY 4: COMPOSITE-DERIVED
----------------------------
- index: Composite measure
  Examples: Consumer Price Index (CPI), Stock Market Index, PMI, Producer Price Index

- correlation: Statistical relationship
  Examples: Correlation coefficient (-1 to 1)

- elasticity: Responsiveness measure
  Examples: Price elasticity, Income elasticity

- multiplier: Effect multiplier
  Examples: Fiscal multiplier, Money multiplier

FAMILY 5: TEMPORAL
-------------------
- duration: Time period
  Examples: Years to maturity, Bond duration, Time to default

- probability: Likelihood (0-1 or 0-100%)
  Examples: Default probability, Probability of recession

- threshold: Critical value
  Examples: Debt threshold, Inflation threshold

FAMILY 6: QUALITATIVE
----------------------
- sentiment: Subjective measure
  Examples: Consumer confidence, Business sentiment, Investor sentiment

- allocation: Distribution
  Examples: Asset allocation %, Portfolio weights, Budget allocation

CRITICAL: Disambiguating "Rate" indicators

⚠️ WARNING: "rate" type exists in MULTIPLE families - use family to decide!

If Family = price-value:
  → Type = "rate" (these are percentage PRICES for capital)
  Examples: Bank Lending Rate, Interest Rate, Policy Rate, Prime Rate, Deposit Interest Rate, Interbank Rate
  Reasoning: The COST of borrowing/lending - a price, not a change
  Value pattern: 0-20%, stable, rarely negative

If Family = change-movement:
  → Type = "rate" (these are percentage CHANGES over time)
  Examples: GDP Growth Rate, Inflation Rate, Population Growth Rate, Industrial Production %, Manufacturing Production %
  Reasoning: How much something CHANGED - not a price
  Value pattern: Can be negative, more volatile

If Family = numeric-measurement:
  → Type = "percentage" (these are RATIOS/structural measures)
  Examples: Unemployment Rate, Tax Rate, Participation Rate, Employment Rate, Labor Force Participation Rate
  Reasoning: Ratio of parts to whole - not a price or change
  Value pattern: 0-100%, structural not temporal

⚠️ VERIFIED PATTERN FROM REFERENCE DATA (109 human-verified classifications):

❌ COMMON MISTAKES TO AVOID:

1. Interest/Lending Rates:
   ❌ WRONG: indicator_type: ratio or percentage
   ✅ CORRECT: indicator_type: rate, temporal_aggregation: period-average
   Examples: Bank Lending Rate, Interbank Rate, Interest Rate, Deposit Interest Rate
   Reasoning: "Interest rates are PRICE-VALUE rates (cost of capital), averaged over the period"

2. Growth Rates (%, YoY, MoM):
   ❌ WRONG: indicator_type: ratio or percentage
   ✅ CORRECT: indicator_type: rate
   Examples: GDP Growth Rate, Industrial Production %, Manufacturing Production %, Mining Production %
   Reasoning: "Growth rates are CHANGE-MOVEMENT rates (% change over time)"

3. Tax Rates & Social Security Rates:
   ❌ WRONG: indicator_type: percentage, temporal_aggregation: not-applicable
   ✅ CORRECT: indicator_type: ratio, temporal_aggregation: point-in-time
   Examples: Corporate Tax Rate, Personal Income Tax Rate, Sales Tax Rate, Social Security Rate
   Reasoning: "Policy rates are numeric-measurement ratios expressed as %, measured at a point in time"

4. Labor Market Ratios (Unemployment, Employment, Labor Force Participation):
   ❌ WRONG: indicator_type: percentage or rate, temporal_aggregation: not-applicable or period-average
   ✅ CORRECT: indicator_type: ratio, temporal_aggregation: point-in-time
   Examples: Unemployment Rate, Employment Rate, Labor Force Participation Rate
   Reasoning: "Numeric-measurement ratios expressed as %, snapshot at a point in time"

5. Price Indices (CPI, PPI, etc.):
   ❌ WRONG: indicator_type: index, temporal_aggregation: point-in-time
   ✅ CORRECT: indicator_type: index, temporal_aggregation: period-average
   Examples: Consumer Price Index, Core Consumer Prices, Producer Prices, Import Prices, Export Prices
   Reasoning: "Price indices represent average price level during the period"

6. Population & Employment Counts:
   ❌ WRONG: indicator_type: stock
   ✅ CORRECT: indicator_type: count
   Examples: Population, Employed Persons, Unemployed Persons
   Reasoning: "Count of discrete items (people), always non-negative"

7. Production Rates (Physical Units with Per-Unit):
   ❌ WRONG: indicator_type: count, temporal_aggregation: period-total
   ✅ CORRECT: indicator_type: rate, temporal_aggregation: period-average
   Examples: Crude Oil Production (BBL/D), Energy Output (MWh/day), Water Usage (liters/day)
   Reasoning: "Units containing '/' indicate a RATE (per-unit measurement), not a count. BBL/D = barrels PER DAY (production rate), averaged over the period"
   KEY SIGNAL: Look for "/" in units (BBL/D, MT/year, MW/h) - these are flow rates, NOT discrete counts
   Contrast with: Tourist Arrivals (persons) → count, Population (persons) → count (no "/" means discrete count)

8. Physical Measurements (Temperature, Precipitation, etc.):
   ❌ WRONG: indicator_type: percentage or ratio
   ✅ CORRECT: indicator_type: count, temporal_aggregation: point-in-time or period-total
   Examples: Temperature (24.5 celsius), Precipitation (100 mm), Wind Speed (50 km/h)
   Reasoning: "Physical measurements in continuous units are treated as 'counts' of those units (e.g., count of degrees, count of millimeters)"
   KEY: If parsed_unit_type = "physical" and family = "numeric-measurement", use count (NOT percentage!)
   Pattern: Celsius, Fahrenheit, mm, meters, km/h → count

9. Inflation Heat Map Orientation:
   ❌ WRONG: heat_map_orientation: higher-is-positive or lower-is-positive
   ✅ CORRECT: heat_map_orientation: neutral
   Examples: Inflation Rate, Food Inflation, Core Inflation, Inflation Rate MoM, Inflation Rate YoY
   Reasoning: "Inflation impact depends on economic conditions and target rates. Not inherently good or bad."
   KEY: ALL inflation-related indicators should be neutral regardless of what seems intuitive
   Why neutral: "Higher inflation can indicate growth OR overheating. Lower inflation can indicate stability OR deflation risk. Context-dependent."
   Pattern: Name contains "Inflation" → neutral (ALWAYS!)

TEMPORAL AGGREGATION:

- point-in-time: Snapshot value (Interest rates, stock indices, ratios)
- period-rate: Flow rate during period (Growth rates, inflation)
- period-cumulative: Cumulative total (Cumulative returns)
- period-average: Average over period (Average interest rate)
- period-total: Sum over period (Total count changes)
- not-applicable: No temporal dimension (Correlations, elasticities)

HEAT MAP ORIENTATION (whether higher/lower is positive):

- higher-is-positive: Higher values indicate better economic outcomes
  Examples: GDP Growth Rate, Employment Rate, Consumer Confidence Index, Capacity Utilization, Export Volumes, Tourist Arrivals

- lower-is-positive: Lower values indicate better outcomes
  Examples: Unemployment Rate, External Debt, Government Debt to GDP

- neutral: Neither direction is inherently good/bad, context-dependent
  Examples: Interest Rates (affects savers vs borrowers differently),
           ALL INFLATION INDICATORS (Food Inflation, Core Inflation, Inflation Rate, Inflation Rate MoM/YoY - depends on economic conditions and target rates),
           Inflation level indices (reference point, not change),
           Producer Prices level (reference point, higher/lower depends on conditions),
           Tax Rates (revenue vs economic activity tradeoffs),
           Government Spending levels (welfare vs fiscal balance)

  ⚠️ CRITICAL: ANY indicator with "Inflation" in the name → ALWAYS neutral (never higher-is-positive or lower-is-positive)

DECISION HINTS:

Family = price-value + Name contains "Lending/Interest" → rate + point-in-time
Family = change-movement + Name contains "Growth/Inflation" → rate + period-rate
Family = numeric-measurement + Name contains "Rate" → percentage + point-in-time
Family = composite-derived + Name contains "Index" → index + point-in-time

CONCRETE EXAMPLES WITH TEMPORAL AGGREGATION (✅ = VERIFIED FROM REFERENCE DATA):

✅ Bank Lending Rate (5.5%) → rate + period-average + neutral
  Family: price-value, Type: rate (interest rates are PRICE-VALUE rates!)
  Why: Interest rates are price-value rates (cost of capital), averaged over the period. Neutral because impact depends on perspective.

✅ GDP Growth Rate (3.2%) → rate + period-rate + higher-is-positive
  Family: change-movement, Type: rate (growth rates are CHANGE-MOVEMENT rates!)
  Why: Growth rates measure % change over time. Higher growth = better economy.

✅ Unemployment Rate (6.5%) → ratio + point-in-time + lower-is-positive
  Family: numeric-measurement, Type: ratio (labor market measures are ratios!)
  Why: Numeric-measurement ratio expressed as %, snapshot at a point in time. Lower unemployment = better.

✅ Consumer Price Index (118.5) → index + period-average + neutral
  Family: composite-derived, Type: index
  Why: Price indices represent average price level during the period. Level itself is neutral reference point.

✅ Inflation Rate (2.3%) → rate + period-rate + neutral
  Family: change-movement, Type: rate (inflation is a CHANGE-MOVEMENT rate!)
  Why: Percent change in prices during period. ALWAYS neutral for ALL inflation indicators.
  ⚠️ CRITICAL: Higher inflation can indicate growth OR overheating. Lower inflation can indicate stability OR deflation risk.
  Impact depends on economic conditions, inflation targets, and central bank policy. NEVER use higher-is-positive or lower-is-positive.

✅ Population Count (50,000,000) → count + point-in-time + neutral
  Family: numeric-measurement, Type: count (NOT stock!)
  Why: Count of discrete items (people) at a specific date. Neither higher nor lower inherently better.

✅ Debt-to-GDP Ratio (85%) → ratio + point-in-time + lower-is-positive
  Family: numeric-measurement, Type: ratio
  Why: Structural relationship at a point in time. Lower debt ratio = healthier fiscal position.

✅ Bond Yield (4.2%) → yield + point-in-time + neutral
  Family: price-value, Type: yield
  Why: Current return rate (snapshot price). Impact depends on investor/borrower perspective.

✅ Corporate Tax Rate (25%) → ratio + point-in-time + neutral
  Family: numeric-measurement, Type: ratio (policy rates are ratios!)
  Why: Numeric-measurement ratios expressed as %, measured at a point in time. Impact depends on tradeoffs.

✅ Employment Rate (65%) → ratio + point-in-time + higher-is-positive
  Family: numeric-measurement, Type: ratio
  Why: Numeric-measurement ratio expressed as %, snapshot at a point in time. Higher employment = better.

✅ Employed Persons (15,000,000) → count + point-in-time + higher-is-positive
  Family: numeric-measurement, Type: count
  Why: Count of discrete items (people) at a specific date. More employment = better.

✅ Producer Prices Index (112.3) → index + period-average + neutral
  Family: composite-derived, Type: index
  Why: Price indices represent average price level during the period. Level is neutral reference point.

✅ Industrial Production (3.5%) → rate + period-rate + higher-is-positive
  Family: change-movement, Type: rate
  Why: Percent change in industrial output during period. Higher growth = stronger economic activity.

✅ Labor Force Participation Rate (62%) → ratio + point-in-time + higher-is-positive
  Family: numeric-measurement, Type: ratio
  Why: Numeric-measurement ratio expressed as %, snapshot at a point in time. Higher participation = better labor market utilization.

TEMPORAL AGGREGATION QUICK GUIDE (✅ = VERIFIED FROM REFERENCE DATA):
✅ Interest/Lending Rates → period-average (averaged over period, NOT point-in-time!)
✅ Growth/Inflation Rates → period-rate (change during period)
✅ Labor Market Ratios (Unemployment, Employment) → point-in-time (snapshot ratio)
✅ Tax/Policy Rates → point-in-time (policy parameter, not a flow)
✅ Price Indices (CPI, PPI) → period-average (average price level, NOT point-in-time!)
✅ Population/Employment Counts → point-in-time (snapshot count)
- Volatility → period-average or period-rate (variation during period)

REMEMBER: Focus on indicator NAME patterns, but VERIFY with actual data characteristics.

PATTERN-BASED CLASSIFICATION (Default Approach):
The same indicator name USUALLY has consistent core classification across countries:
- "GDP" is typically flow + period-total
- "Bank Lending Rate" is typically rate + period-average
- "Unemployment Rate" is typically ratio + point-in-time

HOWEVER - Country-Specific Variations DO Exist:
⚠️ ALWAYS examine the actual indicator metadata and let the DATA override the pattern when necessary!

Examples of legitimate country-specific variations:
1. **Wages**:
   - Most countries: flow + period-total (total wages paid during period)
   - Some countries: index + period-average (wage index level)
   → If units say "index" or "2015=100", use index NOT flow!

2. **Interest Rates**:
   - Most countries: rate + period-average (averaged over period)
   - Some countries: rate + point-in-time (snapshot policy rate)
   → If description says "end-of-period policy rate", use point-in-time!

3. **Trade Balance**:
   - Most countries: balance + period-total (net flow during period)
   - Some countries: balance + point-in-time (snapshot stock position)
   → If it's explicitly a stock position, use point-in-time!

DECISION PROCESS:
1. Start with the indicator NAME pattern (e.g., "Bank Lending Rate" → rate + period-average)
2. Check units, description, and sample_values for contradictory evidence
3. If the actual data clearly indicates different characteristics, OVERRIDE the pattern
4. Document your reasoning: "Typically X, but this country reports as Y because..."

Example Decision:
- Indicator: "Average Wages"
- Pattern suggests: flow + period-total
- BUT units say: "Index, 2015=100"
- AND description says: "Wage index level"
- DECISION: Override to index + period-average
- Reasoning: "Although wages are typically flows, this country reports wages as an index level"


IMPORTANT: Return ONLY valid JSON matching this exact schema:
=============================================================
{
  "indicatorType": string (from types listed above for your family),
  "temporalAggregation": "point-in-time" | "period-rate" | "period-cumulative" | "period-average" | "period-total" | "not-applicable",
  "heatMapOrientation": "higher-is-positive" | "lower-is-positive" | "neutral",
  "confidence": 0.0-1.0,
  "reasoning": "Clear explanation of your classification logic and key factors"
}`;

  const userPrompt = `Please classify this non-currency-denominated economic indicator:

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
Parsed Unit Type: ${input.parsedUnitType || "unknown"}${unitTypeHint}
Value patterns: ${valueAnalysis}
${cumulativeContext}


Analyze the above indicator and provide your classification as JSON.`;

  return { systemPrompt, userPrompt };
}
