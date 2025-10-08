/**
 * Orientation Stage Valibot Schema
 * Validates heat map orientation outputs
 * @module
 */

import * as v from 'valibot';

/**
 * Single orientation result schema
 */
export const OrientationResultSchema = v.object({
  indicator_id: v.pipe(
    v.string(),
    v.minLength(1, 'Indicator ID must not be empty')
  ),
  heat_map_orientation: v.union([
    v.literal('higher-is-positive'),
    v.literal('lower-is-positive'),
    v.literal('neutral'),
  ], 'Invalid heat map orientation'),
  confidence: v.pipe(
    v.number(),
    v.minValue(0, 'Confidence must be >= 0'),
    v.maxValue(1, 'Confidence must be <= 1')
  ),
  reasoning: v.optional(v.string()),
});

/**
 * Orientation batch result schema (wrapped in object for Anthropic compatibility)
 */
export const OrientationBatchSchema = v.object({
  results: v.pipe(
    v.array(OrientationResultSchema),
    v.minLength(1, 'Batch must contain at least one result')
  ),
});

/**
 * TypeScript types
 */
export type OrientationResult = v.InferOutput<typeof OrientationResultSchema>;
export type OrientationBatch = v.InferOutput<typeof OrientationBatchSchema>;
