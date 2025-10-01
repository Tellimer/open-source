# Performance Benchmarking Guide

Complete guide to benchmarking and performance testing for @tellimer/classify.

## Overview

The package includes comprehensive benchmarks for measuring:
- **Classification Speed** - Time to classify varying numbers of indicators
- **Batch Size Impact** - Effect of different batch configurations
- **Reasoning Overhead** - Performance cost of including LLM reasoning
- **Provider Comparison** - Relative performance across OpenAI, Anthropic, Gemini

## Running Benchmarks

### Quick Start

```bash
# Set API key for your preferred provider
export OPENAI_API_KEY="sk-..."

# Run benchmarks
deno task bench
```

### Output Example

```
benchmark               time (avg)        iter/s             (min … max)       p75       p99      p995
----------------------------------------------------------------------------------------------------
classify 1 indicator    1.45 s/iter          0.7    (1.42 s … 1.49 s)   1.47 s   1.49 s   1.49 s
classify 10 indicators  2.13 s/iter          0.5    (2.09 s … 2.18 s)   2.15 s   2.18 s   2.18 s
classify 25 indicators  3.82 s/iter          0.3    (3.76 s … 3.91 s)   3.86 s   3.91 s   3.91 s
classify 50 indicators  6.54 s/iter          0.2    (6.41 s … 6.72 s)   6.63 s   6.72 s   6.72 s
classify 100 indicators 12.1 s/iter          0.1   (11.8 s … 12.5 s)   12.3 s   12.5 s   12.5 s

summary
  classify 1 indicator (baseline)
   1.47x slower than classify 10 indicators
   2.63x slower than classify 25 indicators
   4.51x slower than classify 50 indicators
   8.34x slower than classify 100 indicators
```

## Benchmark Groups

### 1. Indicator Count Benchmarks

Tests classification performance with different dataset sizes:

| Test | Indicators | Purpose |
|------|------------|---------|
| `classify 1 indicator` | 1 | Baseline (includes network latency) |
| `classify 10 indicators` | 10 | Small batch performance |
| `classify 25 indicators` | 25 | Medium batch performance |
| `classify 50 indicators` | 50 | Large batch performance |
| `classify 100 indicators` | 100 | Stress test |

**Insights:**
- Per-indicator time decreases as batch size increases
- Network overhead is amortized across larger batches
- Sweet spot is typically 10-25 indicators per batch

### 2. Batch Size Benchmarks

Compares different batch sizes for the same dataset (25 indicators):

| Test | Batch Size | API Calls |
|------|------------|-----------|
| `batch size 5` | 5 | 5 calls |
| `batch size 10` | 10 | 3 calls |
| `batch size 25` | 25 | 1 call |

**Insights:**
- Larger batches = fewer API calls = less overhead
- BUT larger batches may hit rate limits or timeouts
- Optimal batch size: 10-15 for most use cases

### 3. Reasoning Benchmarks

Compares performance with and without LLM reasoning:

| Test | Reasoning | Typical Impact |
|------|-----------|----------------|
| `without reasoning` | No | Baseline |
| `with reasoning` | Yes | +40-60% time, +40-60% cost |

**Insights:**
- Reasoning adds 40-60% overhead (time & cost)
- Use reasoning only during development/debugging
- Skip reasoning in production for cost savings

## Performance Metrics

### Measured Values

Each benchmark run measures:

1. **Time (avg)** - Average execution time
2. **Iter/s** - Iterations per second
3. **Min/Max** - Range of execution times
4. **Percentiles** - P75, P99, P995 latencies

### Derived Metrics

From `ClassificationResult.performance`:

```typescript
{
  avgTimePerIndicator: 245.6,     // ms per indicator
  throughput: 4.08,                // indicators per second
  avgTokensPerIndicator: 170,     // tokens per indicator
  avgCostPerIndicator: 0.000066   // USD per indicator
}
```

## Interpreting Results

### Good Performance Baseline

For reference, these are typical values with `gpt-4o-mini`:

| Metric | Good | Acceptable | Poor |
|--------|------|------------|------|
| Avg time/indicator | <300ms | 300-500ms | >500ms |
| Throughput | >3 ind/sec | 1-3 ind/sec | <1 ind/sec |
| Tokens/indicator | <200 | 200-300 | >300 |
| Cost/indicator | <$0.0001 | $0.0001-0.0005 | >$0.0005 |

### Performance Factors

**Network**
- Latency to provider API (50-200ms baseline)
- Bandwidth (minimal impact, small payloads)

**Model**
- Faster: `gpt-4o-mini`, `gemini-2.0-flash`
- Slower: `gpt-4`, `claude-3-opus`

**Batch Size**
- Larger batches amortize network overhead
- But risk timeouts and rate limits

**Reasoning**
- Adds 40-60% overhead
- Skip in production

## Custom Benchmarks

### Create Your Own

```typescript
// my_benchmark.ts
import { classifyIndicators } from '@tellimer/classify';
import type { Indicator } from '@tellimer/classify/types';

const indicators: Indicator[] = [
  // Your test data
];

const config = {
  provider: 'openai',
  apiKey: Deno.env.get('OPENAI_API_KEY')!,
};

Deno.bench('my custom test', async () => {
  await classifyIndicators(indicators, config);
});
```

Run with:
```bash
deno bench --allow-env --allow-net my_benchmark.ts
```

### Benchmark Specific Scenarios

```typescript
// Test complex indicators
Deno.bench('classify complex indicators', async () => {
  const complex = indicators.map(ind => ({
    ...ind,
    sample_values: Array(100).fill(0).map((_, i) => ({
      date: `2024-${i}`,
      value: Math.random() * 1000
    }))
  }));

  await classifyIndicators(complex, config);
});

// Test with custom config
Deno.bench('classify with custom temp', async () => {
  await classifyIndicators(indicators, {
    ...config,
    temperature: 0.0,  // Most deterministic
  });
});
```

## Optimization Tips

### 1. Reduce Network Latency

```typescript
// Use provider closest to your servers
// AWS us-east-1 → OpenAI (fastest)
// GCP us-central1 → Gemini (fastest)
// AWS us-west-2 → Anthropic (fastest)
```

### 2. Optimize Batch Size

```bash
# Test different batch sizes
for size in 5 10 15 20 25; do
  echo "Testing batch size: $size"
  deno run --allow-env --allow-net test_batch.ts $size
done
```

### 3. Use Faster Models

```typescript
// Fastest (free during preview)
{ provider: 'gemini', model: 'gemini-2.0-flash-thinking-exp' }

// Fast & cheap
{ provider: 'openai', model: 'gpt-4o-mini' }

// Balanced
{ provider: 'anthropic', model: 'claude-3-5-sonnet' }

// Slowest (but most capable)
{ provider: 'openai', model: 'gpt-4' }
```

### 4. Parallelize Batches

```typescript
// Process multiple batches in parallel
const batches = chunk(allIndicators, 25);

const results = await Promise.all(
  batches.map(batch =>
    classifyIndicatorsWithOptions(batch, { llmConfig: config })
  )
);

const combined = results.flatMap(r => r.enriched);
```

## Continuous Benchmarking

### Track Performance Over Time

```typescript
// benchmark_logger.ts
import { classifyIndicatorsWithOptions } from '@tellimer/classify';

async function benchmarkAndLog() {
  const result = await classifyIndicatorsWithOptions(testIndicators, {
    llmConfig: config,
  });

  // Log to metrics system
  await metrics.record({
    timestamp: Date.now(),
    throughput: result.performance.throughput,
    avg_time: result.performance.avgTimePerIndicator,
    cost: result.tokenUsage.estimatedCost,
    provider: result.tokenUsage.provider,
    model: result.tokenUsage.model,
  });
}

// Run daily
if (import.meta.main) {
  benchmarkAndLog();
}
```

### Regression Testing

```typescript
// Fail CI if performance degrades
const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: config,
});

const MAX_TIME_PER_INDICATOR = 500; // ms
if (result.performance.avgTimePerIndicator > MAX_TIME_PER_INDICATOR) {
  throw new Error(
    `Performance regression: ${result.performance.avgTimePerIndicator}ms > ${MAX_TIME_PER_INDICATOR}ms`
  );
}
```

## Provider Comparison

### Run Benchmarks for All Providers

```bash
#!/bin/bash

echo "OpenAI Benchmarks"
export OPENAI_API_KEY="sk-..."
deno task bench

echo "\nAnthropic Benchmarks"
export ANTHROPIC_API_KEY="sk-ant-..."
unset OPENAI_API_KEY
deno task bench

echo "\nGemini Benchmarks"
export GEMINI_API_KEY="..."
unset ANTHROPIC_API_KEY
deno task bench
```

### Typical Results (25 indicators)

| Provider | Model | Time | Cost | Throughput |
|----------|-------|------|------|------------|
| Gemini | 2.0 Flash Thinking | 3.2s | $0.00 | 7.8 ind/s |
| OpenAI | gpt-4o-mini | 3.8s | $0.0017 | 6.6 ind/s |
| Anthropic | Claude 3.5 Sonnet | 4.1s | $0.0045 | 6.1 ind/s |
| OpenAI | gpt-4 | 5.6s | $0.025 | 4.5 ind/s |

*Results vary based on network conditions and API load*

## See Also

- [Cost Tracking Guide](./COST_TRACKING.md)
- [Performance Metrics](./PERFORMANCE.md)
- [Benchmark Source](../tests/bench/classification_bench.ts)
- [Cost Analysis Example](../examples/cost_analysis.ts)
