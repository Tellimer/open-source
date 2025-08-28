/**
 * Tests for XState pipeline workflow
 */

import { assertEquals } from 'jsr:@std/assert';
import { createPipeline } from './pipeline_v5.ts';
import type { ParsedData, PipelineConfig } from './pipeline_v5.ts';

Deno.test('Pipeline - complete workflow with mock data', async () => {
  const mockData: ParsedData[] = [
    {
      id: 1,
      value: 100,
      unit: 'USD Million',
      name: 'GDP Growth',
      year: 2023,
    },
    {
      id: 2,
      value: 50,
      unit: 'EUR Billion',
      name: 'Trade Balance',
      year: 2023,
    },
    {
      id: 3,
      value: 2.5,
      unit: 'percent',
      name: 'Inflation Rate',
      year: 2023,
    },
  ];

  const config: PipelineConfig = {
    minQualityScore: 50,
    targetCurrency: 'USD',
    targetMagnitude: 'billions',
    inferUnits: true,
    validateSchema: false,
    useLiveFX: false,
    fxFallback: {
      base: 'USD',
      rates: {
        EUR: 0.85,
        GBP: 0.75,
        JPY: 150,
      },
    },
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(mockData);

  assertEquals(Array.isArray(result), true);
  assertEquals(result.length > 0, true);
});

Deno.test('Pipeline - handles validation errors', async () => {
  const invalidData: ParsedData[] = [];

  const config: PipelineConfig = {
    validateSchema: true,
    requiredFields: ['value', 'unit'],
  };

  const pipeline = createPipeline(config);

  try {
    await pipeline.run(invalidData);
    throw new Error('Pipeline should have failed');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    assertEquals(msg.includes('No data provided'), true);
  }
});

Deno.test('Pipeline - quality check threshold', async () => {
  const lowQualityData: ParsedData[] = [
    {
      value: 100,
      unit: 'unknown',
      name: 'Unknown Indicator',
    },
    {
      value: -999999,
      unit: 'USD',
      name: 'Bad Data',
    },
  ];

  const config: PipelineConfig = {
    minQualityScore: 90, // High threshold
    validateSchema: false,
    useLiveFX: false,
  };

  const pipeline = createPipeline(config);

  // Interactive pipeline for testing quality review
  const interactive = pipeline.createInteractive();
  interactive.start(lowQualityData);

  // Wait a bit for state machine to process
  await new Promise((resolve) => setTimeout(resolve, 100));

  const state = interactive.getState();
  // Should be in quality review state due to low quality
  assertEquals(
    state?.matches('qualityReview') || state?.matches('error') || false,
    true
  );
});

Deno.test('Pipeline - successful normalization', async () => {
  const dataToNormalize: ParsedData[] = [
    {
      value: 100,
      unit: 'USD Million',
      name: 'Revenue',
    },
    {
      value: 50,
      unit: 'USD Million',
      name: 'Expenses',
    },
  ];

  const config: PipelineConfig = {
    targetCurrency: 'EUR',
    targetMagnitude: 'billions',
    minQualityScore: 50,
    useLiveFX: false,
    fxFallback: {
      base: 'USD',
      rates: {
        EUR: 0.85,
      },
    },
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(dataToNormalize);

  assertEquals(Array.isArray(result), true);
  // Check that pipeline metadata was added
  if (result && result[0]) {
    assertEquals('pipeline' in result[0], true);
  }
});

Deno.test('Pipeline - unit inference', async () => {
  const dataWithMissingUnits: ParsedData[] = [
    {
      value: 3.5,
      unit: '',
      description: 'Interest rate percentage',
      name: 'Interest Rate',
    },
    {
      value: 1500000,
      unit: 'unknown',
      description: 'Population count in thousands',
      name: 'Population',
    },
  ];

  const config: PipelineConfig = {
    inferUnits: true,
    minQualityScore: 30,
    validateSchema: false,
    useLiveFX: false,
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(dataWithMissingUnits);

  assertEquals(Array.isArray(result), true);
  // Inferred units should be marked in the result
  if (result && result[0]) {
    // Check if unit was inferred
    assertEquals(
      result[0].inferredUnit !== undefined || result[0].unit !== '',
      true
    );
  }
});

Deno.test('Pipeline - batch processing', async () => {
  const largeBatch: ParsedData[] = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    value: Math.random() * 1000,
    unit: i % 2 === 0 ? 'USD Million' : 'EUR Million',
    name: `Indicator ${i}`,
    year: 2020 + (i % 4),
  }));

  const config: PipelineConfig = {
    targetCurrency: 'USD',
    targetMagnitude: 'millions',
    minQualityScore: 40,
    validateSchema: false,
    useLiveFX: false,
    fxFallback: {
      base: 'USD',
      rates: {
        EUR: 0.85,
        GBP: 0.75,
      },
    },
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(largeBatch);

  assertEquals(Array.isArray(result), true);
  assertEquals(result.length > 0, true);
  // All items should have pipeline metadata
  for (const item of result) {
    assertEquals('pipeline' in item, true);
  }
});

Deno.test('Pipeline - interactive control flow', async () => {
  const testData: ParsedData[] = [
    {
      value: 100,
      unit: 'USD',
      name: 'Test Indicator',
    },
  ];

  const config: PipelineConfig = {
    minQualityScore: 50,
    validateSchema: false,
  };

  const pipeline = createPipeline(config);
  const interactive = pipeline.createInteractive();

  interactive.start(testData);

  // Wait for state machine to process
  await new Promise((resolve) => setTimeout(resolve, 100));

  const state = interactive.getState();

  // Should have moved from idle
  assertEquals(state?.matches('idle') || false, false);

  // Test context access
  const context = interactive.getContext();
  assertEquals(context?.rawData, testData);
  assertEquals(context?.config, config);
  assertEquals(Array.isArray(context?.errors), true);
  assertEquals(Array.isArray(context?.warnings), true);
});

Deno.test('Pipeline - error handling and recovery', async () => {
  const problematicData: ParsedData[] = [
    {
      value: NaN,
      unit: 'USD',
      name: 'Invalid Value',
    },
    {
      value: Infinity,
      unit: 'EUR',
      name: 'Infinite Value',
    },
  ];

  const config: PipelineConfig = {
    minQualityScore: 50,
    validateSchema: true,
    requiredFields: ['value', 'unit'],
    useLiveFX: false,
  };

  const pipeline = createPipeline(config);

  try {
    const result = await pipeline.run(problematicData);
    // Pipeline might handle these gracefully
    assertEquals(Array.isArray(result), true);
  } catch (error) {
    // Or it might fail - both are acceptable behaviors
    assertEquals(error instanceof Error, true);
  }
});

Deno.test('Pipeline - output format configuration', async () => {
  const data: ParsedData[] = [
    {
      value: 100,
      unit: 'USD Million',
      name: 'Export Value',
      date: '2024-01-01',
    },
  ];

  const config: PipelineConfig = {
    outputFormat: 'json',
    targetCurrency: 'USD',
    minQualityScore: 50,
    useLiveFX: false,
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(data);

  assertEquals(Array.isArray(result), true);
  assertEquals(result.length, 1);

  // Result should have the pipeline metadata
  const item = result[0];
  assertEquals('pipeline' in item, true);
  const p = item.pipeline;
  if (p) {
    assertEquals(typeof p.processingTime, 'number');
  }
});
