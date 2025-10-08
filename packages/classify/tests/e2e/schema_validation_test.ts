/**
 * Schema Validation Test Suite
 *
 * Tests that LLM responses conform to the expected schema:
 * - All required fields are present
 * - Field types are correct
 * - Enum values are valid
 * - indicator_id matches request
 * - Category matches type
 */

import { classifyIndicatorsWithOptions } from "../../src/classify.ts";
import type { LLMConfig } from "../../src/types.ts";
import { assertValidSchema, loadAllFixtures } from "../utils.ts";
import {
  getModelForProvider,
  isProviderAvailable,
  requireApiKey,
  testThresholds,
} from "../config.ts";

/**
 * Run schema validation tests for a specific provider
 */
async function testSchemaValidationForProvider(
  providerName: "openai" | "anthropic" | "gemini",
) {
  if (!isProviderAvailable(providerName)) {
    console.log(
      `⚠️  Skipping ${providerName} tests: API key not set (${providerName.toUpperCase()}_API_KEY)`,
    );
    return;
  }

  const apiKey = requireApiKey(providerName);
  const model = getModelForProvider(providerName);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`SCHEMA VALIDATION TEST: ${providerName.toUpperCase()}`);
  console.log(`Model: ${model}`);
  console.log(`${"=".repeat(60)}\n`);

  // Load all fixtures
  const fixtures = await loadAllFixtures();
  console.log(`Loaded ${fixtures.length} fixture files`);

  let totalIndicators = 0;
  let validSchemas = 0;
  let invalidSchemas = 0;
  const errors: Array<{ indicator: string; error: string }> = [];

  // Test each fixture file
  for (const fixture of fixtures) {
    console.log(`\nTesting ${fixture.category}...`);

    const indicators = fixture.indicators.map((f) => f.indicator);
    totalIndicators += indicators.length;

    const llmConfig: LLMConfig = {
      provider: providerName,
      apiKey,
      model,
      includeReasoning: false,
    };

    try {
      const result = await classifyIndicatorsWithOptions(indicators, {
        llmConfig,
        debug: true,
        maxRetries: 3,
      });

      // Validate each classification
      for (const enriched of result.enriched) {
        try {
          assertValidSchema(enriched.classification);
          validSchemas++;
          console.log(`  ✓ ${enriched.name}`);
        } catch (error) {
          invalidSchemas++;
          const errorMsg = error instanceof Error
            ? error.message
            : String(error);
          errors.push({
            indicator: enriched.name,
            error: errorMsg,
          });
          console.log(`  ✗ ${enriched.name}: ${errorMsg}`);
        }
      }

      // Report failed indicators
      if (result.failed.length > 0) {
        console.log(
          `\n  Failed to classify ${result.failed.length} indicators:`,
        );
        for (const failed of result.failed) {
          console.log(`    ✗ ${failed.indicator.name}: ${failed.error}`);
          errors.push({
            indicator: failed.indicator.name,
            error: failed.error,
          });
        }
      }
    } catch (error) {
      console.error(`  ✗ Error processing ${fixture.category}:`, error);
      // Count all indicators in this fixture as invalid
      invalidSchemas += indicators.length;
      for (const indicator of indicators) {
        errors.push({
          indicator: indicator.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // Calculate pass rate
  const passRate = totalIndicators > 0 ? validSchemas / totalIndicators : 0;

  // Print summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`SCHEMA VALIDATION SUMMARY: ${providerName.toUpperCase()}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Total indicators tested: ${totalIndicators}`);
  console.log(`✓ Valid schemas: ${validSchemas}`);
  console.log(`✗ Invalid schemas: ${invalidSchemas}`);
  console.log(`Pass rate: ${(passRate * 100).toFixed(1)}%`);
  console.log(
    `Threshold: ${(testThresholds.schemaValidation * 100).toFixed(1)}%`,
  );
  console.log(`${"=".repeat(60)}\n`);

  // Print errors if any
  if (errors.length > 0) {
    console.log(`\nERRORS (${errors.length}):`);
    for (const error of errors.slice(0, 10)) {
      // Show first 10
      console.log(`  ${error.indicator}: ${error.error}`);
    }
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more errors`);
    }
    console.log();
  }

  // Assert minimum pass rate
  if (passRate < testThresholds.schemaValidation) {
    throw new Error(
      `Schema validation pass rate ${
        (passRate * 100).toFixed(1)
      }% is below threshold ${
        (testThresholds.schemaValidation * 100).toFixed(1)
      }%`,
    );
  }

  console.log(`✅ Schema validation test passed for ${providerName}!\n`);
}

// Test OpenAI
Deno.test({
  name: "Schema Validation - OpenAI",
  async fn() {
    await testSchemaValidationForProvider("openai");
  },
  ignore: !isProviderAvailable("openai"),
});

// Test Anthropic
Deno.test({
  name: "Schema Validation - Anthropic",
  async fn() {
    await testSchemaValidationForProvider("anthropic");
  },
  ignore: !isProviderAvailable("anthropic"),
});

// Test Gemini
Deno.test({
  name: "Schema Validation - Gemini",
  async fn() {
    await testSchemaValidationForProvider("gemini");
  },
  ignore: !isProviderAvailable("gemini"),
});
