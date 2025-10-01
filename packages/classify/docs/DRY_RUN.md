# Dry Run Mode

Test and estimate costs without making actual LLM API calls.

## Overview

Dry run mode allows you to:
- ✅ **Estimate costs** before spending money
- ✅ **Test configurations** without API keys
- ✅ **Compare providers** side-by-side
- ✅ **Validate batching** strategies
- ✅ **Generate mock data** for testing

## Quick Start

Simply add `dryRun: true` to your options:

```typescript
import { classifyIndicatorsWithOptions } from '@tellimer/classify';

const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: {
    provider: 'openai',
    apiKey: 'not-needed-for-dry-run', // Any value works
    model: 'gpt-4o-mini',
  },
  dryRun: true, // 👈 Enable dry run
});

console.log(`Estimated cost: $${result.tokenUsage.estimatedCost}`);
```

## What Dry Run Does

### ✅ Simulates

- **Token estimation** - Uses 4 chars ≈ 1 token heuristic
- **Cost calculation** - Based on current provider pricing
- **Batch processing** - Shows how batches would be processed
- **Mock classifications** - Generates plausible classifications based on indicator names/units

### ❌ Does NOT

- Make actual API calls
- Require valid API keys
- Produce real LLM classifications
- Consume credits or incur costs

## Output Example

```
============================================================
🔍 DRY RUN MODE - No LLM calls will be made
============================================================
Total indicators:        25
Batch size:              10
Provider:                openai
Model:                   gpt-4o-mini
Include reasoning:       no
============================================================

📦 Batch 1/3
   Indicators: 10
   Input tokens: 3,850
   Output tokens: 1,500
   Total tokens: 5,350
   Estimated cost: $0.000803
   ✓ GDP → flow [MOCK]
   ✓ Unemployment Rate → percentage [MOCK]
   ...

============================================================
🔍 DRY RUN SUMMARY
============================================================
Total indicators:        25
✓ Successfully classified: 25
✗ Failed:                  0
Success rate:            100.0%
Simulated API calls:     3
Processing time:         12ms

TOKEN USAGE & COST (ESTIMATED)
============================================================
Input tokens:            12,450
Output tokens:           3,750
Total tokens:            16,200
Model:                   openai/gpt-4o-mini

💰 TOTAL ESTIMATED COST:  $0.002430

⚠️  This was a DRY RUN - no actual LLM calls were made
   Costs and tokens are estimates based on heuristics
   Classifications are mock data for testing
============================================================
```

## Use Cases

### 1. Estimate Costs Before Running

```typescript
// Test cost before committing
const dryRun = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: config,
  dryRun: true,
});

if (dryRun.tokenUsage.estimatedCost > 0.10) {
  console.warn('Cost exceeds budget, aborting');
  Deno.exit(1);
}

// Proceed with actual classification
const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: config,
  dryRun: false, // or omit - false is default
});
```

### 2. Compare Provider Costs

```typescript
const providers: Array<'openai' | 'anthropic' | 'gemini'> = [
  'openai',
  'anthropic',
  'gemini'
];

for (const provider of providers) {
  const dryRun = await classifyIndicatorsWithOptions(indicators, {
    llmConfig: { provider, apiKey: 'not-needed' },
    dryRun: true,
  });

  console.log(`${provider}: ${getCostSummary(dryRun).totalCostFormatted}`);
}

// Output:
// openai: $0.002430
// anthropic: $0.007200
// gemini: $0.000000 (free preview)
```

### 3. Test Batching Strategies

```typescript
const batchSizes = [5, 10, 25, 50];

for (const batchSize of batchSizes) {
  const dryRun = await classifyIndicatorsWithOptions(indicators, {
    llmConfig: config,
    batchSize,
    dryRun: true,
  });

  const apiCalls = Math.ceil(indicators.length / batchSize);
  console.log(`Batch ${batchSize}: ${apiCalls} API calls, ${dryRun.tokenUsage.estimatedCost.toFixed(6)}`);
}
```

### 4. Validate Without API Keys

Perfect for CI/CD, testing, or sharing examples:

```typescript
// No API key needed!
const dryRun = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: {
    provider: 'openai',
    apiKey: 'test-mode', // Any string works
  },
  dryRun: true,
});

// Use mock classifications for testing
assert(dryRun.enriched.length === indicators.length);
assert(dryRun.tokenUsage.estimatedCost > 0);
```

### 5. Test Large Datasets

```typescript
// Generate 1000 test indicators
const largeDataset = generateTestIndicators(1000);

const dryRun = await classifyIndicatorsWithOptions(largeDataset, {
  llmConfig: { provider: 'openai', apiKey: 'test' },
  batchSize: 25,
  dryRun: true,
});

console.log(`Cost for 1000 indicators: ${getCostSummary(dryRun).totalCostFormatted}`);
// Output: "Cost for 1000 indicators: $0.097200"
```

## Mock Classifications

Dry run generates realistic mock classifications using simple heuristics:

```typescript
// Input indicator
{
  name: "GDP",
  units: "USD billions",
  currency_code: "USD"
}

// Mock classification output
{
  indicator_type: "flow",
  indicator_category: "physical-fundamental",
  is_monetary: true,
  temporal_aggregation: "period-rate",
  heat_map_orientation: "higher-is-positive",
  confidence: 0.85,
  reasoning: "[DRY RUN] This is a simulated classification..."
}
```

### Heuristics Used

- Name contains "GDP", "revenue", "export" → `flow`
- Name contains "debt", "stock", "reserve" → `stock`
- Units contain "%" → `percentage` or `rate`
- Name contains "index" → `index`
- Currency code present → `is_monetary: true`
- Name contains "unemployment", "deficit" → `lower-is-positive`

## Estimation Accuracy

### Token Estimation

Dry run uses a simple heuristic: **~4 characters = 1 token**

**Accuracy:** ±10-20% of actual tokens

**Why estimates vary:**
- Actual tokenization is complex (subword units)
- JSON structure adds overhead
- System prompts vary by provider

### Cost Estimation

Based on current pricing (Jan 2025):

**Accuracy:** High (±5%) if token estimate is accurate

**Note:** Provider pricing may change. Update `src/utils/token_counter.ts` if needed.

## Combining with Debug Mode

```typescript
const dryRun = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: config,
  dryRun: true,
  debug: true, // Show detailed batch-by-batch output
});
```

## Complete Example

See [examples/dry_run_example.ts](../examples/dry_run_example.ts) for:
- Basic dry run
- Provider comparison
- With/without reasoning comparison
- Large dataset estimation
- Batch size impact analysis

Run with:
```bash
deno run --allow-env --allow-net examples/dry_run_example.ts
```

## Limitations

### What's Estimated

- ✅ Token counts (±20% accuracy)
- ✅ Costs (based on estimated tokens)
- ✅ Batch processing (exact)
- ✅ API call counts (exact)

### What's NOT Estimated

- ❌ Actual LLM quality/accuracy
- ❌ Latency/response time (returns instantly)
- ❌ Rate limiting behavior
- ❌ Network errors
- ❌ Retry attempts

### Mock Classifications

Mock classifications are **for testing only**:
- Based on simple heuristics
- Not as accurate as real LLM classifications
- Always return `confidence: 0.85`
- Include `[DRY RUN]` prefix in reasoning

**Do not use for production data!**

## Best Practices

### 1. Use for Budgeting

```typescript
// Estimate before committing
const sample = indicators.slice(0, 10);
const dryRun = await classifyIndicatorsWithOptions(sample, {
  llmConfig: config,
  dryRun: true,
});

const avgCost = dryRun.tokenUsage.estimatedCost / sample.length;
const totalCost = avgCost * indicators.length;

if (totalCost > BUDGET) {
  console.error(`Estimated cost $${totalCost} exceeds budget`);
}
```

### 2. Test Before Production

```typescript
// Validate configuration works
const dryRun = await classifyIndicatorsWithOptions(testData, {
  llmConfig: productionConfig,
  dryRun: true,
});

assert(dryRun.summary.successRate === 100);
assert(dryRun.enriched.length === testData.length);

// Now run for real
const result = await classifyIndicatorsWithOptions(productionData, {
  llmConfig: productionConfig,
});
```

### 3. Document Examples

```typescript
// No API key needed for documentation
const example = await classifyIndicatorsWithOptions(sampleData, {
  llmConfig: { provider: 'openai', apiKey: 'demo' },
  dryRun: true,
});

// Safe to commit to git!
```

### 4. Compare Options

```typescript
// Test reasoning impact
const without = await classifyIndicatorsWithOptions(data, {
  llmConfig: config,
  includeReasoning: false,
  dryRun: true,
});

const with = await classifyIndicatorsWithOptions(data, {
  llmConfig: config,
  includeReasoning: true,
  dryRun: true,
});

console.log(`Reasoning adds ${(with.tokenUsage.estimatedCost / without.tokenUsage.estimatedCost - 1) * 100}% cost`);
```

## API Reference

### `dryRun` Option

```typescript
interface ClassificationOptions {
  // ...
  dryRun?: boolean; // Default: false
}
```

When `true`:
- Skips actual LLM API calls
- Generates mock classifications
- Estimates tokens and costs
- Returns immediately (no network latency)

### Result Structure

Same as normal mode, but:
- `tokenUsage` contains estimates
- `performance.throughput` is artificially high (no network delay)
- `enriched[].classification.reasoning` has `[DRY RUN]` prefix

## FAQ

**Q: Do I need an API key for dry run?**
A: No! Any string works. The API key is never used.

**Q: Are cost estimates accurate?**
A: Within ±20%. Actual costs may vary based on exact tokenization.

**Q: Can I use mock classifications in production?**
A: No! They're for testing only. Use real classifications in production.

**Q: Does dry run test my API key?**
A: No. It doesn't make any API calls, so the key is never validated.

**Q: Can I trust the mock indicator types?**
A: For rough testing, yes. For accuracy, use real LLM classifications.

**Q: How fast is dry run?**
A: Near-instant. No network calls are made.

**Q: Will dry run catch configuration errors?**
A: Some (like missing required fields), but not all (like invalid API keys).

## Integration Test Costs

Our test suite includes **33 integration test indicators** across 8 fixture files. Here are the estimated costs for running the full integration test suite with real LLM calls:

| Provider | Model | Estimated Cost |
|----------|-------|----------------|
| Gemini | gemini-2.5-flash | **Free** |
| OpenAI | gpt-4o-mini | **$0.01** |
| OpenAI | gpt-4o | **$0.09** |
| Anthropic | claude-3-5-sonnet-20241022 | **$0.12** |

**Recommendation:** Use `dryRun: true` for regular testing, or use Gemini 2.5 Flash (free tier) for integration tests to avoid costs.

### Fixture Breakdown

- `change_movement.json`: 3 indicators
- `composite_derived.json`: 4 indicators
- `edge_cases.json`: 8 indicators
- `numeric_measurement.json`: 5 indicators
- `physical_fundamental.json`: 6 indicators
- `price_value.json`: 2 indicators
- `qualitative.json`: 2 indicators
- `temporal.json`: 3 indicators

**Total: 33 indicators**

## See Also

- [Cost Tracking Guide](./COST_TRACKING.md)
- [Dry Run Example](../examples/dry_run_example.ts)
- [Quick Cost Guide](../QUICK_COST_GUIDE.md)
