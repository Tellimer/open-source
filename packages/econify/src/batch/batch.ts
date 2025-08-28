/**
 * Batch processing with validation and error handling
 */

import { normalizeValue } from "../normalization/normalization.ts";
import { parseUnit } from "../units/units.ts";
import { assessDataQuality, type QualityScore } from "../quality/quality.ts";
import type { FXTable, Scale, TimeScale } from "../types.ts";

export interface BatchItem {
  id?: string | number;
  value: number;
  unit: string;
  metadata?: Record<string, any>;
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
}

export interface BatchResult<T = BatchItem> {
  successful: Array<T & { normalized: number; normalizedUnit: string }>;
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
 * Process batch of economic data
 */
export async function processBatch<T extends BatchItem>(
  items: T[],
  options: BatchOptions = {}
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
      averageTime: 0
    }
  };

  // 1. Validation phase
  if (validate) {
    const validationResult = await validateBatch(items, qualityThreshold);
    result.quality = validationResult.quality;
    
    if (validationResult.quality.overall < qualityThreshold) {
      if (handleErrors === "throw") {
        throw new Error(
          `Batch quality score ${validationResult.quality.overall} below threshold ${qualityThreshold}`
        );
      }
      
      // Mark low-quality items for skipping
      for (const item of validationResult.invalidItems) {
        result.skipped.push({
          item,
          reason: "Failed quality validation"
        });
      }
    }
  }

  // 2. Processing phase
  const itemsToProcess = items.filter(
    item => !result.skipped.some(s => s.item === item)
  );

  if (parallel) {
    await processInParallel(
      itemsToProcess,
      result,
      normalizationOptions,
      concurrency,
      progressCallback
    );
  } else {
    await processSequentially(
      itemsToProcess,
      result,
      normalizationOptions,
      progressCallback
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
async function validateBatch<T extends BatchItem>(
  items: T[],
  threshold: number
): Promise<{ quality: QualityScore; invalidItems: T[] }> {
  const dataPoints = items.map(item => ({
    value: item.value,
    unit: item.unit,
    metadata: item.metadata
  }));

  const quality = assessDataQuality(dataPoints, {
    checkOutliers: true,
    checkConsistency: true,
    checkCompleteness: true
  });

  // Identify invalid items
  const invalidItems: T[] = [];
  for (const issue of quality.issues) {
    if (issue.severity === "critical" && issue.affectedData) {
      const idx = dataPoints.indexOf(issue.affectedData);
      if (idx >= 0) {
        invalidItems.push(items[idx]);
      }
    }
  }

  return { quality, invalidItems };
}

/**
 * Process items in parallel
 */
async function processInParallel<T extends BatchItem>(
  items: T[],
  result: BatchResult<T>,
  options: Omit<BatchOptions, "parallel" | "concurrency" | "progressCallback">,
  concurrency: number,
  progressCallback?: (progress: number) => void
): Promise<void> {
  const chunks = chunkArray(items, concurrency);
  let processed = 0;

  for (const chunk of chunks) {
    const promises = chunk.map(item => processItem(item, options));
    const results = await Promise.allSettled(promises);

    results.forEach((res, idx) => {
      const item = chunk[idx];
      
      if (res.status === "fulfilled" && res.value) {
        result.successful.push({
          ...item,
          normalized: res.value.normalized,
          normalizedUnit: res.value.normalizedUnit
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
async function processSequentially<T extends BatchItem>(
  items: T[],
  result: BatchResult<T>,
  options: Omit<BatchOptions, "parallel" | "concurrency" | "progressCallback">,
  progressCallback?: (progress: number) => void
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    try {
      const processed = await processItem(item, options);
      if (processed) {
        result.successful.push({
          ...item,
          normalized: processed.normalized,
          normalizedUnit: processed.normalizedUnit
        });
      }
    } catch (error) {
      handleItemError(item, error, options, result);
    }
    
    if (progressCallback) {
      progressCallback(((i + 1) / items.length) * 100);
    }
  }
}

/**
 * Process single item
 */
async function processItem<T extends BatchItem>(
  item: T,
  options: Omit<BatchOptions, "parallel" | "concurrency" | "progressCallback">
): Promise<{ normalized: number; normalizedUnit: string } | null> {
  try {
    // Parse unit
    const parsed = parseUnit(item.unit);
    if (parsed.category === "unknown") {
      throw new Error(`Unknown unit: ${item.unit}`);
    }

    // Normalize value
    const normalized = normalizeValue(item.value, item.unit, {
      toCurrency: options.toCurrency,
      toMagnitude: options.toMagnitude,
      toTimeScale: options.toTimeScale,
      fx: options.fx
    });

    // Build normalized unit string
    const normalizedUnit = buildNormalizedUnit(
      item.unit,
      options.toCurrency,
      options.toMagnitude,
      options.toTimeScale
    );

    return { normalized, normalizedUnit };
  } catch (error) {
    throw error;
  }
}

/**
 * Handle item processing error
 */
function handleItemError<T extends BatchItem>(
  item: T,
  error: any,
  options: Omit<BatchOptions, "parallel" | "concurrency" | "progressCallback">,
  result: BatchResult<T>
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
          normalizedUnit: item.unit
        });
      } else {
        result.failed.push({
          item,
          error: errorObj,
          reason: errorObj.message
        });
      }
      break;
    
    case "skip":
    default:
      result.failed.push({
        item,
        error: errorObj,
        reason: errorObj.message
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
  timeScale?: TimeScale
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
 * Create batch processor with retry logic
 */
export function createBatchProcessor<T extends BatchItem>(
  defaultOptions: BatchOptions
): {
  process: (items: T[], overrides?: Partial<BatchOptions>) => Promise<BatchResult<T>>;
  processWithRetry: (
    items: T[],
    maxRetries?: number,
    overrides?: Partial<BatchOptions>
  ) => Promise<BatchResult<T>>;
} {
  return {
    process: async (items, overrides) => {
      return processBatch(items, { ...defaultOptions, ...overrides });
    },
    
    processWithRetry: async (items, maxRetries = 3, overrides) => {
      let lastError: Error | null = null;
      let retryItems = items;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const result = await processBatch(retryItems, {
            ...defaultOptions,
            ...overrides
          });
          
          // If all successful, return
          if (result.failed.length === 0) {
            return result;
          }
          
          // Retry only failed items
          if (attempt < maxRetries - 1) {
            retryItems = result.failed.map(f => f.item);
            console.log(`Retrying ${retryItems.length} failed items (attempt ${attempt + 2}/${maxRetries})`);
          } else {
            return result;
          }
        } catch (error) {
          lastError = error as Error;
          
          if (attempt < maxRetries - 1) {
            // Exponential backoff
            await new Promise(resolve => 
              setTimeout(resolve, Math.pow(2, attempt) * 1000)
            );
          }
        }
      }
      
      throw lastError || new Error("Batch processing failed after retries");
    }
  };
}

/**
 * Stream process large datasets
 */
export async function* streamProcess<T extends BatchItem>(
  items: AsyncIterable<T> | Iterable<T>,
  options: BatchOptions = {}
): AsyncGenerator<T & { normalized: number; normalizedUnit: string }> {
  for await (const item of items) {
    try {
      const result = await processItem(item, options);
      if (result) {
        yield {
          ...item,
          normalized: result.normalized,
          normalizedUnit: result.normalizedUnit
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