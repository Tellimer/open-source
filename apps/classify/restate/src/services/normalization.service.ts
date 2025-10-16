/**
 * Normalization Service (Stage 1)
 * Parses units to extract scale, type, and currency information
 */

import * as restate from "@restatedev/restate-sdk";
import { normalizeUnits } from "../utils/normalize.ts";
import { DatabaseRepository } from "../db/repository.ts";
import type { IndicatorInput } from "../types.ts";

const normalizationService = restate.service({
  name: "normalization",
  handlers: {
    normalize: async (
      ctx: restate.Context,
      input: IndicatorInput & { llm_provider?: string },
    ) => {
      const { indicator_id, units } = input;
      const startTime = Date.now();

      ctx.console.info("Normalizing indicator", {
        indicator_id,
        name: input.name,
      });

      try {
        // Normalize units (pure CPU operation)
        const normalized = normalizeUnits(units || "");

        const result = {
          original_units: normalized.originalUnits,
          parsed_scale: normalized.parsedScale,
          normalized_scale: normalized.normalizedScale,
          parsed_unit_type: normalized.parsedUnitType,
          parsed_currency: normalized.parsedCurrency,
          parsing_confidence: normalized.parsingConfidence,
          matched_pattern: normalized.matchedPattern,
          created_at: new Date().toISOString(),
        };

        // Save to database (using Restate's run for side effects)
        await ctx.run("save-to-db", async () => {
          const repo = new DatabaseRepository();

          await repo.logProcessing({
            indicator_id,
            stage: "normalize",
            status: "started",
          });

          await repo.saveStageResult("normalize", indicator_id, {
            original_units: result.original_units,
            parsed_scale: result.parsed_scale,
            normalized_scale: result.normalized_scale,
            parsed_unit_type: result.parsed_unit_type,
            parsed_currency: result.parsed_currency,
            parsing_confidence: result.parsing_confidence,
            created_at: result.created_at,
          });

          const processingTime = Date.now() - startTime;
          await repo.logProcessing({
            indicator_id,
            stage: "normalize",
            status: "completed",
            metadata: { processing_time_ms: processingTime },
          });
        });

        const processingTime = Date.now() - startTime;
        ctx.console.info("Normalization complete", {
          indicator_id,
          parsed_type: normalized.parsedUnitType,
          confidence: normalized.parsingConfidence,
          processing_time_ms: processingTime,
        });

        return {
          success: true,
          result,
        };
      } catch (error) {
        ctx.console.error("Normalization failed", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
        });

        // Log failure to database
        await ctx.run("log-failure", async () => {
          const repo = new DatabaseRepository();
          await repo.logProcessing({
            indicator_id,
            stage: "normalize",
            status: "failed",
            error_message: error instanceof Error
              ? error.message
              : String(error),
          });
        });

        throw error;
      }
    },
  },
});

export default normalizationService;
