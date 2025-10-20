/**
 * Quality Consolidator Service
 * Aggregates all detector results into a consolidated quality report
 */

import * as restate from "@restatedev/restate-sdk";
import type {
  StalenessResult,
  MagnitudeResult,
  FalseReadingResult,
  UnitChangeResult,
  ConsistencyResult,
  ConsolidatedQualityReport,
  QualityFlag,
} from "../types.ts";

interface QualityConsolidatorInput {
  indicator_id: string;
  staleness: StalenessResult;
  magnitude: MagnitudeResult;
  false_readings: FalseReadingResult;
  unit_changes: UnitChangeResult;
  consistency: ConsistencyResult;
}

/**
 * Calculate overall quality score (0-100)
 * Higher score = better quality
 */
function calculateQualityScore(
  allFlags: QualityFlag[],
  totalChecks: number
): number {
  if (totalChecks === 0) return 100;

  // Start with perfect score
  let score = 100;

  // Deduct points based on severity
  for (const flag of allFlags) {
    const deduction = flag.severity * 2; // 2-10 points per flag
    score -= deduction;
  }

  // Minimum score is 0
  return Math.max(0, score);
}

const qualityConsolidatorService = restate.service({
  name: "quality-consolidator",
  handlers: {
    consolidate: async (
      ctx: restate.Context,
      input: QualityConsolidatorInput
    ) => {
      const {
        indicator_id,
        staleness,
        magnitude,
        false_readings,
        unit_changes,
        consistency,
      } = input;

      ctx.console.info("Consolidating quality results", {
        indicator_id,
      });

      try {
        // Aggregate all flags
        const allFlags: QualityFlag[] = [
          ...staleness.flags,
          ...magnitude.flags,
          ...false_readings.flags,
          ...unit_changes.flags,
          ...consistency.flags,
        ];

        // Count checks
        const totalChecks = 5; // 5 detector services
        const passedChecks =
          (staleness.has_staleness ? 0 : 1) +
          (magnitude.has_anomalies ? 0 : 1) +
          (false_readings.has_issues ? 0 : 1) +
          (unit_changes.has_changes ? 0 : 1) +
          (consistency.is_consistent ? 1 : 0);

        // Count flags by status
        const flaggedCount = allFlags.filter(
          (f) => f.status === "flagged"
        ).length;
        const criticalCount = allFlags.filter(
          (f) => f.status === "critical"
        ).length;

        // Calculate overall quality score
        const overallScore = calculateQualityScore(allFlags, totalChecks);

        const report: ConsolidatedQualityReport = {
          indicator_id,
          total_checks: totalChecks,
          passed_checks: passedChecks,
          flagged_count: flaggedCount,
          critical_count: criticalCount,
          all_flags: allFlags,
          staleness,
          magnitude,
          false_readings,
          unit_changes,
          consistency,
          overall_score: parseFloat(overallScore.toFixed(1)),
        };

        ctx.console.info("Quality consolidation complete", {
          indicator_id,
          total_checks: totalChecks,
          passed_checks: passedChecks,
          flagged_count: flaggedCount,
          critical_count: criticalCount,
          overall_score: report.overall_score,
        });

        return { success: true, result: report };
      } catch (error) {
        ctx.console.error("Quality consolidation failed", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  },
});

export default qualityConsolidatorService;
