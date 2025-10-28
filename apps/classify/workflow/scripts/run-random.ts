#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

/**
 * Run classification on random indicators from source_indicators table
 *
 * Usage:
 *   deno run --allow-net --allow-read --allow-env scripts/run-random.ts -25
 *   deno run --allow-net --allow-read --allow-env scripts/run-random.ts -50
 *   deno run --allow-net --allow-read --allow-env scripts/run-random.ts -100
 *   deno run --allow-net --allow-read --allow-env scripts/run-random.ts all
 */

import { Database } from "@db/sqlite";

interface SourceIndicator {
  id: string;
  name: string;
  units?: string;
  definition?: string;
  periodicity?: string;
  source_name?: string;
  long_name?: string;
  category_group?: string;
  dataset?: string;
  aggregation_method?: string;
  scale?: string;
  topic?: string;
  currency_code?: string;
  sample_values?: string; // JSON string
}

function getRandomIndicators(
  db: Database,
  count: number | "all",
): SourceIndicator[] {
  let query: string;

  if (count === "all") {
    query = `
      SELECT
        id,
        name,
        units,
        definition,
        periodicity,
        source_name,
        long_name,
        category_group,
        dataset,
        aggregation_method,
        scale,
        topic,
        currency_code,
        sample_values
      FROM source_indicators
      ORDER BY id
    `;
  } else {
    query = `
      SELECT
        id,
        name,
        units,
        definition,
        periodicity,
        source_name,
        long_name,
        category_group,
        dataset,
        aggregation_method,
        scale,
        topic,
        currency_code,
        sample_values
      FROM source_indicators
      ORDER BY RANDOM()
      LIMIT ?
    `;
  }

  const stmt = db.prepare(query);
  const rows = count === "all"
    ? stmt.all<SourceIndicator>()
    : stmt.all<SourceIndicator>(count);

  return rows;
}

function parseSampleValues(
  sampleValuesJson?: string,
): Array<{ date: string; value: number }> | undefined {
  if (!sampleValuesJson) return undefined;

  try {
    const parsed = JSON.parse(sampleValuesJson);
    // Limit to 10 most recent values
    return Array.isArray(parsed) ? parsed.slice(0, 10) : undefined;
  } catch {
    return undefined;
  }
}

async function waitForBatchCompletion(
  db: Database,
  indicatorIds: string[],
  maxWaitMs: number = 300000, // 5 minutes max
  pollIntervalMs: number = 2000, // Check every 2 seconds
): Promise<boolean> {
  const startTime = Date.now();
  const totalIndicators = indicatorIds.length;
  let lastReportedProgress = 0;
  let stuckCounter = 0;
  let lastCompleted = 0;

  while (Date.now() - startTime < maxWaitMs) {
    // Check how many indicators have FULLY completed (logged to processing_log with status='completed')
    // This ensures all workflow steps (including state saves and batch stats) are done
    const placeholders = indicatorIds.map(() => "?").join(",");
    const query = `
      SELECT COUNT(DISTINCT indicator_id) as completed
      FROM processing_log
      WHERE indicator_id IN (${placeholders})
        AND stage = 'complete'
        AND status = 'completed'
    `;

    const stmt = db.prepare(query);
    const result = stmt.value(...indicatorIds) as number[];
    const completed = result[0];

    // Check for stuck indicators (no progress for 20 seconds)
    if (completed === lastCompleted) {
      stuckCounter++;
      if (stuckCounter >= 10) {
        // 10 polls × 2s = 20 seconds stuck
        console.log(
          `   ⚠️  Warning: No progress for 20s, checking status...`,
        );

        // Find latest stage for each indicator
        const statusQuery = `
          SELECT
            p1.indicator_id,
            p1.stage,
            p1.status,
            p1.error_message,
            p1.created_at
          FROM processing_log p1
          INNER JOIN (
            SELECT indicator_id, MAX(created_at) as max_time
            FROM processing_log
            WHERE indicator_id IN (${placeholders})
            GROUP BY indicator_id
          ) p2 ON p1.indicator_id = p2.indicator_id
            AND p1.created_at = p2.max_time
          ORDER BY p1.created_at DESC
        `;
        const statusStmt = db.prepare(statusQuery);
        const statuses = statusStmt.all(...indicatorIds) as any[];

        console.log(`\n   📊 Current status of all indicators:`);
        const incompleteIndicators = statuses.filter(
          (s) => !(s.stage === "complete" && s.status === "completed"),
        );

        if (incompleteIndicators.length > 0) {
          console.log(
            `   ⚠️  ${incompleteIndicators.length} indicator(s) not completed:\n`,
          );
          incompleteIndicators.forEach((s: any) => {
            const statusIcon = s.status === "failed" ? "❌" : "⏳";
            console.log(`      ${statusIcon} ${s.indicator_id}`);
            console.log(`         Stage: ${s.stage}`);
            console.log(`         Status: ${s.status}`);
            if (s.error_message) {
              console.log(`         Error: ${s.error_message}`);
            }
            console.log();
          });
        }

        // Continue processing remaining batches despite failures
        console.log(
          `   ⚠️  Continuing with remaining batches (${completed}/${totalIndicators} completed)...\n`,
        );
        return false;
      }
    } else {
      stuckCounter = 0;
      lastCompleted = completed;
    }

    // Report progress every 10% or when completed
    const progressPercent = Math.floor((completed / totalIndicators) * 100);
    if (
      progressPercent >= lastReportedProgress + 10 ||
      completed === totalIndicators
    ) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(
        `   Progress: ${completed}/${totalIndicators} (${progressPercent}%) - ${elapsed}s elapsed`,
      );
      lastReportedProgress = progressPercent;
    }

    if (completed === totalIndicators) {
      return true; // All indicators completed
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  console.log(`   ⏱️  Timeout reached after ${Math.floor(maxWaitMs / 1000)}s`);
  return false; // Timeout
}

async function classifyIndicatorsBatch(
  indicators: SourceIndicator[],
  llmProvider: string = "openai",
  batchSize: number = 10,
  concurrentBatches: number = 2,
  db: Database,
) {
  const baseUrl = Deno.env.get("MOTIA_API_URL") || "http://localhost:3000";
  const totalIndicators = indicators.length;
  const numBatches = Math.ceil(totalIndicators / batchSize);

  console.log(
    `\n🚀 Processing ${totalIndicators} indicators in ${numBatches} batches of ${batchSize}...`,
  );
  console.log(`   Provider: ${llmProvider}`);
  console.log(
    `   Concurrent batches: ${concurrentBatches} (${
      batchSize * concurrentBatches
    } indicators per group)`,
  );
  console.log(
    `   Strategy: Process 20 indicators, wait for completion, then next 20`,
  );
  console.log(`   Brief pause: 0.5 seconds between groups for rate limiting`);
  console.log(`   API: ${baseUrl}/classify/batch\n`);

  const results = [];

  // Process batches in groups of concurrent batches
  for (let i = 0; i < numBatches; i += concurrentBatches) {
    const batchPromises = [];
    const groupIndicatorIds: string[] = [];

    console.log(
      `📋 Group ${Math.floor(i / concurrentBatches) + 1}/${
        Math.ceil(
          numBatches / concurrentBatches,
        )
      }: Starting ${
        Math.min(
          concurrentBatches,
          numBatches - i,
        )
      } concurrent batches...\n`,
    );

    // Create concurrent batch requests
    for (let j = 0; j < concurrentBatches; j++) {
      const batchIdx = i + j;
      if (batchIdx >= numBatches) break;

      const start = batchIdx * batchSize;
      const end = Math.min(start + batchSize, totalIndicators);
      const batch = indicators.slice(start, end);
      const batchNum = batchIdx + 1;

      // Track indicator IDs for this group's wait
      const batchIndicatorIds = batch.map((ind) => ind.id);
      groupIndicatorIds.push(...batchIndicatorIds);

      console.log(
        `   📦 Batch ${batchNum}/${numBatches}: Submitting indicators ${
          start + 1
        }-${end}...`,
      );

      const payload = {
        indicators: batch.map((ind) => ({
          indicator_id: ind.id,
          name: ind.name,
          units: ind.units,
          description: ind.definition,
          periodicity: ind.periodicity,
          sample_values: parseSampleValues(ind.sample_values),
          source_name: ind.source_name,
          long_name: ind.long_name,
          category_group: ind.category_group,
          dataset: ind.dataset,
          aggregation_method: ind.aggregation_method,
          scale: ind.scale,
          topic: ind.topic,
          currency_code: ind.currency_code,
        })),
        llm_provider: llmProvider,
      };

      // Create a promise for this batch request
      const batchPromise = fetch(`${baseUrl}/classify/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Batch ${batchNum} failed: ${response.status} ${response.statusText}\n${errorText}`,
          );
        }
        const result = await response.json();
        console.log(
          `      ✅ Batch ${batchNum} accepted (trace: ${result.trace_id})`,
        );
        return result;
      });

      batchPromises.push(batchPromise);
    }

    // Wait for all concurrent batches in this group to be submitted
    const groupResults = await Promise.all(batchPromises);
    results.push(...groupResults);

    console.log(
      `   ✅ Group ${
        Math.floor(i / concurrentBatches) + 1
      } batches submitted! (${groupIndicatorIds.length} indicators queued)\n`,
    );

    // Wait for THIS GROUP to complete before moving to next group
    console.log(
      `   ⏳ Waiting for ${groupIndicatorIds.length} indicators to complete...\n`,
    );

    const completed = await waitForBatchCompletion(
      db,
      groupIndicatorIds,
      600000,
    ); // 10 min timeout per group

    if (completed) {
      console.log(
        `   ✅ Group ${
          Math.floor(i / concurrentBatches) + 1
        } completed! (${groupIndicatorIds.length} indicators done)\n`,
      );
    } else {
      console.log(
        `   ⚠️ Group ${
          Math.floor(i / concurrentBatches) + 1
        } timed out, continuing anyway...\n`,
      );
    }

    // Brief pause between groups for rate limiting
    if (i + concurrentBatches < numBatches) {
      const pauseMs = 500; // 0.5 seconds
      await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }
  }

  return results;
}

function printIndicatorSummary(indicators: SourceIndicator[]) {
  console.log("\n📊 Selected Indicators:");
  console.log("═".repeat(80));

  indicators.slice(0, 10).forEach((ind, idx) => {
    console.log(`${idx + 1}. ${ind.name}`);
    console.log(`   ID: ${ind.id}`);
    if (ind.definition) {
      console.log(
        `   Description: ${ind.definition.slice(0, 80)}${
          ind.definition.length > 80 ? "..." : ""
        }`,
      );
    }
    console.log();
  });

  if (indicators.length > 10) {
    console.log(`   ... and ${indicators.length - 10} more indicators\n`);
  }

  console.log("═".repeat(80));
}

async function main() {
  // Parse command line arguments
  const args = Deno.args;

  if (args.length === 0) {
    console.error(`
Usage:
  deno run --allow-net --allow-read --allow-env scripts/run-random.ts <count> [provider]

Examples:
  scripts/run-random.ts -25              # 25 random indicators with OpenAI
  scripts/run-random.ts -50 openai       # 50 random indicators with OpenAI
  scripts/run-random.ts -100 local       # 100 random indicators with local LLM
  scripts/run-random.ts all openai       # All indicators with OpenAI
  scripts/run-random.ts all              # All indicators with OpenAI (default)

Arguments:
  count      Number of random indicators (e.g., -25, -50, -100) or "all"
  provider   LLM provider: "openai" (default), "local", or "anthropic"
    `);
    Deno.exit(1);
  }

  const countArg = args[0];
  const llmProvider = args[1] || "openai";

  // Parse count
  let count: number | "all";
  if (countArg === "all") {
    count = "all";
  } else if (countArg.startsWith("-")) {
    count = parseInt(countArg.slice(1), 10);
    if (isNaN(count) || count <= 0) {
      console.error(
        `❌ Invalid count: ${countArg}. Must be a positive number like -25, -50, etc.`,
      );
      Deno.exit(1);
    }
  } else {
    console.error(
      `❌ Invalid count format: ${countArg}. Use -25, -50, -100, or "all"`,
    );
    Deno.exit(1);
  }

  // Validate provider
  if (!["openai", "local", "anthropic"].includes(llmProvider)) {
    console.error(
      `❌ Invalid provider: ${llmProvider}. Must be "openai", "local", or "anthropic"`,
    );
    Deno.exit(1);
  }

  // Open database
  const dbPath = "./data/classify-workflow-local-dev.db";
  console.log(`📂 Opening database: ${dbPath}`);

  const db = new Database(dbPath);

  try {
    // Get total count
    const totalStmt = db.prepare("SELECT COUNT(*) FROM source_indicators");
    const totalCount = totalStmt.value()![0] as number;
    console.log(
      `📊 Total indicators in database: ${totalCount.toLocaleString()}`,
    );

    // Get random indicators
    console.log(
      `🎲 Selecting ${count === "all" ? "all" : count} ${
        count === "all" ? "" : "random "
      }indicators...`,
    );
    const indicators = getRandomIndicators(db, count);

    if (indicators.length === 0) {
      console.error("❌ No indicators found in database");
      Deno.exit(1);
    }

    console.log(`✅ Selected ${indicators.length} indicators`);

    // Print summary
    printIndicatorSummary(indicators);

    // Classify indicators with controlled batching for stability
    // - 5 indicators per batch (each gets own trace ID in Motia UI)
    // - 3 concurrent batches (15 indicators at a time)
    // - Wait for each group to complete before next group
    const batchSize = 5;
    const concurrentBatches = 3;
    const results = await classifyIndicatorsBatch(
      indicators,
      llmProvider,
      batchSize,
      concurrentBatches,
      db,
    );

    console.log(`\n✅ All batches submitted successfully!`);
    console.log(`   Total indicators: ${indicators.length}`);
    console.log(`   Batches: ${results.length}`);
    console.log(`   Trace IDs: ${results.map((r) => r.trace_id).join(", ")}`);
    console.log(`\n💡 Monitor progress with:`);
    console.log(
      `   sqlite3 ./data/classify-workflow-local-dev.db "SELECT COUNT(*) FROM classifications;"`,
    );
  } finally {
    db.close();
  }
}

// Run the script
if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ Error:", error);
    Deno.exit(1);
  });
}
