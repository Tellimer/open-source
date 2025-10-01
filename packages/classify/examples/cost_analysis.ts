/**
 * Cost Analysis Example
 *
 * Demonstrates how to use token usage and cost tracking features
 * to analyze and optimize classification costs.
 */

import { classifyIndicatorsWithOptions } from '../src/classify.ts';
import type { Indicator } from '../src/types.ts';
import { formatCost, formatTokens } from '../src/utils/token_counter.ts';

// Sample indicators
const indicators: Indicator[] = [
  {
    name: 'GDP',
    units: 'USD billions',
    currency_code: 'USD',
    periodicity: 'quarterly',
    sample_values: [26500, 27000, 27200, 27500],
  },
  {
    name: 'Unemployment Rate',
    units: '%',
    periodicity: 'monthly',
    sample_values: [3.7, 3.9, 3.8, 3.9],
  },
  {
    name: 'Inflation Rate',
    units: '%',
    periodicity: 'monthly',
    sample_values: [3.1, 3.2, 3.5, 3.4],
  },
  {
    name: 'Trade Balance',
    units: 'USD millions',
    currency_code: 'USD',
    periodicity: 'monthly',
    sample_values: [-68000, -70000, -65000, -72000],
  },
  {
    name: 'Consumer Price Index',
    units: 'Index (2015=100)',
    periodicity: 'monthly',
    sample_values: [308.4, 310.3, 312.2, 313.5],
  },
];

async function main() {
  // Get API key from environment
  const apiKey = Deno.env.get('OPENAI_API_KEY') ||
    Deno.env.get('ANTHROPIC_API_KEY') ||
    Deno.env.get('GEMINI_API_KEY');

  if (!apiKey) {
    console.error(
      'Please set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY'
    );
    Deno.exit(1);
  }

  // Determine provider
  const provider = Deno.env.get('OPENAI_API_KEY')
    ? 'openai'
    : Deno.env.get('ANTHROPIC_API_KEY')
    ? 'anthropic'
    : 'gemini';

  console.log(`\n${'='.repeat(70)}`);
  console.log(`COST ANALYSIS EXAMPLE - Provider: ${provider.toUpperCase()}`);
  console.log(`${'='.repeat(70)}\n`);

  // Example 1: Basic classification with cost tracking
  console.log('Example 1: Basic Classification with Cost Tracking');
  console.log('-'.repeat(70));

  const result = await classifyIndicatorsWithOptions(indicators, {
    llmConfig: {
      provider: provider as 'openai' | 'anthropic' | 'gemini',
      apiKey,
    },
    debug: false, // Set to true to see detailed output
  });

  console.log('\n📊 Results:');
  console.log(`  Total indicators:      ${result.summary.total}`);
  console.log(`  Successfully classified: ${result.summary.successful}`);
  console.log(`  Failed:                ${result.summary.failed}`);
  console.log(`  Success rate:          ${result.summary.successRate.toFixed(1)}%`);

  console.log('\n💰 Token Usage & Cost:');
  console.log(`  Input tokens:          ${formatTokens(result.tokenUsage.inputTokens)}`);
  console.log(`  Output tokens:         ${formatTokens(result.tokenUsage.outputTokens)}`);
  console.log(`  Total tokens:          ${formatTokens(result.tokenUsage.totalTokens)}`);
  console.log(`  Estimated cost:        ${formatCost(result.tokenUsage.estimatedCost)}`);
  console.log(`  Provider:              ${result.tokenUsage.provider}`);
  console.log(`  Model:                 ${result.tokenUsage.model}`);

  console.log('\n⚡ Performance Metrics:');
  console.log(`  Avg time/indicator:    ${result.performance.avgTimePerIndicator.toFixed(2)}ms`);
  console.log(`  Throughput:            ${result.performance.throughput.toFixed(2)} indicators/sec`);
  console.log(`  Avg tokens/indicator:  ${result.performance.avgTokensPerIndicator.toFixed(0)}`);
  console.log(`  Avg cost/indicator:    ${formatCost(result.performance.avgCostPerIndicator)}`);

  // Example 2: Cost comparison - with vs without reasoning
  console.log(`\n\n${'='.repeat(70)}`);
  console.log('Example 2: Cost Comparison - With vs Without Reasoning');
  console.log('-'.repeat(70));

  const withoutReasoning = await classifyIndicatorsWithOptions(indicators, {
    llmConfig: { provider: provider as 'openai' | 'anthropic' | 'gemini', apiKey },
    includeReasoning: false,
    debug: false,
  });

  const withReasoning = await classifyIndicatorsWithOptions(indicators, {
    llmConfig: { provider: provider as 'openai' | 'anthropic' | 'gemini', apiKey },
    includeReasoning: true,
    debug: false,
  });

  console.log('\nWithout Reasoning:');
  console.log(`  Tokens:  ${formatTokens(withoutReasoning.tokenUsage.totalTokens)}`);
  console.log(`  Cost:    ${formatCost(withoutReasoning.tokenUsage.estimatedCost)}`);
  console.log(`  Time:    ${withoutReasoning.processingTime}ms`);

  console.log('\nWith Reasoning:');
  console.log(`  Tokens:  ${formatTokens(withReasoning.tokenUsage.totalTokens)}`);
  console.log(`  Cost:    ${formatCost(withReasoning.tokenUsage.estimatedCost)}`);
  console.log(`  Time:    ${withReasoning.processingTime}ms`);

  const tokenIncrease = ((withReasoning.tokenUsage.totalTokens - withoutReasoning.tokenUsage.totalTokens) /
    withoutReasoning.tokenUsage.totalTokens) * 100;
  const costIncrease = ((withReasoning.tokenUsage.estimatedCost - withoutReasoning.tokenUsage.estimatedCost) /
    withoutReasoning.tokenUsage.estimatedCost) * 100;

  console.log('\nImpact of Reasoning:');
  console.log(`  Token increase:  ${tokenIncrease.toFixed(1)}%`);
  console.log(`  Cost increase:   ${costIncrease.toFixed(1)}%`);

  // Example 3: Cost projection for large datasets
  console.log(`\n\n${'='.repeat(70)}`);
  console.log('Example 3: Cost Projection for Large Datasets');
  console.log('-'.repeat(70));

  const avgCost = result.performance.avgCostPerIndicator;
  const avgTime = result.performance.avgTimePerIndicator;

  const projections = [100, 1000, 10000, 100000];
  console.log('\nProjections based on current performance:');
  console.log('');
  console.log('Indicators | Est. Cost    | Est. Time');
  console.log('-'.repeat(45));

  for (const count of projections) {
    const cost = avgCost * count;
    const timeMs = avgTime * count;
    const timeMin = timeMs / 1000 / 60;

    console.log(
      `${count.toLocaleString().padEnd(10)} | ${formatCost(cost).padEnd(12)} | ${
        timeMin < 1
          ? `${(timeMs / 1000).toFixed(1)}s`
          : `${timeMin.toFixed(1)}min`
      }`
    );
  }

  // Example 4: Cost-effectiveness comparison
  console.log(`\n\n${'='.repeat(70)}`);
  console.log('Example 4: Batch Size Impact on Cost & Performance');
  console.log('-'.repeat(70));

  const batchSizes = [5, 10, 25];
  console.log('\nTesting different batch sizes:');
  console.log('');

  for (const batchSize of batchSizes) {
    const batchResult = await classifyIndicatorsWithOptions(indicators, {
      llmConfig: { provider: provider as 'openai' | 'anthropic' | 'gemini', apiKey },
      batchSize,
      debug: false,
    });

    console.log(`Batch Size ${batchSize}:`);
    console.log(`  API calls:    ${batchResult.apiCalls}`);
    console.log(`  Time:         ${batchResult.processingTime}ms`);
    console.log(`  Cost:         ${formatCost(batchResult.tokenUsage.estimatedCost)}`);
    console.log(`  Throughput:   ${batchResult.performance.throughput.toFixed(2)} ind/sec`);
    console.log('');
  }

  console.log(`${'='.repeat(70)}\n`);
}

// Run if executed directly
if (import.meta.main) {
  main();
}
