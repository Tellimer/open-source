/**
 * Specialist Stage Prompts - Family-Specific Classification (Optimized & Robust)
 * @module
 */

import type { Indicator } from '../../types.ts';
import type { IndicatorFamily } from '../types.ts';

/**
 * Concise family prompts - optimized for token usage, robust for edge cases
 */

const PHYSICAL_FUNDAMENTAL_PROMPT = `You are classifying PHYSICAL-FUNDAMENTAL indicators (stocks, flows, balances, capacity, volume).

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

IS_MONETARY (true only if currency-denominated):
• USD/EUR/currency amount → TRUE (including GDP per capita if in currency)
• Physical units (Terajoule, barrels, units, tonnes) → FALSE
• Percent/ratio → FALSE (dimensionless)
• "% of GDP" → FALSE (it's a ratio)

EXAMPLES:
Natural Gas Imports (Terajoule) → {"indicator_type":"volume","temporal_aggregation":"period-total","is_monetary":false}
GDP current prices (USD) → {"indicator_type":"flow","temporal_aggregation":"period-total","is_monetary":true}
GDP from Manufacturing → {"indicator_type":"flow","temporal_aggregation":"period-total","is_monetary":true}
Trade Balance (USD) → {"indicator_type":"balance","temporal_aggregation":"period-total","is_monetary":true}
Changes in Inventories → {"indicator_type":"balance","temporal_aggregation":"period-total","is_monetary":true}
Foreign Reserves (USD) → {"indicator_type":"stock","temporal_aggregation":"point-in-time","is_monetary":true}
Motorbike Sales (Units) → {"indicator_type":"volume","temporal_aggregation":"period-total","is_monetary":false}
Exports (Units) → {"indicator_type":"volume","temporal_aggregation":"period-total","is_monetary":false}
Principal repayments (USD) → {"indicator_type":"flow","temporal_aggregation":"period-total","is_monetary":true}
Net TIC Flows → {"indicator_type":"balance","temporal_aggregation":"period-total","is_monetary":true}

OUTPUT: {"results":[{"indicator_id":"...","indicator_type":"...","temporal_aggregation":"...","is_monetary":true|false,"confidence":0-1,"reasoning":"1 sentence why"}]}`;

const NUMERIC_MEASUREMENT_PROMPT = `You are classifying NUMERIC-MEASUREMENT indicators (dimensionless ratios, percentages, counts).

TYPES (choose exact match):
• count: Discrete events/changes (housing starts, jobless claims, employment change, claimant count change)
• percentage: 0-100% bounded (unemployment rate, participation rate, capacity utilization)
• ratio: X-to-Y or per-X (debt-to-GDP, GDP per capita, price-to-earnings)
• spread: X minus Y (yield spread, interest rate differential)
• share: Compositional % of GDP (consumption as % of GDP, labor share)

CRITICAL DISTINCTIONS:
• "Employment Change" → COUNT (discrete change in number), period-total
• "Jobless Claims" → COUNT (discrete events), period-total
• "Claimant Count Change" → COUNT (change in count), period-total
• "Unemployment Rate %" → PERCENTAGE (0-100% bounded), not-applicable
• "Government Spending to GDP" → RATIO (X-to-Y), not-applicable, is_monetary FALSE
• "GDP per capita" → RATIO, not-applicable, is_monetary TRUE (if in currency)

TEMPORAL AGGREGATION:
• count → period-total (sum of discrete events over period)
• percentage → not-applicable (dimensionless ratio)
• ratio → not-applicable (dimensionless ratio)
• spread → not-applicable (dimensionless difference)
• share → not-applicable (compositional ratio)
• Count series remain period-total even when labeled as an average (e.g., 4-week, 12-month) unless the source explicitly defines a different aggregation

IS_MONETARY:
• Counts of people/events → FALSE (never monetary)
• Ratios/percentages → FALSE (dimensionless, even if derived from money)
• GDP per capita in USD → TRUE (currency amount per person)
• "X to GDP" ratio → FALSE (dimensionless ratio)

EXAMPLES:
Employment Change → {"indicator_type":"count","temporal_aggregation":"period-total","is_monetary":false}
Unemployment Rate % → {"indicator_type":"percentage","temporal_aggregation":"not-applicable","is_monetary":false}
Government Spending to GDP → {"indicator_type":"ratio","temporal_aggregation":"not-applicable","is_monetary":false}
GDP per capita (USD) → {"indicator_type":"ratio","temporal_aggregation":"not-applicable","is_monetary":true}
Jobless Claims 4-week Avg → {"indicator_type":"count","temporal_aggregation":"period-total","is_monetary":false}

OUTPUT: {"results":[{"indicator_id":"...","indicator_type":"...","temporal_aggregation":"...","is_monetary":true|false,"confidence":0-1,"reasoning":"1 sentence why"}]}`;

const PRICE_VALUE_PROMPT = `You are classifying PRICE-VALUE indicators (market-determined prices and rates).

TYPES (choose exact match):
• price: Interest rates, exchange rates, commodity prices, asset prices, stock prices, electricity prices
• yield: Bond yields, returns, dividend yields

CRITICAL RULES - IS_MONETARY:
• Exchange rates (FX) → TRUE (they ARE monetary values: USD/EUR, PKR/USD)
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
Exchange Rate USD/EUR → {"indicator_type":"price","temporal_aggregation":"point-in-time","is_monetary":true}
Exchange Rate PKR/USD → {"indicator_type":"price","temporal_aggregation":"point-in-time","is_monetary":true}
Interbank Rate % → {"indicator_type":"price","temporal_aggregation":"point-in-time","is_monetary":false}
Electricity Price EUR/MWh → {"indicator_type":"price","temporal_aggregation":"point-in-time","is_monetary":true}
Oil Price USD/barrel → {"indicator_type":"price","temporal_aggregation":"point-in-time","is_monetary":true}
10-Year Bond Yield % → {"indicator_type":"yield","temporal_aggregation":"point-in-time","is_monetary":false}
SOFR (%) → {"indicator_type":"price","temporal_aggregation":"point-in-time","is_monetary":false}

OUTPUT: {"results":[{"indicator_id":"...","indicator_type":"...","temporal_aggregation":"...","is_monetary":true|false,"confidence":0-1,"reasoning":"1 sentence why"}]}`;

const CHANGE_MOVEMENT_PROMPT = `You are classifying CHANGE-MOVEMENT indicators (rates of change, volatility, gaps).

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

IS_MONETARY DECISIONS (nuanced, align with fixtures):
• Inflation rates (CPI/PCE inflation rate, Core Inflation Rate, mid-month inflation rates) → is_monetary FALSE
• Producer Prices Change (PPI change), Import/Export Prices changes, Residential Property Prices changes → is_monetary TRUE
• Monetary aggregates growth (M1/M2 growth %, bank credit growth) → is_monetary TRUE
• Non-price macro rates (retail sales YoY %, private sector credit %, private investment %, building capex %, wage growth %) → is_monetary FALSE

TEMPORAL AGGREGATION:
• rate → period-rate (measured over the period: YoY, MoM, QoQ)
• volatility → period-rate (measured over period)
• gap → point-in-time (snapshot of deviation at moment)
• velocity → period-rate

IS_MONETARY:
• TRUE for price-index or price-based change rates (PPI change, import/export price change, property price change), and monetary aggregate growth
• FALSE for inflation rates (CPI/PCE, core inflation, mid‑month inflation), non-price macro rates (retail sales YoY %, private sector credit %, private investment %, capex %, wage growth %), ratios, spreads, and gaps

EXAMPLES:
GDP Growth YoY % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_monetary":false}
CPI Trimmed-Mean % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_monetary":false}
Core Inflation Rate % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_monetary":false}
Mid-month Inflation Rate MoM % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_monetary":false}
Producer Prices Change % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_monetary":true}
Import Prices MoM % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_monetary":true}
Residential Property Prices % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_monetary":true}
Retail Sales YoY % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_monetary":false}
Private Sector Credit % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_monetary":false}
Wage Growth % → {"indicator_type":"rate","temporal_aggregation":"period-rate","is_monetary":false}
Output Gap → {"indicator_type":"gap","temporal_aggregation":"point-in-time","is_monetary":false}

OUTPUT: {"results":[{"indicator_id":"...","indicator_type":"...","temporal_aggregation":"...","is_monetary":true|false,"confidence":0-1,"reasoning":"1 sentence why"}]}`;

const COMPOSITE_DERIVED_PROMPT = `You are classifying COMPOSITE-DERIVED indicators (indices, statistical relationships).

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
• "Prices Paid/Received INDEX" → INDEX (tracks price levels), is_monetary TRUE if price-related; FALSE if survey diffusion without currency meaning
• "PCE/CPI Price INDEX" → INDEX (composite price level), is_monetary TRUE
• "Terms of Trade" → INDEX (export/import price ratio index), is_monetary FALSE
• "CFNAI" → INDEX (composite activity index)
• "Global Dairy Trade Price Index" / "GDT" → INDEX (commodity price index), is_monetary TRUE
• If the name uses "Index" but is clearly a pure sentiment label (e.g., "Services Sentiment Index"), still classify as INDEX here (composite-derived), not qualitative
• Pure "sentiment/confidence" without "index" → qualitative (different family)

TEMPORAL AGGREGATION (CRITICAL - CHECK UNITS):
• PMI/ISM Manufacturing → point-in-time (manufacturing PMI is treated as point reading)
• PMI/ISM Services → period-average (services diffusion often averaged)
• CFNAI (Chicago Fed National Activity Index) → point-in-time
• Business Climate → period-average
• Business Conditions → point-in-time
• Ifo Expectations → period-average
• Prices Paid/Received (Fed/ISM subindices) → period-average (monthly diffusion averaged), monetary TRUE
  MUST: For any ISM or regional Fed “Prices Paid/Received” or “(Non) Manufacturing Prices” subindex, set temporal_aggregation="period-average".
• Dallas/Kansas/Philly Fed Services Revenues Index → point-in-time
• Dallas/Kansas/Philly Fed Employment/Composite readings → point-in-time
• Industry Index Manufacturing → point-in-time
• Industry Index Business Services → period-average
• Price level indices (CPI, PCE, S&P 500, GDT, Export Prices Index) → point-in-time (index level)
• correlation/elasticity/multiplier → period-average (estimated over window)
• Terms of Trade → point-in-time (ratio at point in time)

IS_MONETARY:
• Price-based indices (CPI, PCE, Export/Import/Terms of Trade price indices, GDT, Prices Paid/Received) → TRUE
• Survey indices (PMI, confidence, business climate) → FALSE (dimensionless index scores)
• Equity indices (S&P 500) → TRUE (aggregate price level)
• Statistical measures (correlation, elasticity) → FALSE (dimensionless)

EXAMPLES:
Manufacturing PMI → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_monetary":false}
Services PMI → {"indicator_type":"index","temporal_aggregation":"period-average","is_monetary":false}
Business Climate Index → {"indicator_type":"index","temporal_aggregation":"period-average","is_monetary":false}
Business Conditions Index → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_monetary":false}
Economic Optimism Index → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_monetary":false}
Industry Index Manufacturing → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_monetary":false}
Industry Index Business Services → {"indicator_type":"index","temporal_aggregation":"period-average","is_monetary":false}
Kansas Fed Prices Paid Index → {"indicator_type":"index","temporal_aggregation":"period-average","is_monetary":true}
ISM Prices Paid Index → {"indicator_type":"index","temporal_aggregation":"period-average","is_monetary":true}
Philly Fed Prices Paid → {"indicator_type":"index","temporal_aggregation":"period-average","is_monetary":true}
LMI Inventory Costs → {"indicator_type":"index","temporal_aggregation":"period-average","is_monetary":true}
Dallas Fed Services Revenues Index → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_monetary":false}
Kansas Fed Employment Index → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_monetary":false}
CFNAI Production Index → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_monetary":false}
Ifo Expectations → {"indicator_type":"index","temporal_aggregation":"period-average","is_monetary":false}
PCE Price Index → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_monetary":true}
CPI (level) → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_monetary":true}
Terms of Trade → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_monetary":false}
Global Dairy Trade Price Index → {"indicator_type":"index","temporal_aggregation":"point-in-time","is_monetary":true}
Fiscal Multiplier → {"indicator_type":"multiplier","temporal_aggregation":"period-average","is_monetary":false}

OUTPUT: {"results":[{"indicator_id":"...","indicator_type":"...","temporal_aggregation":"...","is_monetary":true|false,"confidence":0-1,"reasoning":"1 sentence why"}]}`;

const TEMPORAL_PROMPT = `You are classifying TEMPORAL indicators (time-based measurements).

TYPES (choose exact match):
• duration: Time length, maturity, time to event
• probability: Likelihood, risk probability, chance
• threshold: Time-based triggers, breach points

TEMPORAL AGGREGATION:
• All temporal indicators → not-applicable (they measure time itself)

IS_MONETARY:
• All temporal indicators → FALSE (measure time, not money)

EXAMPLES:
Average Maturity → {"indicator_type":"duration","temporal_aggregation":"not-applicable","is_monetary":false}
Recession Probability → {"indicator_type":"probability","temporal_aggregation":"not-applicable","is_monetary":false}

OUTPUT: {"results":[{"indicator_id":"...","indicator_type":"...","temporal_aggregation":"...","is_monetary":true|false,"confidence":0-1,"reasoning":"1 sentence why"}]}`;

const QUALITATIVE_PROMPT = `You are classifying QUALITATIVE indicators (surveys, sentiment, allocations).

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

IS_MONETARY:
• All qualitative indicators → FALSE (categorical/survey data)

EXAMPLES:
Consumer Sentiment → {"indicator_type":"sentiment","temporal_aggregation":"point-in-time","is_monetary":false}
Asset Allocation Survey → {"indicator_type":"allocation","temporal_aggregation":"point-in-time","is_monetary":false}

OUTPUT: {"results":[{"indicator_id":"...","indicator_type":"...","temporal_aggregation":"...","is_monetary":true|false,"confidence":0-1,"reasoning":"1 sentence why"}]}`;

/**
 * Family-specific prompts mapping
 */
export const FAMILY_PROMPTS: Record<IndicatorFamily, string> = {
  'physical-fundamental': PHYSICAL_FUNDAMENTAL_PROMPT,
  'numeric-measurement': NUMERIC_MEASUREMENT_PROMPT,
  'price-value': PRICE_VALUE_PROMPT,
  'change-movement': CHANGE_MOVEMENT_PROMPT,
  'composite-derived': COMPOSITE_DERIVED_PROMPT,
  temporal: TEMPORAL_PROMPT,
  qualitative: QUALITATIVE_PROMPT,
  other: QUALITATIVE_PROMPT, // Use qualitative prompt for 'other' category
};

/**
 * Generate specialist user prompt (comprehensive context with router decision)
 */
export function generateSpecialistUserPrompt(
  indicators: Indicator[],
  family: IndicatorFamily
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
      if (ind.description) parts.push(`- Description: ${ind.description}`);

      // Include router decision (family classification from previous stage)
      const extInd = ind as Partial<
        Indicator & { family?: string; confidence_family?: number }
      >;
      if (extInd.family)
        parts.push(`- Router Family Decision: ${extInd.family}`);
      if (typeof extInd.confidence_family === 'number')
        parts.push(`- Router Confidence: ${extInd.confidence_family}`);

      return parts.join('\n');
    })
    .join('\n\n');

  return `═══════════════════════════════════════════════════════════════════════════
${family.toUpperCase()} SPECIALIST CLASSIFICATION
═══════════════════════════════════════════════════════════════════════════

The Router stage classified these ${indicators.length} indicator${
    indicators.length === 1 ? '' : 's'
  } as ${family} family.
Your task: Determine the specific TYPE, TEMPORAL AGGREGATION, and IS_MONETARY for each.

${indicatorList}

═══════════════════════════════════════════════════════════════════════════
RESPONSE REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════

Return a JSON object with "results" array containing ${
    indicators.length
  } classification${
    indicators.length === 1 ? '' : 's'
  }, in the SAME ORDER as above.

Each classification MUST contain:
• indicator_id (exact match to input ID)
• indicator_type (from family-specific type taxonomy)
• temporal_aggregation (from: point-in-time, period-rate, period-total, period-cumulative, period-average, not-applicable)
• is_monetary (true if currency-denominated, false otherwise)
• confidence (0-1 number)
• reasoning (1 sentence explaining classification choice)`;
}
