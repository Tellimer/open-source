/**
 * Event Step: Complete Classification
 * Stage 9: Finalize classification and aggregate results
 */

import { EventConfig } from "motia";
import { z } from "zod";
import {
  createRepository,
  getDatabase,
  getDatabaseType,
} from "../../src/db/index.ts";

export const config: EventConfig = {
  type: "event",
  name: "CompleteClassify",
  description: "Stage 9: Finalize classification and aggregate results",
  flows: ["classify-indicator"],
  subscribes: ["indicator.complete"],
  emits: [],
  input: z.object({
    indicator_id: z.string(),
    name: z.string(),
    review_status: z.enum(["passed", "corrected", "failed"]),
    corrections: z.record(z.unknown()).optional(),
  }),
};

export const handler = async (input: any, { state, logger }: any) => {
  const { indicator_id, name, review_status, corrections } = input;
  const startTime = Date.now();

  logger.info("Completing classification", { indicator_id, name });

  try {
    // Get database connection
    const repo = createRepository(getDatabase());

    // Log processing start
    await repo.logProcessing({
      indicator_id,
      stage: "complete",
      status: "started",
    });

    // Gather all results from state
    const normalized = await state.get("normalizations", indicator_id);
    const timeInference = await state.get("time-inferences", indicator_id);
    const cumulativeDetection = await state.get(
      "cumulative-detections",
      indicator_id,
    );
    const scaleInference = await state.get("scale-inferences", indicator_id);
    const currencyCheck = await state.get("currency-checks", indicator_id);
    const familyAssignment = await state.get(
      "family-assignments",
      indicator_id,
    );
    const typeClassification = await state.get(
      "type-classifications",
      indicator_id,
    );
    const booleanReview = await state.get("boolean-reviews", indicator_id);
    const finalReview = await state.get("final-reviews", indicator_id);

    // Get source indicator metadata
    const sourceIndicator = await repo.getSourceIndicator(indicator_id);

    // Apply corrections if any
    let finalValues = {
      time_basis: timeInference?.timeBasis,
      reporting_frequency: timeInference?.reportingFrequency,
      scale: scaleInference?.scale,
      is_currency_denominated: currencyCheck?.isCurrencyDenominated,
      detected_currency: currencyCheck?.detectedCurrency,
      family: familyAssignment?.family,
      indicator_type: typeClassification?.indicatorType,
      temporal_aggregation: typeClassification?.temporalAggregation,
      heat_map_orientation: typeClassification?.heatMapOrientation,
    };

    if (corrections && Object.keys(corrections).length > 0) {
      finalValues = { ...finalValues, ...corrections };
    }

    // Calculate overall confidence
    // Only include stages that actually provided confidence scores (filter out nulls/undefined)
    const confidences = [
      normalized?.parsingConfidence,
      timeInference?.confidence,
      scaleInference?.confidence,
      currencyCheck?.confidence,
      familyAssignment?.confidence,
      typeClassification?.confidence,
      booleanReview?.confidence,
    ].filter((c): c is number => c !== null && c !== undefined);

    const overallConfidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

    // Prepare data for database
    const classificationData = {
      indicator_id,
      name,
      // Source metadata
      original_units: normalized?.originalUnits || sourceIndicator?.units,
      source_name: sourceIndicator?.source_name,
      long_name: sourceIndicator?.long_name,
      category_group: sourceIndicator?.category_group,
      dataset: sourceIndicator?.dataset,
      topic: sourceIndicator?.topic,
      source_scale: sourceIndicator?.scale,
      source_periodicity: sourceIndicator?.periodicity,
      aggregation_method: sourceIndicator?.aggregation_method,
      source_currency_code: sourceIndicator?.currency_code,
      // Normalization
      parsed_scale: normalized?.parsedScale,
      parsed_unit_type: normalized?.parsedUnitType,
      parsed_currency: normalized?.parsedCurrency,
      parsing_confidence: normalized?.parsingConfidence,
      // Time inference
      reporting_frequency: finalValues.reporting_frequency,
      time_basis: finalValues.time_basis,
      time_confidence: timeInference?.confidence,
      time_reasoning: timeInference?.reasoning,
      time_source_used: timeInference?.sourceUsed,
      // Cumulative detection
      is_cumulative: cumulativeDetection?.is_cumulative !== undefined
        ? cumulativeDetection.is_cumulative ? 1 : 0
        : null,
      cumulative_pattern_type: cumulativeDetection?.pattern_type,
      cumulative_confidence: cumulativeDetection?.confidence,
      cumulative_reasoning: cumulativeDetection?.reasoning,
      // Scale inference
      scale: finalValues.scale,
      scale_confidence: scaleInference?.confidence,
      scale_reasoning: scaleInference?.reasoning,
      // Currency check
      is_currency_denominated: finalValues.is_currency_denominated !== undefined
        ? finalValues.is_currency_denominated ? 1 : 0
        : null,
      detected_currency: finalValues.detected_currency,
      currency_confidence: currencyCheck?.confidence,
      currency_reasoning: currencyCheck?.reasoning,
      // Family assignment
      family: finalValues.family,
      family_confidence: familyAssignment?.confidence,
      family_reasoning: familyAssignment?.reasoning,
      // Type classification
      indicator_type: finalValues.indicator_type,
      temporal_aggregation: finalValues.temporal_aggregation,
      heat_map_orientation: finalValues.heat_map_orientation,
      type_confidence: typeClassification?.confidence,
      type_reasoning: typeClassification?.reasoning,
      // Boolean review
      boolean_review_passed: booleanReview?.isCorrect !== undefined
        ? booleanReview.isCorrect ? 1 : 0
        : null,
      boolean_review_fields_wrong: booleanReview?.fieldsWrong
        ? JSON.stringify(booleanReview.fieldsWrong)
        : null,
      boolean_review_reason: booleanReview?.reason,
      boolean_review_confidence: booleanReview?.confidence,
      // Final review
      final_review_status: finalReview?.status,
      final_review_corrections: finalReview?.corrections
        ? JSON.stringify(finalReview.corrections)
        : null,
      final_review_reason: finalReview?.reasoning,
      final_review_confidence: finalReview?.confidence,
      // Overall
      overall_confidence: overallConfidence,
      review_status,
      provider: timeInference?.provider || "local",
      model: timeInference?.model || "unknown",
    };

    // Save to database
    // Debug: Check for non-primitive values before saving
    Object.entries(classificationData).forEach(([key, value]) => {
      if (
        value !== null &&
        value !== undefined &&
        typeof value === "object" &&
        !Buffer.isBuffer(value)
      ) {
        logger.warn(`Non-primitive value detected in classification data`, {
          field: key,
          type: typeof value,
          value: JSON.stringify(value).substring(0, 100),
        });
      }
    });

    await repo.saveClassification(classificationData);

    // Save to Motia state for backward compatibility
    await state.set("final-classifications", indicator_id, {
      indicator_id,
      name,
      // Normalized data
      original_units: normalized?.originalUnits,
      parsed_scale: normalized?.parsedScale,
      parsed_unit_type: normalized?.parsedUnitType,
      parsed_currency: normalized?.parsedCurrency,
      // Final values (with corrections applied)
      ...finalValues,
      // Review status
      review_status,
      corrections_applied: corrections || {},
      // Metadata
      overall_confidence: overallConfidence,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const processingTime = Date.now() - startTime;

    // Log processing completion
    await repo.logProcessing({
      indicator_id,
      stage: "complete",
      status: "completed",
      metadata: { processing_time_ms: processingTime },
    });

    logger.info("Classification complete and saved to database", {
      indicator_id,
      name,
      review_status,
      overall_confidence: overallConfidence,
      metadata: { processing_time_ms: processingTime },
    });

    // Cleanup: Delete intermediate state to prevent memory bloat
    // All data is now persisted in SQLite, state no longer needed
    try {
      await Promise.all([
        state.delete("normalizations", indicator_id),
        state.delete("time-inferences", indicator_id),
        state.delete("cumulative-detections", indicator_id),
        state.delete("scale-inferences", indicator_id),
        state.delete("currency-checks", indicator_id),
        state.delete("family-assignments", indicator_id),
        state.delete("type-classifications", indicator_id),
        state.delete("boolean-reviews", indicator_id),
        state.delete("final-reviews", indicator_id),
        // Keep final-classifications for now (may be used externally)
      ]);
      logger.debug("State cleaned up", { indicator_id });
    } catch (cleanupError) {
      logger.warn("State cleanup failed (non-critical)", {
        indicator_id,
        error: cleanupError,
      });
    }

    // Check if this completes a batch and update batch stats
    try {
      // Find the most recent batch that hasn't been completed
      const dbType = getDatabaseType();
      const sql = dbType === "sqlite"
        ? `SELECT batch_id, total_indicators, successful_indicators
             FROM pipeline_stats
             WHERE batch_end_time IS NULL
             ORDER BY batch_start_time DESC
             LIMIT ?`
        : `SELECT batch_id, total_indicators, successful_indicators
             FROM pipeline_stats
             WHERE batch_end_time IS NULL
             ORDER BY batch_start_time DESC
             LIMIT $1`;

      const batch = await repo.queryOne(sql, [1]);

      if (batch) {
        const newSuccessCount = (batch.successful_indicators || 0) + 1;
        logger.info("Batch progress", {
          batch_id: batch.batch_id,
          completed: newSuccessCount,
          total: batch.total_indicators,
        });

        // If all indicators are complete, finalize batch stats
        if (newSuccessCount >= batch.total_indicators) {
          await repo.completeBatchStats(batch.batch_id);
          logger.info("Batch complete", {
            batch_id: batch.batch_id,
            total_indicators: batch.total_indicators,
          });
        }
      }
    } catch (statsError) {
      logger.error("Failed to update batch stats", {
        error: statsError instanceof Error
          ? statsError.message
          : String(statsError),
      });
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("Failed to complete classification", {
      indicator_id,
      name,
      error: errorMessage,
      metadata: { processing_time_ms: processingTime },
    });

    // Try to log the error
    try {
      const repo = createRepository(getDatabase());
      await repo.logProcessing({
        indicator_id,
        stage: "complete",
        status: "failed",
        error_message: errorMessage,
        metadata: { processing_time_ms: processingTime },
      });
    } catch (dbError) {
      logger.error("Failed to log error to database", {
        indicator_id,
        original_error: errorMessage,
        db_error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    }

    throw error;
  }
};
