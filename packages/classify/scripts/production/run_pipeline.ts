#!/usr/bin/env -S deno run --allow-all
/**
 * Production Pipeline Run Script
 *
 * Runs the full V2 classification pipeline against all 668 indicators
 * Uses local SQLite database and local data files
 *
 * Usage:
 *   deno task prod:run
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY=your_anthropic_api_key
 *
 * @module
 */

import { classifyIndicatorsV2 } from '../../src/v2/pipeline.ts';
import type { Indicator } from '../../src/types.ts';
import { INDICATORS_DATA } from '../../data/indicators.ts';
import { COUNTRY_INDICATORS } from '../../data/country_indicators.ts';

async function runProductionPipeline() {
  console.log('\n🚀 Running Production Classification Pipeline');
  console.log('='.repeat(60));

  // Get API key
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!anthropicKey) {
    console.error('❌ ERROR: ANTHROPIC_API_KEY not set');
    Deno.exit(1);
  }

  console.log(`📍 Database: Local SQLite (./data/classify_production_v2.db)`);
  console.log(`🗄️  Source: Local data files (data/indicators.ts, data/country_indicators.ts)`);
  console.log(`🤖 AI Provider: Anthropic (Claude)`);
  console.log('');

  try {
    // Load indicators from local data file
    console.log('📥 Loading indicators from local data...');
    const indicators: Indicator[] = INDICATORS_DATA.map((row) => ({
      id: row.id,
      name: row.name,
      units: row.units || undefined,
      periodicity: row.periodicity || undefined,
      category_group: row.category_group || undefined,
      topic: row.topic || undefined,
      aggregation_method: row.aggregation_method || undefined,
      scale: row.scale || undefined,
      currency_code: row.currency_code || undefined,
      dataset: row.dataset || undefined,
      description: row.definition || undefined,
    }));

    console.log(`✅ Loaded ${indicators.length} indicators\n`);

    // Load time series data from local file
    console.log('📥 Loading time series data...');
    const timeSeriesByIndicator = new Map<
      string,
      Array<{ date: string; value: number }>
    >();

    for (const row of COUNTRY_INDICATORS) {
      if (!row.indicator_id || row.value === null || row.value === undefined) {
        continue;
      }
      if (!timeSeriesByIndicator.has(row.indicator_id)) {
        timeSeriesByIndicator.set(row.indicator_id, []);
      }
      timeSeriesByIndicator.get(row.indicator_id)!.push({
        date: row.date,
        value: row.value,
      });
    }

    console.log(
      `✅ Loaded time series for ${timeSeriesByIndicator.size} indicators\n`
    );

    // Add sample_values to indicators
    for (const indicator of indicators) {
      if (!indicator.id) continue;
      const timeSeries = timeSeriesByIndicator.get(indicator.id);
      if (timeSeries && timeSeries.length > 0) {
        // Take last 10 values for validation
        indicator.sample_values = timeSeries.slice(-10);
      }
    }

    // Run V2 pipeline with local database
    console.log('🔄 Starting V2 Classification Pipeline...\n');
    const startTime = Date.now();
    const localDbPath = './data/classify_production_v2.db';

    const result = await classifyIndicatorsV2(
      indicators,
      {
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
        apiKey: anthropicKey,
        temperature: 0.3,
        // Enable full logging for production runs
        quiet: false,
        debug: true,
      },
      {
        database: {
          type: 'local',
          path: localDbPath,
          autoMigrate: true,
          walMode: true,
        },
        batch: {
          routerBatchSize: 20,
          specialistBatchSize: 20,
          orientationBatchSize: 20,
          reviewBatchSize: 20,
        },
        concurrency: {
          router: 1,
          specialist: 1,
          orientation: 1,
          review: 1,
        },
      }
    );

    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 PRODUCTION PIPELINE SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Total Time: ${totalTime}s`);
    console.log(
      `📈 Success Rate: ${(
        (result.summary.successful / result.summary.total) *
        100
      ).toFixed(1)}%`
    );
    console.log(
      `✅ Successful: ${result.summary.successful}/${result.summary.total}`
    );
    console.log(`❌ Failed: ${result.summary.failed}/${result.summary.total}`);
    console.log(
      `🚩 Flagged: ${result.summary.flagged}/${result.summary.successful}`
    );
    console.log('');

    // Stage breakdown
    console.log('📋 Stage Breakdown:');
    console.log(
      `  Router:      ${result.stages.router.processed} processed (${result.stages.router.apiCalls} API calls, ${result.stages.router.processingTime}ms)`
    );
    console.log(
      `  Specialist:  ${result.stages.specialist.processed} processed (${result.stages.specialist.families} families, ${result.stages.specialist.apiCalls} API calls, ${result.stages.specialist.processingTime}ms)`
    );
    console.log(
      `  Validation:  ${result.stages.validation.analyzed} analyzed (${result.stages.validation.cumulative} cumulative, ${result.stages.validation.processingTime}ms)`
    );
    console.log(
      `  Orientation: ${result.stages.orientation.processed} processed (${result.stages.orientation.apiCalls} API calls, ${result.stages.orientation.processingTime}ms)`
    );
    console.log(`  Flagging:    ${result.stages.flagging.flagged} flagged`);
    console.log(
      `  Review:      ${result.stages.review.reviewed} reviewed (${result.stages.review.fixed} fixed, ${result.stages.review.escalated} escalated, ${result.stages.review.processingTime}ms)`
    );
    console.log('');

    // Cost analysis
    console.log('💰 Cost Analysis:');
    console.log(`  Total API Calls:   ${result.apiCalls}`);
    console.log(`  Total Time:        ${result.processingTime}ms`);
    console.log(`  Execution ID:      ${result.executionId}`);
    console.log('='.repeat(60));

    // Show escalated indicators (those that need human review)
    const escalatedClassifications = result.classifications.filter(
      (c) => c.review_status === 'escalate'
    );
    if (escalatedClassifications.length > 0) {
      console.log(
        `\n⚠️  Escalated Indicators (${escalatedClassifications.length}):`
      );
      for (const cls of escalatedClassifications.slice(0, 10)) {
        console.log(`  • ${cls.name} (${cls.indicator_id})`);
        if (cls.review_reason) {
          console.log(`    Reason: ${cls.review_reason}`);
        }
      }
      if (escalatedClassifications.length > 10) {
        console.log(`  ... and ${escalatedClassifications.length - 10} more`);
      }
      console.log('');
    }

    console.log('✅ Production pipeline completed!\n');
    console.log(`Results have been saved to: ${localDbPath}`);
    console.log('You can query the following tables for results:');
    console.log('  • classifications');
    console.log('  • router_results');
    console.log('  • specialist_results');
    console.log('  • validation_results');
    console.log('  • orientation_results');
    console.log('  • flagging_results');
    console.log('  • review_decisions\n');
  } catch (error) {
    console.error('\n❌ Pipeline failed:');
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}\n`
    );
    console.error('Stack trace:', error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await runProductionPipeline();
}
