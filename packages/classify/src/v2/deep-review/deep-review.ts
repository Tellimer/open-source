/**
 * Deep Review Stage - Second Opinion on Suggested Fixes
 * Uses Claude Sonnet 4.5 for independent verification
 * @module
 */

import type { LLMConfig } from "../../types.ts";
import type { V2DatabaseClient } from "../db/client.ts";
import type {
  DeepReviewBatchResult,
  DeepReviewConfig,
  DeepReviewDecision,
  SuggestedFix,
} from "../types.ts";
import { AiSdkProvider } from "../providers/ai-sdk.ts";
import { DeepReviewBatchSchema } from "../schemas/index.ts";
import {
  generateDeepReviewSystemPrompt,
  generateDeepReviewUserPrompt,
} from "./prompts.ts";
import {
  applyAcceptedFixes,
  readSuggestedFixes,
  writeDeepReviewDecisions,
} from "./storage.ts";
import { Spinner } from "../../utils/spinner.ts";

/**
 * Process a batch of suggested fixes through deep review
 */
async function deepReviewBatch(
  suggestedFixes: SuggestedFix[],
  llmConfig: LLMConfig,
  _config: DeepReviewConfig,
): Promise<{
  decisions: DeepReviewDecision[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}> {
  const aiProvider = new AiSdkProvider(llmConfig);
  const systemPrompt = generateDeepReviewSystemPrompt();
  const userPrompt = generateDeepReviewUserPrompt(suggestedFixes);

  // Use AI SDK with Valibot schema validation
  const aiResult = await aiProvider.generateStructured(
    systemPrompt,
    userPrompt,
    DeepReviewBatchSchema,
  );

  // Map AI SDK result to DeepReviewDecision format
  const decisions: DeepReviewDecision[] = aiResult.data.results.map((item) => ({
    indicator_id: item.indicator_id,
    action: item.action,
    reason: item.reason,
    confidence: item.confidence,
    final_diff: item.final_diff as unknown as Partial<any>,
  }));

  return {
    decisions,
    usage: aiResult.usage,
  };
}

/**
 * Process all suggested fixes through deep review stage
 * Uses Claude Sonnet 4.5 for second opinion
 */
export async function deepReviewSuggestedFixes(
  db: V2DatabaseClient,
  llmConfig: LLMConfig,
  config: DeepReviewConfig,
): Promise<DeepReviewBatchResult> {
  const startTime = Date.now();
  const batchSize = config.batchSize ?? 5;
  const debug = config.debug ?? false;
  const quiet = config.quiet ?? false;

  // 1. Fetch suggested fixes from database
  const suggestedFixes = readSuggestedFixes(db);

  if (suggestedFixes.length === 0) {
    if (!quiet) {
      console.log("✓ No suggested fixes to deep review");
    }
    return {
      reviewed: 0,
      accepted: 0,
      rejected: 0,
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

  if (!quiet) {
    console.log(`\n📍 Stage 6: Deep Review (Second Opinion)\n`);
    console.log("=".repeat(60));
    console.log("🔍 DEEP REVIEW STAGE - CLAUDE SONNET 4.5");
    console.log("=".repeat(60));
    console.log(`Total suggested fixes: ${suggestedFixes.length}`);
    console.log(`Batch size: ${batchSize}`);
    console.log(`Model: ${llmConfig.model || "claude-sonnet-4-5-20250929"}`);
    console.log("=".repeat(60));
    console.log("");
  }

  // 2. Process in batches
  const totalBatches = Math.ceil(suggestedFixes.length / batchSize);
  let allDecisions: DeepReviewDecision[] = [];
  let totalApiCalls = 0;
  let totalUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, suggestedFixes.length);
    const batch = suggestedFixes.slice(start, end);

    if (!quiet) {
      console.log(
        `📦 Processing batch ${
          i + 1
        } of ${totalBatches} (${batch.length} fixes)`,
      );
    }

    const spinner = new Spinner(
      `Deep reviewing batch ${i + 1}/${totalBatches}...`,
    );
    if (!quiet) spinner.start();

    try {
      const result = await deepReviewBatch(batch, llmConfig, config);

      if (!quiet) spinner.succeed();

      allDecisions.push(...result.decisions);
      totalApiCalls++;
      totalUsage.promptTokens += result.usage.promptTokens;
      totalUsage.completionTokens += result.usage.completionTokens;
      totalUsage.totalTokens += result.usage.totalTokens;

      // Write decisions to database after each batch
      writeDeepReviewDecisions(db, result.decisions);

      // Count actions
      const accepted = result.decisions.filter((d) => d.action === "accept-fix")
        .length;
      const rejected = result.decisions.filter((d) => d.action === "reject-fix")
        .length;
      const escalated = result.decisions.filter((d) => d.action === "escalate")
        .length;

      if (!quiet) {
        console.log(
          `   ✓ Batch ${
            i + 1
          }: ${accepted} accepted, ${rejected} rejected, ${escalated} escalated`,
        );
      }

      if (debug) {
        console.log(`   Tokens: ${result.usage.totalTokens}`);
      }
    } catch (error) {
      if (!quiet) {
        spinner.fail();
        console.error(`   ✗ Batch ${i + 1} failed:`, error);
      }
      throw error;
    }
  }

  // 3. Apply accepted fixes
  if (!quiet) {
    console.log("\n📝 Applying accepted fixes to classifications...");
  }
  applyAcceptedFixes(db, allDecisions);

  // 4. Calculate stats
  const accepted = allDecisions.filter((d) => d.action === "accept-fix").length;
  const rejected = allDecisions.filter((d) => d.action === "reject-fix").length;
  const escalated = allDecisions.filter((d) => d.action === "escalate").length;

  const processingTime = Date.now() - startTime;

  if (!quiet) {
    console.log("\n" + "=".repeat(60));
    console.log("📊 DEEP REVIEW SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total reviewed: ${allDecisions.length}`);
    console.log(`✓ Accepted fixes: ${accepted}`);
    console.log(`✗ Rejected fixes: ${rejected}`);
    console.log(`⚠ Escalated: ${escalated}`);
    console.log(`⏱️  Processing time: ${(processingTime / 1000).toFixed(1)}s`);
    console.log(`📞 Total API calls: ${totalApiCalls}`);
    console.log(
      `🪙 Tokens used: ${totalUsage.totalTokens.toLocaleString()}`,
    );
    console.log("=".repeat(60));
  }

  return {
    reviewed: allDecisions.length,
    accepted,
    rejected,
    escalated,
    decisions: allDecisions,
    processingTime,
    apiCalls: totalApiCalls,
    usage: totalUsage,
  };
}
