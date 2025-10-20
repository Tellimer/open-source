/**
 * Consensus Consolidator Service
 * Aggregates results from all 5 consensus detectors into a unified report
 */

import * as restate from "@restatedev/restate-sdk";
import type {
  ConsensusResult,
  ConsensusSummaryReport,
  ConsensusOutlier,
} from "../types.ts";

interface ConsensusConsolidatorInput {
  indicator_name: string;
  total_indicators: number;
  unit_consensus: ConsensusResult;
  scale_consensus: ConsensusResult;
  frequency_consensus: ConsensusResult;
  currency_consensus: ConsensusResult;
  time_basis_consensus: ConsensusResult;
}

const consensusConsolidatorService = restate.service({
  name: "consensus-consolidator",
  handlers: {
    consolidate: async (
      ctx: restate.Context,
      input: ConsensusConsolidatorInput
    ) => {
      const {
        indicator_name,
        total_indicators,
        unit_consensus,
        scale_consensus,
        frequency_consensus,
        currency_consensus,
        time_basis_consensus,
      } = input;

      const startTime = Date.now();

      ctx.console.info("Starting consensus consolidation", {
        indicator_name,
        total_indicators,
      });

      try {
        const result = await ctx.run("consolidate-consensus-results", () => {
          const allResults = [
            unit_consensus,
            scale_consensus,
            frequency_consensus,
            currency_consensus,
            time_basis_consensus,
          ];

          // Count dimensions with/without consensus
          let dimensionsWithConsensus = 0;
          let dimensionsWithIssues = 0;

          for (const result of allResults) {
            if (result.has_strong_consensus) {
              dimensionsWithConsensus++;
            } else {
              dimensionsWithIssues++;
            }
          }

          // Combine all outliers from all dimensions
          const allOutliers: ConsensusOutlier[] = [];

          for (const result of allResults) {
            for (const outlier of result.outliers) {
              allOutliers.push({
                indicator_id: outlier.indicator_id,
                dimension: result.dimension,
                outlier_value: outlier.value,
                consensus_value: result.consensus_value,
                deviation_percentage: outlier.deviation_percentage,
                source_name: outlier.source_name,
                country: outlier.country,
                region: outlier.region,
              });
            }
          }

          // Determine overall status
          let status:
            | "highly_consistent"
            | "mostly_consistent"
            | "inconsistent"
            | "critical_inconsistency";

          if (dimensionsWithConsensus === 5) {
            status = "highly_consistent";
          } else if (dimensionsWithConsensus >= 3) {
            status = "mostly_consistent";
          } else if (dimensionsWithConsensus >= 1) {
            status = "inconsistent";
          } else {
            status = "critical_inconsistency";
          }

          const consolidatedReport: ConsensusSummaryReport = {
            indicator_name,
            total_indicators,
            total_checks: 5, // 5 dimensions
            dimensions_with_consensus: dimensionsWithConsensus,
            dimensions_with_issues: dimensionsWithIssues,
            total_outliers: allOutliers.length,
            unit_consensus,
            scale_consensus,
            frequency_consensus,
            currency_consensus,
            time_basis_consensus,
            all_outliers: allOutliers,
            status,
          };

          return consolidatedReport;
        });

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        ctx.console.info("Consensus consolidation complete", {
          indicator_name,
          status: result.status,
          dimensions_with_consensus: result.dimensions_with_consensus,
          dimensions_with_issues: result.dimensions_with_issues,
          total_outliers: result.total_outliers,
          processing_time_ms: processingTime,
        });

        return {
          success: true,
          result,
        };
      } catch (error) {
        ctx.console.error("Consensus consolidation failed", {
          indicator_name,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  },
});

export default consensusConsolidatorService;
