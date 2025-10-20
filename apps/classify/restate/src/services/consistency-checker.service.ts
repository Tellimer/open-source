/**
 * Consistency Checker Service
 * Validates monotonicity for cumulative indicators and temporal consistency
 */

import * as restate from "@restatedev/restate-sdk";
import type { TimeSeriesPoint, ConsistencyResult, QualityFlag } from "../types.ts";

interface ConsistencyCheckerInput {
  indicator_id: string;
  time_series: TimeSeriesPoint[];
  is_cumulative: boolean; // from classification
  temporal_aggregation: string; // from classification
  llm_provider?: string;
}

const consistencyCheckerService = restate.service({
  name: "consistency-checker",
  handlers: {
    check: async (ctx: restate.Context, input: ConsistencyCheckerInput) => {
      const { indicator_id, time_series, is_cumulative, temporal_aggregation } =
        input;

      ctx.console.info("Checking consistency", {
        indicator_id,
        time_series_count: time_series.length,
        is_cumulative,
        temporal_aggregation,
      });

      try {
        if (time_series.length < 2) {
          const result: ConsistencyResult = {
            is_consistent: true,
            monotonicity_violations: [],
            temporal_inconsistencies: [],
            flags: [],
          };
          return { success: true, result };
        }

        // Sort by date
        const sorted = [...time_series].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const flags: QualityFlag[] = [];
        const monotonicityViolations: Array<{
          date: string;
          value: number;
          expected_direction: "increasing" | "decreasing";
        }> = [];
        const temporalInconsistencies: Array<{
          date: string;
          issue: string;
        }> = [];

        // 1. Check monotonicity for cumulative indicators
        if (is_cumulative) {
          // Cumulative indicators should be monotonically increasing (or at least non-decreasing)
          for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];

            // Allow for small rounding errors (0.01% tolerance)
            const tolerance = Math.abs(prev.value) * 0.0001;

            if (curr.value < prev.value - tolerance) {
              monotonicityViolations.push({
                date: curr.date,
                value: curr.value,
                expected_direction: "increasing",
              });
            }
          }

          if (monotonicityViolations.length > 0) {
            const severity =
              monotonicityViolations.length > sorted.length * 0.1 ? 5 : 3;

            flags.push({
              check_type: "consistency",
              status: severity === 5 ? "critical" : "flagged",
              severity,
              message: `${monotonicityViolations.length} monotonicity violation(s) in cumulative indicator`,
              details: {
                violation_count: monotonicityViolations.length,
                total_points: sorted.length,
                violation_rate: (
                  (monotonicityViolations.length / sorted.length) *
                  100
                ).toFixed(1),
                examples: monotonicityViolations.slice(0, 5),
              },
              affected_dates: monotonicityViolations.map((v) => v.date),
            });
          }
        }

        // 2. Check for backdated changes (temporal inconsistencies)
        // This would require revision/version tracking in time_series_data table
        // For now, we check for duplicate dates with different values
        const dateMap = new Map<string, number[]>();
        for (const point of sorted) {
          const dateKey = point.date;
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, []);
          }
          dateMap.get(dateKey)!.push(point.value);
        }

        for (const [date, values] of dateMap.entries()) {
          if (values.length > 1) {
            const uniqueValues = [...new Set(values)];
            if (uniqueValues.length > 1) {
              temporalInconsistencies.push({
                date,
                issue: `Multiple conflicting values for same date: ${uniqueValues.join(", ")}`,
              });
            }
          }
        }

        if (temporalInconsistencies.length > 0) {
          flags.push({
            check_type: "consistency",
            status: "critical",
            severity: 5,
            message: `${temporalInconsistencies.length} temporal inconsistenc(ies) detected (duplicate dates with different values)`,
            details: {
              inconsistency_count: temporalInconsistencies.length,
              examples: temporalInconsistencies.slice(0, 3),
            },
            affected_dates: temporalInconsistencies.map((i) => i.date),
          });
        }

        // 3. Check temporal aggregation consistency
        // For period-total or period-average, values should align with reporting frequency
        if (
          temporal_aggregation === "period-total" ||
          temporal_aggregation === "period-average"
        ) {
          // Calculate expected frequency from dates
          const gaps: number[] = [];
          for (let i = 1; i < sorted.length; i++) {
            const prevDate = new Date(sorted[i - 1].date);
            const currDate = new Date(sorted[i].date);
            const gapDays =
              (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
            gaps.push(gapDays);
          }

          if (gaps.length > 0) {
            const meanGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
            const stdDevGap = Math.sqrt(
              gaps.reduce((sum, g) => sum + Math.pow(g - meanGap, 2), 0) /
                gaps.length
            );

            // Flag if gaps are too inconsistent (high std dev relative to mean)
            const coefficientOfVariation = (stdDevGap / meanGap) * 100;
            if (coefficientOfVariation > 30 && gaps.length > 5) {
              // >30% variation
              temporalInconsistencies.push({
                date: "multiple",
                issue: `Inconsistent reporting intervals (${coefficientOfVariation.toFixed(0)}% variation)`,
              });

              flags.push({
                check_type: "consistency",
                status: "flagged",
                severity: 2,
                message: `Inconsistent time intervals for ${temporal_aggregation} indicator`,
                details: {
                  mean_gap_days: meanGap.toFixed(1),
                  std_dev_days: stdDevGap.toFixed(1),
                  coefficient_of_variation: coefficientOfVariation.toFixed(1),
                  temporal_aggregation,
                },
              });
            }
          }
        }

        const result: ConsistencyResult = {
          is_consistent: flags.length === 0,
          monotonicity_violations: monotonicityViolations,
          temporal_inconsistencies: temporalInconsistencies,
          flags,
        };

        ctx.console.info("Consistency check complete", {
          indicator_id,
          is_consistent: result.is_consistent,
          monotonicity_violations_count: monotonicityViolations.length,
          temporal_inconsistencies_count: temporalInconsistencies.length,
          flags_count: flags.length,
        });

        return { success: true, result };
      } catch (error) {
        ctx.console.error("Consistency check failed", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  },
});

export default consistencyCheckerService;
