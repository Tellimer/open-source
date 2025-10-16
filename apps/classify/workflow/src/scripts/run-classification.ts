/**
 * Run classification on sampled indicators from the database
 *
 * Usage:
 *   deno task run:dev -100                    # Run 100 indicators with local LLM
 *   deno task run:dev -50 --provider openai   # Run 50 indicators with OpenAI
 *   deno task run:dev -25 --provider anthropic # Run 25 indicators with Anthropic
 */

import { Database } from "@db/sqlite";

interface IndicatorRecord {
  indicator_id: string;
  name: string;
  units: string | null;
  description: string | null;
  periodicity: string | null;
  sample_values: string | null;
}

type LLMProvider = "local" | "openai" | "anthropic";

/**
 * Parse command line arguments
 */
function parseArgs(): { sampleSize: number; provider: LLMProvider } {
  const args = Deno.args;

  // Parse sample size
  const sizeArg = args.find(
    (arg) => (arg.startsWith("--") || arg.startsWith("-")) && !arg.includes("provider"),
  );

  let sampleSize = 100;
  if (sizeArg) {
    const size = parseInt(sizeArg.replace(/^-+/, ""), 10);
    if (isNaN(size) || size <= 0) {
      throw new Error(
        `Invalid sample size: ${sizeArg}. Use --N or -N where N is a positive number.`,
      );
    }
    sampleSize = size;
  } else {
    console.log("ℹ️  No sample size specified, defaulting to 100");
  }

  // Parse provider
  const providerIndex = args.findIndex((arg) => arg === "--provider");
  let provider: LLMProvider = "local";

  if (providerIndex !== -1 && providerIndex + 1 < args.length) {
    const providerArg = args[providerIndex + 1];
    if (providerArg === "openai" || providerArg === "anthropic" || providerArg === "local") {
      provider = providerArg;
    } else {
      throw new Error(
        `Invalid provider: ${providerArg}. Use one of: local, openai, anthropic`,
      );
    }
  }

  return { sampleSize, provider };
}

/**
 * Sample diverse indicators from the database
 * Strategy: Get variety across indicator names and countries
 */
function sampleIndicators(db: Database, sampleSize: number): IndicatorRecord[] {
  console.log(`\n🎲 Sampling ${sampleSize} diverse indicators...`);

  // First, get all unique indicator names
  const uniqueNames = db.sql`SELECT DISTINCT name FROM source_indicators ORDER BY name`
    .map((row: any) => row.name);

  console.log(`   Found ${uniqueNames.length} unique indicator types`);

  // Calculate how many indicators to sample per type
  const indicatorsPerType = Math.max(
    1,
    Math.floor(sampleSize / uniqueNames.length),
  );
  const remainder = sampleSize % uniqueNames.length;

  console.log(
    `   Sampling ~${indicatorsPerType} indicator(s) per type for variety`,
  );

  const sampledIndicators: IndicatorRecord[] = [];

  // Sample from each indicator type
  for (
    let i = 0;
    i < uniqueNames.length && sampledIndicators.length < sampleSize;
    i++
  ) {
    const name = uniqueNames[i];
    const limit = i < remainder ? indicatorsPerType + 1 : indicatorsPerType;

    // Get random indicators for this type
    const rows = db.sql`
      SELECT id, name, units, definition, periodicity, sample_values
      FROM source_indicators
      WHERE name = ${name}
      ORDER BY RANDOM()
      LIMIT ${limit}
    `;

    for (const row of rows as any[]) {
      sampledIndicators.push({
        indicator_id: row.id,
        name: row.name,
        units: row.units,
        description: row.definition,
        periodicity: row.periodicity,
        sample_values: row.sample_values,
      });
    }
  }

  console.log(`✅ Sampled ${sampledIndicators.length} indicators\n`);

  // Show distribution
  const distribution = new Map<string, number>();
  for (const ind of sampledIndicators) {
    distribution.set(ind.name, (distribution.get(ind.name) || 0) + 1);
  }

  console.log("📊 Sample distribution (top 10):");
  const topTypes = Array.from(distribution.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  for (const [name, count] of topTypes) {
    console.log(`   ${count}× ${name}`);
  }
  console.log("");

  return sampledIndicators;
}

/**
 * Convert database record to API payload format
 */
function toAPIPayload(record: IndicatorRecord) {
  let sampleValues;
  if (record.sample_values) {
    try {
      sampleValues = JSON.parse(record.sample_values);
    } catch {
      sampleValues = undefined;
    }
  }

  return {
    indicator_id: record.indicator_id,
    name: record.name,
    units: record.units || undefined,
    description: record.description || undefined,
    periodicity: record.periodicity || undefined,
    sample_values: sampleValues,
  };
}

/**
 * Send indicators to classification API in batches
 * API accepts max 100 indicators per request
 */
async function classifyIndicators(
  indicators: IndicatorRecord[],
  apiUrl: string,
  llmProvider: LLMProvider,
) {
  const API_BATCH_SIZE = 100; // API limit per request
  const batches = Math.ceil(indicators.length / API_BATCH_SIZE);

  console.log(`🚀 Starting classification...`);
  console.log(`   API: ${apiUrl}`);
  console.log(`   LLM Provider: ${llmProvider}`);
  console.log(`   Total indicators: ${indicators.length}`);
  console.log(`   API batches: ${batches} (max ${API_BATCH_SIZE} per request)\n`);

  const results = [];
  let processed = 0;

  for (let i = 0; i < indicators.length; i += API_BATCH_SIZE) {
    const batch = indicators.slice(i, i + API_BATCH_SIZE);
    const batchNum = Math.floor(i / API_BATCH_SIZE) + 1;

    console.log(
      `📦 API Batch ${batchNum}/${batches} (${batch.length} indicators)...`,
    );

    const payload = {
      indicators: batch.map(toAPIPayload),
      llm_provider: llmProvider,
    };

    try {
      const response = await fetch(`${apiUrl}/classify/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      results.push(result);

      console.log(`   ✅ Batch ${batchNum} accepted`);
      console.log(`   📊 Trace ID: ${result.trace_id}`);

      processed += batch.length;
      console.log(`   Progress: ${processed}/${indicators.length}\n`);

      // Small delay between API requests
      if (i + API_BATCH_SIZE < indicators.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error(`   ❌ Batch ${batchNum} failed:`, errorMessage);
      throw error;
    }
  }

  return results;
}

/**
 * Main function
 */
async function main() {
  console.log("🔬 Classification Pipeline Runner\n");

  // Parse arguments
  const { sampleSize, provider } = parseArgs();

  // Get database path
  const dbPath = Deno.env.get("CLASSIFY_DB_LOCAL_DEV") ||
    "./data/classify-workflow-local-dev.db";

  console.log(`📂 Database: ${dbPath}`);

  // Check if database exists
  try {
    await Deno.stat(dbPath);
  } catch {
    console.error(`\n❌ Database not found at ${dbPath}`);
    console.error('   Run "deno task seed-db" first to create the database.');
    Deno.exit(1);
  }

  // Open database
  console.log(`   Opening database...`);
  let db: Database;
  try {
    db = new Database(dbPath);
    console.log(`   ✅ Database opened successfully`);
  } catch (error) {
    console.error(`\n❌ Failed to open database:`, error);
    Deno.exit(1);
  }

  // Get total count
  try {
    const countResult = db.sql`SELECT COUNT(*) as count FROM source_indicators`;
    const totalCount = (countResult[0] as any).count;
    console.log(`   Total indicators in DB: ${totalCount.toLocaleString()}`);
  } catch (error) {
    console.error(`\n❌ Failed to query database:`, error);
    db.close();
    Deno.exit(1);
  }

  // Sample indicators
  const indicators = sampleIndicators(db, sampleSize);
  db.close();

  // Get API URL from environment or default to localhost
  const apiUrl = Deno.env.get("MOTIA_API_URL") || "http://localhost:3000";

  // Classify indicators
  const startTime = Date.now();
  const results = await classifyIndicators(indicators, apiUrl, provider);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Classification pipeline started!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   Total indicators: ${indicators.length}`);
  console.log(`   API batches sent: ${results.length}`);
  console.log(`   Submission time: ${duration}s`);
  console.log("");
  console.log("💡 Next steps:");
  console.log("   1. Check Motia logs for classification progress");
  console.log("   2. Run: deno task query");
  console.log("   3. Run: deno task stats");
  console.log("");

  // Show trace IDs
  if (results.length > 0) {
    console.log("🔍 Trace IDs for tracking:");
    for (let i = 0; i < results.length; i++) {
      console.log(`   Batch ${i + 1}: ${results[i].trace_id}`);
    }
    console.log("");
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch((error) => {
    console.error("\n❌ Error:", error.message);
    Deno.exit(1);
  });
}
