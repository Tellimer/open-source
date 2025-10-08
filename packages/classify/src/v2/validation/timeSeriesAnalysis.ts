/**
 * Time Series Validation - Detect temporal patterns from actual data
 * @module
 */

import type { TemporalDataPoint } from "../../types.ts";

/**
 * Time series analysis result
 */
export interface TimeSeriesAnalysis {
  /** Is this likely a cumulative (YTD) series? */
  is_cumulative: boolean;
  /** Confidence in cumulative detection (0-1) */
  cumulative_confidence: number;

  /** Does series show seasonal reset patterns? */
  has_seasonal_reset: boolean;

  /** Is series monotonically increasing within periods? */
  is_monotonic_within_year: boolean;

  /** Statistical evidence */
  evidence: {
    /** Ratio of December/January values (high = cumulative) */
    dec_jan_ratio?: number;
    /** % of within-year increases (100% = always increasing) */
    within_year_increase_pct?: number;
    /** Number of year boundaries detected */
    year_boundaries?: number;
    /** % of resets at year boundary (high = cumulative) */
    reset_at_boundary_pct?: number;
  };
}

/**
 * Analyze time series to detect cumulative patterns
 */
export function analyzeTimeSeriesPattern(
  values: TemporalDataPoint[],
): TimeSeriesAnalysis {
  if (!values || values.length < 6) {
    // Not enough data for analysis
    return {
      is_cumulative: false,
      cumulative_confidence: 0,
      has_seasonal_reset: false,
      is_monotonic_within_year: false,
      evidence: {},
    };
  }

  // Sort by date
  const sorted = [...values]
    .filter((v) => v.date && v.value !== null && v.value !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < 6) {
    return {
      is_cumulative: false,
      cumulative_confidence: 0,
      has_seasonal_reset: false,
      is_monotonic_within_year: false,
      evidence: {},
    };
  }

  // Group by year
  const yearGroups = new Map<number, TemporalDataPoint[]>();
  for (const val of sorted) {
    const year = parseInt(val.date.substring(0, 4));
    if (!yearGroups.has(year)) {
      yearGroups.set(year, []);
    }
    yearGroups.get(year)!.push(val);
  }

  const years = Array.from(yearGroups.keys()).sort();

  // Evidence metrics
  let decJanRatios: number[] = [];
  let withinYearIncreases = 0;
  let withinYearComparisons = 0;
  let yearBoundaryResets = 0;
  let yearBoundaries = 0;

  // Analyze each year for monotonic increase
  for (const year of years) {
    const yearData = yearGroups.get(year)!;
    if (yearData.length < 2) continue;

    // Check if values increase within year
    for (let i = 1; i < yearData.length; i++) {
      const prev = yearData[i - 1].value as number;
      const curr = yearData[i].value as number;
      withinYearComparisons++;
      if (curr >= prev) {
        withinYearIncreases++;
      }
    }

    // Check Dec vs Jan ratio for this year
    const janValue = yearData.find((v) => v.date.substring(5, 7) === "01")
      ?.value as number;
    const decValue = yearData.find((v) => v.date.substring(5, 7) === "12")
      ?.value as number;

    if (janValue && decValue && janValue > 0) {
      decJanRatios.push(decValue / janValue);
    }
  }

  // Check year boundary resets (Dec year N >> Jan year N+1)
  for (let i = 0; i < years.length - 1; i++) {
    const thisYearData = yearGroups.get(years[i])!;
    const nextYearData = yearGroups.get(years[i + 1])!;

    const decThisYear = thisYearData.find((v) =>
      v.date.substring(5, 7) === "12"
    )?.value as number;
    const janNextYear = nextYearData.find((v) =>
      v.date.substring(5, 7) === "01"
    )?.value as number;

    if (decThisYear && janNextYear) {
      yearBoundaries++;
      // Reset = Jan much smaller than Dec (e.g., Dec=1000, Jan=80 → reset)
      if (janNextYear < decThisYear * 0.2) {
        yearBoundaryResets++;
      }
    }
  }

  // Calculate metrics
  const avgDecJanRatio = decJanRatios.length > 0
    ? decJanRatios.reduce((a, b) => a + b, 0) / decJanRatios.length
    : 0;

  const withinYearIncreasePct = withinYearComparisons > 0
    ? (withinYearIncreases / withinYearComparisons) * 100
    : 0;

  const resetAtBoundaryPct = yearBoundaries > 0
    ? (yearBoundaryResets / yearBoundaries) * 100
    : 0;

  // Decision logic
  const hasSeasonalReset = resetAtBoundaryPct > 50;
  const isMonotonicWithinYear = withinYearIncreasePct > 80;
  const hasHighDecJanRatio = avgDecJanRatio > 5;

  // Cumulative if:
  // 1. Values reset at year boundary AND
  // 2. Values increase within year AND
  // 3. Dec/Jan ratio is high
  const isCumulative = hasSeasonalReset && isMonotonicWithinYear &&
    hasHighDecJanRatio;

  // Confidence based on strength of signals
  let confidence = 0;
  if (hasSeasonalReset) confidence += 0.4;
  if (isMonotonicWithinYear) confidence += 0.3;
  if (hasHighDecJanRatio) confidence += 0.3;

  return {
    is_cumulative: isCumulative,
    cumulative_confidence: confidence,
    has_seasonal_reset: hasSeasonalReset,
    is_monotonic_within_year: isMonotonicWithinYear,
    evidence: {
      dec_jan_ratio: avgDecJanRatio,
      within_year_increase_pct: withinYearIncreasePct,
      year_boundaries: yearBoundaries,
      reset_at_boundary_pct: resetAtBoundaryPct,
    },
  };
}

/**
 * Format analysis for LLM consumption
 */
export function formatAnalysisForLLM(
  analysis: TimeSeriesAnalysis,
): string {
  // Note: Don't return early for 0 confidence - still provide analysis details
  if (
    analysis.cumulative_confidence === 0 && !analysis.evidence.dec_jan_ratio
  ) {
    return "No clear temporal pattern detected from time series data.";
  }

  const parts: string[] = [];

  if (analysis.is_cumulative) {
    parts.push(
      `🔍 Time series analysis indicates CUMULATIVE (YTD) pattern with ${
        (analysis.cumulative_confidence * 100).toFixed(0)
      }% confidence:`,
    );
  } else {
    parts.push(
      `🔍 Time series analysis indicates NON-cumulative pattern:`,
    );
  }

  const ev = analysis.evidence;
  if (ev.dec_jan_ratio) {
    parts.push(
      `  • Dec/Jan ratio: ${ev.dec_jan_ratio.toFixed(1)}x ${
        ev.dec_jan_ratio > 5 ? "(typical of cumulative)" : ""
      }`,
    );
  }
  if (ev.within_year_increase_pct !== undefined) {
    parts.push(
      `  • Within-year increases: ${ev.within_year_increase_pct.toFixed(0)}% ${
        ev.within_year_increase_pct > 80 ? "(monotonically increasing)" : ""
      }`,
    );
  }
  if (ev.reset_at_boundary_pct !== undefined && ev.year_boundaries) {
    parts.push(
      `  • Year boundary resets: ${
        ev.reset_at_boundary_pct.toFixed(0)
      }% of ${ev.year_boundaries} boundaries ${
        ev.reset_at_boundary_pct > 50 ? "(resets to zero)" : ""
      }`,
    );
  }

  return parts.join("\n");
}
