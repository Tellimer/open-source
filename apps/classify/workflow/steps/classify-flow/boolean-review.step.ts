/**
 * Event Step: Boolean Review
 * Stage 7: Review classification for correctness
 */

import { EventConfig } from "motia";
import { z } from "zod";
import {
  booleanReviewSchema,
  createBooleanReviewPrompt,
  createLLMClient,
  getLLMConfig,
} from "../../src/services/classify/index.ts";

export const config: EventConfig = {
  type: "event",
  name: "BooleanReview",
  description: "Stage 7: Review classification for correctness",
  flows: ["classify-indicator"],
  subscribes: ["indicator.boolean-review"],
  emits: ["indicator.final-review", "indicator.complete"],
  input: z.object({
    indicator_id: z.string(),
    name: z.string(),
    time_basis: z.string(),
    reporting_frequency: z.string(),
    scale: z.string(),
    is_currency: z.boolean(),
    family: z.string(),
    indicator_type: z.string(),
    temporal_aggregation: z.string(),
    llm_provider: z.enum(["local", "openai", "anthropic"]).optional().default("local"),
  }),
};

export const handler = async (input: any, { state, emit, logger }: any) => {
  const {
    indicator_id,
    name,
    time_basis,
    scale,
    is_currency,
    family,
    indicator_type,
    temporal_aggregation,
    llm_provider = "local",
  } = input;

  logger.info("Performing boolean review", { indicator_id, name });

  // Create LLM client
  const llmConfig = getLLMConfig("boolean-review", llm_provider);
  const llmClient = createLLMClient(llmConfig);

  // Generate prompt
  const prompt = createBooleanReviewPrompt({
    name,
    timeBasis: time_basis,
    scale,
    isCurrency: is_currency,
    family,
    type: indicator_type,
    temporalAgg: temporal_aggregation,
  });

  // Call LLM
  const reviewResult = await llmClient.generateObject({
    prompt,
    schema: booleanReviewSchema,
  });

  // Save to state
  await state.set("boolean-reviews", indicator_id, {
    indicator_id,
    ...reviewResult,
    created_at: new Date().toISOString(),
  });

  logger.info("Boolean review complete", {
    indicator_id,
    is_correct: reviewResult.isCorrect,
    confidence: reviewResult.confidence,
  });

  // If incorrect, trigger final review
  if (!reviewResult.isCorrect && reviewResult.incorrectFields.length > 0) {
    await emit({
      topic: "indicator.final-review",
      data: {
        indicator_id,
        name,
        incorrect_fields: reviewResult.incorrectFields,
        review_reasoning: reviewResult.reasoning,
        current_values: {
          time_basis,
          scale,
          is_currency,
          family,
          indicator_type,
          temporal_aggregation,
        },
        llm_provider,
      },
    });
  } else {
    // If correct, skip to completion
    await emit({
      topic: "indicator.complete",
      data: {
        indicator_id,
        name,
        review_status: "passed",
        llm_provider,
      },
    });
  }
};
