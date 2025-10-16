/**
 * Rate-Limited Batch Classification Script
 *
 * Triggers classification workflows with rate limiting to respect OpenAI API limits.
 *
 * Note: Restate handles all workflow durability and resume capability automatically.
 * This script only controls the rate at which new workflows are triggered.
 * Progress tracking happens naturally via the database - we only process indicators
 * that don't have existing classifications.
 *
 * Features:
 * - Configurable requests-per-minute (RPM) limit
 * - Automatic delay calculation between batches
 * - Real-time throughput monitoring
 *
 * Usage:
 *   bun run src/scripts/classify-indicators-throttled.ts --openai --rpm 100
 *   bun run src/scripts/classify-indicators-throttled.ts --openai --rpm 300 --limit 1000
 *   bun run src/scripts/classify-indicators-throttled.ts --anthropic --rpm 50
 *
 * Resume: Just run the script again - it automatically skips completed indicators.
 */

import { getDb } from "../db/client.ts";

interface SourceIndicator {
  id: string;
  name: string;
  units: string | null;
  long_name: string | null;
  source_name: string | null;
  periodicity: string | null;
  aggregation_method: string | null;
  scale: string | null;
  topic: string | null;
  category_group: string | null;
  dataset: string | null;
  currency_code: string | null;
  definition: string | null;
  sample_values: string | null;
}

interface TimeSeriesPoint {
  date: string;
  value: number;
}

interface ProcessingStats {
  totalIndicators: number;
  processedIndicators: number;
  startTime: number;
  estimatedRequestsPerIndicator: number;
  targetRpm: number;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let force = false;
  let provider: "local" | "openai" | "anthropic" = "openai";
  let rpm = 150; // Default: safe 150 RPM = ~50 indicators/min (~3.6 hours for 10k indicators)

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--force" || arg === "-f") {
      force = true;
    } else if (arg === "--openai") {
      provider = "openai";
    } else if (arg === "--anthropic") {
      provider = "anthropic";
    } else if (arg === "--local") {
      provider = "local";
    } else if (arg === "--rpm") {
      rpm = parseInt(args[++i], 10);
      if (isNaN(rpm) || rpm <= 0) {
        throw new Error("Invalid RPM value");
      }
    } else if (arg === "--limit") {
      limit = parseInt(args[++i], 10);
      if (isNaN(limit) || limit <= 0) {
        throw new Error("Invalid limit value");
      }
    } else if (arg.startsWith("--") && !isNaN(parseInt(arg.slice(2)))) {
      limit = parseInt(arg.slice(2), 10);
    }
  }

  return { limit, force, provider, rpm };
}

/**
 * Get Restate ingress URL
 */
function getRestateIngressUrl(): string {
  return process.env.RESTATE_INGRESS_URL || "http://localhost:8080";
}

/**
 * Fetch indicators to classify
 */
async function fetchIndicators(
  force: boolean,
  limit: number | null,
): Promise<SourceIndicator[]> {
  const db = getDb();

  if (force) {
    // Classify all indicators (ignore existing classifications)
    if (limit) {
      const result = await db`
        SELECT
          id, name, units, long_name, source_name, periodicity,
          aggregation_method, scale, topic, category_group, dataset,
          currency_code, definition, sample_values
        FROM source_indicators si
        ORDER BY si.created_at DESC
        LIMIT ${limit}
      `;
      return result as unknown as SourceIndicator[];
    } else {
      const result = await db`
        SELECT
          id, name, units, long_name, source_name, periodicity,
          aggregation_method, scale, topic, category_group, dataset,
          currency_code, definition, sample_values
        FROM source_indicators si
        ORDER BY si.created_at DESC
      `;
      return result as unknown as SourceIndicator[];
    }
  } else {
    // Only classify indicators without existing classifications
    if (limit) {
      const result = await db`
        SELECT
          si.id, si.name, si.units, si.long_name, si.source_name, si.periodicity,
          si.aggregation_method, si.scale, si.topic, si.category_group, si.dataset,
          si.currency_code, si.definition, si.sample_values
        FROM source_indicators si
        LEFT JOIN classifications c ON si.id = c.indicator_id
        WHERE c.indicator_id IS NULL
        ORDER BY si.created_at DESC
        LIMIT ${limit}
      `;
      return result as unknown as SourceIndicator[];
    } else {
      const result = await db`
        SELECT
          si.id, si.name, si.units, si.long_name, si.source_name, si.periodicity,
          si.aggregation_method, si.scale, si.topic, si.category_group, si.dataset,
          si.currency_code, si.definition, si.sample_values
        FROM source_indicators si
        LEFT JOIN classifications c ON si.id = c.indicator_id
        WHERE c.indicator_id IS NULL
        ORDER BY si.created_at DESC
      `;
      return result as unknown as SourceIndicator[];
    }
  }
}

/**
 * Format time duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Display progress and statistics
 */
function displayProgress(stats: ProcessingStats): void {
  const elapsed = Date.now() - stats.startTime;
  const elapsedMinutes = elapsed / 60000;

  const actualRpm = stats.processedIndicators / elapsedMinutes;
  const estimatedTotalRequests = stats.totalIndicators * stats.estimatedRequestsPerIndicator;
  const completedRequests = stats.processedIndicators * stats.estimatedRequestsPerIndicator;
  const percentComplete = (stats.processedIndicators / stats.totalIndicators) * 100;

  const remainingIndicators = stats.totalIndicators - stats.processedIndicators;
  const etaMs = (remainingIndicators / actualRpm) * 60000;

  console.log(`\n📊 Progress: ${stats.processedIndicators}/${stats.totalIndicators} indicators (${percentComplete.toFixed(1)}%)`);
  console.log(`⏱️  Elapsed: ${formatDuration(elapsed)} | ETA: ${formatDuration(etaMs)}`);
  console.log(`🚀 Throughput: ${actualRpm.toFixed(1)} indicators/min (target: ${stats.targetRpm / stats.estimatedRequestsPerIndicator} ind/min)`);
  console.log(`📡 Est. API Requests: ${completedRequests}/${estimatedTotalRequests} (${stats.estimatedRequestsPerIndicator} per indicator)`);
}

/**
 * Trigger classification via Restate API with rate limiting
 */
async function classifyBatchThrottled(
  indicators: SourceIndicator[],
  provider: "local" | "openai" | "anthropic",
  targetRpm: number,
): Promise<void> {
  const ingressUrl = getRestateIngressUrl();

  // Each indicator makes ~3 LLM calls (time-inference, family, type)
  const estimatedRequestsPerIndicator = 3;

  // Calculate indicators per minute based on target RPM
  const indicatorsPerMinute = targetRpm / estimatedRequestsPerIndicator;

  // Batch size: submit indicators in small batches to Restate
  // Restate will handle concurrency internally based on concurrent_invocations_limit
  const batchSize = 5; // 5 indicators per batch

  // Calculate delay between batches to hit target RPM
  // Formula: (batchSize / indicatorsPerMinute) * 60000 ms
  // Minimum 500ms delay to prevent overwhelming Restate ingress API
  const delayBetweenBatchesMs = Math.max(500, (batchSize / indicatorsPerMinute) * 60000);

  console.log(`\n📊 Rate Limiting Configuration:`);
  console.log(`   Target RPM: ${targetRpm} requests/minute`);
  console.log(`   Est. Requests per Indicator: ${estimatedRequestsPerIndicator}`);
  console.log(`   Target Throughput: ${indicatorsPerMinute.toFixed(1)} indicators/minute`);
  console.log(`   Batch Size: ${batchSize} indicators`);
  console.log(`   Delay Between Batches: ${delayBetweenBatchesMs.toFixed(0)}ms`);
  console.log(`   Estimated Total Time: ${formatDuration((indicators.length / indicatorsPerMinute) * 60000)}`);

  const stats: ProcessingStats = {
    totalIndicators: indicators.length,
    processedIndicators: 0,
    startTime: Date.now(),
    estimatedRequestsPerIndicator,
    targetRpm,
  };

  console.log(`\n📤 Starting throttled classification via ${ingressUrl}...`);

  for (let i = 0; i < indicators.length; i += batchSize) {
    const batch = indicators.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(indicators.length / batchSize);

    // Transform to API format
    const payload = {
      indicators: batch.map((ind) => {
        let sampleValues: TimeSeriesPoint[] | undefined;
        if (ind.sample_values) {
          if (typeof ind.sample_values === 'string') {
            try {
              sampleValues = JSON.parse(ind.sample_values);
            } catch (e) {
              sampleValues = undefined;
            }
          } else if (typeof ind.sample_values === 'object') {
            sampleValues = ind.sample_values as TimeSeriesPoint[];
          }
        }

        return {
          indicator_id: ind.id,
          name: ind.name,
          units: ind.units || undefined,
          description: ind.definition || undefined,
          periodicity: ind.periodicity || undefined,
          sample_values: sampleValues,
          source_name: ind.source_name || undefined,
          long_name: ind.long_name || undefined,
          category_group: ind.category_group || undefined,
          dataset: ind.dataset || undefined,
          aggregation_method: ind.aggregation_method || undefined,
          scale: ind.scale || undefined,
          topic: ind.topic || undefined,
          currency_code: ind.currency_code || undefined,
        };
      }),
      llm_provider: provider,
    };

    try {
      // Add timeout signal for fetch (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${ingressUrl}/classify-api/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        console.error(`\n❌ Batch ${batchNum}/${totalBatches} failed (${response.status}): ${error}`);

        // If rate limited (429), wait longer and retry
        if (response.status === 429) {
          console.log(`   ⏳ Rate limited - waiting 60 seconds before retry...`);
          await new Promise((resolve) => setTimeout(resolve, 60000));
          i -= batchSize; // Retry this batch
          continue;
        }

        throw new Error(`API request failed (${response.status}): ${error}`);
      }

      const result = await response.json();
      stats.processedIndicators += batch.length;

      console.log(`   ✅ Batch ${batchNum}/${totalBatches}: ${batch.length} indicators queued (trace: ${result.trace_id?.slice(0, 8)}...)`);

      // Display progress every 10 batches or at the end
      if (batchNum % 10 === 0 || i + batchSize >= indicators.length) {
        displayProgress(stats);
      }

      // Apply rate limiting delay between batches
      if (i + batchSize < indicators.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatchesMs));
      }
    } catch (error: any) {
      // Handle timeout errors with retry
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        console.log(`\n⏳ Batch ${batchNum}/${totalBatches} timed out - waiting 5 seconds before retry...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        i -= batchSize; // Retry this batch
        continue;
      }

      console.error(`\n❌ Error processing batch ${batchNum}/${totalBatches}:`, error);
      throw error;
    }
  }

  // Final summary
  const totalElapsed = Date.now() - stats.startTime;
  const actualIndicatorsPerMinute = (stats.processedIndicators / totalElapsed) * 60000;
  const actualRpm = actualIndicatorsPerMinute * estimatedRequestsPerIndicator;

  console.log(`\n\n🎉 Classification Complete!`);
  console.log(`=========================`);
  console.log(`   Processed: ${stats.processedIndicators} indicators`);
  console.log(`   Total Time: ${formatDuration(totalElapsed)}`);
  console.log(`   Actual Throughput: ${actualIndicatorsPerMinute.toFixed(1)} indicators/min`);
  console.log(`   Estimated API RPM: ${actualRpm.toFixed(0)} requests/min`);
  console.log(`   Target RPM: ${targetRpm} requests/min`);
}

/**
 * Main function
 */
async function main() {
  const { limit, force, provider, rpm } = parseArgs();

  console.log("📊 Throttled Classification Script");
  console.log("===================================\n");
  console.log(`Mode: ${force ? "Re-classify all" : "Classify unclassified only"}`);
  console.log(`LLM Provider: ${provider}`);
  console.log(`Rate Limit: ${rpm} requests/minute`);
  if (limit) {
    console.log(`Limit: ${limit} indicators`);
  }
  console.log("");

  // Fetch indicators
  console.log("🔍 Fetching indicators from database...");
  const indicators = await fetchIndicators(force, limit);

  if (indicators.length === 0) {
    console.log("✅ No indicators to classify!");
    return;
  }

  console.log(`✅ Found ${indicators.length} indicators to classify`);

  // Show sample
  console.log("\n📋 Sample indicators:");
  indicators.slice(0, 5).forEach((ind, idx) => {
    console.log(`   ${idx + 1}. ${ind.name} (${ind.id})`);
  });
  if (indicators.length > 5) {
    console.log(`   ... and ${indicators.length - 5} more`);
  }

  // Trigger classification with rate limiting
  await classifyBatchThrottled(indicators, provider, rpm);

  console.log(`\n💡 Monitor progress: curl http://localhost:9070/restate/invocations`);
  console.log(`💡 Check results: SELECT COUNT(*) FROM classifications;`);
}

// Run if called directly
if (import.meta.main) {
  main().catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
}
