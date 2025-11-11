/**
 * Batch processing with validation and error handling
 */

import { normalizeValue } from "../normalization/normalization.ts";
import { buildExplainMetadata } from "../normalization/explain.ts";
import { CURRENCY_CODES, parseUnit } from "../units/units.ts";
import { assessDataQuality, type QualityScore } from "../quality/quality.ts";
import { getScale } from "../scale/scale.ts";
import { parseWithCustomUnits } from "../custom/custom_units.ts";
import { allowsTimeConversion } from "../normalization/indicator_type_rules.ts";
import type {
  Explain,
  FXTable,
  ReportingFrequency,
  Scale,
  TimeScale,
  UnitType,
} from "../types.ts";

/**
 * Normalize scale string from database to Scale type
 */
function normalizeScale(scale?: string | null): Scale | null {
  if (!scale || scale.trim() === "") return null;
  const normalized = scale.toLowerCase().trim();
  switch (normalized) {
    case "ones":
      return "ones";
    case "thousands":
      return "thousands";
    case "millions":
      return "millions";
    case "billions":
      return "billions";
    case "trillions":
      return "trillions";
    default:
      return null;
  }
}

/**
 * Normalize time scale string from database to TimeScale type
 */
/**
 * Normalize time scale from database reporting_frequency or periodicity field.
 * Handles both database values (annual, quarterly, monthly) and descriptive variants.
 *
 * Note: "point-in-time" is a special database value indicating snapshot data
 * with no regular frequency. We return null for it since it doesn't map to a TimeScale.
 */
function normalizeTimeScale(periodicity?: string | null): TimeScale | null {
  if (!periodicity || periodicity.trim() === "") return null;
  const normalized = periodicity.toLowerCase().trim();

  // Handle special case: point-in-time data has no time scale
  if (normalized === "point-in-time") return null;

  switch (normalized) {
    case "yearly":
    case "annual":
      return "year";
    case "quarterly":
      return "quarter";
    case "monthly":
      return "month";
    case "weekly":
      return "week";
    case "daily":
      return "day";
    case "hourly":
      return "hour";
    // Also handle the enum values directly
    case "year":
      return "year";
    case "quarter":
      return "quarter";
    case "month":
      return "month";
    case "week":
      return "week";
    case "day":
      return "day";
    case "hour":
      return "hour";
    default:
      return null;
  }
}

/**
 * Normalize currency code from database
 * - Only accept known ISO currency codes; otherwise treat as non-monetary (null)
 */
/**
 * Normalize currency code from database currency_code field.
 * Validates against known currency codes and returns uppercase ISO code.
 */
function normalizeCurrency(currency?: string | null): string | null {
  if (!currency || currency.trim() === "") return null;
  const code = currency.trim().toUpperCase();
  return CURRENCY_CODES.has(code) ? code : null;
}

/**
 * BatchItem represents economic indicator data with metadata from database.
 *
 * Database columns are provided by the classification workflow and should be
 * treated as authoritative over unit string parsing.
 *
 * Example DB row to BatchItem mapping:
 * ```
 * DB: AFGHANISTACONSPE | Consumer Spending | ... | AFN Million | Millions | Yearly |
 *     AFN | flow | period-total | higher-is-positive | currency-amount | annual | true
 *
 * BatchItem: {
 *   id: "AFGHANISTACONSPE",
 *   name: "Consumer Spending",
 *   value: 1500,
 *   unit: "AFN Million",
 *   scale: "Millions",           // DB: scale column
 *   currency_code: "AFN",         // DB: currency_code column
 *   indicator_type: "flow",       // DB: type column
 *   temporal_aggregation: "period-total",  // DB: temporal_aggregation column
 *   unit_type: "currency-amount", // DB: unit_type column
 *   reporting_frequency: "annual",// DB: reporting_frequency column
 *   is_currency_denominated: true // DB: is_currency_denominated column (last)
 * }
 * ```
 */
export interface BatchItem {
  id?: string | number;
  name?: string; // Indicator name for classification (e.g., "GDP", "Balance of Trade")
  value: number;
  unit: string;

  /** Explicit metadata fields from database - PRIORITIZE these over unit string parsing */

  // Time dimension (from reporting_frequency database column)
  // Maps database values: "annual" | "quarterly" | "monthly" | "weekly" | "daily" | "point-in-time"
  periodicity?: string; // Accepts string for backward compatibility, use reporting_frequency for new code
  reporting_frequency?: ReportingFrequency | string; // From database - accepts string for flexibility

  // Magnitude/scale (from scale column or parsed from units)
  scale?: string; // "Millions", "Billions", "Thousands" - accepts string for flexibility

  // Currency (from currency_code column)
  currency_code?: string; // ISO currency codes: "USD", "SAR", "XOF", etc.

  // Unit semantic type (from unit_type column) - helps avoid incorrect parsing
  unit_type?: UnitType | string; // From database - accepts string for flexibility: "count" | "unknown" | "currency-amount" | "physical" | "percentage" | "index"

  /** Classification from @tellimer/classify batch workflow - AUTHORITATIVE metadata */

  // Indicator behavior classification (from "type" DB column)
  indicator_type?: string; // "flow" | "stock" | "percentage" | "ratio" | "rate" | "index" | etc.

  // Time aggregation behavior (from "temporal_aggregation" DB column)
  temporal_aggregation?: string; // "point-in-time" | "period-rate" | "period-cumulative" | "period-average" | "period-total" | "not-applicable"

  // Visual/UI hint (from "heat_map_orientation" DB column - not used in normalization)
  heat_map_orientation?: string; // "higher-is-positive" | "neutral" | "lower-is-positive"

  // Currency conversion control (from "is_currency_denominated" DB column - LAST column in DB)
  // THIS IS THE DOMINANT CHECK - controls whether to apply FX conversion
  // Set by classification workflow based on indicator semantics
  is_currency_denominated?: boolean; // true = apply FX conversion, false = skip FX conversion

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
  successful: Array<
    T & { normalized: number; normalizedUnit: string; explain?: Explain }
  >;
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
    ...restOptions
  } = options;

  // Include handleErrors in normalization options for error handling
  const normalizationOptions = {
    ...restOptions,
    handleErrors,
  };

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
    const promises = chunk.map((item) =>
      Promise.resolve().then(() => processItem(item, options))
    );

    // For handleErrors: "throw", use Promise.all to fail fast
    // For other modes, use Promise.allSettled to collect all results
    if (options.handleErrors === "throw") {
      const results = await Promise.all(promises);
      results.forEach((value, idx) => {
        const item = chunk[idx];
        if (value) {
          result.successful.push({
            ...item,
            normalized: value.normalized,
            normalizedUnit: value.normalizedUnit,
            ...(value.explain && { explain: value.explain }),
          });
        }
        processed++;
        if (progressCallback) {
          progressCallback((processed / items.length) * 100);
        }
      });
    } else {
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
/**
 * Process a single batch item through normalization pipeline.
 *
 * FIELD PRIORITY SYSTEM (Database First):
 * ========================================
 * This function prioritizes structured metadata from the database over unit string parsing:
 *
 * 1. TIME DIMENSION:
 *    - reporting_frequency (DB column) → PRIMARY SOURCE
 *    - periodicity field → fallback
 *    - parseUnit(unit).timeScale → last resort
 *
 * 2. CURRENCY:
 *    - is_currency_denominated flag → controls whether to look for currency
 *    - unit_type → helps identify non-currency types (percentage, physical)
 *    - currency_code (DB column) → PRIMARY SOURCE for currency
 *    - parseUnit(unit).currency → fallback
 *
 * 3. MAGNITUDE/SCALE:
 *    - scale (DB column) → PRIMARY SOURCE
 *    - parseUnit(unit).scale → fallback
 *    - Exception: Chinese units (hundred-millions) prefer parsed value
 *
 * 4. INDICATOR BEHAVIOR:
 *    - temporal_aggregation (DB) → controls time conversion rules
 *    - indicator_type (DB) → fallback for time conversion
 *
 * This approach ensures data from @tellimer/classify is authoritative.
 */
function processItem<T extends BatchItem>(
  item: T,
  options: Omit<BatchOptions, "parallel" | "concurrency" | "progressCallback">,
): { normalized: number; normalizedUnit: string; explain?: Explain } | null {
  try {
    // PRIORITY 1: Use database fields when available (reporting_frequency, currency_code, etc.)
    // PRIORITY 2: Parse unit string as fallback for missing metadata
    const parsed = parseUnit(item.unit);

    // Extract metadata from @tellimer/classify package
    const indicatorName = (item as unknown as { name?: string }).name;
    const indicatorType = (item as unknown as { indicator_type?: string })
      .indicator_type;

    // UNIT_TYPE from database can help avoid incorrect parsing
    // e.g., if unit_type="percentage", we know it's not a currency amount
    // Available values: "count" | "unknown" | "currency-amount" | "physical" | "percentage" | "index"
    const unitType = item.unit_type;

    // Determine if this is count/volume data (avoid treating as currency)
    const isCountData = indicatorType === "count" || indicatorType === "volume";

    // Check custom units if standard parsing returns unknown
    const custom = parseWithCustomUnits(item.unit);
    if (parsed.category === "unknown" && !custom) {
      // Skip unknown units instead of throwing error
      return null;
    }

    // PRIORITY SYSTEM: Database fields first, then unit string parsing
    // This ensures structured data from @tellimer/classify takes precedence

    const isCurrencyDenominated = (item as unknown as {
      is_currency_denominated?: boolean;
    }).is_currency_denominated;

    // CURRENCY CONVERSION CONTROL
    // ============================
    // is_currency_denominated (from DB) is the DOMINANT CHECK set by classification workflow
    // It authoritatively controls whether FX conversion should be applied
    //
    // DECISION HIERARCHY:
    // 1. is_currency_denominated flag → AUTHORITATIVE (from classification workflow)
    //    - true:  Apply FX conversion (value is in currency units)
    //    - false: Skip FX conversion (even if unit text contains currency codes)
    //    - undefined: Fall back to heuristics (unit_type, parsing)
    //
    // 2. unit_type → Validation hint only
    //    - "currency-amount": Suggests currency (but defer to is_currency_denominated)
    //    - "percentage", "physical", "index": Suggests non-currency
    //
    // 3. currency_code (from DB) → Which currency if conversion is enabled
    //
    // 4. parseUnit(unit) → Fallback parsing if DB fields missing
    //
    // KEY EXAMPLES:
    // - FX Rate "PKR/USD": is_currency_denominated=false (don't convert ratio)
    // - GDP "USD Million": is_currency_denominated=true (convert USD→target currency)
    // - Unemployment "%": is_currency_denominated=false (no currency)

    const shouldSkipCurrency = isCurrencyDenominated === false;

    // Additional validation: warn if unit_type conflicts with is_currency_denominated
    if (
      typeof console !== "undefined" && unitType &&
      isCurrencyDenominated !== undefined
    ) {
      const unitTypeImpliesCurrency = unitType === "currency-amount";
      if (unitTypeImpliesCurrency && isCurrencyDenominated === false) {
        console.warn(
          `⚠️  Data quality issue: unit_type="${unitType}" but is_currency_denominated=false for item ${
            item.id || "unknown"
          }. ` +
            `Using is_currency_denominated as authoritative.`,
        );
      }
    }

    const effectiveCurrency = shouldSkipCurrency
      ? null
      : (normalizeCurrency(item.currency_code) || parsed.currency);

    // SCALE/MAGNITUDE: Database scale first, with special case for Chinese units
    // SPECIAL CASE: If unit text contains "hundred million" (亿), prefer parsed scale
    // This handles Chinese accounting units where database may incorrectly say "Millions"
    const effectiveScale = parsed.scale === "hundred-millions"
      ? parsed.scale
      : (normalizeScale(item.scale) || parsed.scale);

    // TIME SCALE: Use reporting_frequency from database FIRST (maps to periodicity)
    // Fallback to periodicity field, then unit string parsing as last resort
    // This ensures the dataset's reporting cadence (from DB) is preferred over guessing from unit text
    const reportingFreq = (item as unknown as { reporting_frequency?: string })
      .reporting_frequency;
    const effectiveTimeScale = normalizeTimeScale(reportingFreq) ||
      normalizeTimeScale(item.periodicity) ||
      parsed.timeScale;

    // Determine an explicit target magnitude for consistent unit strings (compute before normalization)
    const targetMagnitude: Scale | undefined = options.toMagnitude ??
      effectiveScale ?? getScale(item.unit);

    // Get temporal_aggregation from classify package
    const temporalAggregation = (item as unknown as {
      temporal_aggregation?: string;
    }).temporal_aggregation;

    // Normalize value using enhanced metadata
    const normalized = normalizeValue(item.value, item.unit, {
      toCurrency: options.toCurrency,
      toMagnitude: targetMagnitude,
      toTimeScale: options.toTimeScale,
      fx: options.fx,
      // Pass explicit metadata for more accurate processing
      explicitCurrency: effectiveCurrency,
      explicitScale: effectiveScale,
      explicitTimeScale: effectiveTimeScale,
      indicatorName,
      indicatorType, // Pass indicator_type from @tellimer/classify
      temporalAggregation, // Pass temporal_aggregation from @tellimer/classify
    });

    // Build explain metadata first if requested (to get accurate normalized unit from custom domains)
    let explain: Explain | undefined;
    if (options.explain) {
      explain = buildExplainMetadata(item.value, item.unit, normalized, {
        toCurrency: options.toCurrency,
        toMagnitude: targetMagnitude,
        toTimeScale: options.toTimeScale,
        fx: options.fx,
        // Pass explicit metadata for accurate explain generation
        explicitCurrency: effectiveCurrency,
        explicitScale: effectiveScale,
        explicitTimeScale: effectiveTimeScale,
        indicatorName,
        indicatorType, // Pass indicator_type from @tellimer/classify
        temporalAggregation, // Pass temporal_aggregation from @tellimer/classify
      });

      // Enhance with FX source information if available
      if (explain.fx && options.fxSource) {
        explain.fx.source = options.fxSource;
        explain.fx.sourceId = options.fxSourceId;
      }
    }

    // Build normalized unit string
    // If explain metadata is available, use its normalized unit (which respects custom domains)
    let normalizedUnit: string;
    if (explain?.units?.normalizedUnit) {
      normalizedUnit = explain.units.normalizedUnit;
    } else {
      const isPercentage = parsed.category === "percentage" ||
        custom?.category === "percentage";
      const isIndex = parsed.category === "index" ||
        custom?.category === "index";
      if (isPercentage) {
        // Preserve percentage unit exactly; no currency, magnitude, or time scale applied
        normalizedUnit = "%";
      } else if (isIndex) {
        // Preserve index label - indexes are dimensionless but should be labeled as such
        normalizedUnit = parsed.normalized || custom?.normalized || "index";
      } else if (isCountData) {
        const scale = targetMagnitude ?? "ones";
        normalizedUnit = scale === "ones" ? "ones" : titleCase(scale);
      } else {
        // Choose label currency for units:
        // - If FX would occur (known currency, target set, fx available and different), use target currency
        // - Else, use known effective currency (if any)
        const effectiveCurrencyKnown = (effectiveCurrency &&
            effectiveCurrency !== "UNKNOWN")
          ? effectiveCurrency
          : undefined;
        const willConvert = !shouldSkipCurrency &&
          !!effectiveCurrencyKnown &&
          !!options.toCurrency &&
          !!options.fx &&
          effectiveCurrencyKnown !== options.toCurrency;
        const labelCurrency = willConvert
          ? options.toCurrency
          : effectiveCurrencyKnown;
        normalizedUnit = buildNormalizedUnit(
          item.unit,
          labelCurrency,
          targetMagnitude,
          options.toTimeScale,
          indicatorType,
          temporalAggregation,
        );
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
function titleCase(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

function buildNormalizedUnit(
  original: string,
  currency?: string,
  magnitude?: Scale,
  timeScale?: TimeScale,
  indicatorType?: string | null,
  temporalAggregation?: string | null,
): string {
  const parsed = parseUnit(original);

  // Special-case placeholder currencies (e.g., "National currency"): preserve original label,
  // add magnitude if any, and append time dimension when appropriate.
  if (parsed.currency === "UNKNOWN") {
    const mag = magnitude ?? parsed.scale ?? getScale(original);
    const ts = timeScale ?? parsed.timeScale;
    const parts: string[] = [original];
    if (mag && mag !== "ones") parts.push(String(mag));
    let out = parts.join(" ");
    const shouldIncludeTime = ts &&
      allowsTimeConversion(indicatorType, temporalAggregation);
    if (shouldIncludeTime) {
      out = `${out}${out ? " " : ""}per ${ts}`;
    }
    return out || original;
  }

  // Sanitize provided currency: ignore placeholder values
  const provided = currency && currency.toUpperCase() !== "UNKNOWN"
    ? currency
    : undefined;
  const cur = (provided || parsed.currency)?.toUpperCase();
  // Fallback to detect scale from unit text when parser misses singular forms (e.g., "Thousand")
  const mag = magnitude ?? parsed.scale ?? getScale(original);
  const ts = timeScale ?? parsed.timeScale;

  const parts: string[] = [];

  // For count data, return magnitude or "ones"
  if (parsed.category === "count") {
    return mag && mag !== "ones" ? titleCase(mag) : "ones";
  }

  // For physical/energy/temperature units, preserve the base unit
  if (
    parsed.category === "physical" || parsed.category === "energy" ||
    parsed.category === "temperature"
  ) {
    if (parsed.normalized) {
      parts.push(parsed.normalized);
    }
    // Add magnitude if present (e.g., "thousand tonnes")
    if (mag && mag !== "ones") {
      parts.unshift(String(mag));
    }
  } else {
    // For monetary units, build from currency and magnitude
    if (cur) parts.push(cur);
    if (mag && mag !== "ones") parts.push(String(mag)); // keep lowercase per tests
  }

  let out = parts.join(" ");

  // Check if time dimension should be included
  // Use allowsTimeConversion to respect temporal_aggregation
  const shouldIncludeTime = ts &&
    allowsTimeConversion(indicatorType, temporalAggregation);

  if (shouldIncludeTime) {
    out = `${out}${out ? " " : ""}per ${ts}`;
  }

  return out || original;
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
