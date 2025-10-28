/**
 * Event Step: Currency Denomination Router
 * Routes indicators to currency or non-currency classification branches
 */

import { EventConfig } from "motia";
import { z } from "zod";

export const config: EventConfig = {
  type: "event",
  name: "CurrencyDenominationRouter",
  description:
    "Router: Routes indicators to currency or non-currency branches based on is_currency flag",
  flows: ["classify-indicator"],
  subscribes: [
    "indicator.time-cumulative-complete",
  ],
  emits: ["indicator.assign-family-currency", "indicator.route-by-unit-type"],
  input: z.object({
    indicator_id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    // Time inference results
    time_basis: z.string(),
    reporting_frequency: z.string(),
    // Cumulative detection results
    is_cumulative: z.boolean().optional(),
    cumulative_pattern_type: z.string().optional(),
    cumulative_confidence: z.number().optional(),
    // Scale and currency from normalization
    scale: z.string(),
    is_currency: z.boolean(),
    detected_currency: z.string().nullable(),
    parsed_unit_type: z.string(),
    sample_values: z
      .array(
        z.object({
          date: z.string(),
          value: z.number(),
        }),
      )
      .optional(),
    // Contextual fields
    source_name: z.string().optional(),
    long_name: z.string().optional(),
    category_group: z.string().optional(),
    dataset: z.string().optional(),
    aggregation_method: z.string().optional(),
    topic: z.string().optional(),
    currency_code: z.string().optional(),
    // LLM provider selection
    llm_provider: z.enum(["local", "openai", "anthropic"]).optional().default(
      "local",
    ),
  }),
};

export const handler = async (input: any, { emit, logger }: any) => {
  const { indicator_id, is_currency } = input;

  // Simple router: route to currency or non-currency branch based on flag
  const targetTopic = is_currency
    ? "indicator.assign-family-currency"
    : "indicator.route-by-unit-type";

  logger.info(`Currency router: routing to ${targetTopic}`, {
    indicator_id,
    is_currency,
  });

  // Pass through all data to appropriate branch
  await emit({
    topic: targetTopic,
    data: input,
  });
};
