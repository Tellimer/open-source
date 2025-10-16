/**
 * Trigger classification for indicators in database
 *
 * Fetches indicators from source_indicators table and triggers
 * classification via the Restate API endpoint.
 *
 * Usage:
 *   bun run src/scripts/classify-indicators.ts                    # Classify all unclassified
 *   bun run src/scripts/classify-indicators.ts --200              # Classify first 200
 *   bun run src/scripts/classify-indicators.ts --200 --random     # Classify 200 random indicators
 *   bun run src/scripts/classify-indicators.ts --force            # Re-classify all (ignore existing)
 *   bun run src/scripts/classify-indicators.ts --openai           # Use OpenAI provider
 *   bun run src/scripts/classify-indicators.ts --anthropic        # Use Anthropic provider
 *   bun run src/scripts/classify-indicators.ts --200 --random --openai  # 200 random with OpenAI
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

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let force = false;
  let random = false;
  let provider: "local" | "openai" | "anthropic" = "local";

  for (const arg of args) {
    if (arg === "--force" || arg === "-f") {
      force = true;
    } else if (arg === "--random" || arg === "-r") {
      random = true;
    } else if (arg === "--openai") {
      provider = "openai";
    } else if (arg === "--anthropic") {
      provider = "anthropic";
    } else if (arg === "--local") {
      provider = "local";
    } else if (arg.startsWith("--") || arg.startsWith("-")) {
      const num = parseInt(arg.replace(/^-+/, ""), 10);
      if (!isNaN(num) && num > 0) {
        limit = num;
      }
    }
  }

  return { limit, force, random, provider };
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
  random: boolean,
  limit: number | null,
): Promise<SourceIndicator[]> {
  const db = getDb();

  // Determine ordering: random or chronological
  const orderClause = random ? "ORDER BY RANDOM()" : "ORDER BY si.created_at DESC";

  if (force) {
    // Classify all indicators (ignore existing classifications)
    if (limit) {
      const result = await db`
        SELECT
          id, name, units, long_name, source_name, periodicity,
          aggregation_method, scale, topic, category_group, dataset,
          currency_code, definition, sample_values
        FROM source_indicators si
        ${db.unsafe(orderClause)}
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
        ${db.unsafe(orderClause)}
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
        ${db.unsafe(orderClause)}
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
        ${db.unsafe(orderClause)}
      `;
      return result as unknown as SourceIndicator[];
    }
  }
}

/**
 * Trigger classification via Restate API
 */
async function classifyBatch(
  indicators: SourceIndicator[],
  provider: "local" | "openai" | "anthropic",
): Promise<void> {
  const ingressUrl = getRestateIngressUrl();
  const batchSize = 5; // Max batch size per API call

  console.log(`\n📤 Triggering classification via ${ingressUrl}...`);

  for (let i = 0; i < indicators.length; i += batchSize) {
    const batch = indicators.slice(i, i + batchSize);

    // Transform to API format
    const payload = {
      indicators: batch.map((ind) => {
        // Handle sample_values - might be string, object, or null
        let sampleValues: TimeSeriesPoint[] | undefined;
        if (ind.sample_values) {
          if (typeof ind.sample_values === 'string') {
            try {
              sampleValues = JSON.parse(ind.sample_values);
            } catch (e) {
              console.warn(`Warning: Could not parse sample_values for ${ind.id}`);
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

    const response = await fetch(`${ingressUrl}/classify-api/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `API request failed (${response.status}): ${error}`,
      );
    }

    const result = await response.json();
    console.log(
      `   ✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} indicators queued (trace_id: ${result.trace_id})`,
    );

    // Small delay between batches
    if (i + batchSize < indicators.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

/**
 * Main function
 */
async function main() {
  const { limit, force, random, provider } = parseArgs();

  console.log("📊 Classify Indicators Script");
  console.log("==============================\n");
  console.log(`Mode: ${force ? "Re-classify all" : "Classify unclassified only"}`);
  console.log(`Sampling: ${random ? "Random" : "Most recent"}`);
  console.log(`LLM Provider: ${provider}`);
  if (limit) {
    console.log(`Limit: ${limit} indicators`);
  }
  console.log("");

  // Fetch indicators
  console.log("🔍 Fetching indicators from database...");
  const indicators = await fetchIndicators(force, random, limit);

  if (indicators.length === 0) {
    console.log("✅ No indicators to classify!");
    return;
  }

  console.log(`✅ Found ${indicators.length} indicators to classify`);

  // Show sample
  console.log("\nSample indicators:");
  indicators.slice(0, 5).forEach((ind, idx) => {
    console.log(`   ${idx + 1}. ${ind.name} (${ind.id})`);
  });
  if (indicators.length > 5) {
    console.log(`   ... and ${indicators.length - 5} more`);
  }

  // Trigger classification
  await classifyBatch(indicators, provider);

  console.log(`\n🎉 Classification triggered for ${indicators.length} indicators!`);
  console.log(
    "\n💡 Monitor progress with: curl http://localhost:9070/restate/invocations",
  );
  console.log(
    "💡 Check results in: classifications, normalization_results, family_assignment_results, type_classification_results tables",
  );
}

// Run if called directly
if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
}
