/**
 * Deep Review Stage Valibot Schema
 * Validates deep review decision outputs (second-pass on suggested fixes)
 * @module
 */

import * as v from "valibot";

// Reuse common schemas
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
const DeepReviewDiffSchema = v.object({
  family: v.optional(FamilySchema),
  indicator_type: v.optional(v.string()),
  temporal_aggregation: v.optional(TemporalAggregationSchema),
  is_currency_denominated: v.optional(v.boolean()),
  heat_map_orientation: v.optional(OrientationSchema),
});

/**
 * Deep review action schema (second-pass on suggested fixes)
 */
const DeepReviewActionSchema = v.union(
  [v.literal("accept-fix"), v.literal("reject-fix"), v.literal("escalate")],
  "Invalid deep review action",
);

/**
 * Single deep review decision schema
 */
export const DeepReviewDecisionSchema = v.object({
  indicator_id: v.pipe(
    v.string(),
    v.minLength(1, "Indicator ID must not be empty"),
  ),
  action: DeepReviewActionSchema,
  reason: v.pipe(v.string(), v.minLength(1, "Reason must not be empty")),
  confidence: v.pipe(
    v.number(),
    v.minValue(0, "Confidence must be >= 0"),
    v.maxValue(1, "Confidence must be <= 1"),
  ),
  final_diff: v.optional(DeepReviewDiffSchema),
});

/**
 * Deep review batch result schema
 */
export const DeepReviewBatchSchema = v.object({
  results: v.pipe(
    v.array(DeepReviewDecisionSchema),
    v.minLength(1, "Batch must contain at least one result"),
  ),
});

/**
 * TypeScript types
 */
export type DeepReviewDecision = v.InferOutput<
  typeof DeepReviewDecisionSchema
>;
export type DeepReviewBatch = v.InferOutput<typeof DeepReviewBatchSchema>;
