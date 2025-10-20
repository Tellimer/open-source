/**
 * Quality Review Prompt (LLM)
 * Reviews flagged data quality issues and provides recommendations
 */

import { z } from "zod";
import type { ConsolidatedQualityReport } from "../types.ts";
import { llmQualityReviewSchema } from "../types.ts";

export { llmQualityReviewSchema };

/**
 * Create quality review prompt with optimized caching
 * System prompt: Static instructions (cached)
 * User prompt: Variable indicator data + flagged issues (not cached)
 */
export function createQualityReviewPrompt(input: {
  name: string;
  consolidated_report: ConsolidatedQualityReport;
  time_series_summary: {
    count: number;
    date_range: { start: string; end: string };
    mean: number;
    std_dev: number;
  };
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert economic indicator data quality reviewer.

Your task is to validate data quality flags raised by automated detectors and provide a comprehensive assessment of the indicator's usability.

## DETECTOR TYPES

1. **Staleness**: Missing recent data or historical gaps
   - Expected frequency vs actual gaps
   - Days since last update

2. **Magnitude Changes**: Outliers and sudden value changes
   - Z-score analysis for outliers
   - Period-over-period sudden changes
   - Extreme deviations from mean

3. **False Readings**: Impossible/suspicious values
   - Negative values where inappropriate
   - Suspicious exact zeros
   - Flat periods (same value repeated 5+ times)
   - Repeating patterns (copy-paste errors)
   - Decimal place errors (off by 10^n)

4. **Unit Changes**: Reporting scale shifts
   - Regime shifts (1000x, 1000000x changes)
   - Unit conversion errors

5. **Consistency**: Temporal and logical consistency
   - Monotonicity violations for cumulative indicators
   - Duplicate dates with conflicting values
   - Inconsistent reporting intervals

## YOUR RESPONSIBILITIES

For each flagged issue:
1. **Validate**: Is this a real data quality problem or a false positive?
2. **Explain**: What is the likely root cause?
3. **Assess Impact**: How severely does this affect the indicator's usability?

Provide:
- **Overall Assessment**: clean | minor_issues | major_issues | unusable
- **Validated Issues**: Which flags are valid, with reasoning
- **Recommended Actions**: Specific steps to address issues (prioritized)
- **Usability Verdict**: use_as_is | use_with_caution | investigate_first | do_not_use
- **Summary**: Concise explanation for decision makers

## GUIDELINES

**For staleness:**
- Consider whether data source may have publication delays
- Monthly data missing for 45+ days = concerning
- Annual data missing for 18+ months = critical

**For magnitude changes:**
- Context matters: stock market crashes = real, GDP 10x overnight = error
- Check if change aligns with indicator type
- Multiple outliers in series = more likely data quality issue

**For false readings:**
- Flat periods in volatile indicators = suspicious
- Exact zeros in continuous measurements = suspicious
- Consider measurement precision and rounding

**For unit changes:**
- 1000x shifts around same date = highly suspicious
- Gradual magnitude changes = less concerning

**For consistency:**
- Cumulative indicators must be monotonic (or very close)
- Backdated revisions are acceptable but should be noted

## VALIDATION EXAMPLES

**Example 1: False Positive - Daily Market Data Gap**
- Flag: Staleness (5 days since last update)
- Context: Last update was Friday, today is Wednesday
- Verdict: FALSE POSITIVE - Weekend gap is normal for trading days
- Impact: LOW - No real data quality issue

**Example 2: Valid Issue - Magnitude Outlier**
- Flag: Magnitude change (z-score: 8.5, value jumped 1000x)
- Context: CPI inflation indicator, monthly data, sudden 1000% reading
- Verdict: VALID - Likely decimal place error (should be 1.5% not 1500%)
- Impact: HIGH - Corrupts analysis if used as-is
- Action: Flag for manual correction, exclude outlier from calculations

**Example 3: Valid Issue - Suspicious Flat Period**
- Flag: False reading (exact same value 12 consecutive months)
- Context: Exchange rate indicator, value = 1.2500 for entire year
- Verdict: VALID - Highly suspicious for volatile FX market
- Impact: MEDIUM - Data may be stale or copied placeholder
- Action: Cross-check with alternative data sources

**Example 4: Expected Pattern - Cumulative Reset**
- Flag: Consistency (monotonicity violation, value dropped to zero)
- Context: "YTD Government Expenditure" dropped on January 1st
- Verdict: FALSE POSITIVE - Year-to-date series correctly reset
- Impact: LOW - Expected behavior for cumulative indicators

**Example 5: Critical Issue - Unit Regime Shift**
- Flag: Unit change (1,000,000x regime shift in 2018)
- Context: GDP series, values pre-2018 in millions, post-2018 in units
- Verdict: VALID - Currency redenomination or unit scale change
- Impact: CRITICAL - Time series cannot be compared across break
- Action: Urgent - Apply scaling factor or split into two series

**Example 6: Minor Issue - Publication Delay**
- Flag: Staleness (45 days since last update for monthly indicator)
- Context: Government statistical agency, known for 6-week delays
- Verdict: VALID but MINOR - Within normal publication lag
- Impact: LOW - Data is delayed but likely accurate when published
- Action: Monitor but continue using data

## DECISION FRAMEWORK

When determining usability_verdict:

1. **use_as_is**:
   - No validated issues OR only false positives
   - All critical checks passed
   - Data suitable for production analysis without modifications

2. **use_with_caution**:
   - Minor validated issues that don't fundamentally corrupt analysis
   - Example: Occasional outliers, publication delays, small gaps
   - Data usable but requires analyst awareness of limitations

3. **investigate_first**:
   - Major issues that require human review before use
   - Example: Regime shifts, suspicious flat periods, multiple anomalies
   - Data quality uncertain - needs expert validation

4. **do_not_use**:
   - Critical issues that make data fundamentally unreliable
   - Example: Pervasive errors, systematic corruption, missing critical periods
   - Using this data would produce invalid analysis results

## CONFIDENCE CALIBRATION

- 0.9-1.0: Clear-cut case, strong evidence, unambiguous verdict
- 0.7-0.9: Strong signals but some uncertainty about root cause
- 0.5-0.7: Mixed signals, requires contextual judgment
- 0.3-0.5: Uncertain, limited evidence, multiple plausible explanations
- 0.0-0.3: Highly uncertain, need more information or domain expertise

IMPORTANT: Return ONLY valid JSON matching this exact schema:
=============================================================
{
  "overall_assessment": "clean" | "minor_issues" | "major_issues" | "unusable",
  "validated_issues": [{
    "check_type": string,
    "is_valid": boolean,
    "reasoning": string,
    "root_cause": string (optional),
    "impact": "low" | "medium" | "high" | "critical"
  }],
  "recommended_actions": [{
    "action": string,
    "priority": "low" | "medium" | "high" | "urgent",
    "description": string
  }],
  "usability_verdict": "use_as_is" | "use_with_caution" | "investigate_first" | "do_not_use",
  "confidence": 0.0-1.0,
  "summary": string
}`;

  // Prepare flagged issues summary
  const flagsSummary = input.consolidated_report.all_flags
    .map((flag, idx) => {
      return `
${idx + 1}. [${flag.check_type.toUpperCase()}] ${flag.status.toUpperCase()} (Severity: ${flag.severity}/5)
   Message: ${flag.message}
   Details: ${JSON.stringify(flag.details, null, 2)}
   ${flag.affected_dates ? `Affected Dates: ${flag.affected_dates.slice(0, 5).join(", ")}${flag.affected_dates.length > 5 ? ` (+${flag.affected_dates.length - 5} more)` : ""}` : ""}`;
    })
    .join("\n");

  const userPrompt = `Please review the data quality issues for this economic indicator:

INDICATOR INFORMATION:
======================
Name: ${input.name}
Time Series Points: ${input.time_series_summary.count}
Date Range: ${input.time_series_summary.date_range.start} to ${input.time_series_summary.date_range.end}
Mean Value: ${input.time_series_summary.mean.toExponential(2)}
Std Deviation: ${input.time_series_summary.std_dev.toExponential(2)}

QUALITY SUMMARY:
================
Total Checks: ${input.consolidated_report.total_checks}
Passed: ${input.consolidated_report.passed_checks}
Flagged Issues: ${input.consolidated_report.flagged_count}
Critical Issues: ${input.consolidated_report.critical_count}
Overall Score: ${input.consolidated_report.overall_score}/100

FLAGGED ISSUES:
===============
${flagsSummary}

DETECTOR RESULTS:
=================

Staleness:
- Has Staleness: ${input.consolidated_report.staleness.has_staleness}
- Expected Frequency: ${input.consolidated_report.staleness.expected_frequency_days} days
- Actual Gap: ${input.consolidated_report.staleness.actual_gap_days.toFixed(1)} days
- Last Data Point: ${input.consolidated_report.staleness.last_data_point}
- Days Since Update: ${input.consolidated_report.staleness.days_since_last_update.toFixed(1)}

Magnitude:
- Has Anomalies: ${input.consolidated_report.magnitude.has_anomalies}
- Mean: ${input.consolidated_report.magnitude.mean.toExponential(2)}
- Std Dev: ${input.consolidated_report.magnitude.std_dev.toExponential(2)}
- Outliers: ${input.consolidated_report.magnitude.outliers.length}
- Sudden Changes: ${input.consolidated_report.magnitude.sudden_changes.length}

False Readings:
- Has Issues: ${input.consolidated_report.false_readings.has_issues}
- Impossible Values: ${input.consolidated_report.false_readings.impossible_values.length}
- Flat Periods: ${input.consolidated_report.false_readings.flat_periods.length}
- Repeating Patterns: ${input.consolidated_report.false_readings.repeating_patterns.length}
- Decimal Errors: ${input.consolidated_report.false_readings.decimal_errors.length}

Unit Changes:
- Has Changes: ${input.consolidated_report.unit_changes.has_changes}
- Regime Shifts: ${input.consolidated_report.unit_changes.regime_shifts.length}

Consistency:
- Is Consistent: ${input.consolidated_report.consistency.is_consistent}
- Monotonicity Violations: ${input.consolidated_report.consistency.monotonicity_violations.length}
- Temporal Inconsistencies: ${input.consolidated_report.consistency.temporal_inconsistencies.length}

Validate these issues and provide your comprehensive data quality review as JSON.`;

  return { systemPrompt, userPrompt };
}
