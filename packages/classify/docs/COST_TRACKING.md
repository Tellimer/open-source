# Cost Tracking & Performance Analysis

Complete guide to using token usage tracking and performance metrics in @tellimer/classify.

## Overview

The package automatically tracks:
- **Token Usage** - Input, output, and total tokens consumed
- **Cost Estimation** - Real-time cost calculations based on provider pricing
- **Performance Metrics** - Throughput, latency, and efficiency metrics

All metrics are included in the `ClassificationResult` returned by `classifyIndicatorsWithOptions()`.

## Token Usage Tracking

### Automatic Tracking

Every classification operation tracks token usage:

```typescript
const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: { provider: 'openai', apiKey: 'sk-...' },
});

console.log(result.tokenUsage);
// {
//   inputTokens: 1250,
//   outputTokens: 450,
//   totalTokens: 1700,
//   estimatedCost: 0.000425,  // $0.000425 USD
//   provider: 'openai',
//   model: 'gpt-4o-mini'
// }
```

### Token Usage Fields

| Field | Type | Description |
|-------|------|-------------|
| `inputTokens` | `number` | Tokens in the prompt (indicator data + system prompt) |
| `outputTokens` | `number` | Tokens in the completion (classifications) |
| `totalTokens` | `number` | Sum of input and output tokens |
| `estimatedCost` | `number` | Estimated cost in USD |
| `provider` | `LLMProvider` | Provider used ('openai', 'anthropic', 'gemini') |
| `model` | `string` | Model used (e.g., 'gpt-4o-mini') |

## Cost Calculation

### Pricing Table (Per 1M Tokens)

#### OpenAI
| Model | Input | Output |
|-------|-------|--------|
| gpt-4o | $2.50 | $10.00 |
| gpt-4o-mini | $0.15 | $0.60 |
| gpt-4-turbo | $10.00 | $30.00 |

#### Anthropic
| Model | Input | Output |
|-------|-------|--------|
| claude-3-5-sonnet-20241022 | $3.00 | $15.00 |
| claude-3-opus-20240229 | $15.00 | $75.00 |
| claude-3-haiku-20240307 | $0.25 | $1.25 |

#### Google Gemini
| Model | Input | Output |
|-------|-------|--------|
| gemini-2.0-flash-thinking-exp | $0.00 | $0.00 (preview) |
| gemini-1.5-pro | $1.25 | $5.00 |
| gemini-1.5-flash | $0.075 | $0.30 |

### Cost Formula

```
cost = (inputTokens / 1,000,000 × inputPrice) + (outputTokens / 1,000,000 × outputPrice)
```

### Example Calculation

For 10 indicators with GPT-4o-mini:
```
Input:  1,200 tokens × $0.15/1M = $0.00018
Output:   800 tokens × $0.60/1M = $0.00048
Total:                            $0.00066
```

## Performance Metrics

### Available Metrics

```typescript
console.log(result.performance);
// {
//   avgTimePerIndicator: 245.6,        // milliseconds
//   throughput: 4.08,                   // indicators/sec
//   avgTokensPerIndicator: 170,        // tokens
//   avgCostPerIndicator: 0.000066      // USD
// }
```

| Metric | Type | Description |
|--------|------|-------------|
| `avgTimePerIndicator` | `number` | Average processing time per indicator (ms) |
| `throughput` | `number` | Indicators processed per second |
| `avgTokensPerIndicator` | `number` | Average tokens used per indicator |
| `avgCostPerIndicator` | `number` | Average cost per indicator (USD) |

## Cost Optimization Strategies

### 1. Use Cheaper Models

```typescript
// Expensive: GPT-4
const expensive = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: {
    provider: 'openai',
    apiKey: key,
    model: 'gpt-4'
  },
});
// Cost: ~$0.001 per indicator

// Affordable: GPT-4o-mini
const affordable = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: {
    provider: 'openai',
    apiKey: key,
    model: 'gpt-4o-mini'
  },
});
// Cost: ~$0.00006 per indicator (17x cheaper!)
```

### 2. Optimize Batch Size

Larger batches = fewer API calls = lower overhead:

```typescript
// Many small calls (less efficient)
const small = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: config,
  batchSize: 5,  // 20 API calls for 100 indicators
});

// Fewer large calls (more efficient)
const large = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: config,
  batchSize: 25, // 4 API calls for 100 indicators
});
```

### 3. Skip Reasoning When Not Needed

```typescript
// With reasoning (higher cost)
const withReasoning = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: config,
  includeReasoning: true,  // +40-60% tokens
});

// Without reasoning (lower cost)
const withoutReasoning = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: config,
  includeReasoning: false, // baseline
});
```

### 4. Consider Free Preview Models

```typescript
// Gemini 2.0 Flash Thinking is FREE during preview
const free = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: {
    provider: 'gemini',
    apiKey: geminiKey,
    model: 'gemini-2.0-flash-thinking-exp-01-21',
  },
});
// Cost: $0.00 🎉
```

## Cost Projection

### Project Costs for Large Datasets

```typescript
import { formatCost } from '@tellimer/classify/utils/token_counter';

const result = await classifyIndicatorsWithOptions(sampleIndicators, {
  llmConfig: config
});

const avgCost = result.performance.avgCostPerIndicator;

// Project for 100,000 indicators
const projection = avgCost * 100000;
console.log(`Cost for 100k indicators: ${formatCost(projection)}`);
// Output: "Cost for 100k indicators: $6.60"
```

### Break-Even Analysis

```typescript
const models = [
  { name: 'gpt-4o-mini', cost: 0.000066 },
  { name: 'claude-3-haiku', cost: 0.000045 },
  { name: 'gemini-1.5-flash', cost: 0.000038 },
];

const indicatorCounts = [1000, 10000, 100000];

for (const model of models) {
  console.log(`\n${model.name}:`);
  for (const count of indicatorCounts) {
    const cost = model.cost * count;
    console.log(`  ${count.toLocaleString()}: ${formatCost(cost)}`);
  }
}
```

## Monitoring & Alerts

### Track Costs in Production

```typescript
async function classifyWithBudget(
  indicators: Indicator[],
  config: LLMConfig,
  maxCost: number
) {
  const result = await classifyIndicatorsWithOptions(indicators, {
    llmConfig: config,
  });

  if (result.tokenUsage.estimatedCost > maxCost) {
    console.warn(
      `⚠️  Cost exceeded budget: ${formatCost(result.tokenUsage.estimatedCost)} > ${formatCost(maxCost)}`
    );
  }

  return result;
}
```

### Log Costs for Analytics

```typescript
const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: config,
});

// Send to analytics/monitoring service
await analytics.track('classification', {
  indicators: result.summary.total,
  success_rate: result.summary.successRate,
  tokens: result.tokenUsage.totalTokens,
  cost_usd: result.tokenUsage.estimatedCost,
  avg_time_ms: result.performance.avgTimePerIndicator,
  provider: result.tokenUsage.provider,
  model: result.tokenUsage.model,
  timestamp: new Date().toISOString(),
});
```

## Utility Functions

### Format Values

```typescript
import { formatCost, formatTokens } from '@tellimer/classify/utils/token_counter';

formatCost(0.001234);    // "$0.001234"
formatTokens(1500000);   // "1,500,000"
```

### Calculate Costs Manually

```typescript
import { calculateCost } from '@tellimer/classify/utils/token_counter';

const cost = calculateCost(
  1000,      // input tokens
  500,       // output tokens
  'openai',  // provider
  'gpt-4o-mini'
);

console.log(formatCost(cost)); // "$0.000450"
```

### Estimate Tokens

```typescript
import { estimateTokens } from '@tellimer/classify/utils/token_counter';

const text = "Gross Domestic Product measures...";
const tokens = estimateTokens(text);
console.log(`~${tokens} tokens`); // "~12 tokens"
```

## Best Practices

### 1. Always Use Debug Mode for Initial Testing

```typescript
const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: config,
  debug: true, // Shows cost breakdown
});
```

### 2. Monitor Cost Trends

Track average cost per indicator over time to detect:
- Model pricing changes
- Prompt inefficiencies
- Data complexity changes

### 3. Set Cost Budgets

```typescript
const COST_LIMIT = 0.10; // $0.10 max per batch

if (result.tokenUsage.estimatedCost > COST_LIMIT) {
  throw new Error('Cost limit exceeded');
}
```

### 4. Use Cost-Effective Models for Bulk Operations

For large-scale classification (>10k indicators):
- Use `gpt-4o-mini` or `gemini-1.5-flash`
- Avoid expensive models like `gpt-4` or `claude-3-opus`
- Consider batch processing overnight to reduce urgency

## Example: Cost Analysis Script

See [examples/cost_analysis.ts](../examples/cost_analysis.ts) for a complete cost analysis example that:
- Compares costs across different configurations
- Projects costs for large datasets
- Analyzes batch size impact
- Compares reasoning vs no reasoning

Run it with:
```bash
deno task cost-analysis
```

## Performance Benchmarks

Run benchmarks to measure performance on your hardware:

```bash
deno task bench
```

This will:
- Test different indicator counts (1, 10, 25, 50, 100)
- Compare batch sizes (5, 10, 25)
- Measure with/without reasoning
- Show throughput and latency metrics

## FAQ

**Q: Are costs estimated or exact?**
A: Costs are estimated based on token counts. Actual costs may vary slightly based on provider billing.

**Q: Can I use custom pricing?**
A: Token counting utilities are in `src/utils/token_counter.ts`. You can fork and modify the `PRICING` constant.

**Q: How accurate is token estimation?**
A: ~90% accurate. We use a simple heuristic (4 chars ≈ 1 token). For exact counts, check provider response metadata.

**Q: Do failed indicators count toward costs?**
A: Yes, if an API call was made. Retries also consume tokens/cost.

**Q: Which provider is cheapest?**
A: Currently Gemini 2.0 Flash (free preview), followed by Gemini 1.5 Flash ($0.075/$0.30 per 1M tokens).

## See Also

- [Performance Benchmarks](../tests/bench/classification_bench.ts)
- [Cost Analysis Example](../examples/cost_analysis.ts)
- [Provider Comparison](./PROVIDERS.md)
