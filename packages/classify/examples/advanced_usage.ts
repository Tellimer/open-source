/**
 * Advanced usage example for @tellimer/classify
 *
 * This example demonstrates advanced features including:
 * - Batch processing with options
 * - Error handling and retries
 * - Debug logging
 * - Including reasoning in responses
 */

import { classifyIndicatorsWithOptions } from "../mod.ts";
import type { Indicator } from "../mod.ts";

// Large set of indicators for batch processing
const indicators: Indicator[] = [
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
  {
    name: "Government Debt",
    units: "EUR billions",
    currency_code: "EUR",
    periodicity: "annual",
    sample_values: [2000, 2100, 2200],
  },
  {
    name: "CPI",
    units: "Index (2015=100)",
    periodicity: "monthly",
    sample_values: [100, 102, 104],
  },
  {
    name: "Exports",
    units: "USD millions",
    currency_code: "USD",
    periodicity: "monthly",
    sample_values: [500, 520, 540],
  },
  {
    name: "Interest Rate",
    units: "%",
    periodicity: "monthly",
    sample_values: [2.5, 2.75, 3.0],
  },
  {
    name: "Population",
    units: "millions",
    periodicity: "annual",
    sample_values: [330, 332, 334],
  },
  {
    name: "Foreign Reserves",
    units: "USD billions",
    currency_code: "USD",
    periodicity: "monthly",
    sample_values: [100, 105, 110],
  },
  {
    name: "Debt-to-GDP Ratio",
    units: "%",
    periodicity: "annual",
    sample_values: [95, 98, 100],
  },
  {
    name: "Number of Employees",
    units: "thousands",
    periodicity: "quarterly",
    sample_values: [150, 152, 154],
  },
];

// Example 1: Batch processing with error handling
async function exampleBatchProcessing() {
  console.log("\n=== Example 1: Batch Processing ===\n");

  const apiKey = Deno.env.get("OPENAI_API_KEY") ||
    Deno.env.get("ANTHROPIC_API_KEY") ||
    Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    console.log("⚠️  No API key found, skipping example");
    return;
  }

  const provider = Deno.env.get("OPENAI_API_KEY")
    ? "openai"
    : Deno.env.get("ANTHROPIC_API_KEY")
    ? "anthropic"
    : "gemini";

  try {
    const result = await classifyIndicatorsWithOptions(indicators, {
      llmConfig: {
        provider: provider as "openai" | "anthropic" | "gemini",
        apiKey,
      },
      batchSize: 3, // Process 3 indicators per API call
      maxRetries: 3,
      retryDelay: 1000,
      debug: true, // Enable debug logging
    });

    console.log("\n📊 Results Summary:");
    console.log(`  Total indicators: ${indicators.length}`);
    console.log(`  Successfully classified: ${result.enriched.length}`);
    console.log(`  Failed: ${result.failed.length}`);
    console.log(`  API calls made: ${result.apiCalls}`);
    console.log(`  Processing time: ${result.processingTime}ms`);
    console.log(
      `  Average time per indicator: ${
        (result.processingTime / indicators.length).toFixed(0)
      }ms`,
    );

    if (result.failed.length > 0) {
      console.log("\n❌ Failed indicators:");
      for (const failure of result.failed) {
        console.log(`  - ${failure.indicator.name}: ${failure.error}`);
      }
    }
  } catch (error) {
    console.error("✗ Batch processing failed:", error);
  }
}

// Example 2: With reasoning
async function exampleWithReasoning() {
  console.log("\n=== Example 2: With Reasoning ===\n");

  const apiKey = Deno.env.get("OPENAI_API_KEY") ||
    Deno.env.get("ANTHROPIC_API_KEY") ||
    Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    console.log("⚠️  No API key found, skipping example");
    return;
  }

  const provider = Deno.env.get("OPENAI_API_KEY")
    ? "openai"
    : Deno.env.get("ANTHROPIC_API_KEY")
    ? "anthropic"
    : "gemini";

  try {
    const result = await classifyIndicatorsWithOptions(
      indicators.slice(0, 3), // Just first 3 for this example
      {
        llmConfig: {
          provider: provider as "openai" | "anthropic" | "gemini",
          apiKey,
        },
        includeReasoning: true, // Request reasoning
        debug: false,
      },
    );

    console.log("✓ Classification with reasoning:\n");

    for (const indicator of result.enriched) {
      console.log(`${indicator.name}:`);
      console.log(`  Type: ${indicator.classification.indicator_type}`);
      console.log(`  Monetary: ${indicator.classification.is_monetary}`);
      console.log(`  Cumulative: ${indicator.classification.is_cumulative}`);
      if (indicator.classification.reasoning) {
        console.log(`  Reasoning: ${indicator.classification.reasoning}`);
      }
      console.log();
    }
  } catch (error) {
    console.error("✗ Classification with reasoning failed:", error);
  }
}

// Example 3: Custom configuration
async function exampleCustomConfig() {
  console.log("\n=== Example 3: Custom Configuration ===\n");

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.log("⚠️  OPENAI_API_KEY not set, skipping example");
    return;
  }

  try {
    const result = await classifyIndicatorsWithOptions(
      indicators.slice(0, 5),
      {
        llmConfig: {
          provider: "openai",
          apiKey,
          model: "gpt-4o-mini", // Use smaller, faster model
          temperature: 0.0, // Most deterministic
          maxTokens: 1000, // Limit tokens
          timeout: 15000, // 15 second timeout
        },
        batchSize: 5, // Process all at once
        maxRetries: 2,
        retryDelay: 500,
        debug: true,
      },
    );

    console.log("\n✓ Custom configuration results:");
    console.log(`  Classified: ${result.enriched.length} indicators`);
    console.log(`  Time: ${result.processingTime}ms`);
  } catch (error) {
    console.error("✗ Custom configuration failed:", error);
  }
}

// Run examples
if (import.meta.main) {
  console.log("@tellimer/classify - Advanced Usage Examples");
  console.log("============================================");

  await exampleBatchProcessing();
  await exampleWithReasoning();
  await exampleCustomConfig();

  console.log("\n✓ All examples completed");
}

