/**
 * Boolean Review Service (Stage 5)
 * Reviews classification and flags incorrect fields
 */

import * as restate from "@restatedev/restate-sdk";
import { createLLMClient, getLLMConfig } from "../llm/clients.ts";
import {
  booleanReviewSchema,
  createBooleanReviewPrompt,
} from "../prompts/boolean-review.ts";
import { DatabaseRepository } from "../db/repository.ts";

interface BooleanReviewInput {
  indicator_id: string;
  name: string;
  time_basis: string;
  normalized_scale: string;
  is_currency: boolean;
  family: string;
  indicator_type: string;
  temporal_aggregation: string;
  llm_provider?: "local" | "openai" | "anthropic";
}

const booleanReviewService = restate.service({
  name: "boolean-review",
  handlers: {
    review: async (ctx: restate.Context, input: BooleanReviewInput) => {
      const {
        indicator_id,
        name,
        time_basis,
        normalized_scale,
        is_currency,
        family,
        indicator_type,
        temporal_aggregation,
        llm_provider = "openai",
      } = input;

      const startTime = Date.now();

      ctx.console.info("Reviewing classification", {
        indicator_id,
        name,
        provider: llm_provider,
      });

      try {
        await ctx.run("log-start", async () => {
          const repo = new DatabaseRepository();
          await repo.logProcessing({
            indicator_id,
            stage: "boolean-review",
            status: "started",
          });
        });

        // Get LLM configuration
        const llmConfig = getLLMConfig("boolean-review", llm_provider);
        const llmClient = createLLMClient(llmConfig);

        // Create prompt
        const { systemPrompt, userPrompt } = createBooleanReviewPrompt({
          name,
          timeBasis: time_basis,
          scale: normalized_scale,
          isCurrency: is_currency,
          family,
          type: indicator_type,
          temporalAgg: temporal_aggregation,
        });

        // Generate review
        const reviewResult = await ctx.run("llm-boolean-review", async () => {
          try {
            return await llmClient.generateObject({
              systemPrompt,
              userPrompt,
              schema: booleanReviewSchema,
            });
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
        }, {
          maxRetries: 3,
        });

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
          passed: reviewResult.isCorrect,
          fields_wrong: reviewResult.incorrectFields,
          reason: reviewResult.reasoning,
          confidence: reviewResult.confidence,
          provider: llmConfig.provider,
          model,
          created_at: new Date().toISOString(),
        };

        // Save to database
        await ctx.run("save-to-db", async () => {
          const repo = new DatabaseRepository();
          await repo.saveStageResult("boolean-review", indicator_id, {
            ...result,
            incorrect_fields: JSON.stringify(result.incorrect_fields),
          });

          const processingTime = Date.now() - startTime;
          await repo.logProcessing({
            indicator_id,
            stage: "boolean-review",
            status: "completed",
            metadata: { processing_time_ms: processingTime },
          });
        });

        const processingTime = Date.now() - startTime;
        ctx.console.info("Boolean review complete", {
          indicator_id,
          is_correct: reviewResult.isCorrect,
          incorrect_fields_count: reviewResult.incorrectFields.length,
          confidence: reviewResult.confidence,
          processing_time_ms: processingTime,
        });

        return {
          success: true,
          result,
        };
      } catch (error) {
        ctx.console.error("Boolean review failed", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
        });

        // Log failure
        await ctx.run("log-failure", async () => {
          const repo = new DatabaseRepository();
          await repo.logProcessing({
            indicator_id,
            stage: "boolean-review",
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

export default booleanReviewService;
