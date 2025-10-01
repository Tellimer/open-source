/**
 * Quick Cost Check Example
 *
 * Shows the simplest way to get total estimated cost for a classification run.
 */

import { classifyIndicatorsWithOptions, getCostSummary, printCostSummary, printCostProjections } from '../mod.ts';
import type { Indicator } from '../src/types.ts';

// Sample indicators
const indicators: Indicator[] = [
  {
    name: 'GDP',
    units: 'USD billions',
    currency_code: 'USD',
    periodicity: 'quarterly',
    sample_values: [26500, 27000, 27200],
  },
  {
    name: 'Unemployment Rate',
    units: '%',
    periodicity: 'monthly',
    sample_values: [3.7, 3.9, 3.8],
  },
  {
    name: 'Inflation Rate',
    units: '%',
    periodicity: 'monthly',
    sample_values: [3.1, 3.2, 3.5],
  },
  {
    name: 'Consumer Price Index',
    units: 'Index (2015=100)',
    periodicity: 'monthly',
    sample_values: [308.4, 310.3, 312.2],
  },
  {
    name: 'S&P 500 Index',
    units: 'index',
    periodicity: 'daily',
    sample_values: [4567, 4589, 4543],
  },
];

async function main() {
  // Get API key
  const apiKey = Deno.env.get('OPENAI_API_KEY') ||
    Deno.env.get('ANTHROPIC_API_KEY') ||
    Deno.env.get('GEMINI_API_KEY');

  if (!apiKey) {
    console.error('Please set an API key: OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY');
    Deno.exit(1);
  }

  const provider = Deno.env.get('OPENAI_API_KEY')
    ? 'openai'
    : Deno.env.get('ANTHROPIC_API_KEY')
    ? 'anthropic'
    : 'gemini';

  console.log(`\n🚀 Classifying ${indicators.length} indicators with ${provider}...\n`);

  // Classify indicators
  const result = await classifyIndicatorsWithOptions(indicators, {
    llmConfig: {
      provider: provider as 'openai' | 'anthropic' | 'gemini',
      apiKey,
    },
  });

  // Method 1: Direct access
  console.log('Method 1: Direct Access');
  console.log('=======================');
  console.log(`Total estimated cost: $${result.tokenUsage.estimatedCost.toFixed(6)}`);
  console.log(`Total tokens: ${result.tokenUsage.totalTokens.toLocaleString()}`);
  console.log(`Provider: ${result.tokenUsage.provider}`);
  console.log(`Model: ${result.tokenUsage.model}`);

  // Method 2: Using getCostSummary
  console.log('\n\nMethod 2: Using getCostSummary()');
  console.log('=================================');
  const summary = getCostSummary(result);
  console.log(`Total cost: ${summary.totalCostFormatted}`);
  console.log(`Avg cost per indicator: ${summary.avgCostPerIndicatorFormatted}`);
  console.log(`Total tokens: ${summary.totalTokensFormatted}`);

  // Method 3: Using printCostSummary (pretty output)
  printCostSummary(result);

  // Method 4: Cost projections
  printCostProjections(result);

  // Bonus: Show individual classifications
  console.log('✅ Classifications:');
  console.log('-'.repeat(60));
  for (const enriched of result.enriched) {
    console.log(`${enriched.name.padEnd(30)} → ${enriched.classification.indicator_type}`);
  }
  console.log('');
}

if (import.meta.main) {
  main();
}
