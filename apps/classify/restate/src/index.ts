/**
 * Main Entry Point for Classify Restate Application
 * Registers all services and starts the Restate endpoint
 */

import * as restate from "@restatedev/restate-sdk";

// Import classification services
import normalizationService from "./services/normalization.service.ts";
import timeInferenceService from "./services/time-inference.service.ts";
import familyAssignmentService from "./services/family-assignment.service.ts";
import typeClassificationService from "./services/type-classification.service.ts";
import booleanReviewService from "./services/boolean-review.service.ts";
import finalReviewService from "./services/final-review.service.ts";

// Import data quality services
import stalenessDetectorService from "./services/staleness-detector.service.ts";
import magnitudeDetectorService from "./services/magnitude-detector.service.ts";
import falseReadingDetectorService from "./services/false-reading-detector.service.ts";
import unitChangeDetectorService from "./services/unit-change-detector.service.ts";
import consistencyCheckerService from "./services/consistency-checker.service.ts";
import qualityConsolidatorService from "./services/quality-consolidator.service.ts";
import qualityReviewService from "./services/quality-review.service.ts";

// Import consensus analysis services
import unitConsensusDetectorService from "./services/unit-consensus-detector.service.ts";
import scaleConsensusDetectorService from "./services/scale-consensus-detector.service.ts";
import frequencyConsensusDetectorService from "./services/frequency-consensus-detector.service.ts";
import currencyConsensusDetectorService from "./services/currency-consensus-detector.service.ts";
import timeBasisConsensusDetectorService from "./services/time-basis-consensus-detector.service.ts";
import consensusConsolidatorService from "./services/consensus-consolidator.service.ts";
import consensusReviewService from "./services/consensus-review.service.ts";

// Import workflows
import classificationWorkflow from "./workflows/classification.workflow.ts";
import dataQualityWorkflow from "./workflows/data-quality.workflow.ts";
import consensusAnalysisWorkflow from "./workflows/consensus-analysis.workflow.ts";

// Import APIs
import classifyApi from "./api/classify.api.ts";
import dataQualityApi from "./api/data-quality.api.ts";
import consensusAnalysisApi from "./api/consensus-analysis.api.ts";

/**
 * Create and configure Restate endpoint
 */
function createRestateEndpoint() {
  return restate
    .endpoint()
    // Configure default timeouts for all services
    .defaultServiceOptions({
      // Increase abort timeout to 10 minutes
      abortTimeout: 10 * 60 * 1000, // 10 minutes in milliseconds
    })
    // Register classification services
    .bind(normalizationService)
    .bind(timeInferenceService)
    .bind(familyAssignmentService)
    .bind(typeClassificationService)
    .bind(booleanReviewService)
    .bind(finalReviewService)
    // Register data quality services
    .bind(stalenessDetectorService)
    .bind(magnitudeDetectorService)
    .bind(falseReadingDetectorService)
    .bind(unitChangeDetectorService)
    .bind(consistencyCheckerService)
    .bind(qualityConsolidatorService)
    .bind(qualityReviewService)
    // Register consensus analysis services
    .bind(unitConsensusDetectorService)
    .bind(scaleConsensusDetectorService)
    .bind(frequencyConsensusDetectorService)
    .bind(currencyConsensusDetectorService)
    .bind(timeBasisConsensusDetectorService)
    .bind(consensusConsolidatorService)
    .bind(consensusReviewService)
    // Register workflows
    .bind(classificationWorkflow)
    .bind(dataQualityWorkflow)
    .bind(consensusAnalysisWorkflow)
    // Register APIs
    .bind(classifyApi)
    .bind(dataQualityApi)
    .bind(consensusAnalysisApi);
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

  // Start HTTP server (Restate SDK binds to 0.0.0.0 by default when only port is specified)
  await endpoint.listen(PORT);

  console.log(`✅ Restate endpoint listening on http://${HOST}:${PORT}`);
  console.log();
  console.log("📡 Registered Services:");
  console.log();
  console.log("  📊 Classification Services:");
  console.log("   - normalization");
  console.log("   - time-inference");
  console.log("   - family-assignment");
  console.log("   - type-classification");
  console.log("   - boolean-review");
  console.log("   - final-review");
  console.log();
  console.log("  🔍 Data Quality Services:");
  console.log("   - staleness-detector");
  console.log("   - magnitude-detector");
  console.log("   - false-reading-detector");
  console.log("   - unit-change-detector");
  console.log("   - consistency-checker");
  console.log("   - quality-consolidator");
  console.log("   - quality-review");
  console.log();
  console.log("  🤝 Consensus Analysis Services:");
  console.log("   - unit-consensus-detector");
  console.log("   - scale-consensus-detector");
  console.log("   - frequency-consensus-detector");
  console.log("   - currency-consensus-detector");
  console.log("   - time-basis-consensus-detector");
  console.log("   - consensus-consolidator");
  console.log("   - consensus-review");
  console.log();
  console.log("  🔄 Workflows:");
  console.log("   - classification-workflow");
  console.log("   - data-quality-workflow");
  console.log("   - consensus-analysis-workflow");
  console.log();
  console.log("  🌐 APIs:");
  console.log("   - classify-api");
  console.log("   - data-quality-api");
  console.log("   - consensus-analysis-api");
  console.log();
  console.log("🔗 API Endpoints:");
  console.log();
  console.log("  Classification:");
  console.log("   - POST http://localhost:8080/classify-api/batch");
  console.log("   - GET  http://localhost:8080/classify-api/getStatus/:indicator_id");
  console.log("   - GET  http://localhost:8080/classify-api/health");
  console.log();
  console.log("  Data Quality:");
  console.log("   - POST http://localhost:8080/data-quality-api/check");
  console.log("   - POST http://localhost:8080/data-quality-api/check-all");
  console.log("   - GET  http://localhost:8080/data-quality-api/report/:indicator_id");
  console.log("   - GET  http://localhost:8080/data-quality-api/issues");
  console.log("   - GET  http://localhost:8080/data-quality-api/status/:indicator_id");
  console.log("   - GET  http://localhost:8080/data-quality-api/health");
  console.log();
  console.log("  Consensus Analysis:");
  console.log("   - POST http://localhost:8080/consensus-analysis-api/analyze");
  console.log("   - POST http://localhost:8080/consensus-analysis-api/analyze-all");
  console.log("   - GET  http://localhost:8080/consensus-analysis-api/report/:indicator_name");
  console.log("   - GET  http://localhost:8080/consensus-analysis-api/issues");
  console.log("   - GET  http://localhost:8080/consensus-analysis-api/outliers/:indicator_name");
  console.log("   - GET  http://localhost:8080/consensus-analysis-api/status/:indicator_name");
  console.log("   - GET  http://localhost:8080/consensus-analysis-api/health");
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
