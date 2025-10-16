#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env --allow-ffi

/**
 * Resume classification from where we left off
 * Only processes indicators that haven't been classified yet
 *
 * Usage:
 *   deno task run:resume              # Resume with OpenAI
 *   deno task run:resume local        # Resume with local LLM
 *   deno task run:resume anthropic    # Resume with Anthropic
 */

import { Database } from '@db/sqlite';

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

/**
 * Get unclassified indicators (not in classifications table)
 */
function getUnclassifiedIndicators(db: Database): SourceIndicator[] {
  const query = `
    SELECT
      s.id,
      s.name,
      s.units,
      s.definition,
      s.periodicity,
      s.source_name,
      s.long_name,
      s.category_group,
      s.dataset,
      s.aggregation_method,
      s.scale,
      s.topic,
      s.currency_code,
      s.sample_values
    FROM source_indicators s
    WHERE s.id NOT IN (SELECT indicator_id FROM classifications)
    ORDER BY s.id
  `;

  const stmt = db.prepare(query);
  const rows = stmt.all<SourceIndicator>();
  return rows;
}

function parseSampleValues(
  sampleValuesJson?: string
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
  pollIntervalMs: number = 2000 // Check every 2 seconds
): Promise<boolean> {
  const startTime = Date.now();
  const totalIndicators = indicatorIds.length;
  let lastReportedProgress = 0;

  while (Date.now() - startTime < maxWaitMs) {
    const placeholders = indicatorIds.map(() => '?').join(',');
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

    // Report progress every 10% or when completed
    const progressPercent = Math.floor((completed / totalIndicators) * 100);
    if (
      progressPercent >= lastReportedProgress + 10 ||
      completed === totalIndicators
    ) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(
        `   Progress: ${completed}/${totalIndicators} (${progressPercent}%) - ${elapsed}s elapsed`
      );
      lastReportedProgress = progressPercent;
    }

    if (completed === totalIndicators) {
      return true; // All indicators completed
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return false; // Timeout
}

async function classifyIndicatorsBatch(
  indicators: SourceIndicator[],
  llmProvider: string = 'openai',
  batchSize: number = 10,
  concurrentBatches: number = 10,
  db: Database
) {
  const baseUrl = Deno.env.get('MOTIA_API_URL') || 'http://localhost:3000';
  const totalIndicators = indicators.length;
  const numBatches = Math.ceil(totalIndicators / batchSize);

  console.log(
    `\n🚀 Processing ${totalIndicators} indicators in ${numBatches} batches of ${batchSize}...`
  );
  console.log(`   Provider: ${llmProvider}`);
  console.log(
    `   Concurrent batches: ${concurrentBatches} (${
      batchSize * concurrentBatches
    } indicators per group)`
  );
  console.log(
    `   Strategy: Process 20 indicators, wait for completion, then next 20`
  );
  console.log(`   API: ${baseUrl}/classify/batch\n`);

  const results = [];

  // Process batches in groups of concurrent batches
  for (let i = 0; i < numBatches; i += concurrentBatches) {
    const batchPromises = [];
    const groupIndicatorIds: string[] = [];

    console.log(
      `📋 Group ${Math.floor(i / concurrentBatches) + 1}/${Math.ceil(
        numBatches / concurrentBatches
      )}: Starting ${Math.min(
        concurrentBatches,
        numBatches - i
      )} concurrent batches...\n`
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
        }-${end}...`
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Batch ${batchNum} failed: ${response.status} ${response.statusText}\n${errorText}`
          );
        }
        const result = await response.json();
        console.log(
          `      ✅ Batch ${batchNum} accepted (trace: ${result.trace_id})`
        );
        return result;
      });

      batchPromises.push(batchPromise);
    }

    // Wait for all concurrent batches in this group to be submitted
    const groupResults = await Promise.all(batchPromises);
    results.push(...groupResults);

    console.log(
      `   ✅ Group ${Math.floor(i / concurrentBatches) + 1} batches submitted! (${
        groupIndicatorIds.length
      } indicators queued)\n`
    );

    // Wait for THIS GROUP to complete before moving to next group
    console.log(
      `   ⏳ Waiting for ${groupIndicatorIds.length} indicators to complete...\n`
    );

    const completed = await waitForBatchCompletion(
      db,
      groupIndicatorIds,
      600000
    ); // 10 min timeout per group

    if (completed) {
      console.log(
        `   ✅ Group ${Math.floor(i / concurrentBatches) + 1} completed! (${
          groupIndicatorIds.length
        } indicators done)\n`
      );
    } else {
      console.log(
        `   ⚠️ Group ${
          Math.floor(i / concurrentBatches) + 1
        } timed out, continuing anyway...\n`
      );
    }

    // Brief pause between groups
    if (i + concurrentBatches < numBatches) {
      const pauseMs = 500; // 0.5 seconds
      await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }
  }

  return results;
}

async function main() {
  const args = Deno.args;
  const llmProvider = args[0] || 'openai';

  // Validate provider
  if (!['openai', 'local', 'anthropic'].includes(llmProvider)) {
    console.error(
      `❌ Invalid provider: ${llmProvider}. Must be "openai", "local", or "anthropic"`
    );
    Deno.exit(1);
  }

  // Open database
  const dbPath = './data/classify-workflow-local-dev.db';
  console.log(`📂 Opening database: ${dbPath}`);

  const db = new Database(dbPath);

  try {
    // Get total and completed counts
    const totalStmt = db.prepare('SELECT COUNT(*) FROM source_indicators');
    const totalCount = totalStmt.value()![0] as number;

    const completedStmt = db.prepare('SELECT COUNT(*) FROM classifications');
    const completedCount = completedStmt.value()![0] as number;

    console.log(`📊 Total indicators: ${totalCount.toLocaleString()}`);
    console.log(`✅ Already completed: ${completedCount.toLocaleString()}`);
    console.log(
      `🔄 Remaining: ${(totalCount - completedCount).toLocaleString()}`
    );

    // Get unclassified indicators
    console.log(`\n🎯 Fetching unclassified indicators...`);
    const indicators = getUnclassifiedIndicators(db);

    if (indicators.length === 0) {
      console.log('\n✅ All indicators already classified! Nothing to do.');
      return;
    }

    console.log(`✅ Found ${indicators.length} unclassified indicators\n`);

    // Show first few
    console.log('First 5 unclassified:');
    indicators.slice(0, 5).forEach((ind, idx) => {
      console.log(`   ${idx + 1}. ${ind.id}: ${ind.name}`);
    });
    console.log();

    const batchSize = 10;
    const concurrentBatches = 2;

    const results = await classifyIndicatorsBatch(
      indicators,
      llmProvider,
      batchSize,
      concurrentBatches,
      db
    );

    console.log(`\n✅ All batches processed!`);
    console.log(`   Total indicators: ${indicators.length}`);
    console.log(`   Batches: ${results.length}`);
    console.log(
      `\n💡 Check progress: sqlite3 ${dbPath} "SELECT COUNT(*) FROM classifications;"`
    );
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('❌ Error:', error);
    Deno.exit(1);
  });
}
