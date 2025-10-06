/**
 * Specialist Stage Valibot Schema
 * Validates family-specific classification outputs
 * @module
 */

import * as v from 'valibot';

/**
 * Valid indicator types by family
 */
const PHYSICAL_TYPES = ['stock', 'flow', 'balance', 'capacity', 'volume'] as const;
const NUMERIC_TYPES = ['count', 'percentage', 'ratio', 'spread', 'share'] as const;
const PRICE_TYPES = ['price', 'yield'] as const;
const CHANGE_TYPES = ['rate', 'volatility', 'gap', 'velocity'] as const;
const COMPOSITE_TYPES = ['index', 'correlation', 'elasticity', 'multiplier', 'other'] as const;
const TEMPORAL_TYPES = ['duration', 'probability', 'threshold'] as const;
const QUALITATIVE_TYPES = ['sentiment', 'allocation', 'other'] as const;

/**
 * Temporal aggregation options
 */
const TemporalAggregationSchema = v.union([
  v.literal('not-applicable'),
  v.literal('point-in-time'),
  v.literal('period-rate'),
  v.literal('period-cumulative'),
  v.literal('period-average'),
  v.literal('period-total'),
], 'Invalid temporal aggregation');

/**
 * Base specialist result schema (works for all families)
 */
export const SpecialistResultSchema = v.object({
  indicator_id: v.pipe(
    v.string(),
    v.minLength(1, 'Indicator ID must not be empty')
  ),
  indicator_type: v.string(), // Validated per family in business logic
  temporal_aggregation: TemporalAggregationSchema,
  is_currency_denominated: v.boolean(),
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
 * Specialist batch result schema (wrapped in object for Anthropic compatibility)
 */
export const SpecialistBatchSchema = v.object({
  results: v.pipe(
    v.array(SpecialistResultSchema),
    v.minLength(1, 'Batch must contain at least one result')
  ),
});

/**
 * Family-specific schemas with strict type validation
 */
export const PhysicalFundamentalSchema = v.object({
  indicator_id: v.string(),
  indicator_type: v.union(PHYSICAL_TYPES.map(t => v.literal(t)) as any),
  temporal_aggregation: TemporalAggregationSchema,
  is_currency_denominated: v.boolean(),
  confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
});

export const NumericMeasurementSchema = v.object({
  indicator_id: v.string(),
  indicator_type: v.union(NUMERIC_TYPES.map(t => v.literal(t)) as any),
  temporal_aggregation: TemporalAggregationSchema,
  is_currency_denominated: v.boolean(),
  confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
});

export const PriceValueSchema = v.object({
  indicator_id: v.string(),
  indicator_type: v.union(PRICE_TYPES.map(t => v.literal(t)) as any),
  temporal_aggregation: TemporalAggregationSchema,
  is_currency_denominated: v.boolean(),
  confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
});

export const ChangeMovementSchema = v.object({
  indicator_id: v.string(),
  indicator_type: v.union(CHANGE_TYPES.map(t => v.literal(t)) as any),
  temporal_aggregation: TemporalAggregationSchema,
  is_currency_denominated: v.boolean(),
  confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
});

export const CompositeDerivedSchema = v.object({
  indicator_id: v.string(),
  indicator_type: v.union(COMPOSITE_TYPES.map(t => v.literal(t)) as any),
  temporal_aggregation: TemporalAggregationSchema,
  is_currency_denominated: v.boolean(),
  confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
});

export const TemporalSchema = v.object({
  indicator_id: v.string(),
  indicator_type: v.union(TEMPORAL_TYPES.map(t => v.literal(t)) as any),
  temporal_aggregation: TemporalAggregationSchema,
  is_currency_denominated: v.boolean(),
  confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
});

export const QualitativeSchema = v.object({
  indicator_id: v.string(),
  indicator_type: v.union(QUALITATIVE_TYPES.map(t => v.literal(t)) as any),
  temporal_aggregation: TemporalAggregationSchema,
  is_currency_denominated: v.boolean(),
  confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
});

/**
 * TypeScript types
 */
export type SpecialistResult = v.InferOutput<typeof SpecialistResultSchema>;
export type SpecialistBatch = v.InferOutput<typeof SpecialistBatchSchema>;
