/**
 * Main classification functions
 * @module
 */

import type {
  ClassificationOptions,
  ClassificationResult,
  ClassifiedMetadata,
  EnrichedIndicator,
  Indicator,
  LLMConfig,
} from './types.ts';
import { DEFAULT_CONFIG } from './types.ts';
import { getProvider } from './providers/index.ts';
import { estimateTokens } from './utils/token_counter.ts';
import { Spinner } from '@std/cli/unstable-spinner';

/**
 * Generate a unique ID for an indicator if it doesn't have one
 */
function ensureIndicatorId(indicator: Indicator, index: number): Indicator {
  if (indicator.id) {
    return indicator;
  }
  return {
    ...indicator,
    id: `ind_${index + 1}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`,
  };
}

/**
 * Classify a single indicator with retry logic
 */
async function classifySingleIndicatorWithRetry(
  indicator: Indicator,
  config: LLMConfig,
  maxRetries: number = 3
): Promise<{
  success: boolean;
  classification?: ClassifiedMetadata;
  error?: string;
  retries: number;
}> {
  const provider = getProvider(config.provider);
  let lastError: string = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const classifications = await provider.classify([indicator], config);

      // Validate that we got exactly one classification
      if (classifications.length !== 1) {
        throw new Error(
          `Expected 1 classification, got ${classifications.length}`
        );
      }

      const classification = classifications[0];

      // Validate that the indicator_id matches
      if (classification.indicator_id !== indicator.id) {
        throw new Error(
          `Indicator ID mismatch: expected "${indicator.id}", got "${classification.indicator_id}"`
        );
      }

      return { success: true, classification, retries: attempt };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1))
        );
      }
    }
  }

  return { success: false, error: lastError, retries: maxRetries };
}

/**
 * Classify a batch of economic indicators using LLM
 *
 * @param indicators - Array of indicators to classify
 * @param config - LLM configuration
 * @returns Array of enriched indicators with classification metadata
 *
 * @example
 * ```ts
 * const indicators = [
 *   {
 *     name: "GDP",
 *     units: "USD",
 *     currency_code: "USD",
 *     periodicity: "quarterly",
 *     source: "World Bank",
 *     sample_values: [21000000000000, 21500000000000]
 *   }
 * ];
 *
 * const config = {
 *   provider: "openai",
 *   apiKey: "your-api-key",
 *   model: "gpt-4o"
 * };
 *
 * const enriched = await classifyIndicators(indicators, config);
 * console.log(enriched[0].classification.indicator_type); // "flow"
 * ```
 */
export async function classifyIndicators(
  indicators: Indicator[],
  config: LLMConfig
): Promise<EnrichedIndicator[]> {
  if (indicators.length === 0) {
    return [];
  }

  // Ensure all indicators have IDs
  const indicatorsWithIds = indicators.map((ind, idx) =>
    ensureIndicatorId(ind, idx)
  );

  const provider = getProvider(config.provider);
  const classifications = await provider.classify(indicatorsWithIds, config);

  // Create a map for quick lookup
  const classificationMap = new Map<string, ClassifiedMetadata>();
  for (const classification of classifications) {
    classificationMap.set(classification.indicator_id, classification);
  }

  // Pair classifications with indicators
  return indicatorsWithIds.map((indicator) => {
    const classification = classificationMap.get(indicator.id!);
    if (!classification) {
      throw new Error(
        `No classification found for indicator ID: ${indicator.id}`
      );
    }
    return {
      ...indicator,
      classification,
    };
  });
}

/**
 * Classify indicators with advanced options including batching and error handling
 *
 * @param indicators - Array of indicators to classify
 * @param options - Classification options including LLM config and batch settings
 * @returns Classification result with enriched indicators and error information
 *
 * @example
 * ```ts
 * const result = await classifyIndicatorsWithOptions(indicators, {
 *   llmConfig: {
 *     provider: "anthropic",
 *     apiKey: "your-api-key",
 *   },
 *   batchSize: 5,
 *   includeReasoning: true,
 *   debug: true,
 * });
 *
 * console.log(`Successfully classified: ${result.enriched.length}`);
 * console.log(`Failed: ${result.failed.length}`);
 * console.log(`Processing time: ${result.processingTime}ms`);
 * ```
 */
export async function classifyIndicatorsWithOptions(
  indicators: Indicator[],
  options: ClassificationOptions
): Promise<ClassificationResult> {
  const startTime = Date.now();
  const batchSize = options.batchSize ?? DEFAULT_CONFIG.batchSize;
  const maxRetries = options.maxRetries ?? DEFAULT_CONFIG.maxRetries;
  const debug = options.debug ?? DEFAULT_CONFIG.debug;
  const dryRun = options.dryRun ?? false;
  const quiet = options.quiet ?? false;

  // Ensure all indicators have IDs
  const indicatorsWithIds = indicators.map((ind, idx) =>
    ensureIndicatorId(ind, idx)
  );

  const enriched: EnrichedIndicator[] = [];
  const failed: import('./types.ts').FailedIndicator[] = [];
  let apiCalls = 0;
  let totalRetries = 0;
  const tokenUsages: import('./types.ts').TokenUsage[] = [];

  // Merge options into config
  const config: LLMConfig = {
    ...options.llmConfig,
    temperature: options.llmConfig.temperature ?? DEFAULT_CONFIG.temperature,
    maxTokens: options.llmConfig.maxTokens ?? DEFAULT_CONFIG.maxTokens,
    timeout: options.llmConfig.timeout ?? DEFAULT_CONFIG.timeout,
    maxRetries: options.maxRetries ?? DEFAULT_CONFIG.maxRetries,
    retryDelay: options.retryDelay ?? DEFAULT_CONFIG.retryDelay,
    includeReasoning:
      options.includeReasoning ??
      options.llmConfig.includeReasoning ??
      DEFAULT_CONFIG.includeReasoning,
  };

  // Show header
  if (!quiet) {
    if (dryRun) {
      console.log('\n' + '='.repeat(60));
      console.log('🔍 DRY RUN MODE - No LLM calls will be made');
      console.log('='.repeat(60));
      console.log(`Total indicators: ${indicatorsWithIds.length}`);
      console.log(`Batch size: ${batchSize}`);
      console.log(`Provider: ${config.provider}`);
      console.log(
        `Model: ${
          config.model ||
          (await import('./types.ts')).DEFAULT_MODELS[config.provider]
        }`
      );
      console.log(
        `Include reasoning: ${options.includeReasoning ? 'yes' : 'no'}`
      );
      console.log('='.repeat(60));
    } else if (debug) {
      console.log('\n' + '='.repeat(60));
      console.log('🤖 CLASSIFICATION');
      console.log('='.repeat(60));
      console.log(`Total indicators: ${indicatorsWithIds.length}`);
      console.log(`Batch size: ${batchSize}`);
      console.log(`Provider: ${config.provider}`);
      console.log(
        `Model: ${
          config.model ||
          (await import('./types.ts')).DEFAULT_MODELS[config.provider]
        }`
      );
      console.log('='.repeat(60));
    }
  }

  // Create all batches upfront
  const allBatches: Indicator[][] = [];
  for (let i = 0; i < indicatorsWithIds.length; i += batchSize) {
    allBatches.push(indicatorsWithIds.slice(i, i + batchSize));
  }
  const totalBatches = allBatches.length;

  // Concurrent batch limit - respect API rate limits
  const maxConcurrentBatches =
    config.provider === 'gemini' ? 2 : config.provider === 'anthropic' ? 2 : 5;

  // Helper function to process a single batch
  const processBatch = async (
    batch: Indicator[],
    batchIndex: number,
    spinnerRef?: Spinner
  ) => {
    const batchNumber = batchIndex + 1;

    if (debug && !dryRun && !quiet) {
      console.log(
        `\n📦 Batch ${batchNumber}/${totalBatches} - ${batch.length} indicator${
          batch.length > 1 ? 's' : ''
        }`
      );
      console.log(
        `   Provider: ${config.provider}/${
          config.model ||
          (await import('./types.ts')).DEFAULT_MODELS[config.provider]
        }`
      );
    }

    // DRY RUN MODE
    if (dryRun) {
      const { estimateDryRunCost, generateMockClassification } = await import(
        './utils/dry_run.ts'
      );
      const { formatCost, formatTokens } = await import(
        './utils/token_counter.ts'
      );

      const estimate = estimateDryRunCost(
        batch,
        config.provider,
        config.model,
        (config.includeReasoning ?? false) as boolean
      );

      if (!quiet) {
        console.log(`\n📦 Batch ${batchNumber}/${totalBatches}`);
        console.log(`   Indicators: ${batch.length}`);
        console.log(`   Input tokens: ${formatTokens(estimate.inputTokens)}`);
        console.log(`   Output tokens: ${formatTokens(estimate.outputTokens)}`);
        console.log(`   Total tokens: ${formatTokens(estimate.totalTokens)}`);
        console.log(`   Estimated cost: ${formatCost(estimate.estimatedCost)}`);
      }

      const batchEnriched: EnrichedIndicator[] = [];
      for (const indicator of batch) {
        const mockClassification = generateMockClassification(indicator);
        batchEnriched.push({
          ...indicator,
          classification: mockClassification,
        });

        if (debug && !quiet) {
          console.log(
            `   ✓ ${indicator.name} → ${mockClassification.indicator_type} [MOCK]`
          );
        }
      }

      return {
        enriched: batchEnriched,
        failed: [],
        apiCalls: 1,
        retries: 0,
        tokenUsage: {
          inputTokens: estimate.inputTokens,
          outputTokens: estimate.outputTokens,
          totalTokens: estimate.totalTokens,
          estimatedCost: estimate.estimatedCost,
          provider: estimate.provider,
          model: estimate.model,
        },
      };
    }

    // NORMAL MODE - Process entire batch as single API request with retry
    const batchStartTime = Date.now();
    const batchEnriched: EnrichedIndicator[] = [];
    const batchFailed: import('./types.ts').FailedIndicator[] = [];
    let batchApiCalls = 0;
    let batchRetries = 0;

    // Try batch classification with retries
    let lastError: string = '';
    let batchSuccess = false;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const batchClassified = await classifyIndicators(batch, config);
        batchEnriched.push(...batchClassified);
        batchApiCalls = 1;
        batchRetries = attempt;
        batchSuccess = true;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        batchRetries = attempt;

        // Log error if not in quiet mode
        if (!quiet && spinnerRef) {
          spinnerRef.stop();
          console.error(`
⚠️  Batch ${batchNumber}/${totalBatches} error (attempt ${attempt + 1}/${
            maxRetries + 1
          }): ${lastError.substring(0, 200)}`);
          if (attempt < maxRetries) {
            console.log(`   Retrying in ${attempt + 1}s...`);
          }
          spinnerRef.start();
        }

        // If this isn't the last attempt, wait before retrying
        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1))
          );
        }
      }
    }

    // If batch failed, fall back to individual processing
    if (!batchSuccess) {
      batchApiCalls = 1; // Count the failed batch attempt

      for (const indicator of batch) {
        const result = await classifySingleIndicatorWithRetry(
          indicator,
          config,
          maxRetries
        );

        batchApiCalls += result.retries + 1;
        batchRetries += result.retries;

        if (result.success && result.classification) {
          batchEnriched.push({
            ...indicator,
            classification: result.classification,
          });
        } else {
          batchFailed.push({
            indicator,
            error: result.error || 'Unknown error',
            retries: result.retries,
          });
        }
      }
    }

    const batchTime = Date.now() - batchStartTime;

    if (debug && !quiet) {
      console.log(
        `   ✓ Classified ${batchEnriched.length} indicator${
          batchEnriched.length > 1 ? 's' : ''
        } in ${batchTime}ms`
      );
      for (let j = 0; j < Math.min(3, batchEnriched.length); j++) {
        const item = batchEnriched[j];
        console.log(
          `     • ${item.name}: ${item.classification.indicator_type} (${item.classification.indicator_category})`
        );
      }
      if (batchEnriched.length > 3) {
        console.log(`     ... and ${batchEnriched.length - 3} more`);
      }
    }

    return {
      enriched: batchEnriched,
      failed: batchFailed,
      apiCalls: batchApiCalls,
      retries: batchRetries,
      tokenUsage: undefined,
    };
  };

  // Process batches with concurrency control
  let spinner: Spinner | undefined;
  if (!quiet && !dryRun) {
    spinner = new Spinner({
      message: `Processing ${totalBatches} batches (up to ${maxConcurrentBatches} concurrent)...`,
      color: 'cyan',
    });
    spinner.start();
  }

  for (let i = 0; i < allBatches.length; i += maxConcurrentBatches) {
    const batchChunk = allBatches.slice(i, i + maxConcurrentBatches);
    const chunkResults = await Promise.all(
      batchChunk.map((batch, idx) => processBatch(batch, i + idx, spinner))
    );

    // Aggregate results from this chunk
    for (const result of chunkResults) {
      enriched.push(...result.enriched);
      failed.push(...result.failed);
      apiCalls += result.apiCalls;
      totalRetries += result.retries;
      if (result.tokenUsage) {
        tokenUsages.push(result.tokenUsage);
      }
    }
  }

  if (spinner) {
    spinner.stop();
  }

  const processingTime = Date.now() - startTime;
  const total = indicatorsWithIds.length;
  const successful = enriched.length;
  const failedCount = failed.length;
  const successRate = total > 0 ? (successful / total) * 100 : 0;

  // Aggregate token usage if available
  let totalTokenUsage: import('./types.ts').TokenUsage;
  if (tokenUsages.length > 0) {
    // Use actual token counts from API responses
    const { combineTokenUsage } = await import('./utils/token_counter.ts');
    totalTokenUsage = combineTokenUsage(tokenUsages);
  } else {
    // Estimate tokens based on content
    const provider = config.provider;
    const model =
      config.model || (await import('./types.ts')).DEFAULT_MODELS[provider];

    // Estimate input tokens from all indicators
    let estimatedInput = 0;
    for (const ind of indicatorsWithIds) {
      const text = JSON.stringify(ind);
      estimatedInput += estimateTokens(text);
    }

    // Estimate output tokens (roughly 150 tokens per indicator)
    const estimatedOutput = successful * 150;

    const { calculateCost } = await import('./utils/token_counter.ts');
    const estimatedCost = calculateCost(
      estimatedInput,
      estimatedOutput,
      provider,
      model
    );

    totalTokenUsage = {
      inputTokens: estimatedInput,
      outputTokens: estimatedOutput,
      totalTokens: estimatedInput + estimatedOutput,
      estimatedCost,
      provider,
      model,
    };
  }

  // Calculate performance metrics
  const avgTimePerIndicator = total > 0 ? processingTime / total : 0;
  const throughput =
    processingTime > 0 ? (successful / processingTime) * 1000 : 0;
  const avgTokensPerIndicator =
    successful > 0 ? totalTokenUsage.totalTokens / successful : 0;
  const avgCostPerIndicator =
    successful > 0 ? totalTokenUsage.estimatedCost / successful : 0;

  if ((debug || dryRun) && !quiet) {
    const { formatCost, formatTokens } = await import(
      './utils/token_counter.ts'
    );
    console.log(`\n${'='.repeat(60)}`);
    console.log(dryRun ? `📊 DRY RUN SUMMARY` : `📊 API SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(
      `🔌 API Calls: ${successful}/${total} successful (${successRate.toFixed(
        1
      )}%)`
    );
    if (failedCount > 0) {
      console.log(`   Failed:    ${failedCount}/${total}`);
    }
    console.log(
      `⏱️  Time:     ${processingTime}ms (${avgTimePerIndicator.toFixed(
        0
      )}ms/indicator)`
    );
    if (!dryRun && totalRetries > 0) {
      console.log(`🔄 Retries:   ${totalRetries}`);
    }
    console.log(
      `💰 Cost:     ${formatCost(totalTokenUsage.estimatedCost)}${
        dryRun ? ' (estimated)' : ''
      }`
    );
    console.log(
      `🎫 Tokens:    ${formatTokens(
        totalTokenUsage.totalTokens
      )} (in: ${formatTokens(totalTokenUsage.inputTokens)}, out: ${formatTokens(
        totalTokenUsage.outputTokens
      )})`
    );
    if (dryRun) {
      console.log(`\n⚠️  DRY RUN - No actual LLM calls made`);
    }
    console.log(`${'='.repeat(60)}\n`);
  }

  return {
    enriched,
    failed,
    summary: {
      total,
      successful,
      failed: failedCount,
      successRate,
    },
    processingTime,
    apiCalls,
    retries: totalRetries,
    tokenUsage: totalTokenUsage,
    performance: {
      avgTimePerIndicator,
      throughput,
      avgTokensPerIndicator,
      avgCostPerIndicator,
    },
  };
}

/**
 * Classify a single indicator
 *
 * @param indicator - Indicator to classify
 * @param config - LLM configuration
 * @returns Enriched indicator with classification metadata
 *
 * @example
 * ```ts
 * const indicator = {
 *   name: "Unemployment Rate",
 *   units: "%",
 *   periodicity: "monthly",
 * };
 *
 * const enriched = await classifyIndicator(indicator, {
 *   provider: "gemini",
 *   apiKey: "your-api-key",
 * });
 *
 * console.log(enriched.classification.indicator_type); // "percentage"
 * ```
 */
export async function classifyIndicator(
  indicator: Indicator,
  config: LLMConfig
): Promise<EnrichedIndicator> {
  const results = await classifyIndicators([indicator], config);
  return results[0];
}
