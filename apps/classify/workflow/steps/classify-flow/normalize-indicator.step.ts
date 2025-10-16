/**
 * Event Step: Normalize Indicator
 * Stage 1: Parse units, scale, and currency from indicator metadata
 */

import { EventConfig } from 'motia';
import { z } from 'zod';
import { normalizeUnits } from '../../src/services/classify/index.ts';
import { getDatabase, createRepository } from '../../src/db/index.ts';

export const config: EventConfig = {
  type: 'event',
  name: 'NormalizeIndicator',
  description:
    'Stage 1: Parse units, scale, and currency from indicator metadata',
  flows: ['classify-indicator'],
  subscribes: ['indicator.normalize'],
  emits: [
    'indicator.infer-time', // Combined time inference and cumulative detection
  ],
  input: z.object({
    indicator_id: z.string(),
    name: z.string(),
    units: z.string().optional(),
    description: z.string().optional(),
    periodicity: z.string().optional(),
    sample_values: z
      .array(
        z.object({
          date: z.string(),
          value: z.number(),
        })
      )
      .optional(),
    // Contextual fields
    source_name: z.string().optional(),
    long_name: z.string().optional(),
    category_group: z.string().optional(),
    dataset: z.string().optional(),
    aggregation_method: z.string().optional(),
    scale: z.string().optional(),
    topic: z.string().optional(),
    currency_code: z.string().optional(),
    // LLM provider selection
    llm_provider: z
      .enum(['local', 'openai', 'anthropic'])
      .optional()
      .default('local'),
  }),
};

export const handler = async (input: any, { state, emit, logger }: any) => {
  const {
    indicator_id,
    name,
    units,
    description,
    periodicity,
    sample_values,
    source_name,
    long_name,
    category_group,
    dataset,
    aggregation_method,
    scale,
    topic,
    currency_code,
    llm_provider = 'local',
  } = input;

  const startTime = Date.now();
  logger.info('Normalizing indicator', { indicator_id, name });

  // Normalize units (pure CPU)
  const normalized = normalizeUnits(units || '');

  const result = {
    indicator_id,
    ...normalized,
    created_at: new Date().toISOString(),
  };

  // Save to state (non-blocking)
  await state.set('normalizations', indicator_id, result);

  // Best-effort DB writes — do not fail the pipeline on transient DB errors
  try {
    const repo = createRepository(getDatabase());

    await repo.logProcessing({
      indicator_id,
      stage: 'normalize',
      status: 'started',
    });

    await repo.saveStageResult('normalize', indicator_id, {
      original_units: normalized.originalUnits,
      parsed_scale: normalized.parsedScale,
      normalized_scale: normalized.normalizedScale,
      parsed_unit_type: normalized.parsedUnitType,
      parsed_currency: normalized.parsedCurrency,
      parsing_confidence: normalized.parsingConfidence,
      created_at: result.created_at,
    });

    const processingTime = Date.now() - startTime;
    await repo.logProcessing({
      indicator_id,
      stage: 'normalize',
      status: 'completed',
      metadata: { processing_time_ms: processingTime },
    });

    logger.info('Normalization complete', {
      indicator_id,
      parsed_type: normalized.parsedUnitType,
      confidence: normalized.parsingConfidence,
      processing_time_ms: processingTime,
    });
  } catch (error) {
    logger.warn('Normalization DB writes skipped (transient error)', {
      indicator_id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Emit to 3 parallel stages with contextual fields
  const sharedData = {
    indicator_id,
    name,
    units,
    description,
    periodicity,
    sample_values,
    parsed_scale: normalized.parsedScale,
    parsed_unit_type: normalized.parsedUnitType,
    parsed_currency: normalized.parsedCurrency,
    // Pass through contextual fields
    source_name,
    long_name,
    category_group,
    dataset,
    aggregation_method,
    scale,
    topic,
    currency_code,
    // Pass through LLM provider
    llm_provider,
  };

  // Pass scale and currency data to time inference
  // No need for separate parallel stages since scale/currency are now determined synchronously
  const isCurrency =
    normalized.parsedUnitType === 'currency-amount' ||
    normalized.parsedCurrency !== null;

  // Emit to combined time inference and cumulative detection step
  await emit({
    topic: 'indicator.infer-time',
    data: {
      ...sharedData,
      // Include determined scale and currency for downstream use
      scale: normalized.normalizedScale,
      is_currency: isCurrency,
      detected_currency: normalized.parsedCurrency,
    },
  });
};
