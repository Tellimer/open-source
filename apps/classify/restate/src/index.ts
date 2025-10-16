/**
 * Main Entry Point for Classify Restate Application
 * Registers all services and starts the Restate endpoint
 */

import * as restate from "@restatedev/restate-sdk";

// Import services
import normalizationService from "./services/normalization.service.ts";
import timeInferenceService from "./services/time-inference.service.ts";
import familyAssignmentService from "./services/family-assignment.service.ts";
import typeClassificationService from "./services/type-classification.service.ts";
import booleanReviewService from "./services/boolean-review.service.ts";
import finalReviewService from "./services/final-review.service.ts";

// Import workflows
import classificationWorkflow from "./workflows/classification.workflow.ts";

// Import API
import classifyApi from "./api/classify.api.ts";

/**
 * Create and configure Restate endpoint
 */
function createRestateEndpoint() {
  return restate
    .endpoint()
    // Configure default timeouts for all services
    .defaultServiceOptions({
      // Increase abort timeout to 10 minutes (classification takes 1-3 minutes per indicator)
      abortTimeout: 10 * 60 * 1000, // 10 minutes in milliseconds
    })
    // Register stage services
    .bind(normalizationService)
    .bind(timeInferenceService)
    .bind(familyAssignmentService)
    .bind(typeClassificationService)
    .bind(booleanReviewService)
    .bind(finalReviewService)
    // Register workflow orchestrator (Virtual Object)
    .bind(classificationWorkflow)
    // Register API service
    .bind(classifyApi);
}

/**
 * Start the Restate HTTP server
 */
async function main() {
  const PORT = Number(process.env.PORT) || 9080;
  const HOST = process.env.HOST || "0.0.0.0";

  console.log("🚀 Starting Classify Restate Service...");
  console.log(`📋 Environment:`);
  console.log(`   - PostgreSQL: ${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}`);
  console.log(`   - Database: ${process.env.POSTGRES_DB || 'classify'}`);
  console.log(`   - OpenAI Model: ${process.env.OPENAI_MODEL || 'gpt-5-mini'}`);
  console.log(`   - Anthropic Model: ${process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'}`);
  console.log(`   - LM Studio: ${process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234/v1'}`);
  console.log();

  // Create endpoint
  const endpoint = createRestateEndpoint();

  // Start HTTP server
  await endpoint.listen(PORT);

  console.log(`✅ Restate endpoint listening on http://${HOST}:${PORT}`);
  console.log();
  console.log("📡 Registered Services:");
  console.log("   - normalization");
  console.log("   - time-inference");
  console.log("   - family-assignment");
  console.log("   - type-classification");
  console.log("   - boolean-review");
  console.log("   - final-review");
  console.log("   - classification-workflow (Workflow)");
  console.log("   - classify-api");
  console.log();
  console.log("🔗 API Endpoints:");
  console.log("   - POST http://localhost:8081/classify-api/batch");
  console.log("   - GET  http://localhost:8081/classify-api/getStatus/:indicator_id");
  console.log("   - GET  http://localhost:8081/classify-api/health");
  console.log();
  console.log("💡 Next Steps:");
  console.log("   1. Register services with Restate runtime:");
  console.log(`      curl -X POST http://localhost:9070/deployments \\`);
  console.log(`        -H 'content-type: application/json' \\`);
  console.log(`        -d '{"uri": "http://host.docker.internal:${PORT}"}'`);
  console.log();
  console.log("   2. Start classifying indicators:");
  console.log(`      curl -X POST http://localhost:8080/classify-api/batch \\`);
  console.log(`        -H 'content-type: application/json' \\`);
  console.log(`        -d '{"indicators": [...], "llm_provider": "openai"}'`);
  console.log();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n⏹️  Shutting down gracefully...");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n⏹️  Shutting down gracefully...");
    process.exit(0);
  });
}

// Start if running directly
if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ Fatal error starting service:", error);
    process.exit(1);
  });
}

export { createRestateEndpoint, main };
