/**
 * Review Stage Prompts - LLM-based Correction
 * @module
 */

import type { FlaggedIndicator } from "../types.ts";

/**
 * Review system prompt (optimized)
 */
export function generateReviewSystemPrompt(): string {
  return `You are reviewing economic indicator classifications. Verify each classification is correct and choose an action:

**ACTIONS:**
• **confirm**: Classification is CORRECT - no changes needed
• **fix**: Classification has minor error - provide corrections in diff (auto-applied)
• **escalate**: Classification is unclear/ambiguous - needs human review

**YOUR TASK:**
Carefully review EACH indicator's classification against the taxonomy rules. Check:
1. Is the indicator_type correct based on what the indicator measures?
2. Is temporal_aggregation correct (period-rate vs period-total vs point-in-time)?
3. Is is_currency_denominated correct (true only for actual currency amounts)?
4. Is heat_map_orientation correct (higher-is-positive vs lower-is-positive vs neutral)?
5. Does the reasoning make sense and support the classification?

**DIFF FORMAT** (for "fix" action only):
{"family"?: "...", "indicator_type"?: "...", "temporal_aggregation"?: "...", "is_currency_denominated"?: true|false, "heat_map_orientation"?: "..."}

**TAXONOMY RULES:**

indicator_type:
• balance: Can be positive or negative (e.g., trade balance, budget balance, change in employment)
• count: Always non-negative, discrete items (e.g., building permits, number of unemployed)
• index: Composite index with arbitrary base (e.g., PMI, CPI, consumer confidence)
• ratio: Normalized to [0,1] or percentage (e.g., unemployment rate, inflation rate)

temporal_aggregation:
• period-rate: Flow/change DURING period (e.g., GDP growth, CPI inflation, YoY change, employment change)
• period-total: Sum/total OVER period (e.g., retail sales, exports, government spending)
• period-average: Average DURING period (e.g., exchange rate, interest rate, PMI, consumer confidence)
• point-in-time: Stock/snapshot AT period end (e.g., unemployment level, debt outstanding, population)

is_currency_denominated:
• true: Actual currency amounts (e.g., GDP in USD, retail sales in EUR)
• false: Everything else - ratios, percentages, index points, rates, counts

heat_map_orientation:
• higher-is-positive: Higher values = better economic welfare (e.g., GDP growth, employment)
• lower-is-positive: Lower values = better (e.g., unemployment rate, inflation)
• neutral: Context-dependent or balanced tradeoffs (e.g., budget balance, trade balance)

**COMMON PATTERNS:**
• PMI, ISM, Business Confidence indices → index + period-average
• Interest rates, bond yields → ratio + period-average + NOT currency
• Exchange rates (FX) → ratio + period-average + NOT currency (dimensionless ratio)
• Price indices (CPI, PPI) → index + period-rate (measures change) + NOT currency
• GDP, Retail Sales → flow + period-total + IS currency denominated
• Employment Change, Trade Balance Change → balance + period-rate
• Unemployment Rate, Inflation Rate → ratio + period-rate + NOT currency

**CRITICAL: Be thorough and find actual errors!**
Don't just confirm everything - actively look for misclassifications:
• Check if reasoning contradicts the classification
• Verify temporal_aggregation matches what indicator actually measures
• Ensure is_currency_denominated is only true for actual currency amounts
• Confirm indicator_type matches the indicator's nature (can it be negative? is it a count?)

OUTPUT: JSON array. Each: {"indicator_id":"...","action":"confirm|fix|escalate","diff":{...},"reason":"...","confidence":0-1}`;
}

/**
 * Generate user prompt for flagged indicators (optimized)
 */
export function generateReviewUserPrompt(
  flaggedIndicators: Array<FlaggedIndicator & { name: string }>,
): string {
  const flaggedList = flaggedIndicators
    .map((f, idx) => {
      return `${
        idx + 1
      }. ${f.name} (${f.indicator_id})\n   Flag: ${f.flag_type}\n   Reason: ${f.flag_reason}${
        f.current_value ? `\n   Current: ${f.current_value}` : ""
      }${f.expected_value ? `\n   Expected: ${f.expected_value}` : ""}`;
    })
    .join("\n\n");

  return `Review ${flaggedIndicators.length} flagged indicator${
    flaggedIndicators.length === 1 ? "" : "s"
  }:

${flaggedList}

IMPORTANT: Return exactly ${flaggedIndicators.length} results in the SAME ORDER as above.
For each result, copy the EXACT indicator_id shown in parentheses above.

Return JSON array: [{"indicator_id":"<copy exact ID>","action":"confirm|fix|escalate","diff":{...},"reason":"...","confidence":0-1}]`;
}
