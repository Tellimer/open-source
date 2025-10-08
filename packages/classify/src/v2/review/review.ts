/**
 * Review Stage - LLM-based correction of flagged indicators
 * @module
 */

import type { LLMConfig } from "../../types.ts";
import type { V2DatabaseClient } from "../db/client.ts";
import type {
  FlaggedIndicator,
  ReviewAction,
  ReviewBatchResult,
  ReviewConfig,
  ReviewDecision,
} from "../types.ts";
import { AiSdkProvider } from "../providers/ai-sdk.ts";
import { ReviewBatchSchema } from "../schemas/index.ts";
import {
  generateReviewSystemPrompt,
  generateReviewUserPrompt,
} from "./prompts.ts";
import {
  applyReviewDiff,
  readFlaggedIndicators,
  writeReviewDecisions,
} from "./storage.ts";
import { Spinner } from "../../utils/spinner.ts";

/**
 * Review a batch of flagged indicators using LLM (AI SDK-based)
 */
async function reviewBatch(
  flaggedIndicators: Array<FlaggedIndicator & { name: string }>,
  llmConfig: LLMConfig,
  _config: ReviewConfig,
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
  const userPrompt = generateReviewUserPrompt(flaggedIndicators);

  // Use AI SDK with Valibot schema validation
  const aiResult = await aiProvider.generateStructured(
    systemPrompt,
    userPrompt,
    ReviewBatchSchema,
  );

  // Map AI SDK result to ReviewDecision format (diff typed to Partial<ClassifiedMetadata>)
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
 * Process all flagged indicators through review stage
 */
export async function reviewFlaggedIndicators(
  db: V2DatabaseClient,
  llmConfig: LLMConfig,
  config: ReviewConfig,
): Promise<ReviewBatchResult> {
  const startTime = Date.now();

  // 1. Fetch flagged indicators from database
  const flaggedIndicators = readFlaggedIndicators(db);

  if (flaggedIndicators.length === 0) {
    if (!config.quiet) {
      console.log("✓ No flagged indicators to review");
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
      `\n📋 Reviewing ${flaggedIndicators.length} flagged indicators...`,
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

  const spinner = new Spinner("Processing review batches...");
  if (!config.quiet) spinner.start();

  const batches: Array<Array<FlaggedIndicator & { name: string }>> = [];
  for (let i = 0; i < flaggedIndicators.length; i += batchSize) {
    batches.push(flaggedIndicators.slice(i, i + batchSize));
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
          console.error("[Review] Batch failed:", error);
        }
        // Return escalate decisions for failed batch
        return batch.map((flagged) => ({
          indicator_id: flagged.indicator_id,
          action: "escalate" as ReviewAction,
          reason: `Review failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          confidence: 0,
        }));
      }
    });

    const batchResults = await Promise.all(batchPromises);
    allDecisions.push(...batchResults.flat());

    if (!config.quiet) {
      spinner.text = `Processed ${
        Math.min(
          (i + concurrency) * batchSize,
          flaggedIndicators.length,
        )
      }/${flaggedIndicators.length} flagged indicators...`;
    }
  }

  if (!config.quiet) spinner.stop();

  // 3. Write decisions to database
  writeReviewDecisions(db, allDecisions);

  // 4. Apply fixes to classifications table
  const fixedDecisions = allDecisions.filter(
    (d) => d.action === "fix" && d.diff,
  );
  for (const decision of fixedDecisions) {
    if (decision.diff) {
      applyReviewDiff(
        db,
        decision.indicator_id,
        decision.diff,
        decision.reason,
      );
    }
  }

  // 5. Calculate summary stats
  const confirmed = allDecisions.filter((d) => d.action === "confirm").length;
  const fixed = allDecisions.filter((d) => d.action === "fix").length;
  const escalated = allDecisions.filter((d) => d.action === "escalate").length;

  const result: ReviewBatchResult = {
    reviewed: allDecisions.length,
    confirmed,
    fixed,
    escalated,
    decisions: allDecisions,
    processingTime: Date.now() - startTime,
    apiCalls,
    usage: totalUsage,
  };

  if (!config.quiet) {
    console.log(`\n✓ Review complete:`);
    console.log(`  • Reviewed: ${result.reviewed}`);
    console.log(
      `  • Confirmed: ${confirmed} (${
        (
          (confirmed / result.reviewed) *
          100
        ).toFixed(1)
      }%)`,
    );
    console.log(
      `  • Fixed: ${fixed} (${((fixed / result.reviewed) * 100).toFixed(1)}%)`,
    );
    console.log(
      `  • Escalated: ${escalated} (${
        (
          (escalated / result.reviewed) *
          100
        ).toFixed(1)
      }%)`,
    );
    console.log(`  • Time: ${result.processingTime}ms`);
  }

  return result;
}

/**
 * Review a single flagged indicator (for testing or manual review)
 */
export async function reviewSingleIndicator(
  flaggedIndicator: FlaggedIndicator & { name: string },
  llmConfig: LLMConfig,
  config: ReviewConfig,
): Promise<ReviewDecision> {
  const result = await reviewBatch([flaggedIndicator], llmConfig, config);
  return (
    result.decisions[0] || {
      indicator_id: flaggedIndicator.indicator_id,
      action: "escalate",
      reason: "No decision returned from LLM",
      confidence: 0,
    }
  );
}
