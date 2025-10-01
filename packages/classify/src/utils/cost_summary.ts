/**
 * Cost summary utilities for classification results
 * @module
 */

import type { ClassificationResult } from '../types.ts';
import { formatCost, formatTokens } from './token_counter.ts';

/**
 * Cost summary information
 */
export interface CostSummary {
  /** Total estimated cost in USD */
  totalCost: number;
  /** Total cost formatted as string */
  totalCostFormatted: string;
  /** Average cost per indicator in USD */
  avgCostPerIndicator: number;
  /** Average cost per indicator formatted as string */
  avgCostPerIndicatorFormatted: string;
  /** Total tokens used */
  totalTokens: number;
  /** Total tokens formatted as string */
  totalTokensFormatted: string;
  /** Input tokens used */
  inputTokens: number;
  /** Output tokens used */
  outputTokens: number;
  /** Provider used */
  provider: string;
  /** Model used */
  model: string;
  /** Number of successful classifications */
  successfulClassifications: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Extract a cost summary from classification result
 *
 * @param result - Classification result from classifyIndicatorsWithOptions
 * @returns Cost summary with formatted values
 *
 * @example
 * ```ts
 * const result = await classifyIndicatorsWithOptions(indicators, {
 *   llmConfig: { provider: 'openai', apiKey: 'sk-...' }
 * });
 *
 * const summary = getCostSummary(result);
 * console.log(`Total cost: ${summary.totalCostFormatted}`);
 * console.log(`Avg cost/indicator: ${summary.avgCostPerIndicatorFormatted}`);
 * ```
 */
export function getCostSummary(result: ClassificationResult): CostSummary {
  return {
    totalCost: result.tokenUsage.estimatedCost,
    totalCostFormatted: formatCost(result.tokenUsage.estimatedCost),
    avgCostPerIndicator: result.performance.avgCostPerIndicator,
    avgCostPerIndicatorFormatted: formatCost(result.performance.avgCostPerIndicator),
    totalTokens: result.tokenUsage.totalTokens,
    totalTokensFormatted: formatTokens(result.tokenUsage.totalTokens),
    inputTokens: result.tokenUsage.inputTokens,
    outputTokens: result.tokenUsage.outputTokens,
    provider: result.tokenUsage.provider,
    model: result.tokenUsage.model,
    successfulClassifications: result.summary.successful,
    processingTimeMs: result.processingTime,
  };
}

/**
 * Print a cost summary to console
 *
 * @param result - Classification result
 * @param options - Display options
 *
 * @example
 * ```ts
 * const result = await classifyIndicatorsWithOptions(indicators, config);
 * printCostSummary(result);
 * ```
 */
export function printCostSummary(
  result: ClassificationResult,
  options: { verbose?: boolean } = {}
): void {
  const summary = getCostSummary(result);

  console.log('\n' + '='.repeat(60));
  console.log('💰 COST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Provider:              ${summary.provider}`);
  console.log(`Model:                 ${summary.model}`);
  console.log(`Indicators processed:  ${summary.successfulClassifications}`);
  console.log('');
  console.log(`Total tokens:          ${summary.totalTokensFormatted}`);
  console.log(`  Input tokens:        ${formatTokens(summary.inputTokens)}`);
  console.log(`  Output tokens:       ${formatTokens(summary.outputTokens)}`);
  console.log('');
  console.log(`💵 TOTAL COST:         ${summary.totalCostFormatted}`);
  console.log(`   Per indicator:      ${summary.avgCostPerIndicatorFormatted}`);
  console.log('');
  console.log(`Processing time:       ${summary.processingTimeMs}ms`);
  console.log(`Throughput:            ${result.performance.throughput.toFixed(2)} ind/sec`);

  if (options.verbose) {
    console.log('');
    console.log('Detailed breakdown:');
    console.log(`  API calls:           ${result.apiCalls}`);
    console.log(`  Retries:             ${result.retries}`);
    console.log(`  Success rate:        ${result.summary.successRate.toFixed(1)}%`);
    console.log(`  Failed:              ${result.summary.failed}`);
    console.log(`  Avg time/indicator:  ${result.performance.avgTimePerIndicator.toFixed(2)}ms`);
    console.log(`  Avg tokens/indicator: ${result.performance.avgTokensPerIndicator.toFixed(0)}`);
  }

  console.log('='.repeat(60) + '\n');
}

/**
 * Calculate projected cost for scaling up
 *
 * @param result - Sample classification result
 * @param targetCount - Number of indicators to project for
 * @returns Projected cost information
 *
 * @example
 * ```ts
 * const sample = await classifyIndicatorsWithOptions(sampleIndicators, config);
 * const projection = projectCost(sample, 100000);
 * console.log(`Cost for 100k indicators: ${projection.totalCostFormatted}`);
 * ```
 */
export function projectCost(
  result: ClassificationResult,
  targetCount: number
): {
  targetCount: number;
  totalCost: number;
  totalCostFormatted: string;
  totalTokens: number;
  totalTokensFormatted: string;
  estimatedTimeMs: number;
  estimatedTimeFormatted: string;
} {
  const avgCost = result.performance.avgCostPerIndicator;
  const avgTokens = result.performance.avgTokensPerIndicator;
  const avgTime = result.performance.avgTimePerIndicator;

  const totalCost = avgCost * targetCount;
  const totalTokens = Math.round(avgTokens * targetCount);
  const estimatedTimeMs = Math.round(avgTime * targetCount);

  // Format time nicely
  let estimatedTimeFormatted: string;
  if (estimatedTimeMs < 1000) {
    estimatedTimeFormatted = `${estimatedTimeMs}ms`;
  } else if (estimatedTimeMs < 60000) {
    estimatedTimeFormatted = `${(estimatedTimeMs / 1000).toFixed(1)}s`;
  } else if (estimatedTimeMs < 3600000) {
    estimatedTimeFormatted = `${(estimatedTimeMs / 60000).toFixed(1)}min`;
  } else {
    estimatedTimeFormatted = `${(estimatedTimeMs / 3600000).toFixed(1)}hr`;
  }

  return {
    targetCount,
    totalCost,
    totalCostFormatted: formatCost(totalCost),
    totalTokens,
    totalTokensFormatted: formatTokens(totalTokens),
    estimatedTimeMs,
    estimatedTimeFormatted,
  };
}

/**
 * Print cost projections for multiple target counts
 *
 * @param result - Sample classification result
 * @param targetCounts - Array of indicator counts to project for
 *
 * @example
 * ```ts
 * const sample = await classifyIndicatorsWithOptions(sampleIndicators, config);
 * printCostProjections(sample, [100, 1000, 10000, 100000]);
 * ```
 */
export function printCostProjections(
  result: ClassificationResult,
  targetCounts: number[] = [100, 1000, 10000, 100000]
): void {
  console.log('\n' + '='.repeat(70));
  console.log('📊 COST PROJECTIONS');
  console.log('='.repeat(70));
  console.log(`Based on: ${result.summary.successful} indicators @ ${formatCost(result.tokenUsage.estimatedCost)}`);
  console.log('');
  console.log('Indicators | Est. Cost      | Est. Tokens    | Est. Time');
  console.log('-'.repeat(70));

  for (const count of targetCounts) {
    const projection = projectCost(result, count);
    const countStr = count.toLocaleString().padEnd(10);
    const costStr = projection.totalCostFormatted.padEnd(14);
    const tokensStr = projection.totalTokensFormatted.padEnd(14);
    const timeStr = projection.estimatedTimeFormatted;

    console.log(`${countStr} | ${costStr} | ${tokensStr} | ${timeStr}`);
  }

  console.log('='.repeat(70) + '\n');
}
