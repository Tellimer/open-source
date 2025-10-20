/**
 * Consensus Review Prompt (LLM)
 * Reviews consensus outliers and provides standardization recommendations
 */

import { z } from "zod";
import type { ConsensusSummaryReport } from "../types.ts";
import { llmConsensusReviewSchema } from "../types.ts";

export { llmConsensusReviewSchema };

/**
 * Create consensus review prompt with optimized caching
 * System prompt: Static instructions (cached)
 * User prompt: Variable indicator data + outliers (not cached)
 */
export function createConsensusReviewPrompt(input: {
  indicator_name: string;
  summary: ConsensusSummaryReport;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert in economic indicator standardization and data quality.

Your task is to validate consensus outliers and recommend standardization strategies for indicators with the same name but different reporting characteristics.

## CONSENSUS DIMENSIONS

1. **Unit**: Physical measurement unit (e.g., Celsius vs Fahrenheit, meters vs feet)
2. **Scale**: Numeric scale (e.g., ones vs thousands vs millions vs billions)
3. **Frequency**: Reporting frequency (e.g., daily vs monthly vs quarterly vs annual)
4. **Currency**: Currency denomination (e.g., USD vs local currency)
5. **Time Basis**: Temporal aggregation (e.g., point-in-time vs cumulative)

## YOUR RESPONSIBILITIES

For each outlier indicator:
1. **Validate**: Is this a legitimate difference or an error?
   - Legitimate: Different countries report temperature in Celsius vs Fahrenheit
   - Error: One country reports GDP in ones, all others in millions (likely data entry error)

2. **Explain Reasoning**: Why is this outlier valid or invalid?
   - Consider: Geographic conventions, data source practices, measurement standards
   - Historical context: Did reporting change over time?

3. **Recommend Action**:
   - **no_action**: Valid difference, no standardization needed
   - **document_difference**: Valid but document for users
   - **investigate**: Unclear, needs manual investigation
   - **correct_error**: Clear data entry/conversion error
   - **standardize**: Valid but should be standardized for consistency

Provide:
- **Overall Assessment**: highly_consistent | mostly_consistent | inconsistent | critical_inconsistency
- **Validated Outliers**: Which outliers are valid vs errors, with reasoning
- **Standardization Recommendations**: Specific actions to improve consistency
- **Confidence**: 0.0-1.0 confidence in assessment

## GUIDELINES

**For unit differences:**
- Geographic conventions are valid (Celsius in Europe, Fahrenheit in US)
- Scientific vs imperial units may both be valid
- Inconsistent units within same country/source = suspicious

**For scale differences:**
- All sources reporting in different scales = normal variation
- One or two outliers with 1000x/1M x difference = likely error
- Consider indicator magnitude (GDP in millions OK, interest rate in millions NOT OK)

**For frequency differences:**
- High-frequency indicators (daily/weekly) may have monthly/quarterly aggregates
- Annual data is valid for slow-moving indicators
- Sub-annual data for annual-only indicators = suspicious

**For currency differences:**
- USD vs local currency both valid for trade/finance indicators
- Inconsistent currency within same country = error
- "USD millions" vs "local currency ones" = critical inconsistency

**For time basis differences:**
- Stock vs flow indicators have different time basis expectations
- Cumulative for "Total" indicators, point-in-time for "Rate/Level" indicators
- Inconsistent time basis = potential misclassification

IMPORTANT: Return ONLY valid JSON matching this exact schema:
=============================================================
{
  "overall_assessment": "highly_consistent" | "mostly_consistent" | "inconsistent" | "critical_inconsistency",
  "validated_outliers": [{
    "indicator_id": string,
    "dimension": string,
    "is_valid_outlier": boolean,
    "reasoning": string,
    "recommended_action": "no_action" | "document_difference" | "investigate" | "correct_error" | "standardize"
  }],
  "standardization_recommendations": [{
    "dimension": string,
    "current_consensus": string,
    "recommended_standard": string,
    "affected_indicators": [string],
    "priority": "low" | "medium" | "high" | "critical",
    "rationale": string
  }],
  "confidence": 0.0-1.0,
  "summary": string
}`;

  // Prepare outliers summary
  const outliersSummary = input.summary.all_outliers
    .map((outlier, idx) => {
      return `
${idx + 1}. Indicator: ${outlier.indicator_id}
   Dimension: ${outlier.dimension}
   Outlier Value: "${outlier.outlier_value}"
   Consensus Value: "${outlier.consensus_value}"
   Deviation: ${(outlier.deviation_percentage * 100).toFixed(1)}%
   ${outlier.source_name ? `Source: ${outlier.source_name}` : ""}
   ${outlier.country ? `Country: ${outlier.country}` : ""}
   ${outlier.region ? `Region: ${outlier.region}` : ""}`;
    })
    .join("\n");

  const userPrompt = `Please review the consensus analysis for this indicator group:

INDICATOR GROUP INFORMATION:
============================
Name: ${input.indicator_name}
Total Indicators: ${input.summary.total_indicators}
Dimensions Checked: ${input.summary.total_checks}

CONSENSUS SUMMARY:
==================
Dimensions with Strong Consensus: ${input.summary.dimensions_with_consensus}/${input.summary.total_checks}
Dimensions with Issues: ${input.summary.dimensions_with_issues}/${input.summary.total_checks}
Total Outliers Found: ${input.summary.total_outliers}

CONSENSUS RESULTS BY DIMENSION:
================================

Unit Consensus:
- Consensus Value: "${input.summary.unit_consensus.consensus_value}"
- Consensus %: ${(input.summary.unit_consensus.consensus_percentage * 100).toFixed(1)}%
- Outliers: ${input.summary.unit_consensus.outliers.length}
- Distribution: ${JSON.stringify(input.summary.unit_consensus.value_distribution)}

Scale Consensus:
- Consensus Value: "${input.summary.scale_consensus.consensus_value}"
- Consensus %: ${(input.summary.scale_consensus.consensus_percentage * 100).toFixed(1)}%
- Outliers: ${input.summary.scale_consensus.outliers.length}
- Distribution: ${JSON.stringify(input.summary.scale_consensus.value_distribution)}

Frequency Consensus:
- Consensus Value: "${input.summary.frequency_consensus.consensus_value}"
- Consensus %: ${(input.summary.frequency_consensus.consensus_percentage * 100).toFixed(1)}%
- Outliers: ${input.summary.frequency_consensus.outliers.length}
- Distribution: ${JSON.stringify(input.summary.frequency_consensus.value_distribution)}

Currency Consensus:
- Consensus Value: "${input.summary.currency_consensus.consensus_value}"
- Consensus %: ${(input.summary.currency_consensus.consensus_percentage * 100).toFixed(1)}%
- Outliers: ${input.summary.currency_consensus.outliers.length}
- Distribution: ${JSON.stringify(input.summary.currency_consensus.value_distribution)}

Time Basis Consensus:
- Consensus Value: "${input.summary.time_basis_consensus.consensus_value}"
- Consensus %: ${(input.summary.time_basis_consensus.consensus_percentage * 100).toFixed(1)}%
- Outliers: ${input.summary.time_basis_consensus.outliers.length}
- Distribution: ${JSON.stringify(input.summary.time_basis_consensus.value_distribution)}

OUTLIERS TO VALIDATE:
======================
${outliersSummary || "No outliers found"}

Validate these outliers and provide your comprehensive consensus review as JSON.`;

  return { systemPrompt, userPrompt };
}
