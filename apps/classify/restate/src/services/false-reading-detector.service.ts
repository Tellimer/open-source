/**
 * False Reading Detector Service
 * Detects impossible values, flat periods, repeating patterns, and decimal errors
 */

import * as restate from "@restatedev/restate-sdk";
import type { TimeSeriesPoint, FalseReadingResult, QualityFlag } from "../types.ts";

interface FalseReadingDetectorInput {
  indicator_id: string;
  time_series: TimeSeriesPoint[];
  indicator_type: string; // for context
  llm_provider?: string;
}

/**
 * Check if value is likely a decimal place error (off by 10^n)
 */
function detectDecimalError(
  value: number,
  expectedRange: { min: number; max: number; median: number }
): { isError: boolean; suspectedCorrectValue: number; scaleFactor: number } {
  const scaleFactors = [10, 100, 1000, 10000, 0.1, 0.01, 0.001, 0.0001];

  for (const factor of scaleFactors) {
    const correctedValue = value / factor;
    // Check if corrected value falls within expected range
    if (
      correctedValue >= expectedRange.min * 0.5 &&
      correctedValue <= expectedRange.max * 2.0 &&
      Math.abs(correctedValue - expectedRange.median) <
        Math.abs(value - expectedRange.median)
    ) {
      return {
        isError: true,
        suspectedCorrectValue: correctedValue,
        scaleFactor: factor,
      };
    }
  }

  return { isError: false, suspectedCorrectValue: value, scaleFactor: 1 };
}

const falseReadingDetectorService = restate.service({
  name: "false-reading-detector",
  handlers: {
    detect: async (ctx: restate.Context, input: FalseReadingDetectorInput) => {
      const { indicator_id, time_series, indicator_type } = input;

      ctx.console.info("Detecting false readings", {
        indicator_id,
        time_series_count: time_series.length,
        indicator_type,
      });

      try {
        if (time_series.length === 0) {
          const result: FalseReadingResult = {
            has_issues: false,
            impossible_values: [],
            flat_periods: [],
            repeating_patterns: [],
            decimal_errors: [],
            flags: [],
          };
          return { success: true, result };
        }

        // Sort by date
        const sorted = [...time_series].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const values = sorted.map((p) => p.value);
        const flags: QualityFlag[] = [];
        const impossibleValues: Array<{
          date: string;
          value: number;
          reason: string;
        }> = [];
        const flatPeriods: Array<{
          start_date: string;
          end_date: string;
          value: number;
          duration_days: number;
        }> = [];
        const repeatingPatterns: Array<{
          pattern: number[];
          occurrences: number;
          dates: string[];
        }> = [];
        const decimalErrors: Array<{
          date: string;
          value: number;
          suspected_correct_value: number;
          scale_factor: number;
        }> = [];

        // Calculate median for decimal error detection
        const sortedValues = [...values].sort((a, b) => a - b);
        const median = sortedValues[Math.floor(sortedValues.length / 2)];
        const min = Math.min(...values);
        const max = Math.max(...values);

        // 1. Detect impossible values (negative when shouldn't be, exact zeros)
        for (const point of sorted) {
          // Negative values for indicators that shouldn't be negative
          if (
            point.value < 0 &&
            (indicator_type === "stock" ||
              indicator_type === "capacity" ||
              indicator_type === "price")
          ) {
            impossibleValues.push({
              date: point.date,
              value: point.value,
              reason: `Negative value for ${indicator_type} indicator`,
            });
          }

          // Exact zero runs (suspicious)
          const zeroCount = values.filter((v) => v === 0).length;
          if (
            point.value === 0 &&
            zeroCount > 1 &&
            zeroCount < values.length * 0.5
          ) {
            // Only flag if some but not all values are zero
            impossibleValues.push({
              date: point.date,
              value: point.value,
              reason: "Suspicious exact zero in otherwise non-zero series",
            });
          }
        }

        // 2. Detect flat periods (same value repeated)
        let flatStart = 0;
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i].value !== sorted[i - 1].value) {
            const flatDuration = i - flatStart;
            if (flatDuration >= 5) {
              // 5+ consecutive same values
              const startDate = new Date(sorted[flatStart].date);
              const endDate = new Date(sorted[i - 1].date);
              const durationDays =
                (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

              flatPeriods.push({
                start_date: sorted[flatStart].date,
                end_date: sorted[i - 1].date,
                value: sorted[flatStart].value,
                duration_days: Math.round(durationDays),
              });
            }
            flatStart = i;
          }
        }

        // 3. Detect repeating patterns (copy-paste errors)
        const patternLength = 3; // Look for repeating 3-value patterns
        for (let i = 0; i <= values.length - patternLength * 2; i++) {
          const pattern = values.slice(i, i + patternLength);
          let occurrences = 1;
          const dates = [sorted[i].date];

          for (let j = i + patternLength; j <= values.length - patternLength; j++) {
            const subsequence = values.slice(j, j + patternLength);
            if (
              pattern.every((v, idx) => Math.abs(v - subsequence[idx]) < 0.0001)
            ) {
              occurrences++;
              dates.push(sorted[j].date);
            }
          }

          if (occurrences >= 3) {
            // Pattern repeats 3+ times
            repeatingPatterns.push({
              pattern,
              occurrences,
              dates,
            });
          }
        }

        // 4. Detect decimal place errors
        const expectedRange = { min, max, median };
        for (const point of sorted) {
          const errorCheck = detectDecimalError(point.value, expectedRange);
          if (errorCheck.isError) {
            decimalErrors.push({
              date: point.date,
              value: point.value,
              suspected_correct_value: errorCheck.suspectedCorrectValue,
              scale_factor: errorCheck.scaleFactor,
            });
          }
        }

        // Generate flags
        if (impossibleValues.length > 0) {
          flags.push({
            check_type: "false_reading",
            status: "critical",
            severity: 5,
            message: `${impossibleValues.length} impossible value(s) detected`,
            details: {
              count: impossibleValues.length,
              examples: impossibleValues.slice(0, 3),
            },
            affected_dates: impossibleValues.map((v) => v.date),
          });
        }

        if (flatPeriods.length > 0) {
          flags.push({
            check_type: "false_reading",
            status: "flagged",
            severity: 3,
            message: `${flatPeriods.length} flat period(s) detected (same value repeated 5+ times)`,
            details: {
              count: flatPeriods.length,
              longest_duration_days: Math.max(
                ...flatPeriods.map((p) => p.duration_days)
              ),
              examples: flatPeriods.slice(0, 2),
            },
            affected_dates: flatPeriods.flatMap((p) => [p.start_date, p.end_date]),
          });
        }

        if (repeatingPatterns.length > 0) {
          flags.push({
            check_type: "false_reading",
            status: "flagged",
            severity: 4,
            message: `${repeatingPatterns.length} repeating pattern(s) detected (possible copy-paste error)`,
            details: {
              count: repeatingPatterns.length,
              max_occurrences: Math.max(
                ...repeatingPatterns.map((p) => p.occurrences)
              ),
              examples: repeatingPatterns.slice(0, 2),
            },
          });
        }

        if (decimalErrors.length > 0) {
          flags.push({
            check_type: "false_reading",
            status: "critical",
            severity: 5,
            message: `${decimalErrors.length} decimal place error(s) detected`,
            details: {
              count: decimalErrors.length,
              examples: decimalErrors.slice(0, 3),
            },
            affected_dates: decimalErrors.map((e) => e.date),
          });
        }

        const result: FalseReadingResult = {
          has_issues: flags.length > 0,
          impossible_values: impossibleValues,
          flat_periods: flatPeriods,
          repeating_patterns: repeatingPatterns,
          decimal_errors: decimalErrors,
          flags,
        };

        ctx.console.info("False reading detection complete", {
          indicator_id,
          has_issues: result.has_issues,
          impossible_count: impossibleValues.length,
          flat_periods_count: flatPeriods.length,
          repeating_patterns_count: repeatingPatterns.length,
          decimal_errors_count: decimalErrors.length,
          flags_count: flags.length,
        });

        return { success: true, result };
      } catch (error) {
        ctx.console.error("False reading detection failed", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  },
});

export default falseReadingDetectorService;
