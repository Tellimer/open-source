/**
 * Scale Consensus Detector Service
 * Analyzes scale consistency across indicators with the same name
 * Example: "GDP" reported in ones vs millions vs billions
 */

import * as restate from "@restatedev/restate-sdk";
import type { IndicatorMetadata, ConsensusResult } from "../types.ts";

interface ScaleConsensusInput {
  indicator_name: string;
  indicators: IndicatorMetadata[];
  consensus_threshold?: number; // Default: 0.75 (75%)
}

const scaleConsensusDetectorService = restate.service({
  name: "scale-consensus-detector",
  handlers: {
    detect: async (ctx: restate.Context, input: ScaleConsensusInput) => {
      const {
        indicator_name,
        indicators,
        consensus_threshold = 0.75,
      } = input;

      const startTime = Date.now();

      ctx.console.info("Starting scale consensus detection", {
        indicator_name,
        total_indicators: indicators.length,
        threshold: consensus_threshold,
      });

      try {
        const result = await ctx.run("analyze-scale-consensus", () => {
          // Extract scale values from normalized_scale
          const scaleCounts: Record<string, number> = {};
          const scaleToIndicators: Record<string, string[]> = {};

          for (const indicator of indicators) {
            const scale = indicator.normalized_scale.toLowerCase().trim();

            scaleCounts[scale] = (scaleCounts[scale] || 0) + 1;

            if (!scaleToIndicators[scale]) {
              scaleToIndicators[scale] = [];
            }
            scaleToIndicators[scale].push(indicator.indicator_id);
          }

          // Find consensus value (most common scale)
          let consensusValue = "";
          let maxCount = 0;

          for (const [scale, count] of Object.entries(scaleCounts)) {
            if (count > maxCount) {
              maxCount = count;
              consensusValue = scale;
            }
          }

          const consensusPercentage = maxCount / indicators.length;
          const hasStrongConsensus = consensusPercentage >= consensus_threshold;

          // Identify outliers (indicators not using consensus scale)
          const outliers: Array<{
            indicator_id: string;
            value: string;
            deviation_percentage: number;
            source_name?: string;
            country?: string;
            region?: string;
          }> = [];

          for (const [scale, indicatorIds] of Object.entries(
            scaleToIndicators
          )) {
            if (scale !== consensusValue) {
              const valuePercentage = scaleCounts[scale] / indicators.length;
              const deviation = consensusPercentage - valuePercentage;

              for (const indicatorId of indicatorIds) {
                const metadata = indicators.find(
                  (i) => i.indicator_id === indicatorId
                );
                outliers.push({
                  indicator_id: indicatorId,
                  value: scale,
                  deviation_percentage: deviation,
                  source_name: metadata?.source_name,
                  country: metadata?.country,
                  region: metadata?.region,
                });
              }
            }
          }

          const consensusResult: ConsensusResult = {
            dimension: "scale",
            consensus_value: consensusValue,
            consensus_percentage: consensusPercentage,
            total_indicators: indicators.length,
            value_distribution: scaleCounts,
            outliers,
            has_strong_consensus: hasStrongConsensus,
          };

          return consensusResult;
        });

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        ctx.console.info("Scale consensus detection complete", {
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
        ctx.console.error("Scale consensus detection failed", {
          indicator_name,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  },
});

export default scaleConsensusDetectorService;
