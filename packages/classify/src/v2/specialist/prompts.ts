/**
 * Specialist Stage Prompts - Family-Specific Classification (Optimized & Robust)
 * @module
 */

import type { Indicator, TemporalDataPoint } from "../../types.ts";
import type { IndicatorFamily } from "../types.ts";

/**
 * Concise family prompts - optimized for token usage, robust for edge cases
 */

const PHYSICAL_FUNDAMENTAL_PROMPT =
  `You are classifying PHYSICAL-FUNDAMENTAL indicators (stocks, flows, balances, capacity, volume).

TYPES (choose exact match):
• stock: Point-in-time level (debt, reserves, population, capital stock)
• flow: Measured over period (GDP, consumption, investment, government spending, revenue, tax)
• balance: Can be negative (trade balance, fiscal balance, current account, net lending/borrowing)
• capacity: Maximum potential (potential GDP, labor force, installed capacity)
• volume: Physical quantity/transaction amount (import volume, export volume, trade volume, sales volume in units)

CRITICAL DISTINCTIONS:
• "Imports/Exports in units/Terajoule/barrels" → VOLUME (physical quantity), NOT flow
• "Sales in units" → VOLUME (transaction quantity), NOT flow
• "GDP/Revenue/Spending in currency" → FLOW (monetary flow over period)
• "Net lending/borrowing", "Changes in Inventories/Reserves" → BALANCE (can be +/- negative)
• Names containing "Net", "Balance", "Surplus", or "Deficit" → BALANCE
• "Net Long-term TIC Flows" → BALANCE (net flow, can be negative)
• Vehicle/Motorbike/Auto "Sales" (units) → VOLUME (transaction quantity)
• "Principal repayments", "Debt repayments" → FLOW (payment flow over period), temporal=period-total

TEMPORAL AGGREGATION (CHECK CAREFULLY):
• stock → point-in-time (snapshot at moment)
• flow → Check description/context:
  - "current prices" or total aggregate → period-total (sum over period)
  - "per period" or explicit rate → period-rate (rate over period)
  - GDP (most cases) → period-total (aggregate output)
  - "GDP from Manufacturing" → period-total (sector contribution)
  - Repayments/payments → period-total (sum of payments)
• balance → period-total (net flow over period)
• capacity → point-in-time (maximum at moment)
• volume → period-total (total quantity: imports, exports, sales)
• YTD/cumulative → period-cumulative

⚠️ AGGREGATION METHOD FIELD (CRITICAL INDICATOR):
If "Aggregation Method" is provided, it indicates how the data is measured:
• "Weekly Change", "Monthly Change", "YoY Change" → period-rate (measuring change over period)
• "Sum", "Total" → period-total (sum over period)
• "Average", "Mean" → period-average (average over period)
• "End of Period", "Point in Time" → point-in-time (snapshot)
• When Aggregation Method indicates "Change" → temporal_aggregation MUST be "period-rate"

IS_CURRENCY_DENOMINATED (true only if currency-denominated):
• USD/EUR/currency amount → TRUE (including GDP per capita if in currency)
• Physical units (Terajoule, barrels, units, tonnes) → FALSE
• Percent/ratio → FALSE (dimensionless)
• "% of GDP" → FALSE (it's a ratio)

EXAMPLES:
Natural Gas Imports (Terajoule) → {"indicator_type":"volume","temporal_aggregation":"period-total","is_currency_denominated":false}
GDP current prices (USD) → {"indicator_type":"flow","temporal_aggregation":"period-total","is_currency_denominated":true}
GDP from Manufacturing → {"indicator_type":"flow","temporal_aggregation":"period-total","is_currency_denominated":true}
Trade Balance (USD) → {"indicator_type":"balance","temporal_aggregation":"period-total","is_currency_denominated":true}
Changes in Inventories → {"indicator_type":"balance","temporal_aggregation":"period-total","is_currency_denominated":true}
API Cushing Number (Aggregation: Weekly Change) → {"indicator_type":"balance","temporal_aggregation":"period-rate","is_currency_denominated":false}
Foreign Reserves (USD) → {"indicator_type":"stock","temporal_aggregation":"point-in-time","is_currency_denominated":true}
Motorbike Sales (Units) → {"indicator_type":"volume","temporal_aggregation":"period-total","is_currency_denominated":false}
Exports (Units) → {"indicator_type":"volume","temporal_aggregation":"period-total","is_currency_denominated":false}
Principal repayments (USD) → {"indicator_type":"flow","temporal_aggregation":"period-total","is_currency_denominated":true}
Net TIC Flows → {"indicator_type":"balance","temporal_aggregation":"period-total","is_currency_denominated":true}

OUTPUT: {"results":[{"indicator_id":"...","indicator_type":"...","temporal_aggregation":"...","is_currency_denominated":true|false,"confidence":0-1,"reasoning":"1 sentence why"}]}`;

const NUMERIC_MEASUREMENT_PROMPT =
  `You are classifying NUMERIC-MEASUREMENT indicators (dimensionless ratios, percentages, counts).

TYPES (choose exact match):
• count: Discrete positive events (housing starts, jobless claims)
• balance: Can be positive or negative (employment change, claimant count change, net changes)
• percentage: 0-100% bounded (unemployment rate, participation rate, capacity utilization)
• ratio: X-to-Y or per-X (debt-to-GDP, GDP per capita, price-to-earnings)
• spread: X minus Y (yield spread, interest rate differential)
• share: Compositional % of GDP (consumption as % of GDP, labor share)

CRITICAL DISTINCTIONS:
• "Employment Change" → BALANCE (can be negative), period-total
• "ADP Employment Change" → BALANCE (can be negative), period-total
• "Claimant Count Change" → BALANCE (can be negative), period-total
• "Jobless Claims" → COUNT (discrete events), period-total
• "Jobless Claims 4-week Average" → COUNT with period-average temporal (averaged count over 4 weeks)
• "Unemployment Rate %" → PERCENTAGE (0-100% bounded), not-applicable
• "Government Spending to GDP" → RATIO (X-to-Y), not-applicable, is_currency_denominated FALSE
• "Nurses per 1000 population" → RATIO, point-in-time (observed at specific time)
• "Medical Doctors per 1000 population" → RATIO, point-in-time (observed at specific time)

⚠️ SPECIAL CASE - GDP PER CAPITA:
• "GDP per capita" is NOT a ratio - it's a FLOW indicator
• Reason: GDP is a flow (economic output over period), divided by population
• Has dimensions of currency/person, NOT dimensionless
• Should be classified in PHYSICAL-FUNDAMENTAL family as FLOW, not NUMERIC-MEASUREMENT
• True ratios are dimensionless (%, debt-to-GDP, etc.)

TEMPORAL AGGREGATION:
• count → period-total (sum of discrete events over period)
• count (when "X-week average" or "X-month average") → period-average (averaged over period)
• percentage → not-applicable (dimensionless ratio)
• ratio (per-capita, per-population) → point-in-time (observed at specific time)
• ratio (X-to-Y, debt-to-GDP) → not-applicable (dimensionless ratio)
• spread → not-applicable (dimensionless difference)
• share → not-applicable (compositional ratio)

IS_CURRENCY_DENOMINATED:
• Counts of people/events → FALSE (never monetary)
• Ratios/percentages → FALSE (dimensionless, even if derived from money)
• "X to GDP" ratio → FALSE (dimensionless ratio)
• NOTE: GDP per capita should be classified as FLOW in PHYSICAL-FUNDAMENTAL, not here

EXAMPLES:
Employment Change → {"indicator_type":"balance","temporal_aggregation":"period-total","is_currency_denominated":false}
Claimant Count Change → {"indicator_type":"balance","temporal_aggregation":"period-total","is_currency_denominated":false}
Jobless Claims → {"indicator_type":"count","temporal_aggregation":"period-total","is_currency_denominated":false}
Jobless Claims 4-week Average → {"indicator_type":"count","temporal_aggregation":"period-average","is_currency_denominated":false}
Unemployment Rate % → {"indicator_type":"percentage","temporal_aggregation":"not-applicable","is_currency_denominated":false}
Government Spending to GDP → {"indicator_type":"ratio","temporal_aggregation":"not-applicable","is_currency_denominated":false}
Debt to GDP Ratio → {"indicator_type":"ratio","temporal_aggregation":"not-applicable","is_currency_denominated":false}
Nurses per 1000 population → {"indicator_type":"ratio","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Medical Doctors per 1000 population → {"indicator_type":"ratio","temporal_aggregation":"point-in-time","is_currency_denominated":false}

OUTPUT: {"results":[{"indicator_id":"...","indicator_type":"...","temporal_aggregation":"...","is_currency_denominated":true|false,"confidence":0-1,"reasoning":"1 sentence why"}]}`;

const PRICE_VALUE_PROMPT =
  `You are classifying PRICE-VALUE indicators (market-determined prices and rates).

TYPES (choose exact match):
• price: Interest rates, exchange rates, commodity prices, asset prices, stock prices, electricity prices
• yield: Bond yields, returns, dividend yields

CRITICAL RULES - IS_CURRENCY_DENOMINATED:
• Exchange rates (FX) → FALSE (they are dimensionless ratios: USD/EUR = 1.08 euros per dollar, NOT a currency amount)
• Interest rates → FALSE (they are the price of money, expressed as %)
• Commodity prices (oil, gold, electricity) → TRUE (if in currency: USD/barrel, EUR/MWh)
• Stock prices → TRUE (in currency)
• Bond yields → FALSE (expressed as %)
• Secured Overnight Financing Rate (SOFR) and similar overnight rates → FALSE (expressed as %)

TEMPORAL AGGREGATION:
• All prices/yields → point-in-time (snapshot at moment)
• Explicit "average price" → period-average
• Interest/FX rates → point-in-time (even if daily/weekly)

EXAMPLES:
Exchange Rate USD/EUR → {"indicator_type":"price","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Exchange Rate PKR/USD → {"indicator_type":"price","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Interbank Rate % → {"indicator_type":"price","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Electricity Price EUR/MWh → {"indicator_type":"price","temporal_aggregation":"point-in-time","is_currency_denominated":true}
Oil Price USD/barrel → {"indicator_type":"price","temporal_aggregation":"point-in-time","is_currency_denominated":true}
10-Year Bond Yield % → {"indicator_type":"yield","temporal_aggregation":"point-in-time","is_currency_denominated":false}
SOFR (%) → {"indicator_type":"price","temporal_aggregation":"point-in-time","is_currency_denominated":false}

OUTPUT: {"results":[{"indicator_id":"...","indicator_type":"...","temporal_aggregation":"...","is_currency_denominated":true|false,"confidence":0-1,"reasoning":"1 sentence why"}]}`;

const CHANGE_MOVEMENT_PROMPT =
  `You are classifying CHANGE-MOVEMENT indicators (rates of change, volatility, gaps).

TYPES (choose exact match):
• rate: Growth rates, inflation rates, percent changes (GDP growth, CPI YoY, Producer Prices Change, Import Prices MoM)
• volatility: Price volatility, exchange rate volatility, VIX
• gap: Deviation from trend/potential (output gap, unemployment gap)
• velocity: Turnover rates, circulation speed

CRITICAL RULES:
• Any "YoY/QoQ/MoM/Change/Growth" → RATE type
• "CPI Trimmed-Mean" with % units → RATE (it measures price change)
• "Producer Prices Change %" → RATE
• "Import Prices MoM %" → RATE
• "Property Prices %" → RATE (if measuring change)

TEMPORAL AGGREGATION:
• rate → period-rate (measured over the period: YoY, MoM, QoQ)
• volatility → period-rate (measured over period)
• gap → point-in-time (snapshot of deviation at moment)
• velocity → period-rate

IS_CURRENCY_DENOMINATED (CRITICAL - RATE CHANGES ARE PERCENTAGES, NOT CURRENCY):
• ALL growth/change rates (YoY, MoM, QoQ, % changes) → FALSE (they are percentages/ratios, NOT currency amounts)
• This includes: CPI inflation, PPI change, Import/Export price changes, Property price changes, GDP growth, Retail sales growth, Credit growth, Wage growth
• Percentages are dimensionless, even when derived from monetary values
• Gaps, spreads, volatility → FALSE (dimensionless measures)

EXAMPLES:
GDP Growth YoY % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_currency_denominated":false}
CPI Trimmed-Mean % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_currency_denominated":false}
Core Inflation Rate % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_currency_denominated":false}
Mid-month Inflation Rate MoM % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_currency_denominated":false}
Producer Prices Change % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_currency_denominated":false}
Import Prices MoM % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_currency_denominated":false}
Residential Property Prices % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_currency_denominated":false}
Retail Sales YoY % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_currency_denominated":false}
Private Sector Credit % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_currency_denominated":false}
Wage Growth % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_currency_denominated":false}
M1/M2 Growth % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_currency_denominated":false}
Output Gap → {"indicator_type":"gap","temporal_aggregation":"point-in-time","is_currency_denominated":false}
VIX Volatility → {"indicator_type":"volatility","temporal_aggregation":"period-rate","is_currency_denominated":false}

OUTPUT: {"results":[{"indicator_id":"...","indicator_type":"...","temporal_aggregation":"...","is_currency_denominated":true|false,"confidence":0-1,"reasoning":"1 sentence why"}]}`;

const COMPOSITE_DERIVED_PROMPT =
  `You are classifying COMPOSITE-DERIVED indicators (indices, statistical relationships).

TYPES (choose exact match):
• index: Composite indices (CPI, PMI, S&P 500, confidence index, business climate index, economic optimism index, price indices)
• correlation: Statistical relationships (beta, correlation coefficients)
• elasticity: Sensitivity measures (price elasticity, income elasticity)
• multiplier: Multiplier effects (fiscal multiplier, money multiplier)
• other: Other composite measures

CRITICAL DISTINCTIONS:
• "Business Confidence/Climate/Optimism INDEX" → INDEX (composite measure), NOT qualitative sentiment
• "Economic Optimism INDEX" → INDEX (composite measure), NOT sentiment
• "Industry INDEX" → INDEX (composite measure), NOT sentiment
• PMI/ISM → INDEX (composite survey index)
• "Prices Paid/Received INDEX" → INDEX (tracks price levels), is_currency_denominated TRUE if price-related; FALSE if survey diffusion without currency meaning
• "PCE/CPI Price INDEX" → INDEX (composite price level), is_currency_denominated TRUE
• "Terms of Trade" → INDEX (export/import price ratio index), is_currency_denominated FALSE
• "CFNAI" → INDEX (composite activity index)
• "Global Dairy Trade Price Index" / "GDT" → INDEX (commodity price index), is_currency_denominated TRUE
• If the name uses "Index" but is clearly a pure sentiment label (e.g., "Services Sentiment Index"), still classify as INDEX here (composite-derived), not qualitative
• Pure "sentiment/confidence" without "index" → qualitative (different family)

TEMPORAL AGGREGATION (CRITICAL - CHECK UNITS):
• PMI/ISM Manufacturing → point-in-time (manufacturing PMI is treated as point reading)
• PMI/ISM Services → period-average (services diffusion often averaged)
• CFNAI (Chicago Fed National Activity Index) → point-in-time
• Business Climate → period-average
• Business Conditions → point-in-time
• Ifo Expectations → period-average
• **MUST: Prices Paid/Received subindices → period-average (monthly diffusion averaged)**
  - For ANY indicator with "Prices Paid", "Prices Received", "Manufacturing Prices", "Non Manufacturing Prices" in name
  - ISM Manufacturing Prices, ISM Non Manufacturing Prices
  - Kansas Fed Prices Paid Index
  - Philly Fed Prices Paid
  - Dallas Fed Manufacturing Prices Paid Index
  - LMI Inventory Costs
  - These are diffusion subindices that MUST be period-average
• Dallas/Kansas/Philly Fed Services Revenues Index → point-in-time
• Dallas/Kansas/Philly Fed Employment/Composite readings → point-in-time
• Industry Index Manufacturing → point-in-time
• Industry Index Business Services → period-average
• Price level indices (CPI, PCE, S&P 500, GDT, Export Prices Index) → point-in-time (index level)
• correlation/elasticity/multiplier → period-average (estimated over window)
• Terms of Trade → point-in-time (ratio at point in time)

IS_CURRENCY_DENOMINATED (CRITICAL - PRICE INDICES ARE DIMENSIONLESS):
• Price indices (CPI, PCE, PPI, Export/Import/Residential Property price indices, GDT, Nationwide Housing Prices) → FALSE (dimensionless index points, NOT currency)
• Diffusion indices (PMI, ISM, Fed Prices Paid/Received, LMI Inventory Costs) → FALSE (survey index points, NOT currency)
• Survey indices (confidence, business climate, optimism) → FALSE (dimensionless index scores)
• Equity indices (S&P 500, stock indices) → TRUE (aggregate price level in currency)
• Statistical measures (correlation, elasticity, Terms of Trade) → FALSE (dimensionless ratios)

EXAMPLES:
Manufacturing PMI → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Services PMI → {"indicator_type":"index","temporal_aggregation":"period-average","is_currency_denominated":false}
Business Climate Index → {"indicator_type":"index","temporal_aggregation":"period-average","is_currency_denominated":false}
Business Conditions Index → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Kansas Fed Prices Paid Index → {"indicator_type":"index","temporal_aggregation":"period-average","is_currency_denominated":false}
ISM Manufacturing Prices → {"indicator_type":"index","temporal_aggregation":"period-average","is_currency_denominated":false}
LMI Inventory Costs → {"indicator_type":"index","temporal_aggregation":"period-average","is_currency_denominated":false}
Economic Optimism Index → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Industry Index Manufacturing → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Industry Index Business Services → {"indicator_type":"index","temporal_aggregation":"period-average","is_currency_denominated":false}
Kansas Fed Prices Paid Index → {"indicator_type":"index","temporal_aggregation":"period-average","is_currency_denominated":false}
ISM Manufacturing Prices → {"indicator_type":"index","temporal_aggregation":"period-average","is_currency_denominated":false}
ISM Non Manufacturing Prices → {"indicator_type":"index","temporal_aggregation":"period-average","is_currency_denominated":false}
Philly Fed Prices Paid → {"indicator_type":"index","temporal_aggregation":"period-average","is_currency_denominated":false}
LMI Inventory Costs → {"indicator_type":"index","temporal_aggregation":"period-average","is_currency_denominated":false}
Dallas Fed Manufacturing Prices Paid Index → {"indicator_type":"index","temporal_aggregation":"period-average","is_currency_denominated":false}
Dallas Fed Services Revenues Index → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Kansas Fed Employment Index → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_currency_denominated":false}
CFNAI Production Index → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Ifo Expectations → {"indicator_type":"index","temporal_aggregation":"period-average","is_currency_denominated":false}
PCE Price Index → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_currency_denominated":false}
CPI (level) → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Core Consumer Prices → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Export Prices → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Residential Property Prices → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Nationwide Housing Prices → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Terms of Trade → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Global Dairy Trade Price Index → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_currency_denominated":false}
S&P 500 → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_currency_denominated":true}
Fiscal Multiplier → {"indicator_type":"multiplier","temporal_aggregation":"period-average","is_currency_denominated":false}

OUTPUT: {"results":[{"indicator_id":"...","indicator_type":"...","temporal_aggregation":"...","is_currency_denominated":true|false,"confidence":0-1,"reasoning":"1 sentence why"}]}`;

const TEMPORAL_PROMPT =
  `You are classifying TEMPORAL indicators (time-based measurements).

TYPES (choose exact match):
• duration: Time length, maturity, time to event
• probability: Likelihood, risk probability, chance
• threshold: Time-based triggers, breach points

TEMPORAL AGGREGATION:
• All temporal indicators → not-applicable (they measure time itself)

IS_CURRENCY_DENOMINATED:
• All temporal indicators → FALSE (measure time, not money)

EXAMPLES:
Average Maturity → {"indicator_type":"duration","temporal_aggregation":"not-applicable","is_currency_denominated":false}
Recession Probability → {"indicator_type":"probability","temporal_aggregation":"not-applicable","is_currency_denominated":false}

OUTPUT: {"results":[{"indicator_id":"...","indicator_type":"...","temporal_aggregation":"...","is_currency_denominated":true|false,"confidence":0-1,"reasoning":"1 sentence why"}]}`;

const QUALITATIVE_PROMPT =
  `You are classifying QUALITATIVE indicators (surveys, sentiment, allocations).

TYPES (choose exact match):
• sentiment: Pure sentiment/confidence surveys WITHOUT "index" in name (consumer sentiment, business sentiment)
• allocation: Distribution preferences, asset allocation, sector allocation
• other: Other qualitative/categorical measures

CRITICAL DISTINCTION:
• "Consumer/Business Sentiment" (no "index") → SENTIMENT type (qualitative family)
• "Consumer/Business Confidence INDEX" → INDEX type (composite-derived family - should not be here!)
• If you see "INDEX" in the name → it belongs to composite-derived family, NOT qualitative!

TEMPORAL AGGREGATION:
• sentiment → point-in-time (snapshot of sentiment at moment)
• allocation → point-in-time (current distribution)

IS_CURRENCY_DENOMINATED:
• All qualitative indicators → FALSE (categorical/survey data)

EXAMPLES:
Consumer Sentiment → {"indicator_type":"sentiment","temporal_aggregation":"point-in-time","is_currency_denominated":false}
Asset Allocation Survey → {"indicator_type":"allocation","temporal_aggregation":"point-in-time","is_currency_denominated":false}

OUTPUT: {"results":[{"indicator_id":"...","indicator_type":"...","temporal_aggregation":"...","is_currency_denominated":true|false,"confidence":0-1,"reasoning":"1 sentence why"}]}`;

/**
 * Family-specific prompts mapping
 */
export const FAMILY_PROMPTS: Record<IndicatorFamily, string> = {
  "physical-fundamental": PHYSICAL_FUNDAMENTAL_PROMPT,
  "numeric-measurement": NUMERIC_MEASUREMENT_PROMPT,
  "price-value": PRICE_VALUE_PROMPT,
  "change-movement": CHANGE_MOVEMENT_PROMPT,
  "composite-derived": COMPOSITE_DERIVED_PROMPT,
  temporal: TEMPORAL_PROMPT,
  qualitative: QUALITATIVE_PROMPT,
  other: QUALITATIVE_PROMPT, // Use qualitative prompt for 'other' category
};

/**
 * Generate specialist user prompt (comprehensive context with router decision)
 */
export function generateSpecialistUserPrompt(
  indicators: Indicator[],
  family: IndicatorFamily,
): string {
  const indicatorList = indicators
    .map((ind, idx) => {
      const parts = [
        `Indicator ${idx + 1}:`,
        `- ID: ${ind.id}`,
        `- Name: ${ind.name}`,
      ];

      if (ind.units) parts.push(`- Units: ${ind.units}`);
      if (ind.currency_code) parts.push(`- Currency: ${ind.currency_code}`);
      if (ind.periodicity) parts.push(`- Periodicity: ${ind.periodicity}`);
      if (ind.aggregation_method) {
        parts.push(`- Aggregation Method: ${ind.aggregation_method}`);
      }
      if (ind.description) parts.push(`- Description: ${ind.description}`);

      // Include time series data if available
      if (
        ind.sample_values && Array.isArray(ind.sample_values) &&
        ind.sample_values.length > 0
      ) {
        const isTemporalData = typeof ind.sample_values[0] === "object" &&
          "date" in ind.sample_values[0];

        if (isTemporalData) {
          const timeSeries = ind.sample_values as TemporalDataPoint[];
          const sampleSize = Math.min(5, timeSeries.length);
          const sample = timeSeries.slice(0, sampleSize);
          parts.push(
            `- Time Series Sample (${timeSeries.length} points): ${
              sample.map((p) => `${p.date}: ${p.value}`).join(", ")
            }${timeSeries.length > sampleSize ? "..." : ""}`,
          );
        } else {
          const values = ind.sample_values as number[];
          const sampleSize = Math.min(5, values.length);
          const sample = values.slice(0, sampleSize);
          parts.push(
            `- Sample Values (${values.length} points): ${sample.join(", ")}${
              values.length > sampleSize ? "..." : ""
            }`,
          );
        }
      }

      // Include router decision (family classification from previous stage)
      const extInd = ind as any;
      if (extInd.router_family || extInd.family) {
        parts.push(
          `- Router Family Decision: ${extInd.router_family || extInd.family}`,
        );
      }
      if (
        typeof (extInd.router_confidence || extInd.confidence_family) ===
          "number"
      ) {
        parts.push(
          `- Router Confidence: ${
            extInd.router_confidence || extInd.confidence_family
          }`,
        );
      }
      if (extInd.router_reasoning) {
        parts.push(`- Router Reasoning: ${extInd.router_reasoning}`);
      }

      return parts.join("\n");
    })
    .join("\n\n");

  return `═══════════════════════════════════════════════════════════════════════════
${family.toUpperCase()} SPECIALIST CLASSIFICATION
═══════════════════════════════════════════════════════════════════════════

The Router stage classified these ${indicators.length} indicator${
    indicators.length === 1 ? "" : "s"
  } as ${family} family.
Your task: Determine the specific TYPE, TEMPORAL AGGREGATION, and IS_CURRENCY_DENOMINATED for each.

${indicatorList}

═══════════════════════════════════════════════════════════════════════════
RESPONSE REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════

Return a JSON object with "results" array containing ${indicators.length} classification${
    indicators.length === 1 ? "" : "s"
  }, in the SAME ORDER as above.

Each classification MUST contain:
• indicator_id (exact match to input ID)
• indicator_type (from family-specific type taxonomy)
• temporal_aggregation (from: point-in-time, period-rate, period-total, period-cumulative, period-average, not-applicable)
• is_currency_denominated (true if currency-denominated, false otherwise)
• confidence (0-1 number)
• reasoning (1 sentence explaining classification choice)`;
}
