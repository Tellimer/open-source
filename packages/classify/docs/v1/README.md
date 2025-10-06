# V1 Pipeline Documentation

The V1 pipeline is the default classification system for @tellimer/classify. It provides single-pass classification with robust retry logic and comprehensive error handling.

## Overview

V1 uses a single LLM call to classify indicators with all metadata in one request. It includes:

- **ID-based pairing** - Automatic unique ID generation for reliable response matching
- **Individual retry logic** - Failed indicators retry up to 3 times with exponential backoff
- **Batch processing** - Efficient batching with configurable sizes
- **Multi-provider support** - OpenAI, Anthropic, and Google Gemini
- **Comprehensive statistics** - Detailed success/failure tracking

## Quick Start

```typescript
import { classifyIndicators } from "@tellimer/classify";

const indicators = [
  {
    name: "Gross Domestic Product",
    units: "USD billions",
    currency_code: "USD",
    periodicity: "quarterly",
    source: "World Bank",
    sample_values: [21000, 21500, 22000],
  },
];

const config = {
  provider: "openai",
  apiKey: "your-openai-api-key",
  model: "gpt-4o",
};

const enriched = await classifyIndicators(indicators, config);
console.log(enriched[0].classification);
```

## Key Features

### 1. ID-Based Pairing

Every indicator gets a unique ID (auto-generated or provided):

```typescript
// Auto-generated IDs
const indicators = [
  { name: "GDP", units: "USD billions" },
  { name: "Unemployment Rate", units: "%" },
];

const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: { provider: "openai", apiKey: "..." },
});

// Each enriched indicator has matching ID
console.log(result.enriched[0].id); // "ind_1_1234567890_abc123"
console.log(result.enriched[0].classification.indicator_id); // Same ID
```

See [Pairing and Retry Logic](../PAIRING_AND_RETRY.md) for details.

### 2. Batch Processing

Process multiple indicators efficiently:

```typescript
import { classifyIndicatorsWithOptions } from "@tellimer/classify";

const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: {
    provider: "anthropic",
    apiKey: "your-api-key",
  },
  batchSize: 5, // Process 5 indicators per API call
  includeReasoning: true,
  maxRetries: 3,
  retryDelay: 1000,
  debug: true,
});
```

### 3. Comprehensive Statistics

Track classification performance:

```typescript
console.log(`Total indicators: ${result.summary.total}`);
console.log(`Successfully classified: ${result.summary.successful}`);
console.log(`Failed: ${result.summary.failed}`);
console.log(`Success rate: ${result.summary.successRate.toFixed(1)}%`);
console.log(`Processing time: ${result.processingTime}ms`);
console.log(`API calls made: ${result.apiCalls}`);
console.log(`Retries performed: ${result.retries}`);

// Handle failures with retry information
for (const failure of result.failed) {
  console.error(
    `Failed to classify ${failure.indicator.name}: ${failure.error} (after ${failure.retries} retries)`
  );
}
```

## API Reference

### Functions

#### `classifyIndicators(indicators, config)`

Simple classification for multiple indicators.

```typescript
const enriched = await classifyIndicators(indicators, {
  provider: "openai",
  apiKey: "sk-...",
  model: "gpt-4o",
});
```

#### `classifyIndicator(indicator, config)`

Classify a single indicator.

```typescript
const enriched = await classifyIndicator(indicator, {
  provider: "openai",
  apiKey: "sk-...",
});
```

#### `classifyIndicatorsWithOptions(indicators, options)`

Advanced classification with batching and comprehensive results.

```typescript
const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: { provider: "openai", apiKey: "..." },
  batchSize: 5,
  includeReasoning: true,
  maxRetries: 3,
  retryDelay: 1000,
  debug: true,
});
```

### Types

See the [main README](../../README.md#api-reference) for complete type definitions:

- `Indicator` - Input indicator
- `ClassifiedMetadata` - LLM-classified metadata
- `EnrichedIndicator` - Indicator with classification
- `LLMConfig` - Provider configuration
- `ClassificationOptions` - Advanced options
- `ClassificationResult` - Complete result with statistics

## Classification Output

V1 classifies each indicator with:

- **indicator_category** - One of 7 categories (physical-fundamental, numeric-measurement, etc.)
- **indicator_type** - One of 26 types (stock, flow, count, percentage, index, etc.)
- **temporal_aggregation** - How values aggregate over time
- **is_monetary** - Whether the indicator is monetary
- **heat_map_orientation** - Visualization direction (higher-is-positive, lower-is-positive, neutral)
- **confidence** - Classification confidence (0-1)
- **reasoning** - LLM reasoning (optional)

See [Type Validation](../TYPE_VALIDATION.md) for the complete type system.

## Error Handling

V1 includes robust error handling:

```typescript
import { ClassificationError } from "@tellimer/classify";

try {
  const enriched = await classifyIndicators(indicators, config);
} catch (error) {
  if (error instanceof ClassificationError) {
    console.error(`Provider: ${error.provider}`);
    console.error(`Message: ${error.message}`);
    console.error(`Cause:`, error.cause);
  }
}
```

### Individual Retry Logic

Failed indicators automatically retry up to 3 times:

1. Initial batch processing attempt
2. If batch fails, each failed indicator retried individually
3. Exponential backoff between retries (1s, 2s, 4s)
4. Detailed error tracking per indicator

## LLM Providers

V1 supports three providers with automatic model defaults:

### OpenAI

```typescript
const config = {
  provider: "openai",
  apiKey: "sk-...",
  model: "gpt-4o", // or "gpt-4o-mini", "gpt-4-turbo"
  temperature: 0.1,
  maxTokens: 2000,
};
```

### Anthropic Claude

```typescript
const config = {
  provider: "anthropic",
  apiKey: "sk-ant-...",
  model: "claude-3-5-sonnet-20241022", // or "claude-3-opus-20240229"
  temperature: 0.1,
  maxTokens: 2000,
};
```

### Google Gemini

```typescript
const config = {
  provider: "gemini",
  apiKey: "AIza...",
  model: "gemini-2.0-flash-thinking-exp-01-21", // or "gemini-1.5-pro"
  temperature: 0.1,
  maxTokens: 2000,
};
```

## Performance

V1 pipeline performance benchmarks:

- **GPT-4o**: ~2-3s per batch of 10 indicators
- **Claude 3.5 Sonnet**: ~3-4s per batch of 10 indicators
- **Gemini 2.0 Flash**: ~1-2s per batch of 10 indicators (fastest)

See [Benchmarking](../BENCHMARKING.md) for detailed metrics.

## Cost Estimation

Estimate costs before processing:

```typescript
import { estimateCost } from "@tellimer/classify";

const estimate = estimateCost(indicators, {
  provider: "openai",
  model: "gpt-4o",
});

console.log(`Estimated cost: $${estimate.totalCost.toFixed(4)}`);
console.log(`Input tokens: ${estimate.inputTokens}`);
console.log(`Output tokens: ${estimate.outputTokens}`);
```

See [Cost Tracking](../COST_TRACKING.md) for pricing details.

## Dry Run Mode

Test without API calls:

```typescript
import { dryRunClassification } from "@tellimer/classify";

const result = await dryRunClassification(indicators, {
  provider: "openai",
  model: "gpt-4o",
});

console.log("Dry run complete - no API calls made");
console.log(`Estimated cost: $${result.estimatedCost}`);
```

See [Dry Run Mode](../DRY_RUN.md) for details.

## Testing

V1 includes comprehensive test coverage:

```bash
# Run all tests (unit + integration)
deno task test

# Run only unit tests (no API calls)
deno task test:unit

# Run only integration tests (requires API keys)
deno task test:int

# Run with coverage
deno task test:cov
```

See [Testing Guide](../TESTING_GUIDE.md) for details.

## Upgrading to V2

V2 provides multi-stage classification with persistent state and quality control. See the [Migration Guide](../MIGRATION.md) to upgrade.

Key V2 benefits:
- Family-based routing for better accuracy
- Persistent SQLite database
- Quality flagging and LLM review
- Detailed stage-by-stage metrics
- Resume capability

## Related Documentation

- [Type Validation](../TYPE_VALIDATION.md) - Indicator type system
- [Prompt Engineering](../PROMPT_ENGINEERING.md) - How prompts work
- [Pairing and Retry](../PAIRING_AND_RETRY.md) - ID pairing and retry logic
- [Performance](../PERFORMANCE_SUMMARY.md) - Performance analysis
- [Cost Tracking](../COST_TRACKING.md) - Cost estimation
