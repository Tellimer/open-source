#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env --allow-ffi

/**
 * Run classification on specific indicators by ID
 *
 * Usage:
 *   deno task run:target INDICATOR_ID                    # Single indicator with OpenAI
 *   deno task run:target INDICATOR_ID openai             # Single indicator with OpenAI
 *   deno task run:target INDICATOR_ID local              # Single indicator with local LLM
 *   deno task run:target ID1 ID2 ID3                     # Multiple indicators with OpenAI
 *   deno task run:target ID1 ID2 ID3 anthropic          # Multiple indicators with Anthropic
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

/**
 * Get specific indicators by IDs
 */
function getIndicatorsByIds(
  db: Database,
  indicatorIds: string[],
): SourceIndicator[] {
  const placeholders = indicatorIds.map(() => "?").join(",");
  const query = `
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
    WHERE id IN (${placeholders})
    ORDER BY id
  `;

  const stmt = db.prepare(query);
  const rows = stmt.all<SourceIndicator>(...indicatorIds);
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

  while (Date.now() - startTime < maxWaitMs) {
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

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return false; // Timeout
}

async function classifyIndicators(
  indicators: SourceIndicator[],
  llmProvider: string = "openai",
  db: Database,
) {
  const baseUrl = Deno.env.get("MOTIA_API_URL") || "http://localhost:3000";
  const totalIndicators = indicators.length;

  console.log(`\n🎯 Processing ${totalIndicators} targeted indicators...`);
  console.log(`   Provider: ${llmProvider}`);
  console.log(`   API: ${baseUrl}/classify/batch\n`);

  const payload = {
    indicators: indicators.map((ind) => ({
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

  console.log("📦 Submitting batch...");

  const response = await fetch(`${baseUrl}/classify/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Batch submission failed: ${response.status} ${response.statusText}\n${errorText}`,
    );
  }

  const result = await response.json();
  console.log(`   ✅ Batch accepted (trace: ${result.trace_id})\n`);

  // Wait for completion
  console.log(
    `   ⏳ Waiting for ${totalIndicators} indicators to complete...\n`,
  );

  const indicatorIds = indicators.map((ind) => ind.id);
  const completed = await waitForBatchCompletion(
    db,
    indicatorIds,
    600000,
  ); // 10 min timeout

  if (completed) {
    console.log(`   ✅ All indicators completed!\n`);
  } else {
    console.log(
      `   ⚠️ Timed out, some indicators may still be processing...\n`,
    );
  }

  return result;
}

function printIndicatorSummary(indicators: SourceIndicator[]) {
  console.log("\n📊 Target Indicators:");
  console.log("═".repeat(80));

  indicators.forEach((ind, idx) => {
    console.log(`${idx + 1}. ${ind.name}`);
    console.log(`   ID: ${ind.id}`);
    if (ind.units) {
      console.log(`   Units: ${ind.units}`);
    }
    if (ind.definition) {
      console.log(
        `   Description: ${ind.definition.slice(0, 80)}${
          ind.definition.length > 80 ? "..." : ""
        }`,
      );
    }
    console.log();
  });

  console.log("═".repeat(80));
}

async function main() {
  const args = Deno.args;

  if (args.length === 0) {
    console.error(`
Usage:
  deno task run:target <INDICATOR_ID> [INDICATOR_ID2] [...] [provider]

Examples:
  deno task run:target ALBANIAINFNRATE                    # Single indicator with OpenAI
  deno task run:target ALBANIAINFNRATE local              # Single indicator with local LLM
  deno task run:target ID1 ID2 ID3                        # Multiple indicators with OpenAI
  deno task run:target ID1 ID2 ID3 anthropic             # Multiple with Anthropic

Arguments:
  INDICATOR_ID   One or more indicator IDs to classify
  provider       LLM provider: "openai" (default), "local", or "anthropic"
    `);
    Deno.exit(1);
  }

  // Parse arguments - last arg might be provider
  const validProviders = ["openai", "local", "anthropic"];
  const lastArg = args[args.length - 1];
  let llmProvider = "openai";
  let indicatorIds: string[];

  if (validProviders.includes(lastArg)) {
    llmProvider = lastArg;
    indicatorIds = args.slice(0, -1);
  } else {
    indicatorIds = args;
  }

  if (indicatorIds.length === 0) {
    console.error("❌ No indicator IDs provided");
    Deno.exit(1);
  }

  // Open database
  const dbPath = "./data/classify-workflow-local-dev.db";
  console.log(`📂 Opening database: ${dbPath}`);

  const db = new Database(dbPath);

  try {
    // Get indicators by IDs
    console.log(`🔍 Looking up ${indicatorIds.length} indicator(s)...`);
    const indicators = getIndicatorsByIds(db, indicatorIds);

    if (indicators.length === 0) {
      console.error("❌ No indicators found with the provided IDs");
      console.error(`   Searched for: ${indicatorIds.join(", ")}`);
      Deno.exit(1);
    }

    // Check if any IDs were not found
    const foundIds = new Set(indicators.map((ind) => ind.id));
    const notFoundIds = indicatorIds.filter((id) => !foundIds.has(id));
    if (notFoundIds.length > 0) {
      console.warn(
        `⚠️  Warning: ${notFoundIds.length} indicator(s) not found:`,
      );
      notFoundIds.forEach((id) => console.warn(`   - ${id}`));
      console.log();
    }

    console.log(`✅ Found ${indicators.length} indicator(s)`);

    // Check which are already classified
    const placeholders = indicators.map(() => "?").join(",");
    const checkQuery = `
      SELECT indicator_id
      FROM classifications
      WHERE indicator_id IN (${placeholders})
    `;
    const checkStmt = db.prepare(checkQuery);
    const alreadyClassified = checkStmt.all<{ indicator_id: string }>(
      ...indicators.map((ind) => ind.id),
    );

    if (alreadyClassified.length > 0) {
      console.warn(
        `⚠️  Warning: ${alreadyClassified.length} indicator(s) already classified:`,
      );
      alreadyClassified.forEach((row) => {
        const ind = indicators.find((i) => i.id === row.indicator_id);
        console.warn(`   - ${row.indicator_id}: ${ind?.name}`);
      });
      console.log(
        "\n   These will be re-classified (existing classifications will remain).\n",
      );
    }

    // Print summary
    printIndicatorSummary(indicators);

    // Classify indicators
    const result = await classifyIndicators(indicators, llmProvider, db);

    console.log(`\n✅ Batch processed!`);
    console.log(`   Total indicators: ${indicators.length}`);
    console.log(`   Trace ID: ${result.trace_id}`);
    console.log(`\n💡 Check results with:`);
    console.log(
      `   sqlite3 ${dbPath} "SELECT * FROM classifications WHERE indicator_id IN ('${
        indicators.map((i) => i.id).join("','")
      }');"`,
    );
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ Error:", error);
    Deno.exit(1);
  });
}
