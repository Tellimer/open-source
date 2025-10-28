/**
 * Parallel batch classification example
 *
 * Sends 4 concurrent batches of 5 indicators each (20 total)
 * to maximize throughput and parallel processing
 */

const API_URL = process.env.API_URL || "http://localhost:3000";
const API_KEY = process.env.API_KEY;

// Fetch 20 random indicators from database
async function fetchRandomIndicators(count: number = 20) {
  const dbUrl = process.env.CLASSIFY_DB_URL;

  if (!dbUrl) {
    throw new Error("CLASSIFY_DB_URL environment variable not set");
  }

  // Import postgres
  const postgres = (await import("postgres")).default;
  const sql = postgres(dbUrl);

  try {
    const indicators = await sql`
      SELECT
        id as indicator_id,
        name,
        units,
        scale,
        periodicity,
        source_name,
        source_url,
        long_name,
        category_group,
        dataset,
        aggregation_method,
        topic,
        currency_code,
        sample_values
      FROM source_indicators
      WHERE deleted_at IS NULL
        AND sample_values IS NOT NULL
      ORDER BY RANDOM()
      LIMIT ${count}
    `;

    await sql.end();
    return indicators;
  } catch (error) {
    console.error("Database error:", error);
    await sql.end();
    throw error;
  }
}

// Send a single batch to the classification API
async function sendBatch(
  indicators: any[],
  batchNumber: number,
  llmProvider: string = "openai",
) {
  console.log(
    `[Batch ${batchNumber}] Sending ${indicators.length} indicators...`,
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (API_KEY) {
    headers["x-api-key"] = API_KEY;
  }

  const startTime = Date.now();

  const response = await fetch(`${API_URL}/classify/batch`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      indicators,
      llm_provider: llmProvider,
    }),
  });

  const elapsed = Date.now() - startTime;

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `[Batch ${batchNumber}] HTTP ${response.status}: ${error}`,
    );
  }

  const result = await response.json();
  console.log(
    `[Batch ${batchNumber}] ✅ Started (${elapsed}ms) - Trace: ${result.trace_id}`,
  );

  return result;
}

async function main() {
  const TOTAL_INDICATORS = 20;
  const BATCH_SIZE = 5;
  const NUM_BATCHES = TOTAL_INDICATORS / BATCH_SIZE; // 4 batches
  const LLM_PROVIDER = (process.env.LLM_PROVIDER || "openai") as
    | "openai"
    | "anthropic"
    | "local";

  console.log("🚀 Parallel Batch Classification\n");
  console.log(`Total indicators: ${TOTAL_INDICATORS}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Number of batches: ${NUM_BATCHES}`);
  console.log(`LLM provider: ${LLM_PROVIDER}\n`);

  // Fetch random indicators
  console.log("📊 Fetching random indicators from database...");
  const allIndicators = await fetchRandomIndicators(TOTAL_INDICATORS);
  console.log(`✅ Fetched ${allIndicators.length} indicators\n`);

  // Split into batches
  const batches: any[][] = [];
  for (let i = 0; i < NUM_BATCHES; i++) {
    batches.push(allIndicators.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE));
  }

  // Send all batches in parallel
  console.log("🔄 Sending batches in parallel...\n");
  const startTime = Date.now();

  try {
    const results = await Promise.all(
      batches.map((batch, index) => sendBatch(batch, index + 1, LLM_PROVIDER)),
    );

    const elapsed = Date.now() - startTime;

    console.log(`\n✅ All batches sent successfully in ${elapsed}ms!`);
    console.log(`\nTrace IDs:`);
    results.forEach((result, index) => {
      console.log(`  Batch ${index + 1}: ${result.trace_id}`);
    });
    console.log(
      "\n💡 Check Motia logs and database for classification results.",
    );
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
