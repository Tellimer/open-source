/**
 * Event Step: Infer Time Basis and Detect Cumulative Pattern
 * Stage 2: Combined time inference and cumulative detection (run in parallel)
 */

import { EventConfig } from "motia";
import { z } from "zod";
import {
  createLLMClient,
  createTimeInferencePrompt,
  getLLMConfig,
  inferTimeRuleBased,
  timeInferenceSchema,
} from "../../src/services/classify/index.ts";
import { detectCumulativePattern } from "../../src/utils/cumulative-detector.ts";
import { getDatabase } from "../../src/db/client.ts";
import { createRepository } from "../../src/db/index.ts";

export const config: EventConfig = {
  type: "event",
  name: "InferTimeBasisAndCumulativePattern",
  description:
    "Stage 2: Infer reporting frequency and time basis (LLM or rule-based), and detect YTD/cumulative patterns in parallel",
  flows: ["classify-indicator"],
  subscribes: ["indicator.infer-time"],
  emits: ["indicator.time-cumulative-complete"],
  input: z.object({
    indicator_id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    units: z.string().optional(),
    periodicity: z.string().optional(),
    sample_values: z
      .array(
        z.object({
          date: z.string(),
          value: z.number(),
        }),
      )
      .optional(),
    parsed_scale: z.string(),
    parsed_unit_type: z.string(),
    parsed_currency: z.string().nullable(),
    scale: z.string(),
    is_currency: z.boolean(),
    detected_currency: z.string().nullable(),
    source_name: z.string().optional(),
    long_name: z.string().optional(),
    category_group: z.string().optional(),
    dataset: z.string().optional(),
    aggregation_method: z.string().optional(),
    topic: z.string().optional(),
    currency_code: z.string().optional(),
    llm_provider: z
      .enum(["local", "openai", "anthropic"])
      .optional()
      .default("local"),
  }),
};

export const handler = async (input: any, { state, emit, logger }: any) => {
  const {
    indicator_id,
    name,
    description,
    units,
    periodicity,
    sample_values,
    parsed_scale,
    parsed_unit_type,
    source_name,
    long_name,
    category_group,
    dataset,
    aggregation_method,
    scale,
    topic,
    currency_code,
    llm_provider = "local",
  } = input;

  const startTime = Date.now();
  logger.info("Starting parallel time inference and cumulative detection", {
    indicator_id,
    name,
    provider: llm_provider,
  });

  // Run time inference and cumulative detection in parallel with Promise.all
  const [timeResult, cumulativeResult] = await Promise.all([
    // TIME INFERENCE
    (async () => {
      const timeStartTime = Date.now();
      try {
        const repo = createRepository(getDatabase());
        await repo.logProcessing({
          indicator_id,
          stage: "time",
          status: "started",
        });

        let timeInference: any;

        if (llm_provider !== "local") {
          // LLM-based time inference
          let timeSeriesFrequency = "unknown";
          if (sample_values && sample_values.length >= 2) {
            timeSeriesFrequency = `${sample_values.length} data points`;
          }

          const llmConfig = getLLMConfig("time-inference", llm_provider);
          const llmClient = createLLMClient(llmConfig);

          const prompt = createTimeInferencePrompt({
            name,
            units,
            periodicity,
            timeSeriesFrequency,
          });

          timeInference = await llmClient.generateObject({
            prompt,
            schema: timeInferenceSchema,
          });
        } else {
          // Rule-based time inference
          timeInference = inferTimeRuleBased({
            name,
            units,
            periodicity,
            parsedUnitType: parsed_unit_type,
            sampleValues: sample_values,
          });
        }

        // Determine provider and model
        let provider: string;
        let model: string;
        if (llm_provider === "local") {
          provider = "rule-based";
          model = "deterministic";
        } else {
          const llmConfig = getLLMConfig("time-inference", llm_provider);
          provider = llmConfig.provider;
          if (llm_provider === "openai") {
            model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
          } else if (llm_provider === "anthropic") {
            model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
          } else {
            model = llmConfig.model || "unknown";
          }
        }

        const result = {
          indicator_id,
          ...timeInference,
          provider,
          model,
          created_at: new Date().toISOString(),
        };

        // Save to state
        await state.set("time-inferences", indicator_id, result);

        // Save to SQLite
        await repo.saveStageResult("time", indicator_id, {
          reporting_frequency: timeInference.reportingFrequency,
          time_basis: timeInference.timeBasis,
          confidence: timeInference.confidence,
          reasoning: timeInference.reasoning,
          source_used: timeInference.sourceUsed,
          provider: result.provider,
          model: result.model,
          created_at: result.created_at,
        });

        const processingTime = Date.now() - timeStartTime;
        await repo.logProcessing({
          indicator_id,
          stage: "time",
          status: "completed",
          metadata: { processing_time_ms: processingTime },
        });

        logger.info("Time inference complete", {
          indicator_id,
          time_basis: timeInference.timeBasis,
          confidence: timeInference.confidence,
          processing_time_ms: processingTime,
        });

        return timeInference;
      } catch (error) {
        const processingTime = Date.now() - timeStartTime;
        logger.error("Time inference failed, using fallback", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
          processing_time_ms: processingTime,
        });

        // Log error to database
        try {
          const repo = createRepository(getDatabase());
          await repo.logProcessing({
            indicator_id,
            stage: "time",
            status: "failed",
            error_message: error instanceof Error
              ? error.message
              : String(error),
            metadata: { processing_time_ms: processingTime },
          });
        } catch (dbError) {
          logger.error("Failed to log error to database", { dbError });
        }

        // Return fallback result using rules
        const fallback = inferTimeRuleBased({
          name,
          units,
          periodicity,
          parsedUnitType: parsed_unit_type,
          sampleValues: sample_values,
        });
        fallback.reasoning =
          `Failed during processing, using rule-based fallback: ${
            error instanceof Error ? error.message : String(error)
          }`;
        return fallback;
      }
    })(),

    // CUMULATIVE DETECTION
    (async () => {
      const cumulativeStartTime = Date.now();
      try {
        const repo = createRepository(getDatabase());

        await repo.logProcessing({
          indicator_id,
          stage: "cumulative-detection",
          status: "started",
        });

        const detectionResult = detectCumulativePattern(sample_values);

        const result = {
          is_cumulative: detectionResult.is_cumulative,
          pattern_type: detectionResult.pattern_type,
          confidence: detectionResult.confidence,
        };

        // Save to database
        await repo.saveStageResult("cumulative-detection", indicator_id, {
          is_cumulative: detectionResult.is_cumulative ? 1 : 0,
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

        logger.info("Cumulative detection complete", {
          indicator_id,
          is_cumulative: detectionResult.is_cumulative,
          pattern_type: detectionResult.pattern_type,
          processing_time_ms: processingTime,
        });

        return result;
      } catch (error) {
        const processingTime = Date.now() - cumulativeStartTime;
        logger.error("Cumulative detection failed, using fallback", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
          processing_time_ms: processingTime,
        });

        // Use fallback
        return {
          is_cumulative: false,
          pattern_type: "unknown",
          confidence: 0,
        };
      }
    })(),
  ]);

  const totalTime = Date.now() - startTime;
  logger.info("Time and cumulative detection complete (parallel)", {
    indicator_id,
    time_basis: timeResult.timeBasis,
    is_cumulative: cumulativeResult.is_cumulative,
    total_time_ms: totalTime,
  });

  // Emit combined result to currency router
  await emit({
    topic: "indicator.time-cumulative-complete",
    data: {
      indicator_id,
      name,
      description,
      time_basis: timeResult.timeBasis,
      reporting_frequency: timeResult.reportingFrequency,
      scale: input.scale,
      is_currency: input.is_currency,
      detected_currency: input.detected_currency,
      parsed_unit_type: parsed_unit_type,
      sample_values,
      // Pass through contextual fields
      source_name,
      long_name,
      category_group,
      dataset,
      aggregation_method,
      topic,
      currency_code,
      llm_provider,
      // Add cumulative detection results
      is_cumulative: cumulativeResult.is_cumulative,
      cumulative_pattern_type: cumulativeResult.pattern_type,
      cumulative_confidence: cumulativeResult.confidence,
    },
  });
};
