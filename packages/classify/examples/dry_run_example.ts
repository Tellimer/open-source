/**
 * Dry Run Example
 *
 * Demonstrates dry-run mode to estimate costs without making actual LLM calls.
 * Perfect for testing, budgeting, and cost estimation.
 */

import { classifyIndicatorsWithOptions, getCostSummary } from '../mod.ts';
import type { Indicator } from '../src/types.ts';

// Sample indicators for testing
const sampleIndicators: Indicator[] = [
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
    sample_values: [3.7, 3.9, 3.8, 3.9, 4.0],
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
  {
    name: 'S&P 500 Index',
    units: 'index',
    periodicity: 'daily',
    sample_values: [4567, 4589, 4543, 4612],
  },
  {
    name: 'Housing Starts',
    units: 'thousands of units',
    periodicity: 'monthly',
    sample_values: [1331, 1521, 1321, 1360],
  },
  {
    name: '10-Year Treasury Yield',
    units: '%',
    periodicity: 'daily',
    sample_values: [4.18, 4.22, 4.15, 4.28],
  },
  {
    name: 'VIX Volatility Index',
    units: 'index',
    periodicity: 'daily',
    sample_values: [14.2, 15.8, 13.5, 16.3],
  },
  {
    name: 'Consumer Sentiment Index',
    units: 'index',
    periodicity: 'monthly',
    sample_values: [79.0, 76.9, 79.4, 77.2],
  },
];

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('DRY RUN EXAMPLE - Cost Estimation Without LLM Calls');
  console.log('='.repeat(70));

  // Example 1: Basic dry run
  console.log('\n📝 Example 1: Basic Dry Run\n');

  const dryRunResult = await classifyIndicatorsWithOptions(sampleIndicators, {
    llmConfig: {
      provider: 'openai',
      apiKey: 'not-needed-for-dry-run', // No actual call made
      model: 'gpt-4o-mini',
    },
    dryRun: true, // 👈 Enable dry run mode
  });

  // The result contains mock classifications with estimated costs
  console.log('\n✅ Dry run complete! Mock classifications generated.');
  console.log(`Total estimated cost: ${getCostSummary(dryRunResult).totalCostFormatted}`);

  // Example 2: Compare different providers
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 Example 2: Cost Comparison Across Providers\n');

  const providers: Array<'openai' | 'anthropic' | 'gemini'> = ['openai', 'anthropic', 'gemini'];
  const comparisons = [];

  for (const provider of providers) {
    const result = await classifyIndicatorsWithOptions(sampleIndicators, {
      llmConfig: {
        provider,
        apiKey: 'not-needed',
      },
      dryRun: true,
      debug: false, // Suppress individual batch output
    });

    const summary = getCostSummary(result);
    comparisons.push({
      provider,
      model: summary.model,
      cost: summary.totalCost,
      formatted: summary.totalCostFormatted,
      tokens: summary.totalTokens,
    });
  }

  console.log('Provider Comparison:');
  console.log('-'.repeat(70));
  console.log('Provider    | Model                          | Cost       | Tokens');
  console.log('-'.repeat(70));

  for (const comp of comparisons) {
    const providerStr = comp.provider.padEnd(11);
    const modelStr = comp.model.substring(0, 30).padEnd(30);
    const costStr = comp.formatted.padEnd(10);
    const tokensStr = comp.tokens.toLocaleString();

    console.log(`${providerStr} | ${modelStr} | ${costStr} | ${tokensStr}`);
  }

  // Example 3: With vs without reasoning
  console.log('\n\n' + '='.repeat(70));
  console.log('💭 Example 3: Impact of Reasoning on Cost\n');

  const withoutReasoning = await classifyIndicatorsWithOptions(sampleIndicators, {
    llmConfig: { provider: 'openai', apiKey: 'not-needed', model: 'gpt-4o-mini' },
    includeReasoning: false,
    dryRun: true,
    debug: false,
  });

  const withReasoning = await classifyIndicatorsWithOptions(sampleIndicators, {
    llmConfig: { provider: 'openai', apiKey: 'not-needed', model: 'gpt-4o-mini' },
    includeReasoning: true,
    dryRun: true,
    debug: false,
  });

  const summaryWithout = getCostSummary(withoutReasoning);
  const summaryWith = getCostSummary(withReasoning);

  console.log('Without Reasoning:');
  console.log(`  Tokens: ${summaryWithout.totalTokensFormatted}`);
  console.log(`  Cost:   ${summaryWithout.totalCostFormatted}`);

  console.log('\nWith Reasoning:');
  console.log(`  Tokens: ${summaryWith.totalTokensFormatted}`);
  console.log(`  Cost:   ${summaryWith.totalCostFormatted}`);

  const tokenIncrease = ((summaryWith.totalTokens - summaryWithout.totalTokens) /
    summaryWithout.totalTokens) * 100;
  const costIncrease = ((summaryWith.totalCost - summaryWithout.totalCost) /
    summaryWithout.totalCost) * 100;

  console.log('\nImpact:');
  console.log(`  Token increase: +${tokenIncrease.toFixed(1)}%`);
  console.log(`  Cost increase:  +${costIncrease.toFixed(1)}%`);

  // Example 4: Test large batches
  console.log('\n\n' + '='.repeat(70));
  console.log('📦 Example 4: Estimate Cost for Large Datasets\n');

  // Generate a larger dataset
  const largeDataset: Indicator[] = [];
  for (let i = 0; i < 100; i++) {
    const baseIndicator = sampleIndicators[i % sampleIndicators.length];
    largeDataset.push({
      ...baseIndicator,
      name: `${baseIndicator.name} ${i + 1}`,
      id: `indicator_${i}`,
    });
  }

  const largeResult = await classifyIndicatorsWithOptions(largeDataset, {
    llmConfig: { provider: 'openai', apiKey: 'not-needed', model: 'gpt-4o-mini' },
    batchSize: 25,
    dryRun: true,
    debug: false,
  });

  const largeSummary = getCostSummary(largeResult);

  console.log(`Dataset size: ${largeDataset.length} indicators`);
  console.log(`Estimated total cost: ${largeSummary.totalCostFormatted}`);
  console.log(`Avg cost per indicator: ${largeSummary.avgCostPerIndicatorFormatted}`);
  console.log(`Total tokens: ${largeSummary.totalTokensFormatted}`);

  // Project costs for even larger datasets
  const { projectCost } = await import('../src/utils/cost_summary.ts');

  console.log('\nProjections based on this estimate:');
  console.log('-'.repeat(70));

  const projections = [1000, 10000, 100000, 1000000];
  for (const count of projections) {
    const projection = projectCost(largeResult, count);
    console.log(`  ${count.toLocaleString().padEnd(10)} indicators: ${projection.totalCostFormatted.padEnd(12)} (${projection.estimatedTimeFormatted})`);
  }

  // Example 5: Batch size impact
  console.log('\n\n' + '='.repeat(70));
  console.log('⚙️  Example 5: Batch Size Impact\n');

  const batchSizes = [5, 10, 25, 50];
  const testSet = sampleIndicators.slice(0, 25); // Use 25 indicators

  console.log('Testing different batch sizes (25 indicators):');
  console.log('-'.repeat(70));

  for (const batchSize of batchSizes) {
    const result = await classifyIndicatorsWithOptions(testSet, {
      llmConfig: { provider: 'openai', apiKey: 'not-needed', model: 'gpt-4o-mini' },
      batchSize,
      dryRun: true,
      debug: false,
    });

    const summary = getCostSummary(result);
    const apiCalls = Math.ceil(testSet.length / batchSize);

    console.log(`  Batch size ${batchSize.toString().padEnd(2)}: ${apiCalls} API calls, ${summary.totalCostFormatted} estimated`);
  }

  // Example 6: Cost Projection Table
  console.log('\n' + '='.repeat(70));
  console.log('💰 Example 6: Cost Projection Table for Different Scales');
  console.log('='.repeat(70) + '\n');

  // Define models and quantities
  const models = [
    { provider: 'gemini' as const, model: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { provider: 'openai' as const, model: 'gpt-4o', label: 'GPT-4o' },
    { provider: 'anthropic' as const, model: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  ];
  const quantities = [500, 1000, 5000, 10000, 50000, 100000];

  // Run a small dry run to get base metrics
  const baseResult = await classifyIndicatorsWithOptions(
    sampleIndicators.slice(0, 10),
    {
      llmConfig: { provider: 'openai', apiKey: 'not-needed' },
      dryRun: true,
      debug: false,
    }
  );

  const avgTokensPerIndicator = baseResult.tokenUsage.totalTokens / baseResult.summary.total;

  // Calculate costs for each model and quantity
  const { calculateCost } = await import('../src/utils/token_counter.ts');

  console.log('Based on estimated token usage of ~' + Math.round(avgTokensPerIndicator) + ' tokens per indicator:\n');
  console.log('┌─────────────┬────────────────────┬─────────────┬──────────────────┬─────────────────────┐');
  console.log('│ Indicators  │ Gemini 2.5 Flash   │ GPT-4o      │ Claude 3.5 Sonnet│ Cheapest Option     │');
  console.log('├─────────────┼────────────────────┼─────────────┼──────────────────┼─────────────────────┤');

  for (const quantity of quantities) {
    const inputTokens = Math.round(avgTokensPerIndicator * quantity * 0.7); // ~70% input
    const outputTokens = Math.round(avgTokensPerIndicator * quantity * 0.3); // ~30% output

    const costs = models.map(({ provider, model }) => ({
      label: model,
      cost: calculateCost(inputTokens, outputTokens, provider, model),
    }));

    const minCost = Math.min(...costs.map(c => c.cost));
    const cheapest = costs.find(c => c.cost === minCost);

    const formatCost = (cost: number) => {
      if (cost === 0) return 'Free';
      return '$' + cost.toFixed(2).padStart(8);
    };

    console.log(
      '│ ' + quantity.toLocaleString().padEnd(11) + ' │ ' +
      formatCost(costs[0].cost).padEnd(18) + ' │ ' +
      formatCost(costs[1].cost).padEnd(11) + ' │ ' +
      formatCost(costs[2].cost).padEnd(16) + ' │ ' +
      (cheapest?.label.includes('gemini') ? 'Gemini' : cheapest?.label.includes('gpt') ? 'GPT-4o' : 'Claude').padEnd(19) + ' │'
    );
  }

  console.log('└─────────────┴────────────────────┴─────────────┴──────────────────┴─────────────────────┘');

  console.log('\n' + '='.repeat(70));
  console.log('✅ All dry run examples complete!');
  console.log('   No actual LLM calls were made, no API keys required.');
  console.log('='.repeat(70) + '\n');
}

if (import.meta.main) {
  main();
}
