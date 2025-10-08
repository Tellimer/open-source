/**
 * Review All Classifications - AI reviews all indicators, flags only errors
 * @module
 */

import type { LLMConfig } from '../../types.ts';
import type { V2DatabaseClient } from '../db/client.ts';
import type {
  ReviewDecision,
  ReviewAction,
  ReviewConfig,
  ReviewBatchResult,
} from '../types.ts';
import { AiSdkProvider } from '../providers/ai-sdk.ts';
import { ReviewBatchSchema } from '../schemas/index.ts';
import {
  generateReviewSystemPrompt,
  generateReviewUserPrompt,
} from './prompts.ts';
import { writeReviewDecisions, applyReviewDiff } from './storage.ts';
import { writeFlaggingResults } from './storage.ts';
import { Spinner } from '../../utils/spinner.ts';

interface ClassificationForReview {
  indicator_id: string;
  name: string;
  units?: string;
  description?: string;
  family?: string;
  confidence_family?: number;
  reasoning_router?: string;
  indicator_type?: string;
  temporal_aggregation?: string;
  is_currency_denominated?: boolean;
  confidence_cls?: number;
  reasoning_specialist?: string;
  heat_map_orientation?: string;
  confidence_orient?: number;
  reasoning_orientation?: string;
}

/**
 * Review a batch of classifications using LLM
 */
async function reviewBatch(
  classifications: ClassificationForReview[],
  llmConfig: LLMConfig,
  config: ReviewConfig
): Promise<{
  decisions: ReviewDecision[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}> {
  const aiProvider = new AiSdkProvider(llmConfig);
  const systemPrompt = generateReviewSystemPrompt();

  // Convert classifications to format expected by review prompt
  const flaggedIndicators = classifications.map((c) => {
    // Build current_value with all classification data and reasoning
    const currentValue = [
      c.units ? `Units: ${c.units}` : null,
      c.description ? `Description: ${c.description}` : null,
      c.family
        ? `Family: ${c.family} (conf: ${c.confidence_family?.toFixed(2)})`
        : null,
      c.reasoning_router ? `Router reasoning: ${c.reasoning_router}` : null,
      c.indicator_type ? `Type: ${c.indicator_type}` : null,
      c.temporal_aggregation ? `Temporal: ${c.temporal_aggregation}` : null,
      c.is_currency_denominated !== undefined
        ? `Currency: ${c.is_currency_denominated}`
        : null,
      c.confidence_cls
        ? `Classification conf: ${c.confidence_cls.toFixed(2)}`
        : null,
      c.reasoning_specialist
        ? `Specialist reasoning: ${c.reasoning_specialist}`
        : null,
      c.heat_map_orientation
        ? `Orientation: ${
            c.heat_map_orientation
          } (conf: ${c.confidence_orient?.toFixed(2)})`
        : null,
      c.reasoning_orientation
        ? `Orientation reasoning: ${c.reasoning_orientation}`
        : null,
    ]
      .filter(Boolean)
      .join('; ');

    return {
      indicator_id: c.indicator_id,
      name: c.name,
      flag_type: 'review_all' as const,
      flag_reason: 'Production review - verify classification correctness',
      current_value: currentValue,
      flagged_at: new Date().toISOString(),
    };
  });

  const userPrompt = generateReviewUserPrompt(flaggedIndicators);

  // Use AI SDK with Valibot schema validation
  const aiResult = await aiProvider.generateStructured(
    systemPrompt,
    userPrompt,
    ReviewBatchSchema
  );

  // Map AI SDK result to ReviewDecision format
  const decisions: ReviewDecision[] = aiResult.data.results.map((item) => ({
    indicator_id: item.indicator_id,
    action: item.action,
    diff: item.diff as unknown as Partial<any>,
    reason: item.reason,
    confidence: item.confidence,
  }));

  return {
    decisions,
    usage: aiResult.usage,
  };
}

/**
 * Review ALL classifications and flag only those with errors
 */
export async function reviewAllClassifications(
  db: V2DatabaseClient,
  llmConfig: LLMConfig,
  config: ReviewConfig
): Promise<ReviewBatchResult> {
  const startTime = Date.now();

  // 1. Fetch ALL classified indicators from database
  const query = `
    SELECT
      indicator_id,
      name,
      units,
      description,
      family,
      confidence_family,
      reasoning_router,
      indicator_type,
      temporal_aggregation,
      is_currency_denominated,
      confidence_cls,
      reasoning_specialist,
      heat_map_orientation,
      confidence_orient,
      reasoning_orientation
    FROM classifications
    WHERE indicator_type IS NOT NULL
    ORDER BY indicator_id
  `;

  const rows = db.prepare(query).all();
  const classifications = rows as ClassificationForReview[];

  if (classifications.length === 0) {
    if (!config.quiet) {
      console.log('✓ No classifications to review');
    }
    return {
      reviewed: 0,
      confirmed: 0,
      fixed: 0,
      escalated: 0,
      decisions: [],
      processingTime: Date.now() - startTime,
      apiCalls: 0,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  }

  if (!config.quiet) {
    console.log(
      `\n📋 Reviewing ${classifications.length} classified indicators...`
    );
  }

  // 2. Batch processing
  const batchSize = config.batchSize || 20;
  const concurrency = config.concurrency || 2;
  const allDecisions: ReviewDecision[] = [];
  let apiCalls = 0;
  let totalUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  const spinner = new Spinner('Processing review batches...');
  if (!config.quiet) spinner.start();

  const batches: ClassificationForReview[][] = [];
  for (let i = 0; i < classifications.length; i += batchSize) {
    batches.push(classifications.slice(i, i + batchSize));
  }

  // Process batches with concurrency control
  for (let i = 0; i < batches.length; i += concurrency) {
    const concurrentBatches = batches.slice(i, i + concurrency);

    const batchPromises = concurrentBatches.map(async (batch) => {
      try {
        const result = await reviewBatch(batch, llmConfig, config);
        apiCalls++;

        // Accumulate usage
        totalUsage.promptTokens += result.usage.promptTokens;
        totalUsage.completionTokens += result.usage.completionTokens;
        totalUsage.totalTokens += result.usage.totalTokens;

        return result.decisions;
      } catch (error) {
        if (config.debug) {
          console.error('[Review] Batch failed:', error);
        }
        // Return escalate decisions for failed batch
        return batch.map((c) => ({
          indicator_id: c.indicator_id,
          action: 'escalate' as ReviewAction,
          reason: `Review failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
          confidence: 0,
          diff: {},
        }));
      }
    });

    const batchResults = await Promise.all(batchPromises);
    allDecisions.push(...batchResults.flat());

    if (!config.quiet) {
      spinner.text = `Processed ${Math.min(
        (i + concurrency) * batchSize,
        classifications.length
      )}/${classifications.length}`;
    }
  }

  if (!config.quiet) spinner.stop();

  // 3. Write review decisions to database
  writeReviewDecisions(db, allDecisions);

  // 4. Apply fixes for 'fix' decisions
  const fixDecisions = allDecisions.filter((d) => d.action === 'fix');
  for (const decision of fixDecisions) {
    if (decision.diff && Object.keys(decision.diff).length > 0) {
      applyReviewDiff(
        db,
        decision.indicator_id,
        decision.diff,
        decision.reason
      );
    }
  }

  // 5. Create flags ONLY for escalated indicators
  const escalatedDecisions = allDecisions.filter(
    (d) => d.action === 'escalate'
  );
  const flagsToWrite = escalatedDecisions.map((decision) => ({
    indicator_id: decision.indicator_id,
    flag_type: 'review_escalation' as const,
    flag_reason: decision.reason,
    confidence: decision.confidence,
    flagged_at: new Date().toISOString(),
  }));

  if (flagsToWrite.length > 0) {
    writeFlaggingResults(db, flagsToWrite);
  }

  // 6. Calculate statistics
  const confirmed = allDecisions.filter((d) => d.action === 'confirm').length;
  const fixed = fixDecisions.length;
  const escalated = escalatedDecisions.length;

  if (!config.quiet) {
    console.log(
      `\n✓ Review complete: ${confirmed} confirmed, ${fixed} fixed, ${escalated} escalated`
    );
  }

  return {
    reviewed: allDecisions.length,
    confirmed,
    fixed,
    escalated,
    decisions: allDecisions,
    processingTime: Date.now() - startTime,
    apiCalls,
    usage: totalUsage,
  };
}
