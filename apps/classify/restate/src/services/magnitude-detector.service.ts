/**
 * Magnitude Detector Service
 * Detects outliers and sudden magnitude changes in time series data
 */

import * as restate from "@restatedev/restate-sdk";
import type { TimeSeriesPoint, MagnitudeResult, QualityFlag } from "../types.ts";

interface MagnitudeDetectorInput {
  indicator_id: string;
  time_series: TimeSeriesPoint[];
  indicator_type: string; // from classification
  is_cumulative: boolean; // from classification
  llm_provider?: string;
}

/**
 * Calculate statistical metrics
 */
function calculateStats(values: number[]): {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
} {
  if (values.length === 0) {
    return { mean: 0, stdDev: 0, min: 0, max: 0 };
  }

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return { mean, stdDev, min, max };
}

/**
 * Calculate z-score for a value
 */
function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return Math.abs(value - mean) / stdDev;
}

const magnitudeDetectorService = restate.service({
  name: "magnitude-detector",
  handlers: {
    detect: async (ctx: restate.Context, input: MagnitudeDetectorInput) => {
      const { indicator_id, time_series, indicator_type, is_cumulative } = input;

      ctx.console.info("Detecting magnitude anomalies", {
        indicator_id,
        time_series_count: time_series.length,
        indicator_type,
        is_cumulative,
      });

      try {
        if (time_series.length === 0) {
          const result: MagnitudeResult = {
            has_anomalies: false,
            mean: 0,
            std_dev: 0,
            outliers: [],
            sudden_changes: [],
            flags: [],
          };
          return { success: true, result };
        }

        // Sort by date (oldest first for change detection)
        const sorted = [...time_series].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const values = sorted.map((p) => p.value);
        const stats = calculateStats(values);

        const flags: QualityFlag[] = [];
        const outliers: Array<{
          date: string;
          value: number;
          z_score: number;
        }> = [];
        const suddenChanges: Array<{
          from_date: string;
          to_date: string;
          from_value: number;
          to_value: number;
          change_magnitude: number;
          change_percent: number;
        }> = [];

        // Outlier detection threshold
        const outlierThreshold = is_cumulative ? 4.0 : 3.0; // More lenient for cumulative

        // Detect outliers using z-score
        for (const point of sorted) {
          const z = zScore(point.value, stats.mean, stats.stdDev);
          if (z > outlierThreshold) {
            outliers.push({
              date: point.date,
              value: point.value,
              z_score: parseFloat(z.toFixed(2)),
            });
          }
        }

        // Detect sudden changes (period-over-period)
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1];
          const curr = sorted[i];

          const changeMagnitude = Math.abs(curr.value - prev.value);
          const changePercent =
            prev.value !== 0
              ? (changeMagnitude / Math.abs(prev.value)) * 100
              : Infinity;

          // Thresholds for sudden changes
          const suddenChangeThreshold = is_cumulative
            ? 50 // 50% change for cumulative (more lenient)
            : 100; // 100% change (2x) for non-cumulative

          const extremeChangeThreshold = 1000; // 10x change = extreme

          if (changePercent > suddenChangeThreshold) {
            suddenChanges.push({
              from_date: prev.date,
              to_date: curr.date,
              from_value: prev.value,
              to_value: curr.value,
              change_magnitude: changeMagnitude,
              change_percent: parseFloat(changePercent.toFixed(2)),
            });

            // Flag based on severity
            const severity =
              changePercent > extremeChangeThreshold
                ? 5
                : changePercent > suddenChangeThreshold * 3
                ? 4
                : 3;

            flags.push({
              check_type: "magnitude_change",
              status: severity >= 4 ? "critical" : "flagged",
              severity,
              message: `Sudden ${changePercent.toFixed(1)}% change from ${prev.value.toExponential(2)} to ${curr.value.toExponential(2)}`,
              details: {
                from_date: prev.date,
                to_date: curr.date,
                from_value: prev.value,
                to_value: curr.value,
                change_percent: changePercent,
                change_magnitude: changeMagnitude,
              },
              affected_dates: [prev.date, curr.date],
            });
          }
        }

        // Flag outliers
        if (outliers.length > 0) {
          const criticalOutliers = outliers.filter((o) => o.z_score > 5.0);

          if (criticalOutliers.length > 0) {
            flags.push({
              check_type: "magnitude_change",
              status: "critical",
              severity: 5,
              message: `${criticalOutliers.length} extreme outlier(s) detected (z-score > 5.0)`,
              details: {
                outlier_count: criticalOutliers.length,
                max_z_score: Math.max(...criticalOutliers.map((o) => o.z_score)),
                mean: stats.mean,
                std_dev: stats.stdDev,
              },
              affected_dates: criticalOutliers.map((o) => o.date),
            });
          } else {
            flags.push({
              check_type: "magnitude_change",
              status: "flagged",
              severity: 2,
              message: `${outliers.length} outlier(s) detected (z-score > ${outlierThreshold})`,
              details: {
                outlier_count: outliers.length,
                max_z_score: Math.max(...outliers.map((o) => o.z_score)),
                mean: stats.mean,
                std_dev: stats.stdDev,
                threshold: outlierThreshold,
              },
              affected_dates: outliers.map((o) => o.date),
            });
          }
        }

        const result: MagnitudeResult = {
          has_anomalies: flags.length > 0,
          mean: parseFloat(stats.mean.toFixed(4)),
          std_dev: parseFloat(stats.stdDev.toFixed(4)),
          outliers,
          sudden_changes: suddenChanges,
          flags,
        };

        ctx.console.info("Magnitude detection complete", {
          indicator_id,
          has_anomalies: result.has_anomalies,
          outliers_count: outliers.length,
          sudden_changes_count: suddenChanges.length,
          flags_count: flags.length,
        });

        return { success: true, result };
      } catch (error) {
        ctx.console.error("Magnitude detection failed", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  },
});

export default magnitudeDetectorService;
