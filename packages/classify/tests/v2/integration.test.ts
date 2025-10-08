/**
 * V2 Pipeline Integration Test
 *
 * Tests the complete V2 pipeline using 100 diverse test indicators:
 * 1. Seeds database with test indicators and time series data
 * 2. Runs V2 pipeline (Router → Specialist → Orientation → Flagging → Review → Output)
 * 3. Validates classifications against expected results
 * 4. Checks accuracy across all classification dimensions
 */

import { assertEquals, assertExists } from 'jsr:@std/assert@1';
import { classifyIndicatorsV2 } from '../../src/v2/pipeline.ts';
import { V2DatabaseClient } from '../../src/v2/db/client.ts';
import type { Indicator, LLMConfig } from '../../src/types.ts';
import type { V2Classification, V2Config } from '../../src/v2/types.ts';
import { TEST_INDICATORS } from '../fixtures/v2-test-indicators.ts';
import type { TestIndicatorFixture } from '../fixtures/v2-test-indicators.ts';
import {
  getModelForProvider,
  isProviderAvailable,
  requireApiKey,
  testThresholds,
} from '../config.ts';

/**
 * Convert test fixture to Indicator format
 */
function fixtureToIndicator(fixture: TestIndicatorFixture): Indicator {
  return {
    id: fixture.id,
    name: fixture.name,
    units: fixture.units || undefined,
    periodicity: fixture.periodicity || undefined,
    category_group: fixture.category_group || undefined,
    topic: fixture.topic || undefined,
    aggregation_method: fixture.aggregation_method || undefined,
    scale: fixture.scale || undefined,
    currency_code: fixture.currency_code || undefined,
    dataset: fixture.dataset || undefined,
    sample_values: fixture.sample_values, // Include time series for validation
  };
}

/**
 * Verify test indicators exist in database
 */
function verifyTestIndicators(
  db: V2DatabaseClient,
  fixtures: TestIndicatorFixture[]
): void {
  const indicatorIds = fixtures.map((f) => f.id);
  const placeholders = indicatorIds.map(() => '?').join(',');

  const count = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM source_indicators
    WHERE id IN (${placeholders})
  `
    )
    .get(...indicatorIds) as { count: number };

  if (count.count !== fixtures.length) {
    throw new Error(
      `Expected ${fixtures.length} test indicators in database, found ${count.count}. ` +
        `Please run: deno task seed`
    );
  }

  console.log(`  ✓ Verified ${count.count} test indicators in database\n`);
}

/**
 * Compare actual classification with expected
 */
interface ComparisonResult {
  indicator: string;
  matches: boolean;
  differences: string[];
  actual: {
    family: string;
    indicator_type: string;
    temporal_aggregation: string;
    heat_map_orientation: string;
    is_currency_denominated?: boolean;
  };
  expected: {
    indicator_family: string;
    indicator_type: string;
    temporal_aggregation: string;
    heat_map_orientation: string;
    is_currency_denominated: boolean;
  };
}

function compareClassification(
  indicatorId: string,
  actual: {
    family: string;
    indicator_type: string;
    temporal_aggregation: string;
    heat_map_orientation: string;
    is_currency_denominated?: boolean;
  },
  expected: {
    indicator_family: string;
    indicator_type: string;
    temporal_aggregation: string;
    heat_map_orientation: string;
    is_currency_denominated: boolean;
  }
): ComparisonResult {
  const differences: string[] = [];

  if (actual.family !== expected.indicator_family) {
    differences.push(`family: ${actual.family} ≠ ${expected.indicator_family}`);
  }

  if (actual.indicator_type !== expected.indicator_type) {
    differences.push(
      `type: ${actual.indicator_type} ≠ ${expected.indicator_type}`
    );
  }

  if (actual.temporal_aggregation !== expected.temporal_aggregation) {
    differences.push(
      `temporal: ${actual.temporal_aggregation} ≠ ${expected.temporal_aggregation}`
    );
  }

  if (actual.heat_map_orientation !== expected.heat_map_orientation) {
    differences.push(
      `orientation: ${actual.heat_map_orientation} ≠ ${expected.heat_map_orientation}`
    );
  }

  const actualMonetary = actual.is_currency_denominated ?? false;
  if (actualMonetary !== expected.is_currency_denominated) {
    differences.push(
      `is_currency_denominated: ${actualMonetary} ≠ ${expected.is_currency_denominated}`
    );
  }

  return {
    indicator: indicatorId,
    matches: differences.length === 0,
    differences,
    actual,
    expected,
  };
}

/**
 * Run V2 integration test for a specific provider
 */
async function testV2IntegrationForProvider(
  providerName: 'openai' | 'anthropic' | 'gemini'
) {
  if (!isProviderAvailable(providerName)) {
    console.log(
      `⚠️  Skipping ${providerName} V2 integration test: API key not set (${providerName.toUpperCase()}_API_KEY)`
    );
    return;
  }

  const apiKey = requireApiKey(providerName);
  const model = getModelForProvider(providerName);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`V2 INTEGRATION TEST: ${providerName.toUpperCase()}`);
  console.log(`Model: ${model}`);
  console.log(`${'='.repeat(60)}\n`);

  // Use the main V2 database (already seeded with indicators)
  const dbPath = './data/classify_v2.db';
  const db = new V2DatabaseClient({
    type: 'local',
    path: dbPath,
    walMode: true,
    autoMigrate: true,
  });

  try {
    // Ensure database is initialized and schema applied
    await db.initialize();

    // Verify test indicators exist in database
    console.log(
      `📦 Verifying ${TEST_INDICATORS.length} test indicators in database...`
    );
    verifyTestIndicators(db, TEST_INDICATORS);

    // Convert fixtures to indicators
    const indicators: Indicator[] = TEST_INDICATORS.map(fixtureToIndicator);

    // Configure LLM
    const llmConfig: LLMConfig = {
      provider: providerName,
      apiKey,
      model,
      includeReasoning: false,
      timeout: 180000, // 3 minutes
      debug: true,
      quiet: false,
    };

    // Configure V2 pipeline
    const v2Config: Partial<V2Config> = {
      database: {
        type: 'local',
        path: dbPath,
        walMode: true,
        autoMigrate: true,
      },
      thresholds: {
        confidenceFamilyMin: 0.6,
        confidenceClsMin: 0.6,
        confidenceOrientMin: 0.6,
      },
      batch: {
        routerBatchSize: 20,
        specialistBatchSize: 15,
        orientationBatchSize: 20,
        reviewBatchSize: 10,
      },
      concurrency: {
        router: 1,
        specialist: 1,
        orientation: 1,
        review: 2,
      },
    };

    // Run V2 pipeline
    console.log('🚀 Running V2 pipeline...\n');
    const result = await classifyIndicatorsV2(indicators, llmConfig, v2Config);

    // Verify pipeline execution
    assertExists(result.executionId, 'Execution ID should be generated');
    assertEquals(
      result.summary.total,
      TEST_INDICATORS.length,
      'Should process all indicators'
    );

    console.log(`\n📊 Pipeline Summary:`);
    console.log(`  • Total Indicators: ${result.summary.total}`);
    console.log(`  • Successful: ${result.summary.successful}`);
    console.log(`  • Failed: ${result.summary.failed}`);
    console.log(`  • Flagged: ${result.summary.flagged}`);
    console.log(`  • Reviewed: ${result.summary.reviewed}`);
    console.log(`  • Fixed: ${result.summary.fixed}`);
    console.log(`  • Escalated: ${result.summary.escalated}`);
    console.log(`  • Processing Time: ${result.processingTime}ms`);
    console.log(`  • Total API Calls: ${result.apiCalls}`);

    console.log(`\n📈 Stage Breakdown:`);
    console.log(
      `  Router:      ${result.stages.router.processed} indicators, ${result.stages.router.apiCalls} API calls, ${result.stages.router.processingTime}ms`
    );
    console.log(
      `  Specialist:  ${result.stages.specialist.processed} indicators across ${result.stages.specialist.families} families, ${result.stages.specialist.apiCalls} API calls, ${result.stages.specialist.processingTime}ms`
    );
    console.log(
      `  Validation:  ${result.stages.validation.analyzed} analyzed (${result.stages.validation.cumulative} cumulative, ${result.stages.validation.nonCumulative} non-cumulative), avg confidence ${(result.stages.validation.avgConfidence * 100).toFixed(1)}%, ${result.stages.validation.processingTime}ms`
    );
    console.log(
      `  Orientation: ${result.stages.orientation.processed} indicators, ${result.stages.orientation.apiCalls} API calls, ${result.stages.orientation.processingTime}ms`
    );
    console.log(
      `  Flagging:    ${result.stages.flagging.flagged} indicators flagged`
    );
    console.log(
      `  Review:      ${result.stages.review.reviewed} reviewed, ${result.stages.review.fixed} fixed, ${result.stages.review.escalated} escalated, ${result.stages.review.apiCalls} API calls, ${result.stages.review.processingTime}ms`
    );

    // Compare classifications with expectations
    console.log(`\n🔍 Validating Classifications:\n`);

    const comparisons: ComparisonResult[] = [];
    let correctCount = 0;

    for (const fixture of TEST_INDICATORS) {
      const classification = result.classifications.find(
        (c: V2Classification) => c.indicator_id === fixture.id
      );

      if (!classification) {
        console.log(`  ❌ ${fixture.name} - NOT FOUND IN RESULTS`);
        continue;
      }

      const comparison = compareClassification(
        fixture.id,
        {
          family: classification.family,
          indicator_type: classification.indicator_type,
          temporal_aggregation: classification.temporal_aggregation,
          heat_map_orientation: classification.heat_map_orientation,
          is_currency_denominated: classification.is_currency_denominated,
        },
        fixture.expectation
      );

      comparisons.push(comparison);

      if (comparison.matches) {
        correctCount++;
        console.log(`  ✅ ${fixture.name}`);
      } else {
        console.log(`  ❌ ${fixture.name}`);
        console.log(`     Differences: ${comparison.differences.join(', ')}`);
      }
    }

    // Calculate accuracy metrics
    const totalProcessed = comparisons.length;
    const overallAccuracy =
      totalProcessed > 0 ? (correctCount / totalProcessed) * 100 : 0;

    // Calculate per-field accuracy
    const familyCorrect = comparisons.filter(
      (c) => c.actual.family === c.expected.indicator_family
    ).length;
    const typeCorrect = comparisons.filter(
      (c) => c.actual.indicator_type === c.expected.indicator_type
    ).length;
    const temporalCorrect = comparisons.filter(
      (c) => c.actual.temporal_aggregation === c.expected.temporal_aggregation
    ).length;
    const orientationCorrect = comparisons.filter(
      (c) => c.actual.heat_map_orientation === c.expected.heat_map_orientation
    ).length;
    const monetaryCorrect = comparisons.filter(
      (c) => (c.actual.is_currency_denominated ?? false) === c.expected.is_currency_denominated
    ).length;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 ACCURACY REPORT`);
    console.log(`${'='.repeat(60)}`);
    console.log(
      `Overall Accuracy: ${correctCount}/${totalProcessed} (${overallAccuracy.toFixed(
        1
      )}%)`
    );
    console.log(`\nPer-Field Accuracy:`);
    console.log(
      `  • Family:             ${familyCorrect}/${totalProcessed} (${(
        (familyCorrect / totalProcessed) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `  • Indicator Type:     ${typeCorrect}/${totalProcessed} (${(
        (typeCorrect / totalProcessed) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `  • Temporal Agg:       ${temporalCorrect}/${totalProcessed} (${(
        (temporalCorrect / totalProcessed) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `  • Heat Map Orient:    ${orientationCorrect}/${totalProcessed} (${(
        (orientationCorrect / totalProcessed) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `  • Is Monetary:        ${monetaryCorrect}/${totalProcessed} (${(
        (monetaryCorrect / totalProcessed) *
        100
      ).toFixed(1)}%)`
    );
    console.log(`${'='.repeat(60)}\n`);

    // Show mismatches (first 10)
    const mismatches = comparisons.filter((c) => !c.matches);
    if (mismatches.length > 0) {
      console.log(`\n❌ MISMATCHES (${mismatches.length}):`);
      for (const mismatch of mismatches.slice(0, 10)) {
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

    // Assert minimum accuracy threshold
    if (overallAccuracy < testThresholds.classificationAccuracy) {
      throw new Error(
        `V2 pipeline accuracy (${overallAccuracy.toFixed(
          1
        )}%) is below threshold (${testThresholds.classificationAccuracy}%)`
      );
    }

    console.log(`✅ V2 Integration Test Passed for ${providerName}!\n`);
  } finally {
    // Close database connection
    db.close();
  }
}

// Test Anthropic (using Claude Sonnet 4.5 for all tests)
Deno.test({
  name: 'V2 Integration - Anthropic',
  async fn() {
    await testV2IntegrationForProvider('anthropic');
  },
  ignore: !isProviderAvailable('anthropic'),
});
