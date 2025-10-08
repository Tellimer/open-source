/**
 * ID-Based Pairing and Retry Logic Example
 *
 * This example demonstrates:
 * - Automatic indicator ID generation
 * - Custom indicator IDs
 * - Individual retry logic for failed indicators
 * - Comprehensive statistics and error tracking
 * - Debug logging
 */

import { classifyIndicatorsWithOptions } from "../mod.ts";
import type { Indicator } from "../mod.ts";

// Example 1: Automatic ID Generation
console.log("=".repeat(70));
console.log("Example 1: Automatic ID Generation");
console.log("=".repeat(70));

const indicatorsAutoId: Indicator[] = [
  {
    name: "Gross Domestic Product",
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
    name: "Consumer Price Index",
    units: "Index (2015=100)",
    periodicity: "monthly",
    sample_values: [100, 102, 104],
  },
];

// Get API key from environment
const apiKey = Deno.env.get("OPENAI_API_KEY");
if (!apiKey) {
  console.error("Error: OPENAI_API_KEY environment variable not set");
  Deno.exit(1);
}

try {
  const result = await classifyIndicatorsWithOptions(indicatorsAutoId, {
    llmConfig: {
      provider: "openai",
      apiKey,
      model: "gpt-4o-mini",
    },
    batchSize: 3,
    maxRetries: 3,
    debug: true, // Enable detailed logging
  });

  console.log("\n📊 Results with Auto-Generated IDs:");
  for (const indicator of result.enriched) {
    console.log(`\n✓ ${indicator.name}`);
    console.log(`  ID: ${indicator.id}`);
    console.log(
      `  Classification ID: ${indicator.classification.indicator_id}`,
    );
    console.log(`  Category: ${indicator.classification.indicator_category}`);
    console.log(`  Type: ${indicator.classification.indicator_type}`);
    console.log(`  Temporal: ${indicator.classification.temporal_aggregation}`);
    console.log(`  Heat Map: ${indicator.classification.heat_map_orientation}`);
  }

  if (result.failed.length > 0) {
    console.log("\n❌ Failed Indicators:");
    for (const failed of result.failed) {
      console.log(`\n✗ ${failed.indicator.name}`);
      console.log(`  Error: ${failed.error}`);
      console.log(`  Retries: ${failed.retries}`);
    }
  }
} catch (error) {
  console.error("Error:", error);
}

// Example 2: Custom IDs
console.log("\n\n" + "=".repeat(70));
console.log("Example 2: Custom Indicator IDs");
console.log("=".repeat(70));

const indicatorsCustomId: Indicator[] = [
  {
    id: "gdp_usa_2024",
    name: "US GDP",
    units: "USD billions",
    currency_code: "USD",
    periodicity: "quarterly",
    sample_values: [21000, 21500, 22000],
  },
  {
    id: "unemp_usa_2024",
    name: "US Unemployment Rate",
    units: "%",
    periodicity: "monthly",
    sample_values: [3.5, 3.6, 3.7],
  },
  {
    id: "cpi_usa_2024",
    name: "US Consumer Price Index",
    units: "Index (2015=100)",
    periodicity: "monthly",
    sample_values: [100, 102, 104],
  },
];

try {
  const result = await classifyIndicatorsWithOptions(indicatorsCustomId, {
    llmConfig: {
      provider: "openai",
      apiKey,
      model: "gpt-4o-mini",
    },
    batchSize: 3,
    maxRetries: 3,
    debug: false, // Disable debug logging for cleaner output
  });

  console.log("\n📊 Results with Custom IDs:");
  for (const indicator of result.enriched) {
    console.log(`\n✓ ${indicator.name}`);
    console.log(`  Custom ID: ${indicator.id}`);
    console.log(
      `  Matches Classification ID: ${
        indicator.id === indicator.classification.indicator_id ? "✓" : "✗"
      }`,
    );
    console.log(`  Type: ${indicator.classification.indicator_type}`);
  }

  console.log("\n📈 Summary Statistics:");
  console.log(`  Total: ${result.summary.total}`);
  console.log(`  Successful: ${result.summary.successful}`);
  console.log(`  Failed: ${result.summary.failed}`);
  console.log(`  Success Rate: ${result.summary.successRate.toFixed(1)}%`);
  console.log(`  API Calls: ${result.apiCalls}`);
  console.log(`  Retries: ${result.retries}`);
  console.log(`  Processing Time: ${result.processingTime}ms`);
} catch (error) {
  console.error("Error:", error);
}

// Example 3: Handling Failures with Retry Logic
console.log("\n\n" + "=".repeat(70));
console.log("Example 3: Large Batch with Potential Failures");
console.log("=".repeat(70));

const largeBatch: Indicator[] = [
  {
    id: "ind_1",
    name: "GDP",
    units: "USD billions",
    sample_values: [21000, 21500],
  },
  {
    id: "ind_2",
    name: "Unemployment Rate",
    units: "%",
    sample_values: [3.5, 3.6],
  },
  {
    id: "ind_3",
    name: "Inflation Rate",
    units: "%",
    sample_values: [2.1, 2.3],
  },
  {
    id: "ind_4",
    name: "Trade Balance",
    units: "USD millions",
    sample_values: [-50000, -48000],
  },
  {
    id: "ind_5",
    name: "Foreign Reserves",
    units: "USD billions",
    sample_values: [400, 410],
  },
  {
    id: "ind_6",
    name: "Housing Starts",
    units: "count",
    sample_values: [1200000, 1250000],
  },
  {
    id: "ind_7",
    name: "Interest Rate",
    units: "%",
    sample_values: [5.25, 5.50],
  },
  {
    id: "ind_8",
    name: "Stock Market Index",
    units: "Index",
    sample_values: [4500, 4600],
  },
];

try {
  const result = await classifyIndicatorsWithOptions(largeBatch, {
    llmConfig: {
      provider: "openai",
      apiKey,
      model: "gpt-4o-mini",
    },
    batchSize: 4, // Process 4 at a time
    maxRetries: 3,
    includeReasoning: false,
    debug: true,
  });

  console.log("\n📊 Final Results:");
  console.log(`  Total Indicators: ${result.summary.total}`);
  console.log(`  ✓ Successfully Classified: ${result.summary.successful}`);
  console.log(`  ✗ Failed: ${result.summary.failed}`);
  console.log(`  Success Rate: ${result.summary.successRate.toFixed(1)}%`);
  console.log(`  Total API Calls: ${result.apiCalls}`);
  console.log(`  Total Retries: ${result.retries}`);
  console.log(`  Processing Time: ${result.processingTime}ms`);
  console.log(
    `  Avg Time per Indicator: ${
      (result.processingTime / result.summary.total).toFixed(0)
    }ms`,
  );

  if (result.failed.length > 0) {
    console.log("\n❌ Failed Indicators (after all retries):");
    for (const failed of result.failed) {
      console.log(`  - ${failed.indicator.name} (ID: ${failed.indicator.id})`);
      console.log(`    Error: ${failed.error}`);
      console.log(`    Retry Attempts: ${failed.retries}`);
    }
  }

  // Show sample successful classifications
  if (result.enriched.length > 0) {
    console.log("\n✅ Sample Successful Classifications:");
    for (const indicator of result.enriched.slice(0, 3)) {
      console.log(`\n  ${indicator.name} (${indicator.id})`);
      console.log(
        `    Category: ${indicator.classification.indicator_category}`,
      );
      console.log(`    Type: ${indicator.classification.indicator_type}`);
      console.log(
        `    Temporal: ${indicator.classification.temporal_aggregation}`,
      );
      console.log(
        `    Monetary: ${indicator.classification.is_monetary ? "Yes" : "No"}`,
      );
      console.log(
        `    Heat Map: ${indicator.classification.heat_map_orientation}`,
      );
      console.log(
        `    Confidence: ${(indicator.classification.confidence || 0) * 100}%`,
      );
    }
  }
} catch (error) {
  console.error("Error:", error);
}

console.log("\n" + "=".repeat(70));
console.log("Examples Complete!");
console.log("=".repeat(70));
console.log("\nKey Takeaways:");
console.log("  ✓ IDs automatically generated or use your own");
console.log("  ✓ Responses paired by ID (order-independent)");
console.log("  ✓ Failed indicators retried up to 3 times");
console.log("  ✓ Exponential backoff between retries");
console.log("  ✓ Comprehensive statistics and error tracking");
console.log("  ✓ Batch processing with individual fallback");
console.log("  ✓ Detailed debug logging available");
console.log("\nSee PAIRING_AND_RETRY.md for complete documentation.");
