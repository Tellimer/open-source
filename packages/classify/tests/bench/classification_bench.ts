/**
 * Performance Benchmarks for @tellimer/classify
 *
 * Measures classification performance across different:
 * - Indicator counts (1, 10, 25, 50, 100)
 * - Providers (OpenAI, Anthropic, Gemini)
 * - Batch sizes
 */

import {
  classifyIndicators,
  classifyIndicatorsWithOptions,
} from "../../src/classify.ts";
import type { Indicator, LLMConfig } from "../../src/types.ts";

// Sample indicators for benchmarking
const sampleIndicators: Indicator[] = [
  {
    name: "GDP",
    units: "USD billions",
    currency_code: "USD",
    periodicity: "quarterly",
    sample_values: [26500, 27000, 27200, 27500],
  },
  {
    name: "Unemployment Rate",
    units: "%",
    periodicity: "monthly",
    sample_values: [3.7, 3.9, 3.8, 3.9],
  },
  {
    name: "Inflation Rate",
    units: "%",
    periodicity: "monthly",
    sample_values: [3.1, 3.2, 3.5, 3.4],
  },
  {
    name: "Trade Balance",
    units: "USD millions",
    currency_code: "USD",
    periodicity: "monthly",
    sample_values: [-68000, -70000, -65000, -72000],
  },
  {
    name: "Consumer Price Index",
    units: "Index (2015=100)",
    periodicity: "monthly",
    sample_values: [308.4, 310.3, 312.2, 313.5],
  },
  {
    name: "S&P 500 Index",
    units: "index",
    periodicity: "daily",
    sample_values: [4567, 4589, 4543, 4612],
  },
  {
    name: "Housing Starts",
    units: "thousands of units",
    periodicity: "monthly",
    sample_values: [1331, 1521, 1321, 1360],
  },
  {
    name: "10-Year Treasury Yield",
    units: "%",
    periodicity: "daily",
    sample_values: [4.18, 4.22, 4.15, 4.28],
  },
  {
    name: "VIX Volatility Index",
    units: "index",
    periodicity: "daily",
    sample_values: [14.2, 15.8, 13.5, 16.3],
  },
  {
    name: "Consumer Sentiment Index",
    units: "index",
    periodicity: "monthly",
    sample_values: [79.0, 76.9, 79.4, 77.2],
  },
];

/**
 * Generate N indicators by repeating and modifying sample data
 */
function generateIndicators(count: number): Indicator[] {
  const indicators: Indicator[] = [];
  for (let i = 0; i < count; i++) {
    const base = sampleIndicators[i % sampleIndicators.length];
    indicators.push({
      ...base,
      name: `${base.name} ${Math.floor(i / sampleIndicators.length) + 1}`,
      id: `bench_${i}`,
    });
  }
  return indicators;
}

/**
 * Get test config from environment
 */
function getTestConfig(): LLMConfig | null {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");

  if (openaiKey) {
    return {
      provider: "openai",
      apiKey: openaiKey,
      model: "gpt-4o-mini", // Use cheaper model for benchmarks
    };
  } else if (anthropicKey) {
    return {
      provider: "anthropic",
      apiKey: anthropicKey,
      model: "claude-3-5-sonnet-20241022",
    };
  } else if (geminiKey) {
    return {
      provider: "gemini",
      apiKey: geminiKey,
      model: "gemini-2.0-flash-thinking-exp-01-21",
    };
  }

  return null;
}

// Check if API key is available
const config = getTestConfig();
if (!config) {
  console.warn(
    "⚠️  No API keys found. Skipping benchmarks. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY.",
  );
  Deno.exit(0);
}

// Baseline: Single Indicator
Deno.bench({
  name: "classify 1 indicator",
  group: "indicator-count",
  baseline: true,
  async fn() {
    const indicators = generateIndicators(1);
    await classifyIndicators(indicators, config);
  },
});

// Small batch
Deno.bench({
  name: "classify 10 indicators",
  group: "indicator-count",
  async fn() {
    const indicators = generateIndicators(10);
    await classifyIndicatorsWithOptions(indicators, {
      llmConfig: config,
      batchSize: 10,
      debug: false,
    });
  },
});

// Medium batch
Deno.bench({
  name: "classify 25 indicators",
  group: "indicator-count",
  async fn() {
    const indicators = generateIndicators(25);
    await classifyIndicatorsWithOptions(indicators, {
      llmConfig: config,
      batchSize: 10,
      debug: false,
    });
  },
});

// Large batch
Deno.bench({
  name: "classify 50 indicators",
  group: "indicator-count",
  async fn() {
    const indicators = generateIndicators(50);
    await classifyIndicatorsWithOptions(indicators, {
      llmConfig: config,
      batchSize: 10,
      debug: false,
    });
  },
});

// Very large batch (stress test)
Deno.bench({
  name: "classify 100 indicators",
  group: "indicator-count",
  async fn() {
    const indicators = generateIndicators(100);
    await classifyIndicatorsWithOptions(indicators, {
      llmConfig: config,
      batchSize: 10,
      debug: false,
    });
  },
});

// Batch size comparison (using 25 indicators)
const indicators25 = generateIndicators(25);

Deno.bench({
  name: "batch size 5",
  group: "batch-size",
  baseline: true,
  async fn() {
    await classifyIndicatorsWithOptions(indicators25, {
      llmConfig: config,
      batchSize: 5,
      debug: false,
    });
  },
});

Deno.bench({
  name: "batch size 10",
  group: "batch-size",
  async fn() {
    await classifyIndicatorsWithOptions(indicators25, {
      llmConfig: config,
      batchSize: 10,
      debug: false,
    });
  },
});

Deno.bench({
  name: "batch size 25 (all at once)",
  group: "batch-size",
  async fn() {
    await classifyIndicatorsWithOptions(indicators25, {
      llmConfig: config,
      batchSize: 25,
      debug: false,
    });
  },
});

// With reasoning vs without
const indicators10 = generateIndicators(10);

Deno.bench({
  name: "without reasoning",
  group: "reasoning",
  baseline: true,
  async fn() {
    await classifyIndicatorsWithOptions(indicators10, {
      llmConfig: config,
      includeReasoning: false,
      batchSize: 10,
      debug: false,
    });
  },
});

Deno.bench({
  name: "with reasoning",
  group: "reasoning",
  async fn() {
    await classifyIndicatorsWithOptions(indicators10, {
      llmConfig: { ...config, includeReasoning: true },
      batchSize: 10,
      debug: false,
    });
  },
});
