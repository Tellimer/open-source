# Quick Start Guide

Get started with @tellimer/classify in 5 minutes.

## Installation

```bash
deno add @tellimer/classify
```

## Basic Usage

### 1. Set up your API key

```bash
# Choose one provider
export OPENAI_API_KEY="sk-..."
# or
export ANTHROPIC_API_KEY="sk-ant-..."
# or
export GEMINI_API_KEY="AIza..."
```

### 2. Create your first classification

```typescript
import { classifyIndicators } from "@tellimer/classify";

// Define your indicators
const indicators = [
  {
    name: "GDP",
    units: "USD billions",
    currency_code: "USD",
    periodicity: "quarterly",
    sample_values: [21000, 21500, 22000],
  },
  {
    name: "Unemployment Rate",
    units: "%",
    periodicity: "monthly",
    sample_values: [3.5, 3.6, 3.7],
  },
];

// Configure your LLM
const config = {
  provider: "openai", // or "anthropic" or "gemini"
  apiKey: Deno.env.get("OPENAI_API_KEY")!,
};

// Classify!
const enriched = await classifyIndicators(indicators, config);

// Use the results
for (const indicator of enriched) {
  console.log(`${indicator.name}:`);
  console.log(`  Type: ${indicator.classification.indicator_type}`);
  console.log(`  Monetary: ${indicator.classification.is_monetary}`);
  console.log(`  Cumulative: ${indicator.classification.is_cumulative}`);
}
```

### 3. Run it

```bash
deno run --allow-net --allow-env your-script.ts
```

## Output Example

```
GDP:
  Type: flow
  Monetary: true
  Cumulative: false
  Heat Map: higher-is-positive

Unemployment Rate:
  Type: percentage
  Monetary: false
  Cumulative: false
  Heat Map: lower-is-positive
```

## Next Steps

### Add Error Handling

```typescript
import { classifyIndicatorsWithOptions } from "@tellimer/classify";

const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: {
    provider: "openai",
    apiKey: Deno.env.get("OPENAI_API_KEY")!,
  },
  batchSize: 5,
  maxRetries: 3,
  debug: true,
});

console.log(`Success: ${result.enriched.length}`);
console.log(`Failed: ${result.failed.length}`);
```

### Switch Providers

```typescript
// OpenAI
const config1 = {
  provider: "openai",
  apiKey: "sk-...",
  model: "gpt-4o",
};

// Anthropic
const config2 = {
  provider: "anthropic",
  apiKey: "sk-ant-...",
  model: "claude-3-5-sonnet-20241022",
};

// Gemini
const config3 = {
  provider: "gemini",
  apiKey: "AIza...",
  model: "gemini-2.0-flash-thinking-exp-01-21",
};
```

### Customize Parameters

```typescript
const config = {
  provider: "openai",
  apiKey: "sk-...",
  temperature: 0.0, // More deterministic
  maxTokens: 1500, // Limit response length
  timeout: 20000, // 20 second timeout
};
```

## Common Use Cases

### Classify a Single Indicator

```typescript
import { classifyIndicator } from "@tellimer/classify";

const indicator = {
  name: "Consumer Price Index",
  units: "Index (2015=100)",
  periodicity: "monthly",
};

const enriched = await classifyIndicator(indicator, config);
console.log(enriched.classification.indicator_type); // "index"
```

### Batch Processing Large Datasets

```typescript
const result = await classifyIndicatorsWithOptions(largeDataset, {
  llmConfig: config,
  batchSize: 10, // Process 10 at a time
  debug: true, // See progress
});
```

### Get Reasoning

```typescript
const enriched = await classifyIndicators(indicators, {
  ...config,
  includeReasoning: true,
});

console.log(enriched[0].classification.reasoning);
// "This is a flow indicator because GDP measures..."
```

## Troubleshooting

### API Key Not Found

```typescript
const apiKey = Deno.env.get("OPENAI_API_KEY");
if (!apiKey) {
  throw new Error("OPENAI_API_KEY environment variable not set");
}
```

### Rate Limiting

```typescript
const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: config,
  batchSize: 5, // Smaller batches
  maxRetries: 5, // More retries
  retryDelay: 2000, // Longer delay
});
```

### Timeout Errors

```typescript
const config = {
  provider: "openai",
  apiKey: "sk-...",
  timeout: 60000, // Increase to 60 seconds
};
```

## More Information

- [Full README](./README.md) - Complete documentation
- [Examples](./examples/) - More usage examples
- [API Reference](./README.md#api-reference) - Detailed API docs
- [Contributing](./CONTRIBUTING.md) - How to contribute

## Support

- [GitHub Issues](https://github.com/Tellimer/open-source/issues)
- [Main Repository](https://github.com/Tellimer/open-source)

