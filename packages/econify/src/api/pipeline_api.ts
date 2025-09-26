/**
 * Clean API for the pipeline that abstracts away XState completely
 */

import { createActor } from "npm:xstate@^5.20.2";
import { pipelineMachine } from "../workflows/economic-data-workflow.ts";
import { pipelineV2Machine } from "../workflowsV2/pipeline/pipeline.machine.ts";
import type {
  ParsedData,
  PipelineConfig,
} from "../workflows/economic-data-workflow.ts";

export interface PipelineOptions extends PipelineConfig {
  engine?: "v1" | "v2";
  onProgress?: (step: string, progress: number) => void;
  onWarning?: (warning: string) => void;
  onError?: (error: Error) => void;
}

export interface PipelineResult {
  data: ParsedData[];
  warnings: string[];
  errors: Error[];
  metrics: {
    processingTime: number;
    recordsProcessed: number;
    recordsFailed: number;
    qualityScore?: number;
  };
}

/**
 * Process economic data through the pipeline
 *
 * @param data - Array of economic data points to process
 * @param options - Pipeline configuration and callbacks
 * @returns Promise<PipelineResult> - Processed data with metadata
 *
 * @example
 * ```ts
 * const result = await processEconomicData(
 *   [
 *     { value: 100, unit: 'USD Million', name: 'GDP' },
 *     { value: 3.5, unit: 'percent', name: 'Inflation' }
 *   ],
 *   {
 *     targetCurrency: 'EUR',
 *     targetMagnitude: 'billions',
 *     minQualityScore: 60,
 *     onProgress: (step, progress) => console.log(`${step}: ${progress}%`),
 *   }
 * );
 *
 * console.log(result.data); // Processed data
 * console.log(result.metrics.qualityScore); // Quality score
 * ```
 */
export function processEconomicData(
  data: ParsedData[],
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const { onProgress, onWarning, onError, ...config } = options;

  return new Promise((resolve, reject) => {
    // Use V2 pipeline if specified
    const machine = options.engine === "v2"
      ? pipelineV2Machine
      : pipelineMachine;

    const actor = createActor(machine, {
      input: {
        rawData: data,
        config,
      },
    });

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      actor.stop();
      reject(new Error("Pipeline API timeout after 15 seconds"));
    }, 15000);

    let lastState = "";
    const startTime = Date.now();

    actor.subscribe((state) => {
      // Track progress through states
      if (state.value !== lastState) {
        lastState = state.value as string;

        const progressMap: Record<string, number> = {
          idle: 0,
          validating: 10,
          parsing: 20,
          qualityCheck: 30,
          qualityReview: 40,
          fetchingRates: 50,
          normalizing: 60,
          adjusting: 70,
          finalizing: 90,
          success: 100,
          error: -1,
        };

        // Clean up state names for external consumption
        const cleanStateName = lastState
          .replace("adjusting.", "")
          .replace("xstate.", "")
          .replace(".actor.", " ")
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()
          .trim();

        const progress = progressMap[lastState] ?? 0;
        if (onProgress && progress >= 0) {
          onProgress(cleanStateName, progress);
        }
      }

      // Auto-continue on quality review (like processEconomicDataAuto)
      if ((state as any).matches && (state as any).matches("qualityReview")) {
        if (onWarning) {
          const score = typeof state.context.qualityScore === "object"
            ? (state.context.qualityScore as any).overall
            : state.context.qualityScore;
          onWarning(
            `Quality score ${score || 0} below threshold, continuing anyway`,
          );
        }
        setTimeout(() => actor.send({ type: "CONTINUE" }), 0);
      }

      // Handle warnings
      if (state.context.warnings.length > 0 && onWarning) {
        state.context.warnings.forEach((warning) => {
          if (!warning.startsWith("_processed_")) {
            onWarning(warning);
            // Mark as processed to avoid duplicate calls
            state.context.warnings[state.context.warnings.indexOf(warning)] =
              "_processed_" + warning;
          }
        });
      }

      // Handle V2 completion
      if (
        options.engine === "v2" &&
        ((state as any).matches?.("done") || state.status === "done")
      ) {
        const v2Output = (state as any).output || {};
        const result: PipelineResult = {
          data: v2Output.normalizedData || [],
          warnings: v2Output.warnings || [],
          errors: [],
          metrics: {
            processingTime: Date.now() - startTime,
            recordsProcessed: v2Output.normalizedData?.length || 0,
            recordsFailed: data.length - (v2Output.normalizedData?.length || 0),
            qualityScore: (() => {
              const qs = (state.context as any).qualityScore;
              return typeof qs === "object" ? (qs as any)?.overall : qs;
            })(),
          },
        };

        clearTimeout(timeout);
        actor.stop();
        resolve(result);
        return;
      }

      // Handle V1 completion
      if ((state as any).matches?.("success")) {
        const result: PipelineResult = {
          data: (state.context as any).finalData || [],
          warnings: state.context.warnings.filter(
            (w) => !w.startsWith("_processed_"),
          ),
          errors: [],
          metrics: {
            processingTime: Date.now() - startTime,
            recordsProcessed: (state.context as any).finalData?.length || 0,
            recordsFailed: data.length -
              ((state.context as any).finalData?.length || 0),
            qualityScore: typeof state.context.qualityScore === "object"
              ? (state.context.qualityScore as any)?.overall
              : state.context.qualityScore,
          },
        };
        clearTimeout(timeout);
        actor.stop();
        resolve(result);
      }

      // Handle errors
      if ((state as any).matches?.("error")) {
        const errors = (state.context as any).errors?.map?.(
          (e: any) => new Error(e.message || "Pipeline error"),
        ) || [];

        if (onError && errors[0]) {
          onError(errors[0]);
        }

        const _result: PipelineResult = {
          data: (state.context as any).normalizedData ||
            state.context.parsedData || [],
          warnings: state.context.warnings.filter(
            (w) => !w.startsWith("_processed_"),
          ),
          errors,
          metrics: {
            processingTime: Date.now() - startTime,
            recordsProcessed: (state.context as any).normalizedData?.length ||
              0,
            recordsFailed: data.length,
            qualityScore: typeof state.context.qualityScore === "object"
              ? (state.context.qualityScore as any)?.overall
              : state.context.qualityScore,
          },
        };
        clearTimeout(timeout);
        actor.stop();
        reject(errors[0] || new Error("Pipeline failed"));
      }
    });

    actor.start();
    actor.send({ type: "START" });
  });
}

/**
 * Process economic data with automatic quality review handling.
 * Automatically continues past quality review if below threshold.
 *
 * @param data Array of economic data points to process
 * @param options Pipeline configuration and optional callbacks
 * @returns Processed data, warnings/errors, and timing/quality metrics
 */
export function processEconomicDataAuto(
  data: ParsedData[],
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  return new Promise((resolve, reject) => {
    const { onProgress, onWarning, onError, ...config } = options;
    const actor = createActor(pipelineMachine, {
      input: {
        rawData: data,
        config,
      },
    });

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      actor.stop();
      reject(new Error("Pipeline API Auto timeout after 15 seconds"));
    }, 15000);

    const startTime = Date.now();
    let hasReviewed = false;

    actor.subscribe((state) => {
      // Auto-continue on quality review
      if ((state as any).matches?.("qualityReview") && !hasReviewed) {
        hasReviewed = true;
        if (onWarning) {
          onWarning(
            `Quality score ${
              typeof state.context.qualityScore === "object"
                ? (state.context.qualityScore as any)?.overall
                : state.context.qualityScore || 0
            } below threshold ${
              config.minQualityScore || 70
            }, continuing anyway`,
          );
        }
        setTimeout(() => actor.send({ type: "CONTINUE" }), 0);
      }

      if (onProgress) {
        const progressMap: Record<string, number> = {
          idle: 0,
          validating: 10,
          parsing: 20,
          qualityCheck: 30,
          qualityReview: 40,
          fetchingRates: 50,
          normalizing: 60,
          adjusting: 70,
          finalizing: 90,
          success: 100,
        };
        const progress = progressMap[state.value as string] ?? 0;
        onProgress(state.value as string, progress);
      }

      if ((state as any).matches?.("success")) {
        clearTimeout(timeout);
        actor.stop();
        resolve({
          data: (state.context as any).finalData || [],
          warnings: state.context.warnings,
          errors: [],
          metrics: {
            processingTime: Date.now() - startTime,
            recordsProcessed: (state.context as any).finalData?.length || 0,
            recordsFailed: 0,
            qualityScore: typeof state.context.qualityScore === "object"
              ? (state.context.qualityScore as any)?.overall
              : state.context.qualityScore,
          },
        });
      }

      if ((state as any).matches?.("error")) {
        const error = new Error(
          state.context.errors[0]?.message || "Pipeline failed",
        );
        if (onError) onError(error);
        clearTimeout(timeout);
        actor.stop();
        reject(error);
      }
    });

    actor.start();
    actor.send({ type: "START" });
  });
}

/**
 * Validate data without processing (pre-flight check).
 * Useful to compute a quick quality score and list of issues.
 *
 * @param data Array of economic data points to validate
 * @param options Validation options (e.g. required fields)
 * @returns Validation result with boolean validity, score, and issues
 */
export function validateEconomicData(
  data: ParsedData[],
  options: { requiredFields?: string[] } = {},
): Promise<{ valid: boolean; score: number; issues: string[] }> {
  if (!data || data.length === 0) {
    return Promise.resolve({
      valid: false,
      score: 0,
      issues: ["No data provided"],
    });
  }

  const issues: string[] = [];

  // Check required fields
  if (options.requiredFields) {
    const invalid = data.filter(
      (item) => !options.requiredFields!.every((field) => field in item),
    );
    if (invalid.length > 0) {
      issues.push(`${invalid.length} records missing required fields`);
    }
  }

  // Check basic validity
  const invalidValues = data.filter(
    (item) =>
      typeof item.value !== "number" ||
      isNaN(item.value) ||
      !isFinite(item.value),
  );
  if (invalidValues.length > 0) {
    issues.push(`${invalidValues.length} records have invalid values`);
  }

  const missingUnits = data.filter((item) => !item.unit);
  if (missingUnits.length > 0) {
    issues.push(`${missingUnits.length} records missing units`);
  }

  // Calculate score
  const score = Math.max(0, 100 - issues.length * 20);

  return Promise.resolve({
    valid: issues.length === 0,
    score,
    issues,
  });
}
