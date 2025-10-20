/**
 * Consensus Review Service (LLM)
 * Uses LLM to validate outliers and provide standardization recommendations
 */

import * as restate from "@restatedev/restate-sdk";
import { createLLMClient, getLLMConfig } from "../llm/clients.ts";
import {
  createConsensusReviewPrompt,
  llmConsensusReviewSchema,
} from "../prompts/consensus-review.ts";
import type { ConsensusSummaryReport, LLMConsensusReview } from "../types.ts";

interface ConsensusReviewInput {
  indicator_name: string;
  summary: ConsensusSummaryReport;
  llm_provider?: "local" | "openai" | "anthropic";
}

const consensusReviewService = restate.service({
  name: "consensus-review",
  handlers: {
    review: async (ctx: restate.Context, input: ConsensusReviewInput) => {
      const { indicator_name, summary, llm_provider = "openai" } = input;

      const startTime = Date.now();

      ctx.console.info("Starting LLM consensus review", {
        indicator_name,
        provider: llm_provider,
        total_outliers: summary.total_outliers,
      });

      try {
        // Get LLM configuration
        const llmConfig = getLLMConfig("consensus-review", llm_provider);
        const llmClient = createLLMClient(llmConfig);

        // Create optimized prompt (system/user split for caching)
        const { systemPrompt, userPrompt } = createConsensusReviewPrompt({
          indicator_name,
          summary,
        });

        // Generate review
        const reviewResult = await ctx.run("llm-consensus-review", async () => {
          try {
            return await llmClient.generateObject({
              systemPrompt,
              userPrompt,
              schema: llmConsensusReviewSchema,
            });
          } catch (error: any) {
            if (
              error.name === "AI_TypeValidationError" ||
              error.name === "AI_NoObjectGeneratedError"
            ) {
              ctx.console.error("Schema validation failed", {
                indicator_name,
                error: error.message,
                llm_response: error.value || error.text,
              });
            }
            throw error;
          }
        });

        // Determine model
        let model: string;
        if (llm_provider === "openai") {
          model = process.env.OPENAI_MODEL || "gpt-5-mini";
        } else if (llm_provider === "anthropic") {
          model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
        } else {
          model = process.env.LM_STUDIO_MODEL || "mistral-7b-instruct-v0.3";
        }

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        ctx.console.info("Consensus review complete", {
          indicator_name,
          overall_assessment: reviewResult.overall_assessment,
          validated_outliers_count: reviewResult.validated_outliers.length,
          recommendations_count:
            reviewResult.standardization_recommendations.length,
          confidence: reviewResult.confidence,
          processing_time_ms: processingTime,
        });

        return {
          success: true,
          result: {
            ...reviewResult,
            provider: llm_provider,
            model,
            created_at: new Date().toISOString(),
          },
        };
      } catch (error) {
        ctx.console.error("Consensus review failed", {
          indicator_name,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  },
});

export default consensusReviewService;
