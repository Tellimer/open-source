/**
 * Time Inference Service (Stage 2)
 * Determines reporting frequency and time basis (per-period, point-in-time, cumulative)
 * Also detects cumulative patterns in time series data
 */

import * as restate from "@restatedev/restate-sdk";
import { TerminalError } from "@restatedev/restate-sdk";
import { createLLMClient, getLLMConfig } from "../llm/clients.ts";
import {
  createTimeInferencePrompt,
  timeInferenceSchema,
} from "../prompts/time.ts";
import { inferTimeRuleBased } from "../utils/rules.ts";
import { detectCumulativePattern } from "../utils/cumulative-detector.ts";
import { DatabaseRepository } from "../db/repository.ts";
import type { IndicatorInput } from "../types.ts";

interface TimeInferenceInput extends IndicatorInput {
  parsed_scale: string;
  parsed_unit_type: string;
  parsed_currency: string | null;
  normalized_scale: string;
  llm_provider?: "local" | "openai" | "anthropic";
}

const timeInferenceService = restate.service({
  name: "time-inference",
  handlers: {
    infer: async (ctx: restate.Context, input: TimeInferenceInput) => {
      const {
        indicator_id,
        name,
        units,
        periodicity,
        sample_values,
        parsed_unit_type,
        llm_provider = "local",
      } = input;

      const startTime = Date.now();

      ctx.console.info(
        "Starting parallel time inference and cumulative detection",
        {
          indicator_id,
          name,
          provider: llm_provider,
        },
      );

      try {
        // Run time inference and cumulative detection in parallel
        const [timeResult, cumulativeResult] = await Promise.all([
          // TIME INFERENCE
          (async () => {
            const timeStartTime = Date.now();

            await ctx.run("log-time-start", async () => {
              const repo = new DatabaseRepository();
              await repo.logProcessing({
                indicator_id,
                stage: "time",
                status: "started",
              });
            });

            let timeInference: any;
            let provider: string;
            let model: string;

            if (llm_provider !== "local") {
              // LLM-based time inference
              const timeSeriesFrequency =
                sample_values && sample_values.length >= 2
                  ? `${sample_values.length} data points`
                  : "unknown";

              const llmConfig = getLLMConfig("time-inference", llm_provider);
              const llmClient = createLLMClient(llmConfig);

              const { systemPrompt, userPrompt } = createTimeInferencePrompt({
                name,
                units,
                periodicity,
                timeSeriesFrequency,
              });

              timeInference = await ctx.run("llm-time-inference", async () => {
                try {
                  return await llmClient.generateObject({
                    systemPrompt,
                    userPrompt,
                    schema: timeInferenceSchema,
                  });
                } catch (error: any) {
                  // Log schema validation errors with context
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
                  throw error; // Let Restate retry
                }
              }, {
                maxRetries: 3, // Retry up to 3 times for LLM mistakes
              });

              provider = llmConfig.provider;
              if (llm_provider === "openai") {
                model = Bun.env.OPENAI_MODEL || "gpt-5-mini";
              } else if (llm_provider === "anthropic") {
                model = Bun.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
              } else {
                model = llmConfig.model || "unknown";
              }
            } else {
              // Rule-based time inference
              timeInference = inferTimeRuleBased({
                name,
                units,
                periodicity,
                parsedUnitType: parsed_unit_type as any,
                sampleValues: sample_values,
              });

              provider = "rule-based";
              model = "deterministic";
            }

            const result = {
              reporting_frequency: timeInference.reportingFrequency,
              time_basis: timeInference.timeBasis,
              confidence: timeInference.confidence,
              reasoning: timeInference.reasoning,
              source_used: timeInference.sourceUsed,
              provider,
              model,
              created_at: new Date().toISOString(),
            };

            // Save to database
            await ctx.run("save-time-to-db", async () => {
              const repo = new DatabaseRepository();
              await repo.saveStageResult("time", indicator_id, result);

              const processingTime = Date.now() - timeStartTime;
              await repo.logProcessing({
                indicator_id,
                stage: "time",
                status: "completed",
                metadata: { processing_time_ms: processingTime },
              });
            });

            ctx.console.info("Time inference complete", {
              indicator_id,
              time_basis: timeInference.timeBasis,
              confidence: timeInference.confidence,
              processing_time_ms: Date.now() - timeStartTime,
            });

            return result;
          })(),

          // CUMULATIVE DETECTION
          (async () => {
            const cumulativeStartTime = Date.now();

            await ctx.run("log-cumulative-start", async () => {
              const repo = new DatabaseRepository();
              await repo.logProcessing({
                indicator_id,
                stage: "cumulative-detection",
                status: "started",
              });
            });

            const detectionResult = detectCumulativePattern(sample_values);

            const result = {
              is_cumulative: detectionResult.is_cumulative,
              pattern_type: detectionResult.pattern_type,
              confidence: detectionResult.confidence,
              evidence: detectionResult.evidence,
              reasoning: detectionResult.reasoning,
            };

            // Save to database
            await ctx.run("save-cumulative-to-db", async () => {
              const repo = new DatabaseRepository();
              await repo.saveStageResult("cumulative-detection", indicator_id, {
                is_cumulative: detectionResult.is_cumulative,
                pattern_type: detectionResult.pattern_type,
                confidence: detectionResult.confidence,
                evidence: JSON.stringify(detectionResult.evidence),
                reasoning: detectionResult.reasoning,
                created_at: new Date().toISOString(),
              });

              const processingTime = Date.now() - cumulativeStartTime;
              await repo.logProcessing({
                indicator_id,
                stage: "cumulative-detection",
                status: "completed",
                metadata: { processing_time_ms: processingTime },
              });
            });

            ctx.console.info("Cumulative detection complete", {
              indicator_id,
              is_cumulative: detectionResult.is_cumulative,
              pattern_type: detectionResult.pattern_type,
              processing_time_ms: Date.now() - cumulativeStartTime,
            });

            return result;
          })(),
        ]);

        const totalTime = Date.now() - startTime;
        ctx.console.info("Time and cumulative detection complete (parallel)", {
          indicator_id,
          time_basis: timeResult.time_basis,
          is_cumulative: cumulativeResult.is_cumulative,
          total_time_ms: totalTime,
        });

        return {
          success: true,
          timeResult,
          cumulativeResult,
        };
      } catch (error) {
        ctx.console.error("Time inference or cumulative detection failed", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
        });

        // Log failure
        await ctx.run("log-failure", async () => {
          const repo = new DatabaseRepository();
          await repo.logProcessing({
            indicator_id,
            stage: "time",
            status: "failed",
            error_message: error instanceof Error
              ? error.message
              : String(error),
          });
        });

        // Return fallback using rule-based inference
        const fallback = inferTimeRuleBased({
          name,
          units,
          periodicity,
          parsedUnitType: parsed_unit_type as any,
          sampleValues: sample_values,
        });

        const cumulativeFallback = detectCumulativePattern(sample_values);

        return {
          success: false,
          timeResult: {
            ...fallback,
            provider: "rule-based-fallback",
            model: "deterministic",
            created_at: new Date().toISOString(),
          },
          cumulativeResult: {
            is_cumulative: cumulativeFallback.is_cumulative,
            pattern_type: cumulativeFallback.pattern_type,
            confidence: cumulativeFallback.confidence,
            evidence: cumulativeFallback.evidence,
            reasoning: cumulativeFallback.reasoning,
          },
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  },
});

export default timeInferenceService;
