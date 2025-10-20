/**
 * Final Review Service (Stage 6)
 * Applies corrections to incorrect fields flagged by boolean review
 */

import * as restate from "@restatedev/restate-sdk";
import { TerminalError } from "@restatedev/restate-sdk";
import { createLLMClient, getLLMConfig } from "../llm/clients.ts";
import {
  createFinalReviewPrompt,
  finalReviewSchema,
} from "../prompts/final-review.ts";
import { DatabaseRepository } from "../db/repository.ts";

interface FinalReviewInput {
  indicator_id: string;
  incorrect_fields: string[];
  review_reasoning: string;
  current_values: Record<string, unknown>;
  llm_provider?: "local" | "openai" | "anthropic";
}

const finalReviewService = restate.service({
  name: "final-review",
  handlers: {
    review: async (ctx: restate.Context, input: FinalReviewInput) => {
      const {
        indicator_id,
        incorrect_fields,
        review_reasoning,
        current_values,
        llm_provider = "openai",
      } = input;

      const startTime = Date.now();

      ctx.console.info("Final review", {
        indicator_id,
        incorrect_fields_count: incorrect_fields.length,
        provider: llm_provider,
      });

      try {
        await ctx.run("log-start", async () => {
          const repo = new DatabaseRepository();
          await repo.logProcessing({
            indicator_id,
            stage: "final-review",
            status: "started",
          });
        });

        // Get LLM configuration
        const llmConfig = getLLMConfig("final-review", llm_provider);
        const llmClient = createLLMClient(llmConfig);

        // Create prompt
        const { systemPrompt, userPrompt } = createFinalReviewPrompt({
          incorrectFields: incorrect_fields,
          reviewReasoning: review_reasoning,
          currentValues: current_values,
        });

        // Generate final review
        const finalReviewResult = await ctx.run(
          "llm-final-review",
          async () => {
            try {
              return await llmClient.generateObject({
                systemPrompt,
                userPrompt,
                schema: finalReviewSchema,
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
          },
          {
            maxRetries: 3,
          },
        );

        // Determine model
        let model: string;
        if (llm_provider === "openai") {
          model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
        } else if (llm_provider === "anthropic") {
          model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
        } else {
          model = process.env.LM_STUDIO_MODEL || "mistral-7b-instruct-v0.3";
        }

        const result = {
          status: finalReviewResult.reviewMakesSense ? "approved" : "rejected",
          corrections: finalReviewResult.correctionsApplied,
          reason: finalReviewResult.finalReasoning,
          confidence: finalReviewResult.confidence,
          provider: llmConfig.provider,
          model,
          created_at: new Date().toISOString(),
        };

        // Save to database
        await ctx.run("save-to-db", async () => {
          const repo = new DatabaseRepository();
          await repo.saveStageResult("final-review", indicator_id, {
            ...result,
            corrections_applied: JSON.stringify(result.corrections_applied),
          });

          const processingTime = Date.now() - startTime;
          await repo.logProcessing({
            indicator_id,
            stage: "final-review",
            status: "completed",
            metadata: { processing_time_ms: processingTime },
          });
        });

        const processingTime = Date.now() - startTime;
        ctx.console.info("Final review complete", {
          indicator_id,
          review_makes_sense: finalReviewResult.reviewMakesSense,
          corrections_count:
            Object.keys(finalReviewResult.correctionsApplied).length,
          confidence: finalReviewResult.confidence,
          processing_time_ms: processingTime,
        });

        return {
          success: true,
          result,
        };
      } catch (error) {
        ctx.console.error("Final review failed", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
        });

        // Log failure
        await ctx.run("log-failure", async () => {
          const repo = new DatabaseRepository();
          await repo.logProcessing({
            indicator_id,
            stage: "final-review",
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

export default finalReviewService;
