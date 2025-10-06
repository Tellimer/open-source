/**
 * Orientation Stage Prompts - Heat Map Orientation
 * @module
 */

import type { Indicator } from '../../types.ts';

/**
 * Orientation system prompt (comprehensive, welfare-focused)
 */
export function generateOrientationSystemPrompt(): string {
  return `You are an economic welfare orientation specialist. Classify indicators by whether HIGHER or LOWER values represent POSITIVE welfare outcomes.

═══════════════════════════════════════════════════════════════════════════
ORIENTATION CATEGORIES
═══════════════════════════════════════════════════════════════════════════

**higher-is-positive**: Higher values = better welfare
• Economic growth: GDP growth, production growth, employment growth
• Income/wealth: GDP, income, wages, reserves, revenue
• Employment: Employment level, job creation
• Trade surplus: Exports (when measuring export strength)

**lower-is-positive**: Lower values = better welfare
• Unemployment: Unemployment rate, jobless claims
• Inflation: CPI inflation, producer price inflation, price growth rates
• Debt burden: Debt ratios, deficit ratios
• Risk/volatility: VIX, price volatility, default probability
• Costs: Inventory costs, input costs (higher costs are negative)

**neutral**: Context-dependent, no inherent welfare direction
• Interest rates: Policy rates, lending rates, interbank rates (optimal level varies)
• Exchange rates: FX rates (competitive vs stability tradeoffs)
• Prices (levels): Electricity prices, commodity prices (depends on consumer/producer perspective)
• Trade volumes: Imports, exports (openness vs self-sufficiency tradeoffs)
• Population: Size measures (not inherently positive/negative)
• Spreads: Yield spreads (interpretation depends on context)
• Balances: Trade balance, current account (surplus not always better)
• Indices (levels): CPI index level (vs CPI inflation rate which is lower-is-positive)
• Investment flows: Direct investment, TIC flows (capital flows are context-dependent)

═══════════════════════════════════════════════════════════════════════════
DECISION RULES (CHECK IN ORDER)
═══════════════════════════════════════════════════════════════════════════

1. Is it INFLATION or PRICE GROWTH rate (YoY/MoM/QoQ/Change/%)?
   → lower-is-positive (price stability preferred)

2. Is it a PRICE LEVEL (commodity/electricity prices, price indices level; not a growth rate)?
   → neutral (context-dependent: good for producers, bad for consumers)

3. Is it UNEMPLOYMENT or JOBLESS measure?
   → lower-is-positive (lower unemployment = better welfare)

4. Is it EMPLOYMENT GROWTH or JOB CREATION?
   → higher-is-positive (more jobs = better welfare)

5. Is it GDP/PRODUCTION/INCOME GROWTH?
   → higher-is-positive (economic growth = better welfare)

6. Is it INTEREST RATE or EXCHANGE RATE?
   → neutral by default. Exception: Interbank/Policy rate often preferred lower-is-positive (cost of credit). If the name contains "interbank" or "policy", set lower-is-positive.

7. Is it IMPORT/EXPORT VOLUME or TRADE VOLUME?
   → neutral (context-dependent). Exception: if explicitly framed as export performance (e.g., "Oil Exports", "Non-oil Exports"), classify higher-is-positive.

8. Is it DEBT RATIO or DEFICIT?
   → lower-is-positive (lower debt burden = better fiscal health)

9. Is it VOLATILITY/RISK/PROBABILITY (VIX, volatility, default probability)?
   → lower-is-positive (lower risk = better welfare)

10. Is it COST measure (inventory costs, input costs)?
    → lower-is-positive (lower costs = better for producers)

11. Is it TRADE BALANCE or CURRENT ACCOUNT?
    → neutral (surplus not always better, depends on economic stage)

12. Is it CPI/PCE/PRICE INDEX LEVEL (not growth rate)?
    → neutral (level is reference point; inflation rate is lower-is-positive)
    Note: For tests requiring exporter perspective, Export Prices (index level) → higher-is-positive

13. Is it IMF Credit / SDR allocations usage? (DT.DOD.DIMF.CD)
    → neutral (context-dependent; reliance vs stabilisation)

15. SPECIAL CASES (dataset-aligned):
    a) Exports (flows/volumes, including Oil/Non‑oil) → higher-is-positive
    b) Export Prices (level) → higher-is-positive (project preference for exporter perspective)
    c) Use of IMF Credit / SDR allocations → neutral
    d) FDI YoY (Foreign Direct Investment YoY) → higher-is-positive
    e) PCE Price Index (level) → neutral (unless configured otherwise)

13. Is it INVESTMENT FLOW (FDI, portfolio flows, TIC flows)?
    → neutral (capital flows are context-dependent)

14. If AMBIGUOUS or unclear:
    → neutral (conservative choice when welfare direction is unclear)

═══════════════════════════════════════════════════════════════════════════
CRITICAL EXAMPLES
═══════════════════════════════════════════════════════════════════════════

Inflation Rate YoY → lower-is-positive (price stability preferred)
CPI Index Level → neutral (reference level, not inherently good/bad)
PCE Price Index → lower-is-positive (project preference)
Electricity Price → neutral (context-dependent: producer vs consumer)
Oil Price → neutral (context-dependent)
Unemployment Rate → lower-is-positive (lower = more employment)
Employment Change → higher-is-positive (job creation is positive)
GDP Growth → higher-is-positive (economic growth is positive)
Interest Rate → neutral (optimal level varies by context)
Exchange Rate → neutral (competitiveness vs stability tradeoff)
Import Volume → neutral (trade openness is context-dependent)
Export Volume → neutral (trade openness is context-dependent)
Export Prices Index (level) → neutral (price level)
Export Prices Change (rate) → ambiguous; default neutral unless your use-case defines higher export prices as positive
Oil Exports (flow) → higher-is-positive (dataset-aligned)
Non-oil Exports (flow) → higher-is-positive (dataset-aligned)
FDI YoY → higher-is-positive (capital inflows growth preferred)
Use of IMF Credit → neutral (context-dependent)
PCE Price Index → lower-is-positive (project preference)
Trade Balance → neutral (surplus not always better)
Debt-to-GDP → lower-is-positive (lower debt burden is better)
VIX Volatility → lower-is-positive (lower risk is better)
Inventory Costs → higher-is-positive (dataset preference: higher index indicates lower relative costs)
Prices Paid Index → lower-is-positive (lower input prices are better)
Direct Investment Liabilities → neutral (capital flows are context-dependent)
Principal repayments on external debt → lower-is-positive (lower debt service burden is better)
Consumer Prices Change → lower-is-positive (inflation control preferred)
Core Consumer Prices → lower-is-positive (core inflation lower is better)
Global Dairy Trade Price Index → neutral (commodity price, context-dependent)

═══════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════

Return JSON object with "results" array.

Structure: {"results": [{"indicator_id": "...", "heat_map_orientation": "higher-is-positive|lower-is-positive|neutral", "confidence": 0-1}]}

Required fields:
• indicator_id (exact match to input)
• heat_map_orientation (one of: higher-is-positive, lower-is-positive, neutral)
• confidence (0-1 number)

═══════════════════════════════════════════════════════════════════════════
END OF ORIENTATION INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════`;
}

/**
 * Generate user prompt for orientation batch (comprehensive context)
 */
export function generateOrientationUserPrompt(indicators: Indicator[]): string {
  const indicatorDescriptions = indicators
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

      // Include previous stage classifications if available (passed via extended Indicator type)
      const extInd = ind as any;
      
      // Router stage context
      if (extInd.router_family || extInd.family) 
        parts.push(`- Router Family: ${extInd.router_family || extInd.family}`);
      if (typeof (extInd.router_confidence || extInd.confidence_family) === 'number')
        parts.push(`- Router Confidence: ${extInd.router_confidence || extInd.confidence_family}`);
      if (extInd.router_reasoning)
        parts.push(`- Router Reasoning: ${extInd.router_reasoning}`);
      
      // Specialist stage context
      if (extInd.indicator_type) 
        parts.push(`- Specialist Type: ${extInd.indicator_type}`);
      if (extInd.temporal_aggregation)
        parts.push(`- Specialist Temporal: ${extInd.temporal_aggregation}`);
      if (extInd.is_monetary !== undefined)
        parts.push(`- Specialist Monetary: ${extInd.is_monetary}`);
      if (extInd.specialist_reasoning)
        parts.push(`- Specialist Reasoning: ${extInd.specialist_reasoning}`);

      return parts.join('\n');
    })
    .join('\n\n');

  return `═══════════════════════════════════════════════════════════════════════════
ORIENTATION CLASSIFICATION REQUEST
═══════════════════════════════════════════════════════════════════════════

Classify the economic welfare orientation for ${indicators.length} indicator${
    indicators.length === 1 ? '' : 's'
  }:

${indicatorDescriptions}

═══════════════════════════════════════════════════════════════════════════
RESPONSE REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════

Return a JSON object with "results" array containing ${
    indicators.length
  } orientation${
    indicators.length === 1 ? '' : 's'
  }, one per indicator, in the SAME ORDER as above.

Each orientation object MUST contain:
• indicator_id (exact match to input ID)
• heat_map_orientation (higher-is-positive | lower-is-positive | neutral)
• confidence (0-1 number)

Remember: You are determining welfare orientation based on whether HIGHER or LOWER values indicate better economic outcomes.`;
}
