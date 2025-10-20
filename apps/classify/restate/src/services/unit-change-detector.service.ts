/**
 * Unit Change Detector Service
 * Detects sudden scale shifts and reporting unit changes (e.g., thousands → millions)
 */

import * as restate from "@restatedev/restate-sdk";
import type { TimeSeriesPoint, UnitChangeResult, QualityFlag } from "../types.ts";

interface UnitChangeDetectorInput {
  indicator_id: string;
  time_series: TimeSeriesPoint[];
  expected_scale: string; // from classification (e.g., "millions", "billions")
  llm_provider?: string;
}

/**
 * Detect regime shifts by comparing rolling window means
 */
function detectRegimeShifts(sorted: TimeSeriesPoint[]): Array<{
  date: string;
  scale_factor: number;
  before_mean: number;
  after_mean: number;
}> {
  const shifts: Array<{
    date: string;
    scale_factor: number;
    before_mean: number;
    after_mean: number;
  }> = [];

  const windowSize = Math.min(10, Math.floor(sorted.length / 4)); // 10 points or 25% of data
  if (windowSize < 3) return shifts; // Not enough data

  for (let i = windowSize; i < sorted.length - windowSize; i++) {
    const before = sorted.slice(i - windowSize, i).map((p) => p.value);
    const after = sorted.slice(i, i + windowSize).map((p) => p.value);

    const beforeMean =
      before.reduce((sum, v) => sum + Math.abs(v), 0) / before.length;
    const afterMean =
      after.reduce((sum, v) => sum + Math.abs(v), 0) / after.length;

    if (beforeMean === 0 || afterMean === 0) continue;

    const scaleFactor = afterMean / beforeMean;

    // Common scale factor shifts: 1000, 1000000, 0.001, 0.000001
    const commonFactors = [
      1000, 1000000, 1000000000, 0.001, 0.000001, 0.000000001,
    ];

    for (const factor of commonFactors) {
      // Check if scale factor is close to a common factor (within 20%)
      if (
        Math.abs(scaleFactor - factor) < factor * 0.2 ||
        Math.abs(scaleFactor - 1 / factor) < 1 / factor * 0.2
      ) {
        shifts.push({
          date: sorted[i].date,
          scale_factor: scaleFactor,
          before_mean: beforeMean,
          after_mean: afterMean,
        });
        break;
      }
    }
  }

  return shifts;
}

const unitChangeDetectorService = restate.service({
  name: "unit-change-detector",
  handlers: {
    detect: async (ctx: restate.Context, input: UnitChangeDetectorInput) => {
      const { indicator_id, time_series, expected_scale } = input;

      ctx.console.info("Detecting unit changes", {
        indicator_id,
        time_series_count: time_series.length,
        expected_scale,
      });

      try {
        if (time_series.length < 10) {
          // Not enough data for reliable detection
          const result: UnitChangeResult = {
            has_changes: false,
            regime_shifts: [],
            flags: [],
          };
          return { success: true, result };
        }

        // Sort by date
        const sorted = [...time_series].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const regimeShifts = detectRegimeShifts(sorted);
        const flags: QualityFlag[] = [];

        // Flag regime shifts
        for (const shift of regimeShifts) {
          const scaleFactorAbs = Math.abs(shift.scale_factor);
          const severity =
            scaleFactorAbs >= 1000000 || scaleFactorAbs <= 0.000001
              ? 5
              : scaleFactorAbs >= 1000 || scaleFactorAbs <= 0.001
              ? 4
              : 3;

          const direction = shift.scale_factor > 1 ? "increase" : "decrease";
          const factorDisplay =
            shift.scale_factor > 1
              ? `${shift.scale_factor.toFixed(0)}x`
              : `${(1 / shift.scale_factor).toFixed(0)}x reduction`;

          flags.push({
            check_type: "unit_change",
            status: severity >= 4 ? "critical" : "flagged",
            severity,
            message: `Reporting unit likely changed around ${shift.date} (${factorDisplay} ${direction})`,
            details: {
              date: shift.date,
              scale_factor: shift.scale_factor,
              before_mean: shift.before_mean,
              after_mean: shift.after_mean,
              direction,
              expected_scale,
            },
            affected_dates: [shift.date],
          });
        }

        const result: UnitChangeResult = {
          has_changes: regimeShifts.length > 0,
          regime_shifts: regimeShifts,
          flags,
        };

        ctx.console.info("Unit change detection complete", {
          indicator_id,
          has_changes: result.has_changes,
          regime_shifts_count: regimeShifts.length,
          flags_count: flags.length,
        });

        return { success: true, result };
      } catch (error) {
        ctx.console.error("Unit change detection failed", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  },
});

export default unitChangeDetectorService;
