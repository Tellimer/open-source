# @tellimer/classify - Package Summary

## Overview

A comprehensive LLM-powered economic indicator classification package for
TypeScript/Deno that automatically enriches indicator metadata using OpenAI,
Anthropic, or Google Gemini.

## Package Structure

```
packages/classify/
├── mod.ts                          # Main entry point
├── deno.json                       # Deno configuration
├── README.md                       # Full documentation
├── QUICK_START.md                  # Quick start guide
├── CHANGELOG.md                    # Version history
├── CONTRIBUTING.md                 # Contribution guidelines
├── LICENSE                         # MIT License
├── .gitignore                      # Git ignore rules
│
├── src/
│   ├── classify.ts                 # Main classification functions
│   ├── classify_test.ts            # Classification tests
│   ├── types.ts                    # TypeScript type definitions
│   │
│   └── providers/
│       ├── base.ts                 # Base provider utilities
│       ├── openai.ts               # OpenAI provider implementation
│       ├── anthropic.ts            # Anthropic provider implementation
│       ├── gemini.ts               # Google Gemini provider implementation
│       ├── index.ts                # Provider exports
│       └── providers_test.ts       # Provider tests
│
└── examples/
    ├── basic_usage.ts              # Basic usage examples
    ├── advanced_usage.ts           # Advanced features demo
    └── configuration_examples.ts   # Configuration examples
```

## Core Features

### 1. Multi-Provider LLM Support

- **OpenAI**: GPT-4o, GPT-4o-mini
- **Anthropic**: Claude 3.5 Sonnet
- **Google Gemini**: Gemini 2.0 Flash Thinking

### 2. Indicator Classification

Automatically classifies indicators into types:

- `stock` - Point-in-time values (debt, reserves)
- `flow` - Period-based values (GDP, exports)
- `count` - Discrete counts (number of companies)
- `percentage` - Percentage values (unemployment rate)
- `index` - Index values (CPI)
- `ratio` - Ratios (debt-to-GDP)
- `rate` - Rates (interest rate, inflation rate)
- `other` - Other types

### 3. Metadata Enrichment

Adds the following metadata to each indicator:

- `indicator_type` - Classification type
- `is_currency_denominated` - Boolean flag for monetary values
- `is_cumulative` - Boolean flag for cumulative values
- `heat_map_orientation` - Whether higher or lower values are positive
- `confidence` - Confidence score (0-1)
- `reasoning` - Optional explanation (when requested)

### 4. Robust Processing

- Batch processing with configurable batch sizes
- Automatic retry with exponential backoff
- Timeout handling
- Graceful error handling
- Debug logging

## API Functions

### `classifyIndicators(indicators, config)`

Classify multiple indicators with a single LLM call.

```typescript
const enriched = await classifyIndicators(indicators, {
  provider: "openai",
  apiKey: "sk-...",
});
```

### `classifyIndicator(indicator, config)`

Classify a single indicator.

```typescript
const enriched = await classifyIndicator(indicator, {
  provider: "anthropic",
  apiKey: "sk-ant-...",
});
```

### `classifyIndicatorsWithOptions(indicators, options)`

Advanced classification with batching, retries, and error handling.

```typescript
const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: { provider: "gemini", apiKey: "AIza..." },
  batchSize: 5,
  maxRetries: 3,
  debug: true,
});
```

## Type Definitions

### Input Types

- `Indicator` - Input indicator with metadata
- `LLMConfig` - LLM provider configuration
- `ClassificationOptions` - Advanced options

### Output Types

- `EnrichedIndicator` - Indicator with classification
- `ClassifiedMetadata` - LLM-generated metadata
- `ClassificationResult` - Batch processing result

### Provider Types

- `LLMProvider` - Provider name type
- `LLMProviderInterface` - Provider interface
- `IndicatorType` - Classification type

## Configuration

### Default Values

```typescript
{
  temperature: 0.1,
  maxTokens: 2000,
  timeout: 30000,
  batchSize: 10,
  maxRetries: 3,
  retryDelay: 1000,
  includeReasoning: false,
  debug: false,
}
```

### Default Models

```typescript
{
  openai: "gpt-4o",
  anthropic: "claude-3-5-sonnet-20241022",
  gemini: "gemini-2.0-flash-thinking-exp-01-21",
}
```

## Testing

### Test Coverage

- Unit tests for classification functions
- Unit tests for all providers
- Validation tests for parsing and error handling
- Type safety tests

### Running Tests

```bash
deno task test              # Run all tests
deno task test:watch        # Watch mode
deno task test:cov          # With coverage
```

## Examples

### Basic Example

```typescript
import { classifyIndicators } from "@tellimer/classify";

const indicators = [
  { name: "GDP", units: "USD billions", currency_code: "USD" },
  { name: "Unemployment Rate", units: "%" },
];

const enriched = await classifyIndicators(indicators, {
  provider: "openai",
  apiKey: "sk-...",
});
```

### Advanced Example

```typescript
import { classifyIndicatorsWithOptions } from "@tellimer/classify";

const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: { provider: "anthropic", apiKey: "sk-ant-..." },
  batchSize: 5,
  includeReasoning: true,
  maxRetries: 3,
  debug: true,
});

console.log(`Success: ${result.enriched.length}`);
console.log(`Failed: ${result.failed.length}`);
console.log(`Time: ${result.processingTime}ms`);
```

## Development Tasks

```bash
deno task dev          # Run development server
deno task test         # Run tests
deno task test:watch   # Watch mode
deno task test:cov     # Coverage
deno task lint         # Lint code
deno task fmt          # Format code
```

## Dependencies

- `@std/assert` - Testing assertions (dev dependency)
- No runtime dependencies - fully self-contained

## Runtime Support

- ✅ Deno
- ✅ Node.js
- ✅ Bun
- ✅ Cloudflare Workers

## License

MIT License - See LICENSE file

## Contributing

See CONTRIBUTING.md for guidelines

## Links

- [GitHub Repository](https://github.com/Tellimer/open-source)
- [JSR Package](https://jsr.io/@tellimer/classify)
- [Issues](https://github.com/Tellimer/open-source/issues)
- [Tellimer](https://tellimer.com)
