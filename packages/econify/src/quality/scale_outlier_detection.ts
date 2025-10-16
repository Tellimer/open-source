/**
 * Scale Outlier Detection
 *
 * Detects values that are on a fundamentally different scale than the majority,
 * indicating data quality issues (e.g., some values stored as actual counts,
 * others as thousands, despite having the same metadata label).
 *
 * Use case: Tourist Arrivals where some countries store "520,394 persons"
 * labeled as "Thousands" while others store "6,774 thousands" correctly.
 */

export interface ScaleOutlierResult {
  hasOutliers: boolean;
  outlierIds: string[];
  reason: string;
  dominantMagnitude?: number;
  distribution: Record<number, number>;
  outlierDetails?: Array<{
    id: string;
    value: number;
    magnitude: number;
    magnitudeDifference: number;
  }>;
}

export interface ScaleOutlierOptions {
  /** Minimum percentage of values that must cluster at same magnitude (default: 0.6 = 60%) */
  clusterThreshold?: number;
  /** Minimum magnitude difference to flag as outlier (default: 2 = 100x different) */
  magnitudeDifferenceThreshold?: number;
  /** Enable detailed outlier information (default: false) */
  includeDetails?: boolean;
}

/**
 * Detect scale outliers by analyzing order of magnitude clustering
 *
 * Logic:
 * 1. Calculate order of magnitude for each value (log10)
 * 2. Find the dominant magnitude where most values cluster
 * 3. Flag values that are 2+ magnitudes away (100x+ different) as outliers
 *
 * Example:
 * - Brazil: 6.77M → magnitude 6
 * - Vietnam: 1.5M → magnitude 6
 * - Armenia: 520M → magnitude 8 ← OUTLIER (2 magnitudes away from cluster)
 */
export function detectScaleOutliers(
  items: Array<{ id: string; normalized: number }>,
  options: ScaleOutlierOptions = {},
): ScaleOutlierResult {
  const {
    clusterThreshold = 0.6,
    magnitudeDifferenceThreshold = 2,
    includeDetails = false,
  } = options;

  if (items.length === 0) {
    return {
      hasOutliers: false,
      outlierIds: [],
      reason: "No items to analyze",
      distribution: {},
    };
  }

  // Skip outlier detection if too few items (need at least 3 for meaningful clustering)
  if (items.length < 3) {
    return {
      hasOutliers: false,
      outlierIds: [],
      reason: "Too few items for outlier detection (need at least 3)",
      distribution: {},
    };
  }

  // Step 1: Calculate order of magnitude for each value
  const magnitudes = items.map((item) => {
    const absValue = Math.abs(item.normalized);
    // Handle zero and very small values
    if (absValue === 0 || !isFinite(absValue)) {
      return { id: item.id, value: item.normalized, magnitude: -Infinity };
    }
    return {
      id: item.id,
      value: item.normalized,
      magnitude: Math.floor(Math.log10(absValue)),
    };
  }).filter((m) => m.magnitude !== -Infinity); // Exclude zero/invalid values

  if (magnitudes.length === 0) {
    return {
      hasOutliers: false,
      outlierIds: [],
      reason: "No valid values to analyze",
      distribution: {},
    };
  }

  // Step 2: Count values at each magnitude
  const magnitudeCounts: Record<number, number> = {};
  magnitudes.forEach((m) => {
    magnitudeCounts[m.magnitude] = (magnitudeCounts[m.magnitude] || 0) + 1;
  });

  // Step 3: Find the dominant magnitude cluster
  const sortedMagnitudes = Object.entries(magnitudeCounts)
    .sort((a, b) => b[1] - a[1]); // Sort by count descending

  if (sortedMagnitudes.length === 0) {
    return {
      hasOutliers: false,
      outlierIds: [],
      reason: "No magnitude clusters found",
      distribution: magnitudeCounts,
    };
  }

  const [dominantMagnitudeStr, dominantCount] = sortedMagnitudes[0];
  const dominantMagnitude = parseInt(dominantMagnitudeStr);

  // Step 4: Check if we have a clear majority cluster
  const clusterPercentage = dominantCount / magnitudes.length;

  if (clusterPercentage < clusterThreshold) {
    return {
      hasOutliers: false,
      outlierIds: [],
      reason: `No clear majority cluster (${
        (clusterPercentage * 100).toFixed(0)
      }% < ${(clusterThreshold * 100).toFixed(0)}% threshold)`,
      distribution: magnitudeCounts,
    };
  }

  // Step 5: Flag values that are too far from the dominant magnitude
  const outliers = magnitudes.filter((m) => {
    const difference = Math.abs(m.magnitude - dominantMagnitude);
    return difference >= magnitudeDifferenceThreshold;
  });

  const result: ScaleOutlierResult = {
    hasOutliers: outliers.length > 0,
    outlierIds: outliers.map((o) => o.id),
    reason: outliers.length > 0
      ? `${outliers.length} value(s) are ${
        Math.pow(10, magnitudeDifferenceThreshold)
      }x+ different from majority scale (${dominantCount}/${magnitudes.length} at magnitude ${dominantMagnitude})`
      : "No outliers detected",
    dominantMagnitude,
    distribution: magnitudeCounts,
  };

  if (includeDetails && outliers.length > 0) {
    result.outlierDetails = outliers.map((o) => ({
      id: o.id,
      value: o.value,
      magnitude: o.magnitude,
      magnitudeDifference: Math.abs(o.magnitude - dominantMagnitude),
    }));
  }

  return result;
}

/**
 * Helper to format scale outlier results for logging/display
 */
export function formatScaleOutlierResult(result: ScaleOutlierResult): string {
  if (!result.hasOutliers) {
    return `✓ No scale outliers detected. ${result.reason}`;
  }

  let message = `⚠️ Scale outliers detected: ${result.reason}\n`;
  message += `  Outliers: ${result.outlierIds.join(", ")}\n`;
  message += `  Magnitude distribution: ${JSON.stringify(result.distribution)}`;

  if (result.outlierDetails) {
    message += `\n  Details:`;
    result.outlierDetails.forEach((d) => {
      message += `\n    - ${d.id}: ${
        d.value.toExponential(2)
      } (magnitude ${d.magnitude}, ${d.magnitudeDifference} orders different)`;
    });
  }

  return message;
}
