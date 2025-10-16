/**
 * Event Step: Route by Unit Type (Non-Currency Sub-Router)
 * Routes non-currency indicators to specialized classification paths based on parsed_unit_type
 */

import { EventConfig } from "motia";
import { z } from "zod";

export const config: EventConfig = {
  type: "event",
  name: "RouteByUnitType",
  description:
    "Sub-router for non-currency indicators based on unit type (%, index, ratio, count)",
  flows: ["classify-indicator"],
  subscribes: ["indicator.route-by-unit-type"],
  emits: ["indicator.assign-family-non-currency"],
  input: z.object({
    indicator_id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    time_basis: z.string(),
    reporting_frequency: z.string(),
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
    llm_provider: z.enum(["local", "openai", "anthropic"]).optional().default("local"),
  }),
};

export const handler = async (input: any, { emit, logger }: any) => {
  const {
    indicator_id,
    name,
    parsed_unit_type,
    llm_provider = "local",
  } = input;

  logger.info("Routing non-currency indicator with unit-type context", {
    indicator_id,
    name,
    parsed_unit_type,
  });

  // All non-currency indicators go to the same family assignment step,
  // but with unit_type as strong contextual hint for the LLM
  await emit({
    topic: "indicator.assign-family-non-currency",
    data: {
      ...input,
      // parsed_unit_type is already in input, just log it for visibility
    },
  });
};
