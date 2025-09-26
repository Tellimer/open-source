/**
 * Pure batch processing functions for V2 normalization
 *
 * These functions handle the actual data transformation without
 * state machine concerns. They are reusable across domains.
 */

import type { FXTable, Scale, TimeScale } from "../shared/types.ts";
import type { MonetaryBatchOptions } from "../shared/types.ts";
import { processBatch } from "../shared/batch.ts";
import { enhanceExplainWithFXSource } from "../shared/explain.ts";
import { parseUnit } from "../../units/units.ts";
import { detectScale } from "../../scale/scale.ts";
import { SCALE_MAP } from "../../patterns.ts";

// ============================================================================
// Monetary Domain Batch Processing
// ============================================================================

/**
 * Process monetary items with currency/scale/time normalization
 */
export async function processMonetaryBatch(
  items: any[],
  options: MonetaryBatchOptions,
): Promise<any[]> {
  if (!items || items.length === 0) {
    return [];
  }

  // Use existing V1 batch processing logic
  const result = await processBatch(items, {
    toCurrency: options.toCurrency,
    toMagnitude: options.toMagnitude,
    toTimeScale: options.toTimeScale,
    fx: options.fx,
    explain: options.explain,
  });

  const processed = result.successful;

  // Map V1 field names to V2 field names and enhance explain metadata
  return processed.map((item: any) => {
    const mappedItem = {
      ...item,
      normalizedValue: item.normalized, // Map V1 'normalized' to V2 'normalizedValue'
    };

    // Enhance explain metadata with FX source information if available
    if (options.explain && options.fxSource && mappedItem.explain?.fx) {
      const asOf = mappedItem.explain.fx.asOf;
      mappedItem.explain = enhanceExplainWithFXSource(
        mappedItem.explain,
        options.fxSource as "live" | "fallback",
        options.fxSourceId,
        asOf,
      );
    }

    return mappedItem;
  });
}

// ============================================================================
// Counts Domain Processing
// ============================================================================

/**
 * Normalize counts to "ones" unit
 */
export function processCountsBatch(items: any[]): any[] {
  if (!items || items.length === 0) {
    return [];
  }

  return items.map((item) => {
    // Parse the unit to detect magnitude
    const parsed = parseUnit(item.unit || "");

    // Apply magnitude expansion for counts
    let normalizedValue = item.value;
    if (parsed.scale) {
      // Get the multiplier for the scale (e.g., "millions" -> 1e6)
      const multiplier = SCALE_MAP[parsed.scale] || 1;
      normalizedValue = item.value * multiplier;
    }

    return {
      ...item,
      normalizedValue,
      normalizedUnit: "ones",
      qualityScore: 1.0,
      explain: {
        explainVersion: "v2",
        originalUnit: item.unit,
        normalizedUnit: "ones",
        conversionApplied: !!parsed.scale,
        conversionSummary: parsed.scale
          ? `Expanded ${parsed.scale} to ones (×${
            SCALE_MAP[parsed.scale] || 1
          })`
          : "Normalized to count units (ones)",
        domain: "counts",
      },
    };
  });
}

// ============================================================================
// Percentages Domain Processing
// ============================================================================

/**
 * Pass through percentages with validation
 */
export function processPercentagesBatch(items: any[]): any[] {
  if (!items || items.length === 0) {
    return [];
  }

  return items.map((item) => {
    // Normalize percentage unit formats to standard forms
    const originalUnit = item.unit || "";
    let normalizedUnit = originalUnit;
    let conversionApplied = false;
    let conversionSummary = "Percentage values passed through unchanged";

    // Standardize percentage unit formats
    if (originalUnit.toLowerCase() === "percent") {
      normalizedUnit = "%";
      conversionApplied = true;
      conversionSummary = "Standardized percentage format";
    } else if (originalUnit.toLowerCase().includes("percent of gdp")) {
      normalizedUnit = "% of GDP";
      conversionApplied = true;
      conversionSummary = "Standardized percentage of GDP format";
    } else if (originalUnit.toLowerCase() === "percentage points") {
      normalizedUnit = "pp";
      conversionApplied = true;
      conversionSummary = "Standardized percentage points format";
    } else if (originalUnit.toLowerCase() === "basis points") {
      normalizedUnit = "bps";
      conversionApplied = true;
      conversionSummary = "Standardized basis points format";
    }

    return {
      ...item,
      normalizedValue: item.value,
      normalizedUnit,
      qualityScore: 1.0,
      explain: {
        explainVersion: "v2",
        originalUnit,
        normalizedUnit,
        conversionApplied,
        conversionSummary,
        domain: "percentages",
      },
    };
  });
}

// ============================================================================
// Indices Domain Processing
// ============================================================================

/**
 * Pass through indices with metadata
 */
export function processIndicesBatch(items: any[]): any[] {
  if (!items || items.length === 0) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    normalizedValue: item.value,
    normalizedUnit: item.unit,
    qualityScore: 1.0,
    explain: {
      explainVersion: "v2",
      originalUnit: item.unit,
      normalizedUnit: item.unit,
      conversionApplied: false,
      conversionSummary: "Index values preserved in original units",
      domain: "indices",
    },
  }));
}

// ============================================================================
// Ratios Domain Processing
// ============================================================================

/**
 * Pass through ratios with validation
 */
export function processRatiosBatch(items: any[]): any[] {
  if (!items || items.length === 0) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    normalizedValue: item.value,
    normalizedUnit: item.unit,
    qualityScore: 1.0,
    explain: {
      explainVersion: "v2",
      originalUnit: item.unit,
      normalizedUnit: item.unit,
      conversionApplied: false,
      conversionSummary: "Ratio values maintained in original form",
      domain: "ratios",
    },
  }));
}

// ============================================================================
// Physical Domain Processing
// ============================================================================

// Legacy export - redirects to unified commodities handler
export const processEnergyBatch = processCommoditiesBatch;

/**
 * Pass through commodities units
 */
export function processCommoditiesBatch(items: any[]): any[] {
  if (!items || items.length === 0) {
    return [];
  }

  return items.map((item) => {
    // Pass through commodities units without modification in V2
    return {
      ...item,
      normalizedValue: item.value,
      normalizedUnit: item.unit,
      qualityScore: 1.0,
      explain: {
        explainVersion: "v2",
        originalUnit: item.unit,
        normalizedUnit: item.unit,
        conversionApplied: false,
        conversionSummary: "Commodity units preserved in original form",
        domain: "commodities",
      },
    };
  });
}

// Legacy export - redirects to unified commodities handler
export const processAgricultureBatch = processCommoditiesBatch;

// Legacy export - redirects to unified commodities handler
export const processMetalsBatch = processCommoditiesBatch;

/**
 * Pass through crypto units
 */
export function processCryptoBatch(items: any[]): any[] {
  if (!items || items.length === 0) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    normalizedValue: item.value,
    normalizedUnit: item.unit,
    qualityScore: 1.0,
    explain: {
      explainVersion: "v2",
      originalUnit: item.unit,
      normalizedUnit: item.unit,
      conversionApplied: false,
      conversionSummary: "Cryptocurrency units preserved in original form",
      domain: "crypto",
    },
  }));
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Merge results from multiple domain batches
 */
export function mergeResults(resultArrays: any[][]): any[] {
  return resultArrays.flat();
}

/**
 * Restore original order based on item IDs
 */
export function restoreOrder(results: any[], originalOrder: string[]): any[] {
  const resultMap = new Map(results.map((item) => [item.id, item]));
  return originalOrder.map((id) => resultMap.get(id)).filter(Boolean);
}

/**
 * Add domain metadata to processed items
 */
export function addDomainMetadata(items: any[], domain: string): any[] {
  return items.map((item) => ({
    ...item,
    domain,
    processedBy: `v2-${domain}`,
  }));
}

/**
 * Calculate quality scores based on processing success
 */
export function calculateQualityScores(items: any[]): any[] {
  return items.map((item) => {
    let qualityScore = 1.0;

    // Reduce quality for missing data
    if (!item.normalizedValue && item.normalizedValue !== 0) {
      qualityScore -= 0.3;
    }

    if (!item.normalizedUnit) {
      qualityScore -= 0.2;
    }

    // Ensure minimum quality
    qualityScore = Math.max(0.1, qualityScore);

    return {
      ...item,
      qualityScore,
    };
  });
}
