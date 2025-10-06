# Quick Cost Guide

Get the total estimated cost for your classification runs in seconds.

## TL;DR - Show Me the Cost!

```typescript
import { classifyIndicatorsWithOptions, getCostSummary } from '@tellimer/classify';

const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: { provider: 'openai', apiKey: 'sk-...' }
});

// Method 1: Direct access
console.log(`Total cost: $${result.tokenUsage.estimatedCost}`);

// Method 2: Formatted
const summary = getCostSummary(result);
console.log(`Total cost: ${summary.totalCostFormatted}`); // "$0.002419"
```

## Quick Examples

### Get Total Cost

```typescript
const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: { provider: 'openai', apiKey: 'sk-...' }
});

// Total cost for this run
console.log(`💰 Total: $${result.tokenUsage.estimatedCost.toFixed(6)}`);
// Output: "💰 Total: $0.002419"
```

### Get Cost Per Indicator

```typescript
const avgCost = result.performance.avgCostPerIndicator;
console.log(`Avg cost per indicator: $${avgCost.toFixed(6)}`);
// Output: "Avg cost per indicator: $0.000097"
```

### Print Full Cost Summary

```typescript
import { printCostSummary } from '@tellimer/classify';

printCostSummary(result);
```

**Output:**
```
============================================================
💰 COST SUMMARY
============================================================
Provider:              openai
Model:                 gpt-4o-mini
Indicators processed:  25

Total tokens:          16,130
  Input tokens:        12,450
  Output tokens:       3,680

💵 TOTAL COST:         $0.002419
   Per indicator:      $0.000097

Processing time:       3847ms
Throughput:            6.50 ind/sec
============================================================
```

### Project Costs for Large Datasets

```typescript
import { projectCost } from '@tellimer/classify';

// Based on sample run, project for 100,000 indicators
const projection = projectCost(result, 100000);
console.log(`Cost for 100k: ${projection.totalCostFormatted}`);
// Output: "Cost for 100k: $9.70"
```

### Print Cost Projections

```typescript
import { printCostProjections } from '@tellimer/classify';

printCostProjections(result, [100, 1000, 10000, 100000]);
```

**Output:**
```
======================================================================
📊 COST PROJECTIONS
======================================================================
Based on: 25 indicators @ $0.002419

Indicators | Est. Cost      | Est. Tokens    | Est. Time
----------------------------------------------------------------------
100        | $0.009676      | 64,520         | 15.4s
1,000      | $0.096760      | 645,200        | 2.6min
10,000     | $0.967600      | 6,452,000      | 25.6min
100,000    | $9.676000      | 64,520,000     | 4.3hr
======================================================================
```

## Enable Debug Mode

Show cost summary automatically:

```typescript
const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: { provider: 'openai', apiKey: 'sk-...' },
  debug: true  // 👈 Shows full breakdown
});
```

**Output:**
```
============================================================
CLASSIFICATION SUMMARY
============================================================
Total indicators:        25
✓ Successfully classified: 25
✗ Failed:                  0
Success rate:            100.0%
API calls made:          3
Retries performed:       0
Processing time:         3847ms

TOKEN USAGE & COST
============================================================
Input tokens:            12,450
Output tokens:           3,680
Total tokens:            16,130
Model:                   openai/gpt-4o-mini

💰 TOTAL ESTIMATED COST:  $0.002419

PERFORMANCE METRICS
============================================================
Avg time/indicator:      153.88ms
Throughput:              6.50 indicators/sec
Avg tokens/indicator:    672
Avg cost/indicator:      $0.000097
============================================================
```

## Cost Summary Object

All the data you need:

```typescript
import { getCostSummary } from '@tellimer/classify';

const summary = getCostSummary(result);
// {
//   totalCost: 0.002419,
//   totalCostFormatted: "$0.002419",
//   avgCostPerIndicator: 0.000097,
//   avgCostPerIndicatorFormatted: "$0.000097",
//   totalTokens: 16130,
//   totalTokensFormatted: "16,130",
//   inputTokens: 12450,
//   outputTokens: 3680,
//   provider: "openai",
//   model: "gpt-4o-mini",
//   successfulClassifications: 25,
//   processingTimeMs: 3847
// }
```

## Set Cost Budgets

```typescript
const MAX_COST = 0.10; // $0.10 budget

const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: { provider: 'openai', apiKey: 'sk-...' }
});

if (result.tokenUsage.estimatedCost > MAX_COST) {
  throw new Error(
    `Budget exceeded! $${result.tokenUsage.estimatedCost} > $${MAX_COST}`
  );
}
```

## Compare Providers

```typescript
const providers = ['openai', 'anthropic', 'gemini'];
const costs = [];

for (const provider of providers) {
  const result = await classifyIndicatorsWithOptions(sampleIndicators, {
    llmConfig: { provider, apiKey: keys[provider] }
  });

  costs.push({
    provider,
    cost: result.tokenUsage.estimatedCost,
    model: result.tokenUsage.model
  });
}

costs.sort((a, b) => a.cost - b.cost);
console.log('Cheapest:', costs[0]); // { provider: 'gemini', cost: 0, model: '...' }
```

## Run Examples

### Quick Cost Check
```bash
export OPENAI_API_KEY="sk-..."
deno run --allow-env --allow-net examples/quick_cost_check.ts
```

### Full Cost Analysis
```bash
deno task cost-analysis
```

## Typical Costs

**For 25 indicators:**

| Provider | Model | Estimated Cost |
|----------|-------|----------------|
| Gemini | 2.0 Flash Thinking | **$0.00** (free preview) |
| OpenAI | gpt-4o-mini | $0.0024 |
| Anthropic | Claude 3.5 Sonnet | $0.0072 |
| OpenAI | gpt-4o | $0.0194 |
| OpenAI | gpt-4 | $0.0485 |

**Scaling to 100,000 indicators:**

| Provider | Model | Projected Cost |
|----------|-------|----------------|
| Gemini | 2.0 Flash | **$0.00** |
| OpenAI | gpt-4o-mini | $9.70 |
| Anthropic | Claude 3.5 Sonnet | $28.80 |
| OpenAI | gpt-4o | $77.60 |
| OpenAI | gpt-4 | $194.00 |

## See Also

- [Full Cost Tracking Guide](./docs/COST_TRACKING.md)
- [Performance Benchmarks](./docs/BENCHMARKING.md)
- [Cost Analysis Example](./examples/cost_analysis.ts)
