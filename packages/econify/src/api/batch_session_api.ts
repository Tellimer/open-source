import {
  type AutoTargets,
  computeAutoTargets,
} from "../normalization/auto_targets.ts";
import { processEconomicData } from "./pipeline_api.ts";
import type { PipelineOptions, PipelineResult } from "./pipeline_api.ts";
import type { ParsedData } from "../workflows/economic-data-workflow.ts";
import { isMonetaryIndicator } from "../utils/monetary_detection.ts";

/**
 * Batch processing session for accumulating data points and processing them together
 * to ensure proper auto-target normalization across all items of an indicator.
 */
export class EconifyBatchSession {
  private dataPoints: ParsedData[] = [];
  private options: PipelineOptions;
  private indicatorName?: string;

  constructor(options: PipelineOptions) {
    this.options = options;
  }

  /**
   * Add a data point to the batch.
   * All data points should belong to the same indicator for proper normalization.
   */
  addDataPoint(data: ParsedData): void {
    this.dataPoints.push(data);

    // Track indicator name for validation
    if (!this.indicatorName && data.name) {
      this.indicatorName = data.name;
    } else if (
      this.indicatorName && data.name &&
      data.name.toLowerCase() !== this.indicatorName.toLowerCase()
    ) {
      console.warn(
        `Mixed indicators in batch: "${this.indicatorName}" and "${data.name}"`,
      );
    }
  }

  /**
   * Add multiple data points to the batch.
   */
  addDataPoints(data: ParsedData[]): void {
    data.forEach((d) => this.addDataPoint(d));
  }

  /**
   * Process all accumulated data points together.
   * This ensures auto-targets are computed across the entire dataset.
   */
  async process(): Promise<PipelineResult> {
    if (this.dataPoints.length === 0) {
      throw new Error("No data points to process");
    }

    // Detect if this is monetary data and adjust options accordingly
    const processOptions = { ...this.options };

    // Only apply targetCurrency if:
    // 1. It was explicitly set in options, AND
    // 2. The data is actually monetary
    if (processOptions.targetCurrency) {
      const isMonetary = isMonetaryIndicator(this.dataPoints);

      if (!isMonetary) {
        // Remove targetCurrency for non-monetary data to prevent conversion errors
        console.warn(
          `Removing targetCurrency "${processOptions.targetCurrency}" for non-monetary indicator "${
            this.indicatorName || "unknown"
          }"`,
        );
        delete processOptions.targetCurrency;

        // Also exclude currency from auto-target dimensions if it was included
        if (processOptions.autoTargetDimensions?.includes("currency")) {
          processOptions.autoTargetDimensions = processOptions
            .autoTargetDimensions.filter(
              (d) => d !== "currency",
            );
        }
      }
    }

    // Process all data points together
    const result = await processEconomicData(this.dataPoints, processOptions);

    // Clear the batch after processing
    this.dataPoints = [];

    return result;
  }

  /**
   * Get the number of data points in the current batch.
   */
  size(): number {
    return this.dataPoints.length;
  }

  /**
   * Clear all data points from the batch without processing.
   */
  clear(): void {
    this.dataPoints = [];
    this.indicatorName = undefined;
  }

  /**
   * Get a preview of what auto-targets would be computed for the current batch.
   * Useful for debugging and understanding the normalization that will be applied.
   */
  previewAutoTargets(): AutoTargets {
    if (this.dataPoints.length === 0) {
      return new Map();
    }

    return computeAutoTargets(this.dataPoints, {
      indicatorKey: this.options.indicatorKey ?? "name",
      autoTargetDimensions: this.options.autoTargetDimensions,
      minMajorityShare: this.options.minMajorityShare,
      tieBreakers: this.options.tieBreakers,
      targetCurrency: this.options.targetCurrency,
      allowList: this.options.allowList,
      denyList: this.options.denyList,
    });
  }
}

/**
 * Helper function to process data in indicator-based batches.
 * Automatically groups data by indicator and processes each group with proper auto-targeting.
 */
export async function processEconomicDataByIndicator(
  data: ParsedData[],
  options: PipelineOptions,
): Promise<PipelineResult> {
  // Group data by indicator
  const groups = new Map<string, ParsedData[]>();

  for (const item of data) {
    const key = typeof options.indicatorKey === "function"
      ? options.indicatorKey(item)
      : (item.name || item.id || "unknown");

    const normalizedKey = String(key).trim().toLowerCase().replace(/\s+/g, " ");
    const group = groups.get(normalizedKey) || [];
    group.push(item);
    groups.set(normalizedKey, group);
  }

  // Process each indicator group
  const allResults: ParsedData[] = [];
  const allWarnings: string[] = [];
  const allErrors: Error[] = [];
  let totalQualityScore = 0;
  let groupCount = 0;

  for (const [indicator, items] of groups) {
    try {
      const result = await processEconomicData(items, options);
      allResults.push(...result.data);
      allWarnings.push(...result.warnings);
      allErrors.push(...result.errors);
      if (result.metrics.qualityScore) {
        totalQualityScore += result.metrics.qualityScore;
        groupCount++;
      }
    } catch (error) {
      console.error(`Failed to process indicator "${indicator}":`, error);
      allErrors.push(error as Error);
    }
  }

  return {
    data: allResults,
    warnings: allWarnings,
    errors: allErrors,
    metrics: {
      processingTime: 0,
      recordsProcessed: allResults.length,
      recordsFailed: data.length - allResults.length,
      qualityScore: groupCount > 0 ? totalQualityScore / groupCount : undefined,
    },
  };
}
