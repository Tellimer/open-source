/**
 * Deep Review Stage Prompts - Second Opinion on Suggested Fixes
 * @module
 */

import type { SuggestedFix } from "../types.ts";

/**
 * Deep review system prompt
 */
export function generateDeepReviewSystemPrompt(): string {
  return `You are providing a SECOND OPINION on suggested classification fixes. Another model has reviewed flagged indicators and suggested corrections - your job is to independently verify whether those fixes are correct.

**CONTEXT:**
You are seeing indicators where:
1. The original classification had issues (low confidence or rule violations)
2. A first reviewer suggested fixes
3. You must decide if the suggested fix is correct

**ACTIONS:**
• **accept-fix**: The suggested fix is CORRECT - apply it
• **reject-fix**: The suggested fix is WRONG - keep original classification
• **escalate**: Too ambiguous to decide - needs human review

**YOUR TASK:**
For EACH indicator, independently analyze:
1. The ORIGINAL classification (what the pipeline initially decided)
2. The SUGGESTED FIX (what the first reviewer wants to change)
3. The FULL INDICATOR CONTEXT (name, units, description, time series data)

Then decide:
- Is the suggested fix an improvement over the original?
- Does the fix make sense given the indicator's actual characteristics?
- If you're uncertain, escalate for human review

**CRITICAL PRINCIPLES:**
• Be independent - don't just rubber-stamp the suggested fix
• Focus on the INDICATOR'S ACTUAL NATURE (what does it really measure?)
• Check if suggested fix aligns with time series data patterns
• If both original and suggested fix seem wrong, escalate
• If you disagree with the suggested fix, reject it (keep original)

**TAXONOMY RULES:**

indicator_type:
• balance: Can be positive or negative (e.g., trade balance, budget balance, employment change)
• count: Always non-negative (e.g., building permits, number of unemployed, stock levels)
• index: Composite index with arbitrary base (e.g., PMI=50, CPI=100)
• ratio: Percentage or normalized value (e.g., unemployment rate 5.2%, inflation 3.1%)

temporal_aggregation:
• period-rate: Flow/change DURING period (e.g., "GDP growth 2.5% YoY", "CPI inflation 3%", "employment change +200k")
• period-total: Sum/total OVER period (e.g., "Q1 exports $500M", "monthly retail sales", "annual government spending")
• period-average: Average DURING period (e.g., "average exchange rate", "average interest rate", "PMI for the month")
• point-in-time: Stock AT period end (e.g., "unemployment level 5M persons", "debt outstanding $2T", "population 50M")

is_currency_denominated:
• true: ONLY for actual currency amounts (GDP in USD, retail sales in EUR, debt in GBP)
• false: Everything else - rates, percentages, index points, ratios, counts of people/items

heat_map_orientation:
• higher-is-positive: Higher = better welfare (e.g., GDP growth, employment, exports)
• lower-is-positive: Lower = better (e.g., unemployment rate, inflation, poverty)
• neutral: Context-dependent or balanced (e.g., exchange rate, money supply, budget balance)

**COMMON PATTERNS:**
• Interest rates → ratio + period-average + NOT currency-denominated + neutral orientation
• Exchange rates (FX) → ratio + period-average + NOT currency-denominated
• GDP, Retail Sales, Exports → period-total + IS currency-denominated
• GDP Growth, Inflation Rate → ratio + period-rate + NOT currency-denominated
• Stock indices (S&P 500, FTSE) → index + period-average + NOT currency
• Unemployment level → count + point-in-time + NOT currency
• Trade balance, Budget balance → balance + period-total + IS currency-denominated + neutral orientation

**OUTPUT FORMAT:**
For accept-fix action, the final_diff should match the suggested fix (or be refined if you want minor adjustments).
For reject-fix action, do NOT include final_diff (original is kept).
For escalate action, do NOT include final_diff.

Return JSON: {"indicator_id":"...","action":"accept-fix|reject-fix|escalate","reason":"...","confidence":0-1,"final_diff":{...}}`;
}

/**
 * Generate user prompt for suggested fixes
 */
export function generateDeepReviewUserPrompt(
  suggestedFixes: SuggestedFix[],
): string {
  const fixesList = suggestedFixes
    .map((fix, idx) => {
      const parts = [
        `${idx + 1}. Indicator: ${fix.indicator_name} (${fix.indicator_id})`,
      ];

      // Add context
      if (fix.indicator_context?.units) {
        parts.push(`   Units: ${fix.indicator_context.units}`);
      }
      if (fix.indicator_context?.description) {
        parts.push(`   Description: ${fix.indicator_context.description}`);
      }
      if (fix.indicator_context?.source_name) {
        parts.push(`   Source: ${fix.indicator_context.source_name}`);
      }
      if (fix.indicator_context?.long_name) {
        parts.push(`   Long Name: ${fix.indicator_context.long_name}`);
      }

      // Add time series sample if available
      if (
        fix.indicator_context?.sample_values &&
        Array.isArray(fix.indicator_context.sample_values) &&
        fix.indicator_context.sample_values.length > 0
      ) {
        const sample = fix.indicator_context.sample_values.slice(0, 5);
        const isTemporalData = typeof sample[0] === "object" &&
          sample[0] !== null &&
          "date" in sample[0];

        if (isTemporalData) {
          parts.push(
            `   Time Series Sample: ${
              sample.map((p: any) => `${p.date}: ${p.value}`).join(", ")
            }...`,
          );
        } else {
          parts.push(`   Sample Values: ${sample.join(", ")}...`);
        }
      }

      // Show original classification
      parts.push(`
   ORIGINAL CLASSIFICATION:
   - Family: ${fix.original_classification.family}
   - Type: ${fix.original_classification.indicator_type}
   - Temporal Aggregation: ${fix.original_classification.temporal_aggregation}
   - Currency Denominated: ${fix.original_classification.is_currency_denominated}
   - Orientation: ${fix.original_classification.heat_map_orientation}`);

      // Show suggested fix
      const diffKeys = Object.keys(fix.suggested_diff);
      if (diffKeys.length > 0) {
        parts.push(`
   SUGGESTED FIX (First Reviewer):
   ${
          diffKeys.map((key) =>
            `- Change ${key}: ${(fix.original_classification as any)[key]} → ${
              (fix.suggested_diff as any)[key]
            }`
          ).join("\n   ")
        }
   Reason: ${fix.review_reason}
   Confidence: ${fix.review_confidence.toFixed(2)}`);
      }

      return parts.join("\n");
    })
    .join("\n\n");

  return `Review ${suggestedFixes.length} suggested fix${
    suggestedFixes.length === 1 ? "" : "es"
  }:

${fixesList}

IMPORTANT:
1. Return exactly ${suggestedFixes.length} results in the SAME ORDER as above
2. Copy the EXACT indicator_id shown in parentheses
3. Independently verify each suggested fix - don't just accept them
4. Use "accept-fix" only if you agree the fix is correct
5. Use "reject-fix" if you think the original was better
6. Use "escalate" if you're uncertain or if both seem wrong

Return JSON array: [{"indicator_id":"<exact ID>","action":"accept-fix|reject-fix|escalate","reason":"...","confidence":0-1,"final_diff":{...}}]`;
}
