/**
 * Unit Consensus Detector Service
 * Analyzes unit consistency across indicators with the same name
 * Example: "Temperature" reported in Celsius vs Fahrenheit
 */

import * as restate from "@restatedev/restate-sdk";
import type { IndicatorMetadata, ConsensusResult } from "../types.ts";

interface UnitConsensusInput {
  indicator_name: string;
  indicators: IndicatorMetadata[];
  consensus_threshold?: number; // Default: 0.75 (75%)
}

const unitConsensusDetectorService = restate.service({
  name: "unit-consensus-detector",
  handlers: {
    detect: async (ctx: restate.Context, input: UnitConsensusInput) => {
      const {
        indicator_name,
        indicators,
        consensus_threshold = 0.75,
      } = input;

      const startTime = Date.now();

      ctx.console.info("Starting unit consensus detection", {
        indicator_name,
        total_indicators: indicators.length,
        threshold: consensus_threshold,
      });

      try {
        const result = await ctx.run("analyze-unit-consensus", () => {
          // Extract unit values (use parsed_unit_type from normalization)
          const unitCounts: Record<string, number> = {};
          const unitToIndicators: Record<string, string[]> = {};

          for (const indicator of indicators) {
            // Prefer parsed_unit_type, fallback to original units
            const unit =
              indicator.units?.toLowerCase().trim() || "unknown";

            unitCounts[unit] = (unitCounts[unit] || 0) + 1;

            if (!unitToIndicators[unit]) {
              unitToIndicators[unit] = [];
            }
            unitToIndicators[unit].push(indicator.indicator_id);
          }

          // Find consensus value (most common unit)
          let consensusValue = "";
          let maxCount = 0;

          for (const [unit, count] of Object.entries(unitCounts)) {
            if (count > maxCount) {
              maxCount = count;
              consensusValue = unit;
            }
          }

          const consensusPercentage = maxCount / indicators.length;
          const hasStrongConsensus = consensusPercentage >= consensus_threshold;

          // Identify outliers (indicators not using consensus value)
          const outliers: Array<{
            indicator_id: string;
            value: string;
            deviation_percentage: number;
            source_name?: string;
            country?: string;
            region?: string;
          }> = [];

          for (const [unit, indicatorIds] of Object.entries(
            unitToIndicators
          )) {
            if (unit !== consensusValue) {
              const valuePercentage = unitCounts[unit] / indicators.length;
              const deviation = consensusPercentage - valuePercentage;

              for (const indicatorId of indicatorIds) {
                const metadata = indicators.find(
                  (i) => i.indicator_id === indicatorId
                );
                outliers.push({
                  indicator_id: indicatorId,
                  value: unit,
                  deviation_percentage: deviation,
                  source_name: metadata?.source_name,
                  country: metadata?.country,
                  region: metadata?.region,
                });
              }
            }
          }

          const consensusResult: ConsensusResult = {
            dimension: "unit",
            consensus_value: consensusValue,
            consensus_percentage: consensusPercentage,
            total_indicators: indicators.length,
            value_distribution: unitCounts,
            outliers,
            has_strong_consensus: hasStrongConsensus,
          };

          return consensusResult;
        });

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        ctx.console.info("Unit consensus detection complete", {
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
        ctx.console.error("Unit consensus detection failed", {
          indicator_name,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  },
});

export default unitConsensusDetectorService;
