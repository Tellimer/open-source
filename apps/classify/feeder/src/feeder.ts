/**
 * Core feeder orchestration logic
 * Fetches indicators from LibSQL and sends batches to Motia workflow API
 */

import type { BatchResponse, FeederConfig, Indicator } from "./types.ts";
import { fetchWithRetry, sleep } from "./retry.ts";
import { LibSQLClient } from "./libsql-client.ts";

/**
 * Chunk array into smaller arrays
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Submit a batch of indicators to the workflow API
 */
async function submitBatch(
  indicators: Indicator[],
  config: FeederConfig
): Promise<BatchResponse> {
  const response = await fetchWithRetry(
    `${config.motiaApiUrl}/classify/batch`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        indicators,
        llm_provider: config.provider,
      }),
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      onRetry: (attempt, error) => {
        console.warn(
          `   ⚠️  Retry attempt ${attempt}: ${error.message}`
        );
      },
    }
  );

  return await response.json();
}

/**
 * Process a batch run
 */
export async function processBatchRun(
  config: FeederConfig
): Promise<void> {
  console.log("🚀 Starting batch processing\n");

  // Connect to LibSQL
  const libsql = new LibSQLClient(config.libsqlUrl, config.libsqlAuthToken);

  try {
    // Get initial progress
    const progress = await libsql.getProgress();
    console.log(`📊 Progress:`);
    console.log(`   Total queued: ${progress.queued.toLocaleString()}`);
    console.log(`   Already sent: ${progress.sent.toLocaleString()}`);
    console.log(`   Processed: ${progress.processed.toLocaleString()}`);
    console.log(
      `   Remaining: ${(progress.queued - progress.sent).toLocaleString()}\n`
    );

    // Fetch indicators to process
    const remaining = progress.queued - progress.sent;
    if (remaining === 0) {
      console.log("✅ No indicators to process. All done!");
      return;
    }

    const indicators = await libsql.getQueuedIndicators(remaining);
    console.log(
      `📥 Fetched ${indicators.length} indicators from LibSQL\n`
    );

    // Split into batches
    const batches = chunk(indicators, config.batchSize);
    const numBatches = batches.length;
    const numGroups = Math.ceil(numBatches / config.concurrency);

    console.log(`📦 Batch Configuration:`);
    console.log(`   Batch size: ${config.batchSize}`);
    console.log(`   Concurrency: ${config.concurrency}`);
    console.log(`   Total batches: ${numBatches}`);
    console.log(`   Processing groups: ${numGroups}`);
    console.log(`   Provider: ${config.provider}\n`);

    // Process batches in groups
    let totalSubmitted = 0;

    for (let i = 0; i < numBatches; i += config.concurrency) {
      const groupNum = Math.floor(i / config.concurrency) + 1;
      const batchGroup = batches.slice(i, i + config.concurrency);

      console.log(
        `📋 Group ${groupNum}/${numGroups}: Processing ${batchGroup.length} batches...`
      );

      // Submit all batches in this group concurrently
      const batchPromises = batchGroup.map(async (batch, idx) => {
        const batchNum = i + idx + 1;
        const batchStart = i * config.batchSize + idx * config.batchSize;
        const batchEnd = batchStart + batch.length;

        console.log(
          `   📦 Batch ${batchNum}/${numBatches}: Submitting indicators ${batchStart + 1}-${batchEnd}...`
        );

        try {
          const result = await submitBatch(batch, config);

          // Mark as sent in LibSQL
          await libsql.markAsSent(
            batch.map((ind) => ind.indicator_id),
            result.trace_id
          );

          console.log(
            `      ✅ Batch ${batchNum} accepted (trace: ${result.trace_id})`
          );

          return result;
        } catch (error) {
          const errorMsg = error instanceof Error
            ? error.message
            : String(error);
          console.error(
            `      ❌ Batch ${batchNum} failed: ${errorMsg}`
          );
          throw error;
        }
      });

      // Wait for all batches in this group
      try {
        const results = await Promise.all(batchPromises);
        totalSubmitted += batchGroup.reduce(
          (sum, batch) => sum + batch.length,
          0
        );

        console.log(
          `   ✅ Group ${groupNum} complete! (${totalSubmitted}/${indicators.length} submitted)\n`
        );
      } catch (error) {
        console.error(`   ❌ Group ${groupNum} failed, stopping.\n`);
        throw error;
      }

      // Pace between groups
      if (i + config.concurrency < numBatches) {
        console.log(
          `   ⏸️  Pacing ${config.interBatchDelayMs}ms before next group...\n`
        );
        await sleep(config.interBatchDelayMs);
      }
    }

    console.log(`\n🎉 Batch run complete!`);
    console.log(
      `   Total submitted: ${totalSubmitted}/${indicators.length}`
    );
    console.log(`   API URL: ${config.motiaApiUrl}`);
    console.log(
      `\n💡 Monitor progress in Postgres classifications table`
    );
  } finally {
    libsql.close();
  }
}

/**
 * Resume interrupted batch run
 */
export async function resumeBatchRun(
  config: FeederConfig
): Promise<void> {
  console.log("🔄 Resuming batch processing\n");
  // Resume is the same as start - LibSQL tracks what's been sent
  await processBatchRun(config);
}

/**
 * Check batch status
 */
export async function checkStatus(
  config: FeederConfig
): Promise<void> {
  console.log("📊 Checking batch status\n");

  const libsql = new LibSQLClient(config.libsqlUrl, config.libsqlAuthToken);

  try {
    const progress = await libsql.getProgress();

    console.log(`LibSQL Source Database:`);
    console.log(`   Total queued: ${progress.queued.toLocaleString()}`);
    console.log(`   Sent to workflow: ${progress.sent.toLocaleString()}`);
    console.log(`   Processed: ${progress.processed.toLocaleString()}`);
    console.log(
      `   Remaining: ${(progress.queued - progress.sent).toLocaleString()}`
    );

    const percentSent = progress.queued > 0
      ? ((progress.sent / progress.queued) * 100).toFixed(1)
      : "0";
    const percentProcessed = progress.queued > 0
      ? ((progress.processed / progress.queued) * 100).toFixed(1)
      : "0";

    console.log(`\nProgress:`);
    console.log(`   Sent: ${percentSent}%`);
    console.log(`   Processed: ${percentProcessed}%`);
  } finally {
    libsql.close();
  }
}
