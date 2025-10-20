/**
 * Currency Consensus Detector Service
 * Analyzes currency denomination consistency across indicators with the same name
 * Example: "Trade Balance" reported in USD vs local currency
 */

import * as restate from "@restatedev/restate-sdk";
import type { IndicatorMetadata, ConsensusResult } from "../types.ts";

interface CurrencyConsensusInput {
  indicator_name: string;
  indicators: IndicatorMetadata[];
  consensus_threshold?: number; // Default: 0.75 (75%)
}

const currencyConsensusDetectorService = restate.service({
  name: "currency-consensus-detector",
  handlers: {
    detect: async (ctx: restate.Context, input: CurrencyConsensusInput) => {
      const {
        indicator_name,
        indicators,
        consensus_threshold = 0.75,
      } = input;

      const startTime = Date.now();

      ctx.console.info("Starting currency consensus detection", {
        indicator_name,
        total_indicators: indicators.length,
        threshold: consensus_threshold,
      });

      try {
        const result = await ctx.run("analyze-currency-consensus", () => {
          // Extract currency values (parsed_currency from normalization)
          const currencyCounts: Record<string, number> = {};
          const currencyToIndicators: Record<string, string[]> = {};

          for (const indicator of indicators) {
            // Use parsed_currency, default to "none" if no currency detected
            const currency = indicator.parsed_currency || "none";

            currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;

            if (!currencyToIndicators[currency]) {
              currencyToIndicators[currency] = [];
            }
            currencyToIndicators[currency].push(indicator.indicator_id);
          }

          // Find consensus value (most common currency)
          let consensusValue = "";
          let maxCount = 0;

          for (const [currency, count] of Object.entries(currencyCounts)) {
            if (count > maxCount) {
              maxCount = count;
              consensusValue = currency;
            }
          }

          const consensusPercentage = maxCount / indicators.length;
          const hasStrongConsensus = consensusPercentage >= consensus_threshold;

          // Identify outliers (indicators not using consensus currency)
          const outliers: Array<{
            indicator_id: string;
            value: string;
            deviation_percentage: number;
            source_name?: string;
            country?: string;
            region?: string;
          }> = [];

          for (const [currency, indicatorIds] of Object.entries(
            currencyToIndicators
          )) {
            if (currency !== consensusValue) {
              const valuePercentage =
                currencyCounts[currency] / indicators.length;
              const deviation = consensusPercentage - valuePercentage;

              for (const indicatorId of indicatorIds) {
                const metadata = indicators.find(
                  (i) => i.indicator_id === indicatorId
                );
                outliers.push({
                  indicator_id: indicatorId,
                  value: currency,
                  deviation_percentage: deviation,
                  source_name: metadata?.source_name,
                  country: metadata?.country,
                  region: metadata?.region,
                });
              }
            }
          }

          const consensusResult: ConsensusResult = {
            dimension: "currency",
            consensus_value: consensusValue,
            consensus_percentage: consensusPercentage,
            total_indicators: indicators.length,
            value_distribution: currencyCounts,
            outliers,
            has_strong_consensus: hasStrongConsensus,
          };

          return consensusResult;
        });

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        ctx.console.info("Currency consensus detection complete", {
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
        ctx.console.error("Currency consensus detection failed", {
          indicator_name,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  },
});

export default currencyConsensusDetectorService;
