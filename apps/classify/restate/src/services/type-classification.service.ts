/**
 * Type Classification Service (Stage 4)
 * Classifies indicator into specific type within its family
 */

import * as restate from "@restatedev/restate-sdk";
import { TerminalError } from "@restatedev/restate-sdk";
import { createLLMClient, getLLMConfig } from "../llm/clients.ts";
import {
  createTypeClassificationCurrencyPrompt,
  createTypeClassificationNonCurrencyPrompt,
  typeClassificationCurrencySchema,
  typeClassificationNonCurrencySchema,
} from "../prompts/index.ts";
import { DatabaseRepository } from "../db/repository.ts";
import type { IndicatorInput } from "../types.ts";

interface TypeClassificationInput extends IndicatorInput {
  family: string;
  time_basis: string;
  normalized_scale: string;
  is_currency: boolean;
  detected_currency?: string | null;
  parsed_unit_type?: string;
  is_cumulative?: boolean;
  cumulative_pattern_type?: string;
  llm_provider?: "local" | "openai" | "anthropic";
}

const typeClassificationService = restate.service({
  name: "type-classification",
  handlers: {
    classify: async (ctx: restate.Context, input: TypeClassificationInput) => {
      const {
        indicator_id,
        name,
        family,
        time_basis,
        normalized_scale,
        sample_values,
        llm_provider = "openai",
      } = input;

      const startTime = Date.now();

      ctx.console.info("Classifying type", {
        indicator_id,
        name,
        family,
        provider: llm_provider,
      });

      try {
        await ctx.run("log-start", async () => {
          const repo = new DatabaseRepository();
          await repo.logProcessing({
            indicator_id,
            stage: "type",
            status: "started",
          });
        });

        // Get LLM configuration
        const llmConfig = getLLMConfig("type-classification", llm_provider);
        const llmClient = createLLMClient(llmConfig);

        // Generate type classification with currency-specific routing
        const typeResult = await ctx.run(
          "llm-type-classification",
          async () => {
            try {
              if (input.is_currency) {
                // Currency-specific prompt with YTD detection integration
                const { systemPrompt, userPrompt } = createTypeClassificationCurrencyPrompt({
                  name,
                  family,
                  timeBasis: time_basis,
                  scale: normalized_scale,
                  detectedCurrency: input.detected_currency,
                  isCumulative: input.is_cumulative,
                  cumulativePatternType: input.cumulative_pattern_type,
                  sampleValues: sample_values,
                });
                return await llmClient.generateObject({
                  systemPrompt,
                  userPrompt,
                  schema: typeClassificationCurrencySchema,
                });
              } else {
                // Non-currency-specific prompt with extensive type guidance
                const { systemPrompt, userPrompt } = createTypeClassificationNonCurrencyPrompt({
                  name,
                  family,
                  timeBasis: time_basis,
                  scale: normalized_scale,
                  parsedUnitType: input.parsed_unit_type,
                  isCumulative: input.is_cumulative,
                  cumulativePatternType: input.cumulative_pattern_type,
                  sampleValues: sample_values,
                });
                return await llmClient.generateObject({
                  systemPrompt,
                  userPrompt,
                  schema: typeClassificationNonCurrencySchema,
                });
              }
            } catch (error: any) {
              if (
                error.name === "AI_TypeValidationError" ||
                error.name === "AI_NoObjectGeneratedError"
              ) {
                ctx.console.error("Schema validation failed", {
                  indicator_id,
                  error: error.message,
                  llm_response: error.value || error.text,
                });
              }
              throw error;
            }
          },
          {
            maxRetries: 3,
          },
        );

        // Determine model
        let model: string;
        if (llm_provider === "openai") {
          model = Bun.env.OPENAI_MODEL || "gpt-5-mini";
        } else if (llm_provider === "anthropic") {
          model = Bun.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
        } else {
          model = Bun.env.LM_STUDIO_MODEL || "mistral-7b-instruct-v0.3";
        }

        const result = {
          indicator_type: typeResult.indicatorType,
          temporal_aggregation: typeResult.temporalAggregation,
          heat_map_orientation: typeResult.heatMapOrientation,
          confidence: typeResult.confidence,
          reasoning: typeResult.reasoning,
          provider: llmConfig.provider,
          model,
          created_at: new Date().toISOString(),
        };

        // Save to database
        await ctx.run("save-to-db", async () => {
          const repo = new DatabaseRepository();
          await repo.saveStageResult("type", indicator_id, result);

          const processingTime = Date.now() - startTime;
          await repo.logProcessing({
            indicator_id,
            stage: "type",
            status: "completed",
            metadata: { processing_time_ms: processingTime },
          });
        });

        const processingTime = Date.now() - startTime;
        ctx.console.info("Type classification complete", {
          indicator_id,
          type: typeResult.indicatorType,
          temporal_aggregation: typeResult.temporalAggregation,
          confidence: typeResult.confidence,
          processing_time_ms: processingTime,
        });

        return {
          success: true,
          result,
        };
      } catch (error) {
        ctx.console.error("Type classification failed", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
        });

        // Log failure
        await ctx.run("log-failure", async () => {
          const repo = new DatabaseRepository();
          await repo.logProcessing({
            indicator_id,
            stage: "type",
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

export default typeClassificationService;
