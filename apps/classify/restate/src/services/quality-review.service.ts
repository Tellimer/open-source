/**
 * Quality Review Service (LLM)
 * Uses LLM to validate flagged issues and provide comprehensive recommendations
 */

import * as restate from "@restatedev/restate-sdk";
import { createLLMClient, getLLMConfig } from "../llm/clients.ts";
import {
  createQualityReviewPrompt,
  llmQualityReviewSchema,
} from "../prompts/quality-review.ts";
import type { ConsolidatedQualityReport, LLMQualityReview } from "../types.ts";

interface QualityReviewInput {
  indicator_id: string;
  name: string;
  consolidated_report: ConsolidatedQualityReport;
  time_series_summary: {
    count: number;
    date_range: { start: string; end: string };
    mean: number;
    std_dev: number;
  };
  llm_provider?: "local" | "openai" | "anthropic";
}

const qualityReviewService = restate.service({
  name: "quality-review",
  handlers: {
    review: async (ctx: restate.Context, input: QualityReviewInput) => {
      const {
        indicator_id,
        name,
        consolidated_report,
        time_series_summary,
        llm_provider = "openai",
      } = input;

      const startTime = Date.now();

      ctx.console.info("Starting LLM quality review", {
        indicator_id,
        name,
        provider: llm_provider,
        flagged_count: consolidated_report.flagged_count,
        critical_count: consolidated_report.critical_count,
      });

      try {
        // Get LLM configuration
        const llmConfig = getLLMConfig("quality-review", llm_provider);
        const llmClient = createLLMClient(llmConfig);

        // Create optimized prompt (system/user split for caching)
        const { systemPrompt, userPrompt } = createQualityReviewPrompt({
          name,
          consolidated_report,
          time_series_summary,
        });

        // Generate review
        const reviewResult = await ctx.run("llm-quality-review", async () => {
          try {
            return await llmClient.generateObject({
              systemPrompt,
              userPrompt,
              schema: llmQualityReviewSchema,
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
        });

        // Determine model
        let model: string;
        if (llm_provider === "openai") {
          model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
        } else if (llm_provider === "anthropic") {
          model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
        } else {
          model = process.env.LM_STUDIO_MODEL || "mistral-7b-instruct-v0.3";
        }

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        ctx.console.info("Quality review complete", {
          indicator_id,
          overall_assessment: reviewResult.overall_assessment,
          usability_verdict: reviewResult.usability_verdict,
          validated_issues_count: reviewResult.validated_issues.length,
          recommended_actions_count: reviewResult.recommended_actions.length,
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
        ctx.console.error("Quality review failed", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  },
});

export default qualityReviewService;
