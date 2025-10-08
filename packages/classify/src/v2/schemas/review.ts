/**
 * Review Stage Valibot Schema
 * Validates review decision outputs
 * @module
 */

import * as v from "valibot";

// Provider-friendly diff schema (avoid v.record/v.unknown for OpenAI JSON schema)
const FamilySchema = v.union([
  v.literal("physical-fundamental"),
  v.literal("numeric-measurement"),
  v.literal("price-value"),
  v.literal("change-movement"),
  v.literal("composite-derived"),
  v.literal("temporal"),
  v.literal("qualitative"),
]);

const TemporalAggregationSchema = v.union([
  v.literal("not-applicable"),
  v.literal("point-in-time"),
  v.literal("period-rate"),
  v.literal("period-cumulative"),
  v.literal("period-average"),
  v.literal("period-total"),
]);

const OrientationSchema = v.union([
  v.literal("higher-is-positive"),
  v.literal("lower-is-positive"),
  v.literal("neutral"),
]);

// Only allow specific diff keys with explicit types
const ReviewDiffSchema = v.object({
  family: v.optional(FamilySchema),
  indicator_type: v.optional(v.string()),
  temporal_aggregation: v.optional(TemporalAggregationSchema),
  is_currency_denominated: v.optional(v.boolean()),
  heat_map_orientation: v.optional(OrientationSchema),
});

/**
 * Review action schema
 */
const ReviewActionSchema = v.union(
  [v.literal("confirm"), v.literal("fix"), v.literal("escalate")],
  "Invalid review action",
);

/**
 * Single review decision schema
 */
export const ReviewDecisionSchema = v.object({
  indicator_id: v.pipe(
    v.string(),
    v.minLength(1, "Indicator ID must not be empty"),
  ),
  action: ReviewActionSchema,
  diff: v.optional(ReviewDiffSchema),
  reason: v.pipe(v.string(), v.minLength(1, "Reason must not be empty")),
  confidence: v.pipe(
    v.number(),
    v.minValue(0, "Confidence must be >= 0"),
    v.maxValue(1, "Confidence must be <= 1"),
  ),
});

/**
 * Review batch result schema (wrapped in object for Anthropic compatibility)
 */
export const ReviewBatchSchema = v.object({
  results: v.pipe(
    v.array(ReviewDecisionSchema),
    v.minLength(1, "Batch must contain at least one result"),
  ),
});

/**
 * TypeScript types
 */
export type ReviewDecision = v.InferOutput<typeof ReviewDecisionSchema>;
export type ReviewBatch = v.InferOutput<typeof ReviewBatchSchema>;
