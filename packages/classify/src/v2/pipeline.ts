/**
 * V2 Pipeline Orchestrator
 * Coordinates: Router → Specialist → Orientation → Flagging → Review → Output
 * @module
 */

import type { Indicator, LLMConfig } from "../types.ts";
import type {
  ClassificationData,
  PipelineExecutionRecord,
  ReviewBatchResult,
  V2Config,
  V2PipelineResult,
} from "./types.ts";
import type { V2DatabaseClient } from "./db/client.ts";
import { V2DatabaseClient as V2DbClient } from "./db/client.ts";
import { DEFAULT_V2_CONFIG } from "./types.ts";
import { createV2Provider } from "./providers.ts";
import { routeIndicators } from "./router/router.ts";
import { writeRouterResults } from "./router/storage.ts";
import { groupIndicatorsByFamily } from "./specialist/grouping.ts";
import { classifyByFamily } from "./specialist/specialist.ts";
import { writeSpecialistResults } from "./specialist/storage.ts";
import { validateIndicators } from "./validation/validation.ts";
import {
  readValidationResults,
  writeValidationResults,
} from "./validation/storage.ts";
import { classifyOrientations } from "./orientation/orientation.ts";
import { writeOrientationResults } from "./orientation/storage.ts";
import { applyFlaggingRules } from "./review/flagging.ts";
import { writeFlaggingResults } from "./review/storage.ts";
import { reviewFlaggedIndicators } from "./review/review.ts";
import { readClassifications, writeClassifications } from "./output/storage.ts";
import { calculateCost } from "./utils/pricing.ts";

/**
 * Main V2 pipeline entry point
 */
export async function classifyIndicatorsV2(
  indicators: Indicator[],
  llmConfig: LLMConfig,
  v2Config: Partial<V2Config> = {},
): Promise<V2PipelineResult> {
  const startTime = Date.now();

  // Merge with defaults
  const config: V2Config = {
    ...v2Config,
    database: v2Config.database!,
    thresholds: { ...DEFAULT_V2_CONFIG.thresholds, ...v2Config.thresholds },
    batch: { ...DEFAULT_V2_CONFIG.batch, ...v2Config.batch },
    concurrency: { ...DEFAULT_V2_CONFIG.concurrency, ...v2Config.concurrency },
  };

  // Initialize database client from provided config
  const db = new V2DbClient(config.database as any);
  await db.initialize();
  createV2Provider(llmConfig); // Create provider to validate config

  const debug = Boolean(llmConfig.debug ?? false);
  const quiet = Boolean(llmConfig.quiet ?? false);

  if (!quiet) {
    console.log("\n🚀 Starting V2 Classification Pipeline...\n");
  }

  // Track execution
  const executionId = crypto.randomUUID();
  const execution: Partial<PipelineExecutionRecord> = {
    execution_id: executionId,
    started_at: new Date().toISOString(),
    total_indicators: indicators.length,
    provider: llmConfig.provider,
    model: llmConfig.model || "default",
  };

  // Track costs
  let totalCost = 0;

  let totalApiCalls = 0;

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 1: ROUTER - Assign family to each indicator
    // ═══════════════════════════════════════════════════════════════════════
    if (!quiet) console.log("📍 Stage 1: Router (Family Assignment)");

    // Use router-specific model if provided, otherwise use default
    const routerLlmConfig = config.models?.router
      ? { ...llmConfig, model: config.models.router }
      : llmConfig;

    const routerResult = await routeIndicators(indicators, {
      llmConfig: routerLlmConfig,
      batchSize: config.batch!.routerBatchSize!,
      concurrency: config.concurrency!.router!,
      debug: debug,
      quiet: quiet,
    });

    writeRouterResults(db, routerResult.successful, indicators);
    totalApiCalls += routerResult.apiCalls;

    // Calculate cost for router stage
    const routerCost = calculateCost(
      routerLlmConfig.model || llmConfig.model || "claude-sonnet-4-5-20250929",
      routerResult.usage.promptTokens,
      routerResult.usage.completionTokens,
    );
    totalCost += routerCost;

    if (debug) {
      console.log(
        `[Router] Processed ${routerResult.successful.length} indicators in ${routerResult.processingTime}ms`,
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 2: SPECIALIST - Family-specific classification
    // ═══════════════════════════════════════════════════════════════════════
    if (!quiet) {
      console.log("\n🎯 Stage 2: Specialist (Family-Specific Classification)");
    }

    // Use in-memory router results
    const groupedByFamily = groupIndicatorsByFamily(
      indicators,
      routerResult.successful,
    );

    // Use specialist-specific model if provided, otherwise use default
    const specialistLlmConfig = config.models?.specialist
      ? { ...llmConfig, model: config.models.specialist }
      : llmConfig;

    const specialistResult = await classifyByFamily(
      Array.from(groupedByFamily.values()).flat(),
      {
        llmConfig: specialistLlmConfig,
        batchSize: config.batch!.specialistBatchSize!,
        concurrency: config.concurrency!.specialist!,
        debug: debug,
        quiet: quiet,
      },
    );

    // Persist specialist results to database
    writeSpecialistResults(db, specialistResult.successful);
    totalApiCalls += specialistResult.apiCalls;

    // Calculate cost for specialist stage
    const specialistCost = calculateCost(
      specialistLlmConfig.model ||
        llmConfig.model ||
        "claude-sonnet-4-5-20250929",
      specialistResult.usage.promptTokens,
      specialistResult.usage.completionTokens,
    );
    totalCost += specialistCost;

    if (debug) {
      console.log(
        `[Specialist] Processed ${specialistResult.successful.length} indicators across ${groupedByFamily.size} families in ${specialistResult.processingTime}ms`,
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 3: VALIDATION - Time Series Analysis
    // ═══════════════════════════════════════════════════════════════════════
    if (!quiet) console.log("\n🔬 Stage 3: Validation (Time Series Analysis)");

    const validationStartTime = Date.now();
    const validationResults = validateIndicators(
      indicators,
      specialistResult.successful,
      { quiet },
    );
    const validationProcessingTime = Date.now() - validationStartTime;

    // Calculate validation metrics
    const cumulativeCount = validationResults.filter((r) =>
      r.is_cumulative
    ).length;
    const nonCumulativeCount = validationResults.length - cumulativeCount;
    const avgConfidence = validationResults.length > 0
      ? validationResults.reduce((sum, r) => sum + r.cumulative_confidence, 0) /
        validationResults.length
      : 0;

    // Write validation results to database
    if (validationResults.length > 0) {
      writeValidationResults(db, validationResults);
      if (!quiet) {
        console.log(
          `  ✓ Validated ${validationResults.length} indicators, saved to database`,
        );
      }
    } else {
      if (!quiet) {
        console.log(
          `  ℹ️  No indicators required validation (all non-cumulable types)`,
        );
      }
    }

    if (debug) {
      console.log(
        `[Validation] Analyzed ${validationResults.length} indicators in ${validationProcessingTime}ms`,
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 4: ORIENTATION - Heat map orientation
    // ═══════════════════════════════════════════════════════════════════════
    if (!quiet) console.log("\n🧭 Stage 4: Orientation (Heat Map Direction)");

    // Use in-memory stage outputs for enrichment
    const dbRouterResults = routerResult.successful;
    const dbSpecialistResults = specialistResult.successful;

    // Enrich indicators with router and specialist context for orientation stage
    const enrichedIndicatorsForOrientation = indicators.map((ind) => {
      const router = dbRouterResults.find((r) => r.indicator_id === ind.id);
      const specialist = dbSpecialistResults.find((s) =>
        s.indicator_id === ind.id
      );

      return {
        ...ind,
        router_family: router?.family,
        router_confidence: router?.confidence_family,
        router_reasoning: router?.reasoning,
        indicator_type: specialist?.indicator_type,
        temporal_aggregation: specialist?.temporal_aggregation,
        is_currency_denominated: specialist?.is_currency_denominated,
        specialist_reasoning: specialist?.reasoning,
      };
    });

    // Use orientation-specific model if provided, otherwise use default
    const orientationLlmConfig = config.models?.orientation
      ? { ...llmConfig, model: config.models.orientation }
      : llmConfig;

    const orientationResult = await classifyOrientations(
      enrichedIndicatorsForOrientation as any,
      {
        llmConfig: orientationLlmConfig,
        batchSize: config.batch!.orientationBatchSize!,
        concurrency: config.concurrency!.orientation!,
        debug: debug,
        quiet: quiet,
      },
    );

    writeOrientationResults(db, orientationResult.successful);
    totalApiCalls += orientationResult.apiCalls;

    // Calculate cost for orientation stage
    const orientationCost = calculateCost(
      orientationLlmConfig.model ||
        llmConfig.model ||
        "claude-sonnet-4-5-20250929",
      orientationResult.usage.promptTokens,
      orientationResult.usage.completionTokens,
    );
    totalCost += orientationCost;

    if (debug) {
      console.log(
        `[Orientation] Processed ${orientationResult.successful.length} indicators in ${orientationResult.processingTime}ms`,
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 5: FLAGGING - Quality control checks
    // ═══════════════════════════════════════════════════════════════════════
    if (!quiet) console.log("\n🚩 Stage 5: Flagging (Quality Control)");

    // Use in-memory stage outputs instead of re-reading DB
    const dbOrientationResults = orientationResult.successful;

    // Read validation results from database
    const indicatorIds = indicators.map((ind) => ind.id!);
    const validationResultsMap = readValidationResults(db, indicatorIds);

    const allClassificationData: ClassificationData[] = indicators.map(
      (ind) => {
        const router = dbRouterResults.find((r) => r.indicator_id === ind.id);
        const specialist = dbSpecialistResults.find(
          (s) => s.indicator_id === ind.id,
        );
        const orientation = dbOrientationResults.find(
          (o) => o.indicator_id === ind.id,
        );
        const validation = validationResultsMap.get(ind.id!);

        return {
          indicator_id: ind.id!,
          name: ind.name,
          units: ind.units,
          description: ind.description,
          family: router?.family || "qualitative",
          confidence_family: router?.confidence_family || 0,
          indicator_type: specialist?.indicator_type || "other",
          temporal_aggregation: specialist?.temporal_aggregation ||
            "not-applicable",
          is_currency_denominated: specialist?.is_currency_denominated,
          confidence_cls: specialist?.confidence_cls || 0,
          heat_map_orientation: orientation?.heat_map_orientation || "neutral",
          confidence_orient: orientation?.confidence_orient || 0,
          validated: validation ? 1 : 0,
          validation_confidence: validation?.cumulative_confidence,
        };
      },
    );

    // Convert to flagging format (requires different structure)
    // Include validation results from database
    const flaggingData = indicators.map((ind) => {
      // Extract time series if available from sample_values (fallback for inline analysis)
      let timeSeries: any[] | undefined;
      if (ind.sample_values && Array.isArray(ind.sample_values)) {
        // Check if it's temporal data (has date field)
        if (
          ind.sample_values.length > 0 &&
          typeof ind.sample_values[0] === "object" &&
          "date" in ind.sample_values[0]
        ) {
          timeSeries = ind.sample_values as any[];
        }
      }

      return {
        indicator: ind,
        router: dbRouterResults.find((r) => r.indicator_id === ind.id),
        specialist: dbSpecialistResults.find((s) => s.indicator_id === ind.id),
        orientation: dbOrientationResults.find((o) =>
          o.indicator_id === ind.id
        ),
        validation: validationResultsMap.get(ind.id!),
        time_series: timeSeries,
      };
    });

    const flaggedIndicators = flaggingData.flatMap((data) =>
      applyFlaggingRules(data, config.thresholds! as any)
    );

    // Persist flagging results to database
    writeFlaggingResults(db, flaggedIndicators);

    // Write consolidated classification data to classifications table
    writeClassifications(
      db,
      allClassificationData,
      llmConfig.provider,
      llmConfig.model || "default",
    );

    if (!quiet) {
      console.log(
        `  • Flagged ${flaggedIndicators.length}/${indicators.length} indicators for review`,
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 6: REVIEW - LLM-based correction of flagged indicators
    // ═══════════════════════════════════════════════════════════════════════
    let reviewResult: ReviewBatchResult;
    const shouldReviewAll = Boolean((config as any).reviewAll);
    if (flaggedIndicators.length > 0 || shouldReviewAll) {
      if (!quiet) {
        console.log("\n🔍 Stage 5: Review (LLM Correction)");
        if (config.models?.review) {
          console.log(`  Using model: ${config.models.review}`);
        }
      }

      // Use review-specific model if provided, otherwise use default
      const reviewLlmConfig = config.models?.review
        ? { ...llmConfig, model: config.models.review }
        : llmConfig;

      reviewResult = await reviewFlaggedIndicators(db, reviewLlmConfig, {
        batchSize: config.batch!.reviewBatchSize!,
        concurrency: config.concurrency!.review!,
        debug,
        quiet,
      });

      totalApiCalls += reviewResult.apiCalls;

      // Calculate cost for review stage
      const reviewCost = calculateCost(
        reviewLlmConfig.model ||
          llmConfig.model ||
          "claude-sonnet-4-5-20250929",
        reviewResult.usage.promptTokens,
        reviewResult.usage.completionTokens,
      );
      totalCost += reviewCost;

      // Update classifications table with review decisions
      if (reviewResult.decisions.length > 0) {
        const updateStmt = db.prepare(`
          UPDATE classifications
          SET review_status = ?,
              review_reason = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE indicator_id = ?
        `);

        db.transaction(() => {
          for (const decision of reviewResult.decisions) {
            updateStmt.run(
              decision.action,
              decision.reason,
              decision.indicator_id,
            );
          }
        });
      }

      if (debug) {
        console.log(
          `[Review] Reviewed ${reviewResult.reviewed} indicators in ${reviewResult.processingTime}ms`,
        );
      }
    } else {
      if (!quiet) console.log("\n✓ Stage 5: Review - Skipped (no flags)");
      reviewResult = {
        reviewed: 0,
        confirmed: 0,
        fixed: 0,
        escalated: 0,
        decisions: [],
        processingTime: 0,
        apiCalls: 0,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 6: OUTPUT - Fetch final classifications
    // ═══════════════════════════════════════════════════════════════════════
    if (!quiet) console.log("\n📤 Stage 6: Output Assembly");

    const finalClassifications = readClassifications(
      db,
      indicators.map((i) => i.id!),
    );

    // Calculate metrics
    const processingTime = Date.now() - startTime;
    const successful = finalClassifications.length;
    const failed = indicators.length - successful;

    // Update execution record
    execution.completed_at = new Date().toISOString();
    execution.total_api_calls = totalApiCalls;
    execution.total_cost = totalCost;
    execution.total_flagged = flaggedIndicators.length;
    execution.total_reviewed = reviewResult.reviewed;
    execution.total_fixed = reviewResult.fixed;
    execution.total_escalated = reviewResult.escalated;
    execution.processing_time_ms = processingTime;
    execution.status = "completed";

    // Write execution record
    writeExecutionRecord(db, execution as PipelineExecutionRecord);

    // Build result
    const result: V2PipelineResult = {
      classifications: finalClassifications,
      summary: {
        total: indicators.length,
        successful,
        failed,
        flagged: flaggedIndicators.length,
        reviewed: reviewResult.reviewed,
        fixed: reviewResult.fixed,
        escalated: reviewResult.escalated,
      },
      stages: {
        router: {
          processed: routerResult.successful.length,
          apiCalls: routerResult.apiCalls,
          processingTime: routerResult.processingTime,
        },
        specialist: {
          processed: specialistResult.successful.length,
          families: groupedByFamily.size,
          apiCalls: specialistResult.apiCalls,
          processingTime: specialistResult.processingTime,
        },
        validation: {
          analyzed: validationResults.length,
          cumulative: cumulativeCount,
          nonCumulative: nonCumulativeCount,
          avgConfidence,
          processingTime: validationProcessingTime,
        },
        orientation: {
          processed: orientationResult.successful.length,
          apiCalls: orientationResult.apiCalls,
          processingTime: orientationResult.processingTime,
        },
        flagging: {
          flagged: flaggedIndicators.length,
        },
        review: {
          reviewed: reviewResult.reviewed,
          confirmed: reviewResult.confirmed,
          fixed: reviewResult.fixed,
          escalated: reviewResult.escalated,
          apiCalls: reviewResult.apiCalls,
          processingTime: reviewResult.processingTime,
        },
      },
      processingTime,
      apiCalls: totalApiCalls,
      executionId,
    };

    if (!quiet) {
      console.log("\n✅ V2 Pipeline Complete!");
      console.log(`  • Total Time: ${processingTime}ms`);
      console.log(`  • Total API Calls: ${totalApiCalls}`);
      console.log(
        `  • Success Rate: ${
          ((successful / indicators.length) * 100).toFixed(
            1,
          )
        }%`,
      );
      if (result.summary.escalated > 0) {
        console.log(
          `  ⚠️  ${result.summary.escalated} indicator(s) require human review`,
        );
      }
      console.log("");
    }

    return result;
  } catch (error) {
    // Update execution record with error
    execution.completed_at = new Date().toISOString();
    execution.status = "failed";
    execution.error_message = error instanceof Error
      ? error.message
      : "Unknown error";
    execution.processing_time_ms = Date.now() - startTime;
    execution.total_cost = totalCost;

    writeExecutionRecord(db, execution as PipelineExecutionRecord);

    throw error;
  }
}

/**
 * Write execution record to database
 */
function writeExecutionRecord(
  db: V2DatabaseClient,
  record: PipelineExecutionRecord,
): void {
  // Align with schema: start_time, end_time, total_duration_ms, ...
  const configJson = JSON.stringify({});
  const telemetryJson = JSON.stringify({});
  db.prepare(
    `
    INSERT INTO pipeline_executions (
      execution_id,
      start_time,
      end_time,
      total_duration_ms,
      total_indicators,
      successful_indicators,
      failed_indicators,
      total_cost,
      provider,
      model,
      config_json,
      telemetry_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    record.execution_id,
    record.started_at,
    record.completed_at || null,
    record.processing_time_ms || 0,
    record.total_indicators,
    record.successful_indicators || 0,
    record.failed_indicators || 0,
    record.total_cost || 0,
    record.provider,
    record.model,
    configJson,
    telemetryJson,
  );
}
