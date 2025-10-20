/**
 * Staleness Detector Service
 * Detects gaps in time series data relative to expected release frequency
 */

import * as restate from "@restatedev/restate-sdk";
import type { TimeSeriesPoint, StalenessResult, QualityFlag } from "../types.ts";

interface StalenessDetectorInput {
  indicator_id: string;
  time_series: TimeSeriesPoint[];
  expected_frequency: string; // from classification: 'daily', 'weekly', 'monthly', 'quarterly', 'annual'
  llm_provider?: string;
}

/**
 * Convert reporting frequency to expected days
 */
function frequencyToDays(frequency: string): number {
  const map: Record<string, number> = {
    daily: 1,
    weekly: 7,
    monthly: 30, // approximation
    quarterly: 90,
    annual: 365,
    "point-in-time": 30, // default assumption
  };
  return map[frequency.toLowerCase()] || 30;
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return diffMs / (1000 * 60 * 60 * 24);
}

const stalenessDetectorService = restate.service({
  name: "staleness-detector",
  handlers: {
    detect: async (ctx: restate.Context, input: StalenessDetectorInput) => {
      const { indicator_id, time_series, expected_frequency } = input;

      ctx.console.info("Detecting staleness", {
        indicator_id,
        time_series_count: time_series.length,
        expected_frequency,
      });

      try {
        // Sort time series by date (newest first)
        const sorted = [...time_series].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        if (sorted.length === 0) {
          // No data - critical issue
          const flags: QualityFlag[] = [
            {
              check_type: "staleness",
              status: "critical",
              severity: 5,
              message: "No time series data available",
              details: {},
            },
          ];

          const result: StalenessResult = {
            has_staleness: true,
            expected_frequency_days: frequencyToDays(expected_frequency),
            actual_gap_days: Infinity,
            last_data_point: new Date().toISOString(),
            days_since_last_update: Infinity,
            flags,
          };

          ctx.console.warn("No time series data", { indicator_id });

          return { success: true, result };
        }

        // Get most recent data point
        const lastDataPoint = sorted[0];
        const now = new Date();
        const daysSinceLastUpdate = daysBetween(
          lastDataPoint.date,
          now.toISOString()
        );

        // Expected frequency in days
        const expectedFreqDays = frequencyToDays(expected_frequency);

        // Allow 1.5x buffer (e.g., monthly = 45 days)
        const stalenessThreshold = expectedFreqDays * 1.5;

        // Calculate largest gap in historical data
        let maxGap = 0;
        for (let i = 0; i < sorted.length - 1; i++) {
          const gap = daysBetween(sorted[i + 1].date, sorted[i].date);
          if (gap > maxGap) {
            maxGap = gap;
          }
        }

        const actualGapDays = Math.max(maxGap, daysSinceLastUpdate);

        // Determine staleness
        const flags: QualityFlag[] = [];
        let hasStaleness = false;

        // Check current staleness (no recent update)
        if (daysSinceLastUpdate > stalenessThreshold) {
          hasStaleness = true;
          const severity = daysSinceLastUpdate > expectedFreqDays * 3 ? 5 : 3;

          flags.push({
            check_type: "staleness",
            status: severity === 5 ? "critical" : "flagged",
            severity,
            message: `No data for ${Math.round(daysSinceLastUpdate)} days (expected every ${expectedFreqDays} days)`,
            details: {
              days_since_last_update: daysSinceLastUpdate,
              expected_frequency_days: expectedFreqDays,
              last_data_point: lastDataPoint.date,
              threshold_days: stalenessThreshold,
            },
          });
        }

        // Check historical gaps
        if (maxGap > stalenessThreshold && maxGap !== daysSinceLastUpdate) {
          hasStaleness = true;
          flags.push({
            check_type: "staleness",
            status: "flagged",
            severity: 2,
            message: `Historical data gap of ${Math.round(maxGap)} days detected`,
            details: {
              max_historical_gap_days: maxGap,
              expected_frequency_days: expectedFreqDays,
              threshold_days: stalenessThreshold,
            },
          });
        }

        const result: StalenessResult = {
          has_staleness: hasStaleness,
          expected_frequency_days: expectedFreqDays,
          actual_gap_days: actualGapDays,
          last_data_point: lastDataPoint.date,
          days_since_last_update: daysSinceLastUpdate,
          flags,
        };

        ctx.console.info("Staleness detection complete", {
          indicator_id,
          has_staleness: hasStaleness,
          days_since_last_update: daysSinceLastUpdate,
          flags_count: flags.length,
        });

        return { success: true, result };
      } catch (error) {
        ctx.console.error("Staleness detection failed", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  },
});

export default stalenessDetectorService;
