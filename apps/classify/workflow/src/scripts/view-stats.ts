/**
 * View pipeline batch statistics
 *
 * Usage:
 *   deno task stats      # Show all batch stats
 *   deno task stats --5  # Show last 5 batches
 */

import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";

function getLimit(): number | null {
  const args = Deno.args;
  const limitArg = args.find((arg) =>
    arg.startsWith("--") || arg.startsWith("-")
  );

  if (!limitArg) {
    return null;
  }

  const limit = parseInt(limitArg.replace(/^-+/, ""), 10);
  if (isNaN(limit) || limit <= 0) {
    console.error(
      `Invalid limit: ${limitArg}. Use --N where N is a positive number.`,
    );
    Deno.exit(1);
  }

  return limit;
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === 0) return "-";

  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function viewStats() {
  const dbPath = Deno.env.get("CLASSIFY_DB_LOCAL_DEV") ||
    "./data/classify-workflow-local-dev.db";

  const limit = getLimit();

  console.log("📊 Pipeline Batch Statistics\n");
  console.log(`   Database: ${dbPath}\n`);

  const db = new DB(dbPath);

  try {
    // Overall summary
    const summaryQuery = db.query<[number, number, number, number]>(`
      SELECT 
        COUNT(*) as total_batches,
        SUM(total_indicators) as total_indicators,
        SUM(successful_indicators) as successful_indicators,
        AVG(avg_time_per_indicator_ms) as avg_time_per_indicator
      FROM pipeline_stats
    `);

    const [
      totalBatches,
      totalIndicators,
      successfulIndicators,
      avgTimePerIndicator,
    ] = summaryQuery[0];

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📈 Overall Summary");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Total batches:          ${totalBatches}`);
    console.log(`   Total indicators:       ${totalIndicators}`);
    console.log(`   Successful:             ${successfulIndicators}`);
    console.log(
      `   Avg time per indicator: ${formatDuration(avgTimePerIndicator)}`,
    );
    console.log("");

    // Batch details
    const limitClause = limit ? `LIMIT ${limit}` : "";
    const batches = db.query<
      [
        string,
        string,
        string,
        number,
        number,
        string,
        string | null,
        number | null,
        number | null,
        number | null,
      ]
    >(`
      SELECT 
        batch_id,
        model,
        provider,
        total_indicators,
        successful_indicators,
        batch_start_time,
        batch_end_time,
        total_duration_ms,
        avg_time_per_indicator_ms,
        avg_confidence
      FROM pipeline_stats
      ORDER BY batch_start_time DESC
      ${limitClause}
    `);

    if (batches.length === 0) {
      console.log("   No batches found.\n");
      return;
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🔍 Recent Batches (showing ${batches.length})`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    for (const batch of batches) {
      const [
        batchId,
        model,
        provider,
        totalIndicators,
        successfulIndicators,
        startTime,
        endTime,
        totalDuration,
        avgTimePerIndicator,
        avgConfidence,
      ] = batch;

      const status = endTime ? "✅ Complete" : "⏳ In Progress";
      const successRate = totalIndicators > 0
        ? ((successfulIndicators / totalIndicators) * 100).toFixed(1)
        : "0.0";

      console.log(`📦 Batch: ${batchId}`);
      console.log(`   Status:      ${status}`);
      console.log(`   Model:       ${model} (${provider})`);
      console.log(
        `   Indicators:  ${successfulIndicators}/${totalIndicators} (${successRate}%)`,
      );
      console.log(`   Duration:    ${formatDuration(totalDuration)}`);
      console.log(`   Avg/item:    ${formatDuration(avgTimePerIndicator)}`);

      if (avgConfidence !== null) {
        console.log(`   Avg confidence: ${(avgConfidence * 100).toFixed(1)}%`);
      }

      console.log(`   Started:     ${startTime}`);
      if (endTime) {
        console.log(`   Completed:   ${endTime}`);
      }
      console.log("");
    }

    // Model comparison
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🤖 Performance by Model");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const modelStats = db.query<
      [string, string, number, number, number, number]
    >(`
      SELECT 
        model,
        provider,
        COUNT(*) as batches,
        SUM(successful_indicators) as total_processed,
        AVG(avg_time_per_indicator_ms) as avg_time,
        AVG(avg_confidence) as avg_conf
      FROM pipeline_stats
      WHERE batch_end_time IS NOT NULL
      GROUP BY model, provider
      ORDER BY total_processed DESC
    `);

    if (modelStats.length > 0) {
      for (const stat of modelStats) {
        const [model, provider, batches, totalProcessed, avgTime, avgConf] =
          stat;
        console.log(`   ${model} (${provider})`);
        console.log(`      Batches:    ${batches}`);
        console.log(`      Processed:  ${totalProcessed} indicators`);
        console.log(`      Avg time:   ${formatDuration(avgTime)}/indicator`);
        if (avgConf !== null) {
          console.log(`      Avg conf:   ${(avgConf * 100).toFixed(1)}%`);
        }
        console.log("");
      }
    } else {
      console.log("   No completed batches yet.\n");
    }
  } catch (error) {
    console.error("❌ Error reading stats:", error);
    Deno.exit(1);
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  viewStats();
}
