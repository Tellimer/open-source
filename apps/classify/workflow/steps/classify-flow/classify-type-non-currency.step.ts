/**
 * Event Step: Classify Type (Non-Currency Branch)
 * Stage 6b: Classify indicator type for non-currency indicators
 */

import { EventConfig } from "motia";
import { z } from "zod";
import {
  createLLMClient,
  createTypeClassificationNonCurrencyPrompt,
  getLLMConfig,
  typeClassificationNonCurrencySchema,
} from "../../src/services/classify/index.ts";
import { getDatabase } from "../../src/db/client.ts";
import { createRepository } from "../../src/db/index.ts";

export const config: EventConfig = {
  type: "event",
  name: "ClassifyTypeNonCurrency",
  description: "Stage 6b: Classify type for non-currency indicators",
  flows: ["classify-indicator"],
  subscribes: ["indicator.classify-type-non-currency"],
  emits: ["indicator.complete"],
  input: z.object({
    indicator_id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    time_basis: z.string(),
    reporting_frequency: z.string(),
    scale: z.string(),
    is_currency: z.boolean(),
    family: z.string(),
    parsed_unit_type: z.string().optional(),
    // Cumulative detection results
    is_cumulative: z.boolean().optional(),
    cumulative_pattern_type: z.string().optional(),
    cumulative_confidence: z.number().optional(),
    sample_values: z
      .array(
        z.object({
          date: z.string(),
          value: z.number(),
        }),
      )
      .optional(),
    source_name: z.string().optional(),
    long_name: z.string().optional(),
    category_group: z.string().optional(),
    dataset: z.string().optional(),
    topic: z.string().optional(),
    aggregation_method: z.string().optional(),
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
    time_basis,
    reporting_frequency,
    scale,
    is_currency,
    family,
    parsed_unit_type,
    is_cumulative,
    cumulative_pattern_type,
    cumulative_confidence,
    sample_values,
    source_name,
    long_name,
    category_group,
    dataset,
    topic,
    aggregation_method,
    currency_code,
    llm_provider = "local",
  } = input;

  logger.info("Classifying type (non-currency branch)", {
    indicator_id,
    name,
    parsed_unit_type,
  });

  // Create LLM client
  const llmConfig = getLLMConfig("type-classification", llm_provider);
  const llmClient = createLLMClient(llmConfig);

  // Generate prompt with full context
  const prompt = createTypeClassificationNonCurrencyPrompt({
    name,
    description,
    family,
    timeBasis: time_basis,
    scale,
    parsedUnitType: parsed_unit_type,
    isCumulative: is_cumulative,
    cumulativePatternType: cumulative_pattern_type,
    cumulativeConfidence: cumulative_confidence,
    sampleValues: sample_values,
    sourceName: source_name,
    longName: long_name,
    categoryGroup: category_group,
    dataset,
    topic,
    aggregationMethod: aggregation_method,
    currencyCode: currency_code,
  });

  // Call LLM
  const typeResult = await llmClient.generateObject({
    prompt,
    schema: typeClassificationNonCurrencySchema,
  });

  // Save to state
  await state.set("type-classifications", indicator_id, {
    indicator_id,
    ...typeResult,
    branch: "non-currency",
    created_at: new Date().toISOString(),
  });

  // Save to database (best-effort)
  try {
    const repo = createRepository(getDatabase());
    await repo.saveStageResult("type", indicator_id, {
      indicator_type: typeResult.indicatorType,
      temporal_aggregation: typeResult.temporalAggregation,
      heat_map_orientation: typeResult.heatMapOrientation,
      confidence: typeResult.confidence,
      reasoning: typeResult.reasoning,
      created_at: new Date().toISOString(),
    });
  } catch (dbError) {
    logger.warn("Type save skipped (transient DB error)", {
      indicator_id,
      error: dbError instanceof Error ? dbError.message : String(dbError),
    });
  }

  logger.info("Type classification complete (non-currency)", {
    indicator_id,
    type: typeResult.indicatorType,
    confidence: typeResult.confidence,
  });

  // Emit directly to complete (skip boolean-review and final-review)
  await emit({
    topic: "indicator.complete",
    data: {
      indicator_id,
      name,
      review_status: "passed",
      llm_provider,
    },
  });
};
