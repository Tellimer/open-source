/**
 * Basic usage example for @tellimer/classify
 *
 * This example demonstrates how to classify economic indicators using
 * the classify package with different LLM providers.
 */

import { classifyIndicators } from "../mod.ts";
import type { Indicator } from "../mod.ts";

// Sample economic indicators
const indicators: Indicator[] = [
  {
    name: "Gross Domestic Product",
    units: "USD billions",
    currency_code: "USD",
    periodicity: "quarterly",
    source: "World Bank",
    description: "Total value of goods and services produced",
    sample_values: [21000, 21500, 22000, 22500],
  },
  {
    name: "Unemployment Rate",
    units: "%",
    periodicity: "monthly",
    source: "Bureau of Labor Statistics",
    description: "Percentage of labor force that is unemployed",
    sample_values: [3.5, 3.6, 3.7, 3.8],
  },
  {
    name: "Government Debt",
    units: "EUR billions",
    currency_code: "EUR",
    periodicity: "annual",
    source: "Eurostat",
    description: "Total outstanding government debt",
    sample_values: [2000, 2100, 2200],
  },
  {
    name: "Consumer Price Index",
    units: "Index (2015=100)",
    periodicity: "monthly",
    source: "National Statistics Office",
    description: "Measure of average change in prices",
    sample_values: [100, 102, 104, 106],
  },
  {
    name: "Number of Registered Companies",
    units: "count",
    periodicity: "annual",
    source: "Business Registry",
    description: "Total number of registered companies",
    sample_values: [50000, 52000, 54000],
  },
];

// Example 1: Using OpenAI
async function exampleOpenAI() {
  console.log("\n=== Example 1: OpenAI ===\n");

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.log("⚠️  OPENAI_API_KEY not set, skipping OpenAI example");
    return;
  }

  try {
    const enriched = await classifyIndicators(indicators, {
      provider: "openai",
      apiKey,
      model: "gpt-4o",
      temperature: 0.1,
    });

    console.log("✓ Successfully classified indicators with OpenAI\n");

    for (const indicator of enriched) {
      console.log(`${indicator.name}:`);
      console.log(`  Category: ${indicator.classification.indicator_category}`);
      console.log(`  Type: ${indicator.classification.indicator_type}`);
      console.log(
        `  Temporal: ${indicator.classification.temporal_aggregation}`,
      );
      console.log(`  Monetary: ${indicator.classification.is_monetary}`);
      console.log(
        `  Heat Map: ${indicator.classification.heat_map_orientation}`,
      );
      console.log(
        `  Confidence: ${
          indicator.classification.confidence?.toFixed(2) || "N/A"
        }`,
      );
      console.log();
    }
  } catch (error) {
    console.error("✗ OpenAI classification failed:", error);
  }
}

// Example 2: Using Anthropic
async function exampleAnthropic() {
  console.log("\n=== Example 2: Anthropic Claude ===\n");

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.log("⚠️  ANTHROPIC_API_KEY not set, skipping Anthropic example");
    return;
  }

  try {
    const enriched = await classifyIndicators(indicators, {
      provider: "anthropic",
      apiKey,
      model: "claude-3-5-sonnet-20241022",
      temperature: 0.1,
    });

    console.log("✓ Successfully classified indicators with Anthropic\n");

    for (const indicator of enriched) {
      console.log(`${indicator.name}:`);
      console.log(`  Category: ${indicator.classification.indicator_category}`);
      console.log(`  Type: ${indicator.classification.indicator_type}`);
      console.log(
        `  Temporal: ${indicator.classification.temporal_aggregation}`,
      );
      console.log(`  Monetary: ${indicator.classification.is_monetary}`);
      console.log(
        `  Heat Map: ${indicator.classification.heat_map_orientation}`,
      );
      console.log(
        `  Confidence: ${
          indicator.classification.confidence?.toFixed(2) || "N/A"
        }`,
      );
      console.log();
    }
  } catch (error) {
    console.error("✗ Anthropic classification failed:", error);
  }
}

// Example 3: Using Google Gemini
async function exampleGemini() {
  console.log("\n=== Example 3: Google Gemini ===\n");

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.log("⚠️  GEMINI_API_KEY not set, skipping Gemini example");
    return;
  }

  try {
    const enriched = await classifyIndicators(indicators, {
      provider: "gemini",
      apiKey,
      model: "gemini-2.0-flash-thinking-exp-01-21",
      temperature: 0.1,
    });

    console.log("✓ Successfully classified indicators with Gemini\n");

    for (const indicator of enriched) {
      console.log(`${indicator.name}:`);
      console.log(`  Category: ${indicator.classification.indicator_category}`);
      console.log(`  Type: ${indicator.classification.indicator_type}`);
      console.log(
        `  Temporal: ${indicator.classification.temporal_aggregation}`,
      );
      console.log(`  Monetary: ${indicator.classification.is_monetary}`);
      console.log(
        `  Heat Map: ${indicator.classification.heat_map_orientation}`,
      );
      console.log(
        `  Confidence: ${
          indicator.classification.confidence?.toFixed(2) || "N/A"
        }`,
      );
      console.log();
    }
  } catch (error) {
    console.error("✗ Gemini classification failed:", error);
  }
}

// Run examples
if (import.meta.main) {
  console.log("@tellimer/classify - Basic Usage Examples");
  console.log("=========================================");

  await exampleOpenAI();
  await exampleAnthropic();
  await exampleGemini();

  console.log("\n✓ All examples completed");
}
