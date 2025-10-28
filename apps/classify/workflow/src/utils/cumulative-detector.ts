/**
 * Detects cumulative/YTD patterns in time series data
 *
 * Analyzes sample values to identify if data represents:
 * - YTD (Year-to-Date): Values accumulate within year, reset at year boundary
 * - Running Total: Values continuously accumulate without reset
 * - Period Total: Values represent discrete period amounts (not cumulative)
 */

interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface CumulativeDetectionResult {
  is_cumulative: boolean;
  pattern_type: "ytd" | "running_total" | "periodic" | "unknown";
  confidence: number; // 0-1
  evidence: {
    year_resets_detected?: number;
    within_year_increases?: number;
    total_periods_analyzed?: number;
    reset_points?: Array<
      { from_date: string; to_date: string; dropped_by: number }
    >;
    increase_points?: Array<
      { from_date: string; to_date: string; increased_by: number }
    >;
  };
  reasoning: string;
}

/**
 * Parse date string to year and quarter/month
 */
function parseDateToComponents(
  dateStr: string,
): { year: number; month: number; quarter: number } | null {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 0-indexed to 1-indexed
    const quarter = Math.ceil(month / 3);

    return { year, month, quarter };
  } catch {
    return null;
  }
}

/**
 * Check if two dates are in different years
 */
function isDifferentYear(
  date1Components: ReturnType<typeof parseDateToComponents>,
  date2Components: ReturnType<typeof parseDateToComponents>,
): boolean {
  if (!date1Components || !date2Components) return false;
  return date1Components.year !== date2Components.year;
}

/**
 * Check if date2 is later in the same year as date1
 */
function isLaterInSameYear(
  date1Components: ReturnType<typeof parseDateToComponents>,
  date2Components: ReturnType<typeof parseDateToComponents>,
): boolean {
  if (!date1Components || !date2Components) return false;
  return date1Components.year === date2Components.year &&
    (date2Components.quarter > date1Components.quarter ||
      date2Components.month > date1Components.month);
}

/**
 * Detect cumulative patterns in time series data
 */
export function detectCumulativePattern(
  sampleValues: TimeSeriesPoint[] | undefined,
): CumulativeDetectionResult {
  // Default result if no data
  if (!sampleValues || sampleValues.length < 3) {
    return {
      is_cumulative: false,
      pattern_type: "unknown",
      confidence: 0,
      evidence: { total_periods_analyzed: sampleValues?.length || 0 },
      reasoning:
        "Insufficient data points for cumulative pattern detection (need at least 3 points)",
    };
  }

  // Filter out non-date entries (like "last10YearsAvg")
  const validPoints = sampleValues
    .filter((p) => {
      const components = parseDateToComponents(p.date);
      return components !== null && !p.date.includes("Avg") &&
        !p.date.includes("avg");
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (validPoints.length < 3) {
    return {
      is_cumulative: false,
      pattern_type: "unknown",
      confidence: 0,
      evidence: { total_periods_analyzed: validPoints.length },
      reasoning: "Insufficient valid time series points after filtering",
    };
  }

  // Track patterns
  let yearResets = 0;
  let withinYearIncreases = 0;
  let withinYearDecreases = 0;
  const resetPoints: Array<
    { from_date: string; to_date: string; dropped_by: number }
  > = [];
  const increasePoints: Array<
    { from_date: string; to_date: string; increased_by: number }
  > = [];

  // Analyze consecutive points
  for (let i = 0; i < validPoints.length - 1; i++) {
    const current = validPoints[i];
    const next = validPoints[i + 1];

    const currentComponents = parseDateToComponents(current.date);
    const nextComponents = parseDateToComponents(next.date);

    if (!currentComponents || !nextComponents) continue;

    const valueDiff = next.value - current.value;
    const percentChange = (valueDiff / current.value) * 100;

    // Check for year boundary crossing
    if (isDifferentYear(currentComponents, nextComponents)) {
      // Expect a reset (value drops significantly) at year boundary for YTD
      if (valueDiff < 0 && Math.abs(percentChange) > 20) {
        yearResets++;
        resetPoints.push({
          from_date: current.date,
          to_date: next.date,
          dropped_by: Math.round(percentChange),
        });
      }
    } // Within same year
    else if (isLaterInSameYear(currentComponents, nextComponents)) {
      if (valueDiff > 0) {
        withinYearIncreases++;
        increasePoints.push({
          from_date: current.date,
          to_date: next.date,
          increased_by: Math.round(percentChange),
        });
      } else if (valueDiff < 0) {
        withinYearDecreases++;
      }
    }
  }

  // Determine pattern
  const totalTransitions = validPoints.length - 1;
  const withinYearTransitions = withinYearIncreases + withinYearDecreases;

  // YTD Pattern: Values increase within year AND reset at year boundaries
  const isYTD = yearResets > 0 &&
    withinYearIncreases >= 2 &&
    withinYearDecreases === 0;

  // Running Total: Values continuously increase, no resets
  const isRunningTotal = yearResets === 0 &&
    withinYearIncreases >= 3 &&
    withinYearDecreases === 0 &&
    totalTransitions >= 4;

  // Calculate confidence
  let confidence = 0;
  let patternType: CumulativeDetectionResult["pattern_type"] = "periodic";
  let reasoning = "";

  if (isYTD) {
    patternType = "ytd";
    // Confidence based on consistency of pattern
    const ytdConsistency = (yearResets + withinYearIncreases) /
      totalTransitions;
    confidence = Math.min(0.95, ytdConsistency);

    reasoning =
      `Detected YTD (Year-to-Date) cumulative pattern: ${yearResets} year ${
        yearResets === 1 ? "reset" : "resets"
      } observed where values dropped significantly at year boundaries, and ${withinYearIncreases} within-year increases where values accumulated throughout the year. This indicates the data represents cumulative totals that reset annually.`;
  } else if (isRunningTotal) {
    patternType = "running_total";
    confidence = Math.min(0.90, withinYearIncreases / totalTransitions);

    reasoning =
      `Detected running total cumulative pattern: ${withinYearIncreases} consecutive increases with no resets observed. Values continuously accumulate without year-boundary resets.`;
  } else {
    patternType = "periodic";
    confidence = 0.85;

    reasoning = `No cumulative pattern detected. `;
    if (withinYearDecreases > 0) {
      reasoning +=
        `Found ${withinYearDecreases} within-year decreases, indicating period-specific values rather than accumulation. `;
    }
    if (yearResets === 0 && withinYearTransitions > 0) {
      reasoning +=
        `No year-boundary resets observed across ${totalTransitions} transitions. `;
    }
    reasoning +=
      `Data appears to represent discrete period totals or averages.`;
  }

  return {
    is_cumulative: isYTD || isRunningTotal,
    pattern_type: patternType,
    confidence,
    evidence: {
      year_resets_detected: yearResets,
      within_year_increases: withinYearIncreases,
      total_periods_analyzed: validPoints.length,
      reset_points: resetPoints.length > 0
        ? resetPoints.slice(0, 3)
        : undefined, // Show first 3
      increase_points: increasePoints.length > 0
        ? increasePoints.slice(0, 3)
        : undefined,
    },
    reasoning,
  };
}
