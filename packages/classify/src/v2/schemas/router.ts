/**
 * Router Stage Valibot Schema
 * Validates family classification outputs
 * @module
 */

import * as v from 'valibot';
import type { IndicatorFamily } from '../types.ts';

/**
 * Single router result schema
 */
export const RouterResultSchema = v.object({
  indicator_id: v.pipe(
    v.string(),
    v.minLength(1, 'Indicator ID must not be empty')
  ),
  family: v.union([
    v.literal('physical-fundamental'),
    v.literal('numeric-measurement'),
    v.literal('price-value'),
    v.literal('change-movement'),
    v.literal('composite-derived'),
    v.literal('temporal'),
    v.literal('qualitative'),
  ], 'Invalid indicator family'),
  confidence: v.pipe(
    v.number(),
    v.minValue(0, 'Confidence must be >= 0'),
    v.maxValue(1, 'Confidence must be <= 1')
  ),
  reasoning: v.optional(v.pipe(
    v.string(),
    v.minLength(1, 'Reasoning must not be empty')
  )),
});

/**
 * Router batch result schema (wrapped in object for Anthropic compatibility)
 */
export const RouterBatchSchema = v.object({
  results: v.pipe(
    v.array(RouterResultSchema),
    v.minLength(1, 'Batch must contain at least one result')
  ),
});

/**
 * TypeScript types inferred from schemas
 */
export type RouterResult = v.InferOutput<typeof RouterResultSchema>;
export type RouterBatch = v.InferOutput<typeof RouterBatchSchema>;
