/**
 * Classification Orchestrator Workflow
 * Coordinates all classification stages for a single indicator
 * One workflow instance per indicator_id ensures sequential execution and state isolation
 */

import * as restate from "@restatedev/restate-sdk";
import type {
  WorkflowContext,
  WorkflowSharedContext,
} from "@restatedev/restate-sdk";
import { DatabaseRepository } from "../db/repository.ts";
import type { IndicatorInput } from "../types.ts";
import type {
  BooleanReviewService,
  FamilyAssignmentService,
  FinalReviewService,
  NormalizationService,
  TimeInferenceService,
  TypeClassificationService,
} from "./service-types.ts";

interface WorkflowState {
  indicator: IndicatorInput & { llm_provider?: string };
  normalization?: any;
  timeInference?: any;
  cumulativeDetection?: any;
  familyAssignment?: any;
  typeClassification?: any;
  booleanReview?: any;
  finalReview?: any;
  status:
    | "pending"
    | "normalizing"
    | "time-inferring"
    | "family-assigning"
    | "type-classifying"
    | "reviewing"
    | "final-reviewing"
    | "completed"
    | "failed";
  error?: string;
  startedAt: string;
  completedAt?: string;
}

const classificationWorkflow = restate.workflow({
  name: "classification-workflow",
  handlers: {
    /**
     * Run classification workflow for an indicator
     */
    run: async (
      ctx: WorkflowContext,
      input: IndicatorInput & { llm_provider?: string },
    ) => {
      const indicator_id = ctx.key; // workflow ID = indicator_id
      const { llm_provider = "openai" } = input;

      ctx.console.info("Starting classification workflow", {
        indicator_id,
        name: input.name,
        provider: llm_provider,
      });

      // Initialize workflow state
      // Use ctx.run for timestamp to ensure determinism on replay
      const startedAt = await ctx.run("get-start-time", () => {
        return new Date().toISOString();
      });

      const state: WorkflowState = {
        indicator: input,
        status: "pending",
        startedAt,
      };

      ctx.set("state", state);

      // Log workflow start
      await ctx.run("log-workflow-start", async () => {
        const repo = new DatabaseRepository();
        await repo.logProcessing({
          indicator_id,
          stage: "workflow",
          status: "started",
        });
      });

      try {
        // Stage 1: Normalization
        ctx.console.info("Stage 1: Normalization", { indicator_id });
        state.status = "normalizing";
        ctx.set("state", state);

        const normalizationResult = await (ctx.serviceClient({
          name: "normalization",
        }) as unknown as NormalizationService).normalize(input);

        if (!normalizationResult.success) {
          throw new Error("Normalization failed");
        }

        state.normalization = normalizationResult.result;
        ctx.set("state", state);

        // Stage 2: Time Inference (includes cumulative detection)
        ctx.console.info("Stage 2: Time Inference", { indicator_id });
        state.status = "time-inferring";
        ctx.set("state", state);

        const timeInferenceResult = await (ctx.serviceClient({
          name: "time-inference",
        }) as unknown as TimeInferenceService).infer({
          ...input,
          parsed_scale: state.normalization.parsed_scale,
          parsed_unit_type: state.normalization.parsed_unit_type,
          parsed_currency: state.normalization.parsed_currency,
          normalized_scale: state.normalization.normalized_scale,
          llm_provider,
        });

        if (!timeInferenceResult.success) {
          throw new Error("Time inference failed");
        }

        state.timeInference = timeInferenceResult.timeResult;
        state.cumulativeDetection = timeInferenceResult.cumulativeResult;
        ctx.set("state", state);

        // Determine if currency
        const isCurrency =
          state.normalization.parsed_unit_type === "currency-amount" ||
          state.normalization.parsed_currency !== null;

        // Stage 3: Family Assignment
        ctx.console.info("Stage 3: Family Assignment", { indicator_id });
        state.status = "family-assigning";
        ctx.set("state", state);

        const familyResult = await (ctx.serviceClient({
          name: "family-assignment",
        }) as unknown as FamilyAssignmentService).assign({
          ...input,
          time_basis: state.timeInference.time_basis,
          normalized_scale: state.normalization.normalized_scale,
          is_currency: isCurrency,
          detected_currency: state.normalization.parsed_currency,
          parsed_unit_type: state.normalization.parsed_unit_type,
          llm_provider,
        });

        if (!familyResult.success) {
          throw new Error("Family assignment failed");
        }

        state.familyAssignment = familyResult.result;
        ctx.set("state", state);

        // Stage 4: Type Classification
        ctx.console.info("Stage 4: Type Classification", { indicator_id });
        state.status = "type-classifying";
        ctx.set("state", state);

        const typeResult = await (ctx.serviceClient({
          name: "type-classification",
        }) as unknown as TypeClassificationService).classify({
          ...input,
          family: state.familyAssignment.family,
          time_basis: state.timeInference.time_basis,
          normalized_scale: state.normalization.normalized_scale,
          is_currency: isCurrency,
          detected_currency: state.normalization.parsed_currency,
          parsed_unit_type: state.normalization.parsed_unit_type,
          is_cumulative: state.cumulativeDetection?.is_cumulative,
          cumulative_pattern_type: state.cumulativeDetection?.pattern_type,
          llm_provider,
        });

        if (!typeResult.success) {
          throw new Error("Type classification failed");
        }

        state.typeClassification = typeResult.result;
        ctx.set("state", state);

        // Skip boolean-review and final-review stages for now
        // TODO: Re-enable these stages once schema issues are resolved

        /*
        // Stage 5: Boolean Review
        ctx.console.info("Stage 5: Boolean Review", { indicator_id });
        state.status = "reviewing";
        ctx.set("state", state);

        const reviewResult = await (ctx.serviceClient({
          name: "boolean-review",
        }) as unknown as BooleanReviewService).review({
          indicator_id,
          name: input.name,
          time_basis: state.timeInference.time_basis,
          normalized_scale: state.normalization.normalized_scale,
          is_currency: isCurrency,
          family: state.familyAssignment.family,
          indicator_type: state.typeClassification.indicator_type,
          temporal_aggregation: state.typeClassification.temporal_aggregation,
          llm_provider,
        });

        if (!reviewResult.success) {
          throw new Error("Boolean review failed");
        }

        state.booleanReview = reviewResult.result;
        ctx.set("state", state);
        */

        /*
        // Stage 6: Final Review (only if corrections needed)
        if (!state.booleanReview.is_correct && state.booleanReview.incorrect_fields.length > 0) {
          ctx.console.info("Stage 6: Final Review (corrections needed)", { indicator_id });
          state.status = "final-reviewing";
          ctx.set("state", state);

          const finalReviewResult = await (ctx.serviceClient({
            name: "final-review",
          }) as unknown as FinalReviewService).review({
            indicator_id,
            incorrect_fields: state.booleanReview.incorrect_fields,
            review_reasoning: state.booleanReview.reasoning,
            current_values: {
              family: state.familyAssignment.family,
              type: state.typeClassification.indicator_type,
              temporal_aggregation: state.typeClassification.temporal_aggregation,
              time_basis: state.timeInference.time_basis,
              scale: state.normalization.normalized_scale,
            },
            llm_provider,
          });

          if (!finalReviewResult.success) {
            throw new Error("Final review failed");
          }

          state.finalReview = finalReviewResult.result;
          ctx.set("state", state);
        } else {
          ctx.console.info("Stage 6: Skipped (no corrections needed)", { indicator_id });
        }
        */

        // Stage 7: Save final classification
        ctx.console.info("Stage 7: Saving final classification", {
          indicator_id,
        });

        await ctx.run("save-final-classification", async () => {
          const repo = new DatabaseRepository();

          // Save to classifications table (without review stages for now)
          await repo.saveClassification({
            indicator_id,
            name: input.name,
            // Source metadata from original indicator
            original_units: input.units,
            source_name: input.source_name,
            long_name: input.long_name,
            category_group: input.category_group,
            dataset: input.dataset,
            topic: input.topic,
            source_scale: input.scale,
            source_periodicity: input.periodicity,
            aggregation_method: input.aggregation_method,
            source_currency_code: input.currency_code,
            // Normalization
            parsed_scale: state.normalization.parsed_scale,
            parsed_unit_type: state.normalization.parsed_unit_type,
            parsed_currency: state.normalization.parsed_currency,
            parsing_confidence: state.normalization.parsing_confidence,
            // Time Inference
            reporting_frequency: state.timeInference.reporting_frequency,
            time_basis: state.timeInference.time_basis,
            time_confidence: state.timeInference.confidence,
            time_reasoning: state.timeInference.reasoning,
            time_source_used: state.timeInference.source_used,
            // Cumulative Detection
            is_cumulative: state.cumulativeDetection.is_cumulative,
            cumulative_pattern_type: state.cumulativeDetection.pattern_type,
            cumulative_confidence: state.cumulativeDetection.confidence,
            cumulative_reasoning: state.cumulativeDetection.reasoning,
            // Family Assignment
            family: state.familyAssignment.family,
            family_confidence: state.familyAssignment.confidence,
            family_reasoning: state.familyAssignment.reasoning,
            // Type Classification
            indicator_type: state.typeClassification.indicator_type,
            temporal_aggregation: state.typeClassification.temporal_aggregation,
            heat_map_orientation: state.typeClassification.heat_map_orientation,
            type_confidence: state.typeClassification.confidence,
            type_reasoning: state.typeClassification.reasoning,
            // Provider & Model Info
            provider: state.typeClassification.provider,
            model: state.typeClassification.model,
          });

          // Log completion
          await repo.logProcessing({
            indicator_id,
            stage: "complete",
            status: "completed",
          });
        });

        state.status = "completed";
        state.completedAt = await ctx.run("get-completion-time", () => {
          return new Date().toISOString();
        });
        ctx.set("state", state);

        const totalTime = new Date(state.completedAt!).getTime() -
          new Date(state.startedAt).getTime();

        ctx.console.info("Classification workflow completed", {
          indicator_id,
          total_time_ms: totalTime,
          family: state.familyAssignment.family,
          type: state.typeClassification.indicator_type,
        });

        return {
          success: true,
          indicator_id,
          family: state.familyAssignment.family,
          type: state.typeClassification.indicator_type,
          temporal_aggregation: state.typeClassification.temporal_aggregation,
          reviewed: !!state.booleanReview,
          corrections_applied: !!state.finalReview,
          total_time_ms: totalTime,
        };
      } catch (error) {
        ctx.console.error("Classification workflow failed", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
          stage: state.status,
        });

        state.status = "failed";
        state.error = error instanceof Error ? error.message : String(error);
        state.completedAt = await ctx.run("get-failure-time", () => {
          return new Date().toISOString();
        });
        ctx.set("state", state);

        // Log failure
        await ctx.run("log-workflow-failure", async () => {
          const repo = new DatabaseRepository();
          await repo.logProcessing({
            indicator_id,
            stage: "workflow",
            status: "failed",
            error_message: state.error,
          });
        });

        return {
          success: false,
          indicator_id,
          error: state.error,
          failed_at_stage: state.status,
        };
      }
    },

    /**
     * Get current workflow state (shared handler - read-only)
     */
    getState: async (ctx: WorkflowSharedContext) => {
      const state = await ctx.get<WorkflowState>("state");
      return state || null;
    },
  },
});

export default classificationWorkflow;
