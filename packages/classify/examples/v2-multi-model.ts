/**
 * Example: Using different models for different stages
 *
 * This example demonstrates multi-model configuration for cost optimization.
 *
 * Note: Claude Sonnet 4.5 and 4.0 have the same price ($3/$15 per MTok),
 * so Sonnet 4.5 is recommended as the default. This example shows using
 * cheaper models (Haiku) for high-volume stages to reduce costs.
 */

import { classifyIndicatorsV2 } from '../mod.ts';
import type { V2Config } from '../src/v2/types.ts';

const indicators = [
  {
    id: 'GDP_GROWTH',
    name: 'GDP Growth Rate',
    units: '%',
    definition: 'Annualized percentage change in real GDP',
  },
  {
    id: 'INFLATION',
    name: 'Consumer Price Index',
    units: 'Index',
    definition: 'Measure of average change in prices paid by consumers',
  },
];

const llmConfig = {
  provider: 'anthropic' as const,
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
  model: 'claude-sonnet-4-5-20250929', // Recommended: most capable at same price
};

const v2Config: Partial<V2Config> = {
  database: {
    type: 'local',
    path: './examples/multi-model.db',
    walMode: true,
  },
  models: {
    // Cost optimization: use cheaper Haiku for high-volume stages
    router: 'claude-haiku-4-20250514',      // $0.80/$4 per MTok
    specialist: 'claude-haiku-4-20250514',  // $0.80/$4 per MTok
    orientation: 'claude-haiku-4-20250514', // $0.80/$4 per MTok
    // Keep Sonnet 4.5 for review (more complex reasoning)
    review: 'claude-sonnet-4-5-20250929',   // $3/$15 per MTok
  },
  batch: {
    routerBatchSize: 10,
    specialistBatchSize: 10,
    orientationBatchSize: 10,
    reviewBatchSize: 5,
  },
  concurrency: {
    router: 1,
    specialist: 1,
    orientation: 1,
    review: 1,
  },
};

// Run classification
const result = await classifyIndicatorsV2(indicators, llmConfig, v2Config);

console.log('\n📊 Results:');
console.log(`Total: ${result.summary.total}`);
console.log(`Successful: ${result.summary.successful}`);
console.log(`Failed: ${result.summary.failed}`);

// Display classifications
for (const classification of result.classifications) {
  console.log(`\n${classification.name}:`);
  console.log(`  Family: ${classification.family}`);
  console.log(`  Type: ${classification.indicator_type}`);
  console.log(`  Orientation: ${classification.heat_map_orientation}`);
}
