/**
 * Time Basis Consensus Detector Service
 * Analyzes time basis consistency across indicators with the same name
 * Example: "GDP" reported as point-in-time vs cumulative
 */

import * as restate from "@restatedev/restate-sdk";
import type { IndicatorMetadata, ConsensusResult } from "../types.ts";

interface TimeBasisConsensusInput {
  indicator_name: string;
  indicators: IndicatorMetadata[];
  consensus_threshold?: number; // Default: 0.75 (75%)
}

const timeBasisConsensusDetectorService = restate.service({
  name: "time-basis-consensus-detector",
  handlers: {
    detect: async (ctx: restate.Context, input: TimeBasisConsensusInput) => {
      const {
        indicator_name,
        indicators,
        consensus_threshold = 0.75,
      } = input;

      const startTime = Date.now();

      ctx.console.info("Starting time basis consensus detection", {
        indicator_name,
        total_indicators: indicators.length,
        threshold: consensus_threshold,
      });

      try {
        const result = await ctx.run("analyze-time-basis-consensus", () => {
          // Extract time_basis values
          const timeBasisCounts: Record<string, number> = {};
          const timeBasisToIndicators: Record<string, string[]> = {};

          for (const indicator of indicators) {
            const timeBasis = indicator.time_basis.toLowerCase().trim();

            timeBasisCounts[timeBasis] = (timeBasisCounts[timeBasis] || 0) + 1;

            if (!timeBasisToIndicators[timeBasis]) {
              timeBasisToIndicators[timeBasis] = [];
            }
            timeBasisToIndicators[timeBasis].push(indicator.indicator_id);
          }

          // Find consensus value (most common time basis)
          let consensusValue = "";
          let maxCount = 0;

          for (const [timeBasis, count] of Object.entries(timeBasisCounts)) {
            if (count > maxCount) {
              maxCount = count;
              consensusValue = timeBasis;
            }
          }

          const consensusPercentage = maxCount / indicators.length;
          const hasStrongConsensus = consensusPercentage >= consensus_threshold;

          // Identify outliers (indicators not using consensus time basis)
          const outliers: Array<{
            indicator_id: string;
            value: string;
            deviation_percentage: number;
            source_name?: string;
            country?: string;
            region?: string;
          }> = [];

          for (const [timeBasis, indicatorIds] of Object.entries(
            timeBasisToIndicators
          )) {
            if (timeBasis !== consensusValue) {
              const valuePercentage =
                timeBasisCounts[timeBasis] / indicators.length;
              const deviation = consensusPercentage - valuePercentage;

              for (const indicatorId of indicatorIds) {
                const metadata = indicators.find(
                  (i) => i.indicator_id === indicatorId
                );
                outliers.push({
                  indicator_id: indicatorId,
                  value: timeBasis,
                  deviation_percentage: deviation,
                  source_name: metadata?.source_name,
                  country: metadata?.country,
                  region: metadata?.region,
                });
              }
            }
          }

          const consensusResult: ConsensusResult = {
            dimension: "time_basis",
            consensus_value: consensusValue,
            consensus_percentage: consensusPercentage,
            total_indicators: indicators.length,
            value_distribution: timeBasisCounts,
            outliers,
            has_strong_consensus: hasStrongConsensus,
          };

          return consensusResult;
        });

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        ctx.console.info("Time basis consensus detection complete", {
          indicator_name,
          consensus_value: result.consensus_value,
          consensus_percentage: result.consensus_percentage.toFixed(2),
          outlier_count: result.outliers.length,
          has_strong_consensus: result.has_strong_consensus,
          processing_time_ms: processingTime,
        });

        return {
          success: true,
          result,
        };
      } catch (error) {
        ctx.console.error("Time basis consensus detection failed", {
          indicator_name,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  },
});

export default timeBasisConsensusDetectorService;
