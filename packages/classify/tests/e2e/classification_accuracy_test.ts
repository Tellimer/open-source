/**
 * Classification Accuracy Test Suite
 *
 * Tests that LLM classifications match expected ground truth:
 * - indicator_category matches expected
 * - indicator_type matches expected
 * - temporal_aggregation matches expected
 * - is_currency_denominated matches expected
 * - heat_map_orientation matches expected
 */

import { classifyIndicatorsWithOptions } from '../../src/classify.ts';
import type {
  ClassifiedMetadata,
  Indicator,
  LLMConfig,
} from '../../src/types.ts';
import {
  loadAllFixtures,
  calculateAccuracy,
  formatAccuracyReport,
  assertMinimumAccuracy,
  compareClassification,
  assertValidSchema,
} from '../utils.ts';
import {
  isProviderAvailable,
  requireApiKey,
  getModelForProvider,
  testThresholds,
} from '../config.ts';

/**
 * Run classification accuracy tests for a specific provider
 */
async function testClassificationAccuracyForProvider(
  providerName: 'openai' | 'anthropic' | 'gemini'
) {
  if (!isProviderAvailable(providerName)) {
    console.log(
      `⚠️  Skipping ${providerName} tests: API key not set (${providerName.toUpperCase()}_API_KEY)`
    );
    return;
  }

  const apiKey = requireApiKey(providerName);
  const model = getModelForProvider(providerName);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`CLASSIFICATION ACCURACY TEST: ${providerName.toUpperCase()}`);
  console.log(`Model: ${model}`);
  console.log(`${'='.repeat(60)}\n`);

  // Load all fixtures
  const fixtures = await loadAllFixtures();
  console.log(`Loaded ${fixtures.length} fixture files\n`);

  // Flatten all indicators into a single batch with their expected classifications
  const allIndicators: Array<{
    indicator: Indicator;
    expected: Partial<ClassifiedMetadata>;
    category: string;
  }> = [];

  for (const fixture of fixtures) {
    for (const item of fixture.indicators) {
      allIndicators.push({
        indicator: item.indicator,
        expected: item.expected_classification,
        category: fixture.category,
      });
    }
  }

  console.log(`Total indicators: ${allIndicators.length}`);
  console.log(`Testing with batch size: 50 (realistic production scenario)\n`);

  const results: Array<{
    actual: ClassifiedMetadata;
    expected: Partial<ClassifiedMetadata>;
  }> = [];

  const mismatches: Array<{
    indicator: string;
    differences: string[];
  }> = [];

  // Process all indicators in a single batch (or configured batch size)
  const indicators = allIndicators.map((item) => item.indicator);

  const llmConfig: LLMConfig = {
    provider: providerName,
    apiKey,
    model,
    includeReasoning: false, // Faster and often more accurate without overthinking
    timeout: 120000, // 2 minutes for larger batches
  };

  try {
    console.log('🔄 Classifying indicators...\n');
    const result = await classifyIndicatorsWithOptions(indicators, {
      llmConfig,
      debug: false,
      quiet: false,
      maxRetries: 3,
      batchSize: 10, // Process 10 indicators concurrently per batch
    });

    let totalCorrect = 0;
    let totalProcessed = 0;

    // Validate schema and compare each classification with expected
    for (let i = 0; i < result.enriched.length; i++) {
      const enriched = result.enriched[i];
      const expected = allIndicators[i].expected;

      // First validate schema
      try {
        assertValidSchema(enriched.classification);
      } catch (error) {
        console.log(`  ❌ ${enriched.name} - INVALID SCHEMA`);
        console.log(
          `     Error: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        mismatches.push({
          indicator: enriched.name,
          differences: [
            `Schema validation failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ],
        });
        continue;
      }

      const comparison = compareClassification(
        enriched.classification,
        expected
      );

      results.push({
        actual: enriched.classification,
        expected,
      });

      totalProcessed++;
      if (comparison.matches) {
        totalCorrect++;
        console.log(`  ✅ ${enriched.name}`);
      } else {
        console.log(`  ❌ ${enriched.name}`);
        console.log(`     Differences: ${comparison.differences.join(', ')}`);
        if (enriched.classification.reasoning) {
          console.log(`     Reasoning: ${enriched.classification.reasoning}`);
        }
        mismatches.push({
          indicator: enriched.name,
          differences: comparison.differences,
        });
      }
    }

    // Report failed indicators
    if (result.failed.length > 0) {
      console.log(`\n  Failed to classify ${result.failed.length} indicators:`);
      for (const failed of result.failed) {
        console.log(`    ✗ ${failed.indicator.name}: ${failed.error}`);
      }
    }

    // Show overall test results
    const overallAccuracy =
      totalProcessed > 0 ? (totalCorrect / totalProcessed) * 100 : 0;
    console.log(`
${'='.repeat(60)}`);
    console.log(`📋 FINAL TEST RESULTS`);
    console.log(`${'='.repeat(60)}`);
    console.log(
      `✅ Correct:   ${totalCorrect}/${totalProcessed} (${overallAccuracy.toFixed(
        1
      )}%)`
    );
    if (totalCorrect < totalProcessed) {
      console.log(
        `❌ Incorrect: ${totalProcessed - totalCorrect}/${totalProcessed}`
      );
    }
    console.log(
      `⏱️  Time:      ${result.processingTime}ms (${(
        result.processingTime / 1000
      ).toFixed(1)}s)`
    );
    console.log(
      `📊 Throughput: ${result.performance.throughput.toFixed(
        2
      )} indicators/sec`
    );
    console.log(`💰 Cost:      $${result.tokenUsage.estimatedCost.toFixed(4)}`);
    console.log(
      `🎫 Tokens:    ${result.tokenUsage.totalTokens.toLocaleString()} (in: ${result.tokenUsage.inputTokens.toLocaleString()}, out: ${result.tokenUsage.outputTokens.toLocaleString()})`
    );
    console.log(`${'='.repeat(60)}
`);
  } catch (error) {
    console.error(`  ✗ Error processing batch:`, error);
  }

  // Calculate accuracy
  const accuracyReport = calculateAccuracy(results);

  // Print detailed report
  console.log(formatAccuracyReport(accuracyReport));

  // Print mismatches
  if (mismatches.length > 0) {
    console.log(`\nMISMATCHES (${mismatches.length}):`);
    for (const mismatch of mismatches.slice(0, 10)) {
      // Show first 10
      console.log(`  ${mismatch.indicator}:`);
      for (const diff of mismatch.differences) {
        console.log(`    - ${diff}`);
      }
    }
    if (mismatches.length > 10) {
      console.log(`  ... and ${mismatches.length - 10} more mismatches`);
    }
    console.log();
  }

  // Assert minimum accuracy
  assertMinimumAccuracy(
    accuracyReport,
    testThresholds.classificationAccuracy,
    `Classification accuracy for ${providerName} is below threshold`
  );

  console.log(`✅ Classification accuracy test passed for ${providerName}!\n`);
}

// Test OpenAI
Deno.test({
  name: 'Classification Accuracy - OpenAI',
  async fn() {
    await testClassificationAccuracyForProvider('openai');
  },
  ignore: !isProviderAvailable('openai'),
});

// Test Anthropic
Deno.test({
  name: 'Classification Accuracy - Anthropic',
  async fn() {
    await testClassificationAccuracyForProvider('anthropic');
  },
  ignore: !isProviderAvailable('anthropic'),
});

// Test Gemini
Deno.test({
  name: 'Classification Accuracy - Gemini',
  async fn() {
    await testClassificationAccuracyForProvider('gemini');
  },
  ignore: !isProviderAvailable('gemini'),
});
