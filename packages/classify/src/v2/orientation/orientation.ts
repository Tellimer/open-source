/**
 * Orientation Stage - Heat Map Orientation Classification
 * @module
 */

import type { HeatMapOrientation, Indicator, LLMConfig } from "../../types.ts";
import type { OrientationResult } from "../types.ts";
import { AiSdkProvider } from "../providers/ai-sdk.ts";
import { OrientationBatchSchema } from "../schemas/index.ts";
import {
  generateOrientationSystemPrompt,
  generateOrientationUserPrompt,
} from "./prompts.ts";
import { Spinner } from "@std/cli/unstable-spinner";

/**
 * Orientation configuration
 */
export interface OrientationConfig {
  llmConfig: LLMConfig;
  batchSize?: number;
  concurrency?: number;
  maxRetries?: number;
  debug?: boolean;
  quiet?: boolean;
}

/**
 * Orientation batch result
 */
export interface OrientationBatchResult {
  successful: OrientationResult[];
  failed: Array<{ indicator: Indicator; error: string; retries: number }>;
  processingTime: number;
  apiCalls: number;
  retries: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Map AI SDK batch result to OrientationResult format
 */
function mapBatchToOrientationResults(
  batchResults: Array<{
    indicator_id: string;
    heat_map_orientation: HeatMapOrientation;
    confidence: number;
    reasoning?: string;
  }>,
): OrientationResult[] {
  return batchResults.map((result) => ({
    indicator_id: result.indicator_id,
    heat_map_orientation: result.heat_map_orientation,
    confidence_orient: result.confidence,
    reasoning: result.reasoning,
  }));
}

/**
 * Classify orientation for a batch with retry logic (AI SDK-based)
 */
async function orientBatchWithRetry(
  indicators: Indicator[],
  config: OrientationConfig,
  maxRetries: number = 3,
): Promise<{
  success: boolean;
  results?: OrientationResult[];
  error?: string;
  retries: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}> {
  const aiProvider = new AiSdkProvider(config.llmConfig);
  let lastError: string = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Generate prompts
      const systemPrompt = generateOrientationSystemPrompt();
      const userPrompt = generateOrientationUserPrompt(indicators);

      // Use AI SDK with Valibot schema validation
      const aiResult = await aiProvider.generateStructured(
        systemPrompt,
        userPrompt,
        OrientationBatchSchema,
      );

      // Extract results from wrapped object
      const results = mapBatchToOrientationResults(aiResult.data.results);

      return {
        success: true,
        results,
        retries: attempt,
        usage: aiResult.usage,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      if (config.debug) {
        console.error(
          `[Orientation] Attempt ${attempt + 1}/${maxRetries + 1} failed:`,
          lastError,
        );
        console.error("[Orientation] Full error:", error);
      }

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
 * Classify orientations (Orientation Stage)
 */
export async function classifyOrientations(
  indicators: Indicator[],
  config: OrientationConfig,
): Promise<OrientationBatchResult> {
  const startTime = Date.now();
  const batchSize = config.batchSize ?? 5;
  const concurrency = config.concurrency ?? 4;
  const maxRetries = config.maxRetries ?? 3;
  const debug = config.debug ?? false;
  const quiet = config.quiet ?? false;

  if (indicators.length === 0) {
    return {
      successful: [],
      failed: [],
      processingTime: 0,
      apiCalls: 0,
      retries: 0,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  }

  const successful: OrientationResult[] = [];
  const failed: OrientationBatchResult["failed"] = [];
  let apiCalls = 0;
  let totalRetries = 0;
  let totalUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  // Create batches
  const batches: Indicator[][] = [];
  for (let i = 0; i < indicators.length; i += batchSize) {
    batches.push(indicators.slice(i, i + batchSize));
  }

  if (debug && !quiet) {
    console.log("\n" + "=".repeat(60));
    console.log("🧭 ORIENTATION STAGE - HEAT MAP ORIENTATION");
    console.log("=".repeat(60));
    console.log(`Total indicators: ${indicators.length}`);
    console.log(`Batch size: ${batchSize}`);
    console.log(`Concurrency: ${concurrency}`);
    console.log(`Total batches: ${batches.length}`);
    console.log("=".repeat(60));
  }

  let spinner: Spinner | undefined;
  if (!quiet && !debug) {
    spinner = new Spinner({
      message: `Determining orientation for ${indicators.length} indicators...`,
      color: "cyan",
    });
    spinner.start();
  }

  // Process batches with concurrency control
  for (let i = 0; i < batches.length; i += concurrency) {
    const batchChunk = batches.slice(i, i + concurrency);

    if (debug) {
      console.log(
        `\n📦 Processing batches ${i + 1}-${
          i + batchChunk.length
        } of ${batches.length}`,
      );
    }

    const results = await Promise.all(
      batchChunk.map((batch) =>
        orientBatchWithRetry(batch, config, maxRetries)
      ),
    );

    // Aggregate results
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const batch = batchChunk[j];

      apiCalls += 1;
      totalRetries += result.retries;

      if (result.success && result.results) {
        successful.push(...result.results);

        // Accumulate usage
        if (result.usage) {
          totalUsage.promptTokens += result.usage.promptTokens;
          totalUsage.completionTokens += result.usage.completionTokens;
          totalUsage.totalTokens += result.usage.totalTokens;
        }

        if (debug) {
          console.log(
            `   ✓ Batch ${i + j + 1}: ${result.results.length} oriented`,
          );
          // Show orientation distribution
          const orientCount: Record<HeatMapOrientation, number> = {
            "higher-is-positive": 0,
            "lower-is-positive": 0,
            "neutral": 0,
          };
          for (const r of result.results) {
            orientCount[r.heat_map_orientation]++;
          }
          console.log(`     Distribution:`, orientCount);
        }
      } else {
        // Mark all indicators in failed batch as failed
        for (const indicator of batch) {
          failed.push({
            indicator,
            error: result.error || "Unknown error",
            retries: result.retries,
          });
        }

        if (debug) {
          console.log(`   ✗ Batch ${i + j + 1} failed: ${result.error}`);
        }
      }
    }
  }

  if (spinner) {
    spinner.stop();
  }

  const processingTime = Date.now() - startTime;

  if (debug && !quiet) {
    // Calculate orientation distribution
    const orientDistribution: Record<HeatMapOrientation, number> = {
      "higher-is-positive": 0,
      "lower-is-positive": 0,
      "neutral": 0,
    };
    for (const result of successful) {
      orientDistribution[result.heat_map_orientation]++;
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 ORIENTATION SUMMARY");
    console.log("=".repeat(60));
    console.log(
      `✓ Success: ${successful.length}/${indicators.length} (${
        ((successful.length / indicators.length) * 100).toFixed(1)
      }%)`,
    );
    if (failed.length > 0) {
      console.log(`✗ Failed: ${failed.length}/${indicators.length}`);
    }
    console.log(`⏱  Time: ${processingTime}ms`);
    console.log(`🔄 Retries: ${totalRetries}`);
    console.log(`🔌 API Calls: ${apiCalls}`);
    console.log("\nOrientation Distribution:");
    for (const [orient, count] of Object.entries(orientDistribution)) {
      console.log(`  • ${orient}: ${count}`);
    }
    console.log("=".repeat(60) + "\n");
  }

  return {
    successful,
    failed,
    processingTime,
    apiCalls,
    retries: totalRetries,
    usage: totalUsage,
  };
}
