#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Classify Feeder CLI
 * Orchestrates batch processing from LibSQL → Motia workflow → Postgres
 */

import type { FeederConfig } from "./src/types.ts";
import { checkStatus, processBatchRun, resumeBatchRun } from "./src/feeder.ts";

/**
 * Load configuration from environment
 */
function loadConfig(): FeederConfig {
  const motiaApiUrl = Deno.env.get("MOTIA_API_URL");
  const libsqlUrl = Deno.env.get("LIBSQL_URL");
  const postgresUrl = Deno.env.get("POSTGRES_URL");

  if (!motiaApiUrl) {
    throw new Error("MOTIA_API_URL environment variable is required");
  }
  if (!libsqlUrl) {
    throw new Error("LIBSQL_URL environment variable is required");
  }
  if (!postgresUrl) {
    throw new Error("POSTGRES_URL environment variable is required");
  }

  return {
    motiaApiUrl,
    libsqlUrl,
    libsqlAuthToken: Deno.env.get("LIBSQL_AUTH_TOKEN"),
    postgresUrl,
    batchSize: parseInt(Deno.env.get("BATCH_SIZE") || "10", 10),
    concurrency: parseInt(Deno.env.get("CONCURRENCY") || "5", 10),
    interBatchDelayMs: parseInt(
      Deno.env.get("INTER_BATCH_DELAY_MS") || "300",
      10
    ),
    provider: (Deno.env.get("PROVIDER") || "openai") as
      | "openai"
      | "anthropic"
      | "local",
  };
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
🔄 Classify Feeder - LibSQL → Motia Workflow Orchestrator

USAGE:
  deno task start    Start new batch processing run
  deno task resume   Resume interrupted batch run
  deno task status   Check current batch status

ENVIRONMENT VARIABLES:
  MOTIA_API_URL           Motia workflow API URL (required)
  LIBSQL_URL              LibSQL/Turso database URL (required)
  LIBSQL_AUTH_TOKEN       LibSQL auth token (optional for local)
  POSTGRES_URL            Postgres results database URL (required)
  BATCH_SIZE              Indicators per batch (default: 10)
  CONCURRENCY             Concurrent batches (default: 5)
  INTER_BATCH_DELAY_MS    Delay between batch groups (default: 300)
  PROVIDER                LLM provider: openai|anthropic|local (default: openai)

EXAMPLES:
  # Start with defaults (10 indicators/batch, 5 concurrent)
  deno task start

  # Custom configuration via env vars
  export BATCH_SIZE=20
  export CONCURRENCY=3
  deno task start

  # Check progress
  deno task status

  # Resume after interruption
  deno task resume

RATE LIMITS (OpenAI GPT-4o-mini Tier 1):
  - TPM: 200,000 tokens/minute
  - Per indicator: ~1,000 tokens
  - Recommended: BATCH_SIZE=10, CONCURRENCY=5 (75% TPM utilization)
  - Max safe: BATCH_SIZE=10, CONCURRENCY=8 (100% TPM limit)

For more info: https://github.com/tellimer/open-source
`);
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = Deno.args;
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    Deno.exit(0);
  }

  try {
    const config = loadConfig();

    console.log(`⚙️  Configuration:`);
    console.log(`   API: ${config.motiaApiUrl}`);
    console.log(`   LibSQL: ${config.libsqlUrl}`);
    console.log(`   Batch size: ${config.batchSize}`);
    console.log(`   Concurrency: ${config.concurrency}`);
    console.log(`   Provider: ${config.provider}`);
    console.log(
      `   Delay: ${config.interBatchDelayMs}ms between groups\n`
    );

    switch (command) {
      case "start":
        await processBatchRun(config);
        break;

      case "resume":
        await resumeBatchRun(config);
        break;

      case "status":
        await checkStatus(config);
        break;

      default:
        console.error(`❌ Unknown command: ${command}\n`);
        printUsage();
        Deno.exit(1);
    }
  } catch (error) {
    console.error(
      `\n❌ Error: ${error instanceof Error ? error.message : String(error)}`
    );
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
