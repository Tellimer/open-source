/**
 * Event Step: Assign Family (Non-Currency Branch)
 * Stage 5b: Use LLM to assign indicator family for non-currency indicators
 */

import { EventConfig } from 'motia';
import { z } from 'zod';
import {
  createFamilyAssignmentNonCurrencyPrompt,
  createLLMClient,
  familyAssignmentNonCurrencySchema,
  getLLMConfig,
} from '../../src/services/classify/index.ts';
import { getDatabase } from '../../src/db/client.ts';
import { createRepository } from '../../src/db/index.ts';

export const config: EventConfig = {
  type: 'event',
  name: 'AssignFamilyNonCurrency',
  description: 'Stage 5b: Assign family for non-currency indicators',
  flows: ['classify-indicator'],
  subscribes: ['indicator.assign-family-non-currency'],
  emits: ['indicator.classify-type-non-currency'],
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
        })
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
    description,
    time_basis,
    reporting_frequency,
    scale,
    is_currency,
    parsed_unit_type,
    sample_values,
    source_name,
    long_name,
    category_group,
    dataset,
    topic,
    aggregation_method,
    currency_code,
    llm_provider = 'local',
  } = input;

  logger.info('Assigning family (non-currency branch)', { indicator_id, name });

  // Create LLM client
  const llmConfig = getLLMConfig('family-assignment', llm_provider);
  const llmClient = createLLMClient(llmConfig);

  // Generate prompt with contextual fields including unit type
  const prompt = createFamilyAssignmentNonCurrencyPrompt({
    name,
    description,
    timeBasis: time_basis,
    scale,
    parsedUnitType: parsed_unit_type,
    sampleValues: sample_values,
    sourceName: source_name,
    categoryGroup: category_group,
    dataset,
    topic,
  });

  // Call LLM
  const familyResult = await llmClient.generateObject({
    prompt,
    schema: familyAssignmentNonCurrencySchema,
  });

  // Save to state
  await state.set('family-assignments', indicator_id, {
    indicator_id,
    ...familyResult,
    branch: 'non-currency',
    created_at: new Date().toISOString(),
  });

  // Save to database (best-effort)
  try {
    const repo = createRepository(getDatabase());
    await repo.saveStageResult('family', indicator_id, {
      family: familyResult.family,
      confidence: familyResult.confidence,
      reasoning: familyResult.reasoning,
      created_at: new Date().toISOString(),
    });
  } catch (dbError) {
    logger.warn('Family save skipped (transient DB error)', {
      indicator_id,
      error: dbError instanceof Error ? dbError.message : String(dbError),
    });
  }

  logger.info('Family assignment complete (non-currency)', {
    indicator_id,
    family: familyResult.family,
    confidence: familyResult.confidence,
  });

  // Emit to non-currency-specific type classification with full context
  await emit({
    topic: 'indicator.classify-type-non-currency',
    data: {
      indicator_id,
      name,
      description,
      time_basis,
      reporting_frequency,
      scale,
      is_currency,
      family: familyResult.family,
      parsed_unit_type,
      sample_values,
      source_name,
      long_name,
      category_group,
      dataset,
      topic,
      aggregation_method,
      currency_code,
      llm_provider,
    },
  });
};
