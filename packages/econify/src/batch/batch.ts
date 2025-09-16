/**
 * Batch processing with validation and error handling
 */

import { normalizeValue } from "../normalization/normalization.ts";
import { buildExplainMetadata } from "../normalization/explain.ts";
import { parseUnit } from "../units/units.ts";
import { assessDataQuality, type QualityScore } from "../quality/quality.ts";
import type { Explain, FXTable, Scale, TimeScale } from "../types.ts";

/**
 * Normalize scale string from database to Scale type
 */
function normalizeScale(scale?: string | null): Scale | null {
  if (!scale || scale.trim() === "") return null;
  const normalized = scale.toLowerCase().trim();
  switch (normalized) {
    case "ones": return "ones";
    case "thousands": return "thousands";
    case "millions": return "millions";
    case "billions": return "billions";
    case "trillions": return "trillions";
    default: return null;
  }
}

/**
 * Normalize time scale string from database to TimeScale type
 */
function normalizeTimeScale(periodicity?: string | null): TimeScale | null {
  if (!periodicity || periodicity.trim() === "") return null;
  const normalized = periodicity.toLowerCase().trim();
  switch (normalized) {
    case "yearly": return "year";
    case "quarterly": return "quarter";
    case "monthly": return "month";
    case "weekly": return "week";
    case "daily": return "day";
    case "hourly": return "hour";
    // Also handle the enum values directly
    case "year": return "year";
    case "quarter": return "quarter";
    case "month": return "month";
    case "week": return "week";
    case "day": return "day";
    case "hour": return "hour";
    default: return null;
  }
}

/**
 * Normalize currency code from database
 */
function normalizeCurrency(currency?: string | null): string | null {
  if (!currency || currency.trim() === "") return null;
  return currency.trim().toUpperCase();
}

export interface BatchItem {
  id?: string | number;
  value: number;
  unit: string;

  /** Explicit metadata fields - use if provided, otherwise parse from unit string */
  periodicity?: string;     // "Quarterly", "Monthly", "Yearly"
  scale?: string;          // "Millions", "Billions", "Thousands"
  currency_code?: string;  // "USD", "SAR", "XOF"

  metadata?: Record<string, unknown>;
}

export interface BatchOptions {
  validate?: boolean;
  handleErrors?: "throw" | "skip" | "default";
  defaultValue?: number;
  parallel?: boolean;
  concurrency?: number;
  progressCallback?: (progress: number) => void;
  qualityThreshold?: number;
  toCurrency?: string;
  toMagnitude?: Scale;
  toTimeScale?: TimeScale;
  fx?: FXTable;
  explain?: boolean;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
}

export interface BatchResult<T = BatchItem> {
  successful: Array<T & { normalized: number; normalizedUnit: string; explain?: Explain }>;
  failed: Array<{
    item: T;
    error: Error;
    reason: string;
  }>;
  skipped: Array<{
    item: T;
    reason: string;
  }>;
  quality?: QualityScore;
  stats: BatchStats;
}

export interface BatchStats {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  processingTime: number;
  averageTime: number;
}

/**
 * Process batch of economic data.
 *
 * @param items Items to normalize with units and optional metadata
 * @param options Controls validation, error handling, parallelism, targets
 * @returns Success/failed/skipped partitions, quality and stats
 */
export async function processBatch<T extends BatchItem>(
  items: T[],
  options: BatchOptions = {},
): Promise<BatchResult<T>> {
  const {
    validate = true,
    handleErrors = "skip",
    parallel = true,
    concurrency = 10,
    progressCallback,
    qualityThreshold = 70,
    ...normalizationOptions
  } = options;

  const startTime = Date.now();
  const result: BatchResult<T> = {
    successful: [],
    failed: [],
    skipped: [],
    stats: {
      total: items.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      processingTime: 0,
      averageTime: 0,
    },
  };

  // 1. Validation phase
  if (validate) {
    const validationResult = validateBatch(items, qualityThreshold);
    result.quality = validationResult.quality;

    if (validationResult.quality.overall < qualityThreshold) {
      if (handleErrors === "throw") {
        throw new Error(
          `Batch quality score ${validationResult.quality.overall} below threshold ${qualityThreshold}`,
        );
      }

      // Mark low-quality items for skipping
      for (const item of validationResult.invalidItems) {
        result.skipped.push({
          item,
          reason: "Failed quality validation",
        });
      }
    }
  }

  // 2. Processing phase
  const itemsToProcess = items.filter(
    (item) => !result.skipped.some((s) => s.item === item),
  );

  if (parallel) {
    await processInParallel(
      itemsToProcess,
      result,
      normalizationOptions,
      concurrency,
      progressCallback,
    );
  } else {
    processSequentially(
      itemsToProcess,
      result,
      normalizationOptions,
      progressCallback,
    );
  }

  // 3. Calculate final stats
  const endTime = Date.now();
  result.stats.processed = result.successful.length + result.failed.length;
  result.stats.successful = result.successful.length;
  result.stats.failed = result.failed.length;
  result.stats.skipped = result.skipped.length;
  result.stats.processingTime = endTime - startTime;
  result.stats.averageTime = result.stats.processed > 0
    ? result.stats.processingTime / result.stats.processed
    : 0;

  return result;
}

/**
 * Validate batch before processing
 */
function validateBatch<T extends BatchItem>(
  items: T[],
  _threshold: number,
): { quality: QualityScore; invalidItems: T[] } {
  const dataPoints = items.map((item) => ({
    value: item.value,
    unit: item.unit,
    metadata: item.metadata,
  }));

  const quality = assessDataQuality(dataPoints, {
    checkOutliers: true,
    checkConsistency: true,
    checkCompleteness: true,
  });

  // Identify invalid items
  const invalidItems: T[] = [];
  for (const issue of quality.issues) {
    if (issue.severity === "critical" && issue.affectedData) {
      const idx = dataPoints.findIndex((item) => item === issue.affectedData);
      if (idx >= 0) {
        invalidItems.push(items[idx]);
      }
    }
  }

  return { quality: quality, invalidItems };
}

/**
 * Process items in parallel
 */
async function processInParallel<T extends BatchItem>(
  items: T[],
  result: BatchResult<T>,
  options: Omit<BatchOptions, "parallel" | "concurrency" | "progressCallback">,
  concurrency: number,
  progressCallback?: (progress: number) => void,
): Promise<void> {
  const chunks = chunkArray(items, concurrency);
  let processed = 0;

  for (const chunk of chunks) {
    const promises = chunk.map((item) => processItem(item, options));
    const results = await Promise.allSettled(promises);

    results.forEach((res, idx) => {
      const item = chunk[idx];

      if (res.status === "fulfilled" && res.value) {
        result.successful.push({
          ...item,
          normalized: res.value.normalized,
          normalizedUnit: res.value.normalizedUnit,
          ...(res.value.explain && { explain: res.value.explain }),
        });
      } else if (res.status === "rejected") {
        handleItemError(item, res.reason, options, result);
      }

      processed++;
      if (progressCallback) {
        progressCallback((processed / items.length) * 100);
      }
    });
  }
}

/**
 * Process items sequentially
 */
function processSequentially<T extends BatchItem>(
  items: T[],
  result: BatchResult<T>,
  options: Omit<BatchOptions, "parallel" | "concurrency" | "progressCallback">,
  progressCallback?: (progress: number) => void,
): void {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      const processed = processItem(item, options);
      if (processed) {
        result.successful.push({
          ...item,
          normalized: processed.normalized,
          normalizedUnit: processed.normalizedUnit,
          ...(processed.explain && { explain: processed.explain }),
        });
      }
    } catch (error) {
      handleItemError(item, error as Error, options, result);
    }

    if (progressCallback) {
      progressCallback(((i + 1) / items.length) * 100);
    }
  }
}

/**
 * Process single item
 */
function processItem<T extends BatchItem>(
  item: T,
  options: Omit<BatchOptions, "parallel" | "concurrency" | "progressCallback">,
): { normalized: number; normalizedUnit: string; explain?: Explain } | null {
  try {
    // Parse unit to get baseline information
    const parsed = parseUnit(item.unit);
    if (parsed.category === "unknown") {
      // Skip unknown units instead of throwing error
      return null;
    }

    // Use explicit fields if provided, otherwise fall back to parsed values
    // Normalize explicit metadata to match expected types
    const effectiveCurrency = normalizeCurrency(item.currency_code) || parsed.currency;
    const effectiveScale = normalizeScale(item.scale) || parsed.scale;
    const effectiveTimeScale = normalizeTimeScale(item.periodicity) || parsed.timeScale;

    // Normalize value using enhanced metadata
    const normalized = normalizeValue(item.value, item.unit, {
      toCurrency: options.toCurrency,
      toMagnitude: options.toMagnitude,
      toTimeScale: options.toTimeScale,
      fx: options.fx,
      // Pass explicit metadata for more accurate processing
      explicitCurrency: effectiveCurrency,
      explicitScale: effectiveScale,
      explicitTimeScale: effectiveTimeScale,
    });

    // Build normalized unit string
    const normalizedUnit = buildNormalizedUnit(
      item.unit,
      options.toCurrency,
      options.toMagnitude,
      options.toTimeScale,
    );

    // Build explain metadata if requested
    let explain: Explain | undefined;
    if (options.explain) {
      explain = buildExplainMetadata(item.value, item.unit, normalized, {
        toCurrency: options.toCurrency,
        toMagnitude: options.toMagnitude,
        toTimeScale: options.toTimeScale,
        fx: options.fx,
        // Pass explicit metadata for accurate explain generation
        explicitCurrency: effectiveCurrency,
        explicitScale: effectiveScale,
        explicitTimeScale: effectiveTimeScale,
      });

      // Enhance with FX source information if available
      if (explain.fx && options.fxSource) {
        explain.fx.source = options.fxSource;
        explain.fx.sourceId = options.fxSourceId;
      }
    }

    return { normalized: normalized, normalizedUnit, explain };
  } catch (error) {
    throw error;
  }
}

/**
 * Handle item processing error
 */
function handleItemError<T extends BatchItem>(
  item: T,
  error: Error,
  options: Omit<BatchOptions, "parallel" | "concurrency" | "progressCallback">,
  result: BatchResult<T>,
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  switch (options.handleErrors) {
    case "throw":
      throw errorObj;

    case "default":
      if (options.defaultValue !== undefined) {
        result.successful.push({
          ...item,
          normalized: options.defaultValue,
          normalizedUnit: item.unit,
        });
      } else {
        result.failed.push({
          item,
          error: errorObj,
          reason: errorObj.message,
        });
      }
      break;

    case "skip":
    default:
      result.failed.push({
        item,
        error: errorObj,
        reason: errorObj.message,
      });
      break;
  }
}

/**
 * Build normalized unit string
 */
function buildNormalizedUnit(
  original: string,
  currency?: string,
  magnitude?: Scale,
  timeScale?: TimeScale,
): string {
  const parsed = parseUnit(original);
  const parts: string[] = [];

  // Currency
  if (currency) {
    parts.push(currency);
  } else if (parsed.currency) {
    parts.push(parsed.currency);
  }

  // Magnitude
  if (magnitude) {
    parts.push(magnitude);
  } else if (parsed.scale) {
    parts.push(parsed.scale);
  }

  // Time scale
  if (timeScale) {
    parts.push(`per ${timeScale}`);
  } else if (parsed.timeScale) {
    parts.push(`per ${parsed.timeScale}`);
  }

  return parts.length > 0 ? parts.join(" ") : original;
}

/**
 * Chunk array for parallel processing
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Create batch processor with retry logic.
 *
 * @param defaultOptions Default processing options
 * @returns Helpers to process and processWithRetry
 */
export function createBatchProcessor<T extends BatchItem>(
  defaultOptions: BatchOptions,
): {
  process: (
    items: T[],
    overrides?: Partial<BatchOptions>,
  ) => Promise<BatchResult<T>>;
  processWithRetry: (
    items: T[],
    maxRetries?: number,
    overrides?: Partial<BatchOptions>,
  ) => Promise<BatchResult<T>>;
} {
  return {
    process: (items, overrides) => {
      return processBatch(items, { ...defaultOptions, ...overrides });
    },

    processWithRetry: async (items, maxRetries = 3, overrides) => {
      let lastError: Error | null = null;
      let retryItems = items;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const result = await processBatch(retryItems, {
            ...defaultOptions,
            ...overrides,
          });

          // If all successful, return
          if (result.failed.length === 0) {
            return result;
          }

          // Retry only failed items
          if (attempt < maxRetries - 1) {
            retryItems = result.failed.map((f) => f.item);
            console.log(
              `Retrying ${retryItems.length} failed items (attempt ${
                attempt + 2
              }/${maxRetries})`,
            );
          } else {
            return result;
          }
        } catch (error) {
          lastError = error as Error;

          if (attempt < maxRetries - 1) {
            // Exponential backoff
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, attempt) * 1000)
            );
          }
        }
      }

      throw lastError || new Error("Batch processing failed after retries");
    },
  };
}

/**
 * Stream process large datasets
 */
export async function* streamProcess<T extends BatchItem>(
  items: AsyncIterable<T> | Iterable<T>,
  options: BatchOptions = {},
): AsyncGenerator<T & { normalized: number; normalizedUnit: string }> {
  for await (const item of items) {
    try {
      const result = processItem(item, options);
      if (result) {
        yield {
          ...item,
          normalized: result.normalized,
          normalizedUnit: result.normalizedUnit,
        };
      }
    } catch (error) {
      if (options.handleErrors === "throw") {
        throw error;
      }
      // Skip on error for streaming
      console.warn(`Skipping item due to error: ${error}`);
    }
  }
}
