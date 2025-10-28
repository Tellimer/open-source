/**
 * Event Step: Final Review
 * Stage 8: Apply corrections from boolean review
 */

import { EventConfig } from "motia";
import { z } from "zod";
import {
  createFinalReviewPrompt,
  createLLMClient,
  finalReviewSchema,
  getLLMConfig,
} from "../../src/services/classify/index.ts";

export const config: EventConfig = {
  type: "event",
  name: "FinalReview",
  description: "Stage 8: Apply corrections from boolean review",
  flows: ["classify-indicator"],
  subscribes: ["indicator.final-review"],
  emits: ["indicator.complete"],
  input: z.object({
    indicator_id: z.string(),
    name: z.string(),
    incorrect_fields: z.array(z.string()),
    review_reasoning: z.string(),
    current_values: z.record(z.unknown()),
    llm_provider: z.enum(["local", "openai", "anthropic"]).optional().default(
      "local",
    ),
  }),
};

export const handler = async (input: any, { state, emit, logger }: any) => {
  const {
    indicator_id,
    name,
    incorrect_fields,
    review_reasoning,
    current_values,
    llm_provider = "local",
  } = input;

  logger.info("Performing final review", { indicator_id, name });

  // Create LLM client
  const llmConfig = getLLMConfig("final-review", llm_provider);
  const llmClient = createLLMClient(llmConfig);

  // Generate prompt
  const prompt = createFinalReviewPrompt({
    incorrectFields: incorrect_fields,
    reviewReasoning: review_reasoning,
    currentValues: current_values,
  });

  // Call LLM
  const finalResult = await llmClient.generateObject({
    prompt,
    schema: finalReviewSchema,
  });

  // Save to state
  await state.set("final-reviews", indicator_id, {
    indicator_id,
    ...finalResult,
    created_at: new Date().toISOString(),
  });

  logger.info("Final review complete", {
    indicator_id,
    review_makes_sense: finalResult.reviewMakesSense,
    confidence: finalResult.confidence,
  });

  // Emit to completion
  await emit({
    topic: "indicator.complete",
    data: {
      indicator_id,
      name,
      review_status: finalResult.reviewMakesSense ? "corrected" : "failed",
      corrections: finalResult.correctionsApplied,
      llm_provider,
    },
  });
};
