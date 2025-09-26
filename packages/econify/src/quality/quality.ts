/**
 * Data quality assessment and scoring
 */

import { parseUnit } from "../units/units.ts";

import type { IndicatorType } from "../types.ts";

/** Input data point for quality checks. */
export interface DataPoint {
  value: number;
  unit: string;
  timestamp?: Date;
  source?: string;
  indicatorName?: string;
  metadata?: Record<string, unknown>;
}

/** Aggregated data quality score and breakdown. */
export interface QualityScore {
  overall: number; // 0-100
  dimensions: {
    completeness: number;
    consistency: number;
    validity: number;
    accuracy: number;
    timeliness: number;
    uniqueness: number;
  };
  issues: QualityIssue[];
  recommendations: string[];
}

/** Issue found during quality checks. */
export interface QualityIssue {
  severity: "critical" | "warning" | "info";
  type: string;
  message: string;
  affectedData?: unknown;
}

/** Options toggling specific quality dimensions and rules. */
export interface QualityOptions {
  checkOutliers?: boolean;
  outlierMethod?: "iqr" | "zscore" | "isolation";
  checkConsistency?: boolean;
  checkCompleteness?: boolean;
  expectedSchema?: DataSchema;
  customRules?: QualityRule[];
}

/** Optional expected schema used by quality checks. */
export interface DataSchema {
  requiredFields?: string[];
  valueRange?: { min?: number; max?: number };
  allowedUnits?: string[];
  allowedTypes?: IndicatorType[];
}

/** Custom rule definition for assessDataQuality. */
export interface QualityRule {
  name: string;
  check: (data: DataPoint) => boolean;
  severity: "critical" | "warning" | "info";
  message: string;
}

/**
 * Assess data quality for a single data point
 */
export function assessDataQuality(
  data: DataPoint | DataPoint[],
  options: QualityOptions = {},
): QualityScore {
  const dataArray = Array.isArray(data) ? data : [data];
  const issues: QualityIssue[] = [];
  const recommendations: string[] = [];

  // Initialize dimension scores
  const dimensions = {
    completeness: 100,
    consistency: 100,
    validity: 100,
    accuracy: 100,
    timeliness: 100,
    uniqueness: 100,
  };

  // Handle empty dataset
  if (dataArray.length === 0) {
    issues.push({
      severity: "critical",
      type: "no_data",
      message: "No data provided",
    });
    return {
      overall: 0,
      dimensions: {
        completeness: 0,
        consistency: 0,
        validity: 0,
        accuracy: 0,
        timeliness: 0,
        uniqueness: 0,
      },
      issues,
      recommendations: ["Provide data for analysis"],
    };
  }

  // Detect if this is cross-sectional data by checking metadata patterns
  // Cross-sectional data typically has multiple entities with same indicator
  const hasCountryMetadata = dataArray.some((d) =>
    d.metadata && (
      (d.metadata as any).country_iso ||
      (d.metadata as any).country ||
      (d.metadata as any).entity
    )
  );

  // For cross-sectional data, be more lenient with data point requirements
  const isCrossSectional = hasCountryMetadata && dataArray.length > 1;

  // Check for insufficient data (adjust for cross-sectional vs time series)
  const minDataPoints = isCrossSectional ? 1 : 3; // Cross-sectional needs only 1 point per entity
  if (dataArray.length < minDataPoints) {
    issues.push({
      severity: "warning",
      type: "insufficient_data",
      message: `Insufficient data points: ${dataArray.length}`,
    });
    dimensions.completeness = Math.max(
      0,
      100 - (minDataPoints - dataArray.length) * 35,
    );
  } else if (dataArray.length === 1) {
    // Single data point is acceptable for cross-sectional or snapshot data
    dimensions.completeness = 85; // Good score for single data point
  }

  // 1. Completeness checks
  if (options.checkCompleteness !== false) {
    const completenessResult = checkCompleteness(
      dataArray,
      options.expectedSchema,
    );
    dimensions.completeness = Math.min(
      dimensions.completeness,
      completenessResult.score,
    );
    issues.push(...completenessResult.issues);
  }

  // 2. Validity checks
  const validityResult = checkValidity(dataArray, options.expectedSchema);
  dimensions.validity = validityResult.score;
  issues.push(...validityResult.issues);

  // 3. Consistency checks
  if (options.checkConsistency !== false && dataArray.length > 1) {
    const consistencyResult = checkConsistency(dataArray);
    dimensions.consistency = consistencyResult.score;
    issues.push(...consistencyResult.issues);
  }

  // 4. Accuracy checks (outlier detection)
  if (options.checkOutliers !== false && dataArray.length > 2) {
    const outlierResult = detectOutliers(
      dataArray,
      options.outlierMethod || "iqr",
    );
    dimensions.validity = Math.min(dimensions.validity, outlierResult.score);
    issues.push(...outlierResult.issues);
  }

  // 5. Temporal checks
  const temporalResult = checkTemporal(dataArray);
  dimensions.timeliness = Math.min(dimensions.timeliness, temporalResult.score);
  issues.push(...temporalResult.issues);

  // 6. Uniqueness checks
  const uniquenessResult = checkUniqueness(dataArray);
  dimensions.uniqueness = uniquenessResult.score;
  dimensions.consistency = Math.min(
    dimensions.consistency,
    uniquenessResult.score,
  );
  issues.push(...uniquenessResult.issues);

  // 7. Source reliability checks
  const sourceResult = checkSourceReliability(dataArray);
  dimensions.accuracy = Math.min(dimensions.accuracy, sourceResult.score);
  issues.push(...sourceResult.issues);

  // 7. Apply custom rules
  if (options.customRules) {
    for (const rule of options.customRules) {
      for (const point of dataArray) {
        if (!rule.check(point)) {
          issues.push({
            severity: rule.severity,
            type: `custom_${rule.name}`,
            message: rule.message,
            affectedData: point,
          });
        }
      }
    }
  }

  // Generate recommendations
  recommendations.push(...generateRecommendations(issues, dimensions));

  // Calculate overall score
  const overall = calculateOverallScore(dimensions);

  return {
    overall,
    dimensions,
    issues,
    recommendations,
  };
}

/**
 * Check data completeness
 */
function checkCompleteness(
  data: DataPoint[],
  schema?: DataSchema,
): { score: number; issues: QualityIssue[] } {
  const issues: QualityIssue[] = [];
  let missingCount = 0;

  for (const point of data) {
    // Check for missing values
    if (
      point.value === null ||
      point.value === undefined ||
      isNaN(point.value)
    ) {
      issues.push({
        severity: "critical",
        type: "missing_value",
        message: "Missing or invalid value",
        affectedData: point,
      });
      missingCount++;
    }

    // Check for missing unit
    if (!point.unit || point.unit === "unknown") {
      issues.push({
        severity: "warning",
        type: "missing_unit",
        message: "Missing or unknown unit",
        affectedData: point,
      });
      missingCount++;
    }
  }

  // Check for temporal gaps (missing data points)
  const datedData = data.filter((d) =>
    d.timestamp || (d as DataPoint & { date?: string }).date
  );
  if (datedData.length > 1) {
    const dates = datedData.map((d) =>
      new Date(d.timestamp || (d as DataPoint & { date?: string }).date!)
    ).sort((a, b) => a.getTime() - b.getTime());
    let expectedPoints = 0;
    const actualPoints = dates.length;

    // Estimate expected frequency
    if (dates.length >= 2) {
      const totalSpan = dates[dates.length - 1].getTime() - dates[0].getTime();
      const avgGap = totalSpan / (dates.length - 1);
      const dayGap = avgGap / (1000 * 60 * 60 * 24);

      if (dayGap <= 45) { // Monthly data (allow for some variation)
        expectedPoints = Math.round(totalSpan / (30 * 24 * 60 * 60 * 1000)) + 1;
      } else if (dayGap <= 100) { // Quarterly data
        expectedPoints = Math.round(totalSpan / (90 * 24 * 60 * 60 * 1000)) + 1;
      } else {
        // For larger gaps, assume monthly and detect missing data
        expectedPoints = Math.round(totalSpan / (30 * 24 * 60 * 60 * 1000)) + 1;
      }

      if (expectedPoints > actualPoints) {
        issues.push({
          severity: "warning",
          type: "missing_values",
          message:
            `Expected ${expectedPoints} data points, found ${actualPoints}`,
        });
        missingCount += expectedPoints - actualPoints;
      }
    } else {
      // If we can't determine frequency, but have gaps, assume missing data
      if (dates.length >= 2) {
        const totalSpan = dates[dates.length - 1].getTime() -
          dates[0].getTime();
        const daySpan = totalSpan / (1000 * 60 * 60 * 24);

        // If span is more than 2 months but we have only a few points, likely missing data
        if (daySpan > 60 && dates.length < 5) {
          issues.push({
            severity: "warning",
            type: "missing_values",
            message: `Large time span (${
              Math.round(daySpan)
            } days) with few data points (${dates.length})`,
          });
          missingCount += 2; // Assume some missing data
        }
      }
    }
  } else if (data.length >= 2) {
    // For non-dated data, check if we have fewer than expected points
    // This is a simple heuristic - if we have very few points, assume some are missing
    if (data.length < 5) {
      issues.push({
        severity: "warning",
        type: "missing_values",
        message:
          `Only ${data.length} data points available, may be missing data`,
      });
      missingCount += 5 - data.length;
    }
  }

  // Simple heuristic: if we have dated data spanning more than 3 months with few points
  if (datedData.length >= 2 && datedData.length <= 3) {
    const dates = datedData.map((d) =>
      new Date(d.timestamp || (d as DataPoint & { date?: string }).date!)
    );
    const span = dates[dates.length - 1].getTime() - dates[0].getTime();
    const monthSpan = span / (30 * 24 * 60 * 60 * 1000);

    if (monthSpan > 3) { // More than 3 months span
      issues.push({
        severity: "warning",
        type: "missing_values",
        message: `${
          Math.round(monthSpan)
        } month span with only ${datedData.length} data points`,
      });
      missingCount += Math.floor(monthSpan - datedData.length);
    }
  }

  // Check required fields from schema
  if (schema?.requiredFields) {
    for (const point of data) {
      for (const field of schema.requiredFields) {
        if (!(field in point)) {
          issues.push({
            severity: "warning",
            type: "missing_field",
            message: `Missing required field: ${field}`,
            affectedData: point,
          });
          missingCount++;
        }
      }
    }
  }

  let score = Math.max(0, 100 - (missingCount / data.length) * 100);

  // Additional penalty for temporal gaps
  const temporalGapIssues = issues.filter((i) => i.type === "missing_values");
  if (temporalGapIssues.length > 0) {
    score = Math.max(0, score - 30); // Additional penalty for temporal gaps
  }

  return { score, issues };
}

/**
 * Check data validity
 */
function checkValidity(
  data: DataPoint[],
  schema?: DataSchema,
): { score: number; issues: QualityIssue[] } {
  const issues: QualityIssue[] = [];
  let invalidCount = 0;

  for (const point of data) {
    // Check for invalid numeric values
    if (!isFinite(point.value) || isNaN(point.value)) {
      issues.push({
        severity: "critical",
        type: "invalid_values",
        message: `Invalid numeric value: ${point.value}`,
        affectedData: point,
      });
      invalidCount++;
    }

    // Check value range
    if (schema?.valueRange) {
      const { min, max } = schema.valueRange;
      if (min !== undefined && point.value < min) {
        issues.push({
          severity: "warning",
          type: "value_out_of_range",
          message: `Value ${point.value} below minimum ${min}`,
          affectedData: point,
        });
        invalidCount++;
      }
      if (max !== undefined && point.value > max) {
        issues.push({
          severity: "warning",
          type: "value_out_of_range",
          message: `Value ${point.value} above maximum ${max}`,
          affectedData: point,
        });
        invalidCount++;
      }
    }

    // Check unit validity
    const parsed = parseUnit(point.unit);
    if (parsed.category === "unknown") {
      issues.push({
        severity: "warning",
        type: "invalid_unit",
        message: `Unrecognized unit: ${point.unit}`,
        affectedData: point,
      });
      invalidCount++;
    }

    // Check allowed units
    if (schema?.allowedUnits && !schema.allowedUnits.includes(point.unit)) {
      issues.push({
        severity: "warning",
        type: "unexpected_unit",
        message: `Unit "${point.unit}" not in allowed list`,
        affectedData: point,
      });
      invalidCount++;
    }

    // Check suspicious values
    if (parsed.category === "percentage" && Math.abs(point.value) > 1000) {
      issues.push({
        severity: "warning",
        type: "suspicious_percentage",
        message: `Percentage value ${point.value} seems unusually large`,
        affectedData: point,
      });
      invalidCount++;
    }
  }

  const score = Math.max(0, 100 - (invalidCount / data.length) * 80);
  return { score, issues };
}

/**
 * Check data consistency
 */
function checkConsistency(data: DataPoint[]): {
  score: number;
  issues: QualityIssue[];
} {
  const issues: QualityIssue[] = [];

  // Check unit consistency
  const units = new Set(data.map((d) => d.unit));
  if (units.size > 1) {
    issues.push({
      severity: "warning",
      type: "inconsistent_units",
      message: `Multiple units found: ${Array.from(units).join(", ")}`,
      affectedData: data,
    });
  }

  // Check value consistency (coefficient of variation)
  const values = data.map((d) => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
    values.length;
  const cv = Math.sqrt(variance) / Math.abs(mean);

  if (cv > 2) {
    issues.push({
      severity: "info",
      type: "high_variability",
      message: `High coefficient of variation: ${cv.toFixed(2)}`,
      affectedData: data,
    });
  }

  // Check sign consistency
  const signs = new Set(values.map((v) => Math.sign(v)));
  if (signs.size > 1 && !signs.has(0)) {
    issues.push({
      severity: "warning",
      type: "sign_changes",
      message: "Values change sign (positive/negative)",
      affectedData: data,
    });
  }

  // Check for mixed data types (this is a simple heuristic)
  const types = new Set(data.map((d) => typeof d.value));
  if (types.size > 1) {
    issues.push({
      severity: "warning",
      type: "mixed_data_types",
      message: "Mixed data types detected",
      affectedData: data,
    });
  }

  // Calculate score based on issue severity
  let score = 100;
  for (const issue of issues) {
    if (issue.type === "inconsistent_units") {
      score -= 40; // Major penalty for unit inconsistency
    } else if (issue.severity === "warning") {
      score -= 20;
    } else if (issue.severity === "info") {
      score -= 10;
    }
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Detect outliers
 */
function detectOutliers(
  data: DataPoint[],
  method: "iqr" | "zscore" | "isolation",
): { score: number; issues: QualityIssue[] } {
  const issues: QualityIssue[] = [];
  const values = data.map((d) => d.value);
  let outlierIndices: number[] = [];

  switch (method) {
    case "iqr":
      outlierIndices = detectOutliersIQR(values);
      break;
    case "zscore":
      outlierIndices = detectOutliersZScore(values);
      break;
    default:
      outlierIndices = detectOutliersIQR(values);
  }

  for (const idx of outlierIndices) {
    issues.push({
      severity: "warning",
      type: "outliers",
      message: `Potential outlier detected: ${values[idx]}`,
      affectedData: data[idx],
    });
  }

  const score = Math.max(0, 100 - (outlierIndices.length / data.length) * 100);
  return { score, issues };
}

/**
 * IQR outlier detection
 */
function detectOutliersIQR(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;

  return values
    .map((v, i) => (v < lower || v > upper ? i : -1))
    .filter((i) => i >= 0);
}

/**
 * Z-score outlier detection
 */
function detectOutliersZScore(values: number[], threshold = 3): number[] {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(
    values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length,
  );

  return values
    .map((v, i) => (Math.abs((v - mean) / std) > threshold ? i : -1))
    .filter((i) => i >= 0);
}

/**
 * Check timeliness
 */
function _checkTimeliness(data: DataPoint[]): {
  score: number;
  issues: QualityIssue[];
} {
  const issues: QualityIssue[] = [];
  const now = new Date();
  let staleCount = 0;

  for (const point of data) {
    if (!point.timestamp) continue;

    const age = now.getTime() - point.timestamp.getTime();
    const days = age / (1000 * 60 * 60 * 24);

    if (days > 365) {
      issues.push({
        severity: "warning",
        type: "stale_data",
        message: `Data is ${Math.floor(days)} days old`,
        affectedData: point,
      });
      staleCount++;
    } else if (days > 90) {
      issues.push({
        severity: "info",
        type: "aging_data",
        message: `Data is ${Math.floor(days)} days old`,
        affectedData: point,
      });
    }
  }

  const score = Math.max(0, 100 - (staleCount / data.length) * 50);
  return { score, issues };
}

/**
 * Calculate overall quality score
 */
function calculateOverallScore(dimensions: QualityScore["dimensions"]): number {
  const weights = {
    completeness: 0.25,
    consistency: 0.15,
    validity: 0.25,
    accuracy: 0.15,
    timeliness: 0.1,
    uniqueness: 0.1,
  };

  let weighted = 0;
  let totalWeight = 0;

  for (const [dim, score] of Object.entries(dimensions)) {
    const weight = weights[dim as keyof typeof weights];
    weighted += score * weight;
    totalWeight += weight;
  }

  return Math.round(weighted / totalWeight);
}

/**
 * Generate recommendations based on issues
 */
function generateRecommendations(
  issues: QualityIssue[],
  dimensions: QualityScore["dimensions"],
): string[] {
  const recommendations: string[] = [];

  // Check for critical issues
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  if (criticalCount > 0) {
    recommendations.push(
      `Address ${criticalCount} critical data quality issues immediately`,
    );
  }

  // Dimension-specific recommendations
  if (dimensions.completeness < 80) {
    recommendations.push("Improve data completeness by filling missing values");
  }

  if (dimensions.consistency < 80) {
    recommendations.push("Standardize units and formats for consistency");
  }

  if (dimensions.validity < 80) {
    recommendations.push("Validate data against expected ranges and formats");
  }

  if (dimensions.accuracy < 80) {
    recommendations.push("Review and validate outliers before processing");
  }

  if (dimensions.timeliness < 80) {
    recommendations.push("Update stale data to ensure current relevance");
  }

  if (dimensions.uniqueness < 90) {
    recommendations.push("Remove duplicate entries to ensure data integrity");
  }

  // Issue-specific recommendations
  const issueTypes = new Set(issues.map((i) => i.type));

  if (issueTypes.has("invalid_unit")) {
    recommendations.push(
      "Standardize unit formats using the parseUnit function",
    );
  }

  if (issueTypes.has("outlier")) {
    recommendations.push(
      "Investigate outliers - they may be data errors or significant events",
    );
  }

  return recommendations;
}

/**
 * Check temporal aspects of data
 */
function checkTemporal(data: DataPoint[]): {
  score: number;
  issues: QualityIssue[];
} {
  const issues: QualityIssue[] = [];
  let score = 100;

  // Check for temporal gaps if dates are provided
  const datedData = data.filter((d) =>
    d.timestamp || (d as DataPoint & { date?: string }).date
  );
  if (datedData.length > 1) {
    const dates = datedData.map((d) =>
      new Date(d.timestamp || (d as DataPoint & { date?: string }).date!)
    ).sort((a, b) => a.getTime() - b.getTime());

    // Check for large gaps
    for (let i = 1; i < dates.length; i++) {
      const gap = dates[i].getTime() - dates[i - 1].getTime();
      const dayGap = gap / (1000 * 60 * 60 * 24);

      if (dayGap > 45) { // More than 1.5 months
        issues.push({
          severity: "warning",
          type: "temporal_gaps",
          message: `Large temporal gap: ${Math.round(dayGap)} days`,
        });
        score -= 25;
      }
    }
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Check data uniqueness
 */
function checkUniqueness(data: DataPoint[]): {
  score: number;
  issues: QualityIssue[];
} {
  const issues: QualityIssue[] = [];
  let score = 100;

  // Check for duplicate dates
  const dates = data.filter((d) =>
    d.timestamp || (d as DataPoint & { date?: string }).date
  ).map((d) =>
    (d.timestamp || (d as DataPoint & { date?: string }).date!).toString()
  );
  const uniqueDates = new Set(dates);

  if (dates.length > uniqueDates.size) {
    issues.push({
      severity: "warning",
      type: "duplicate_dates",
      message: `Found ${dates.length - uniqueDates.size} duplicate dates`,
    });
    score -= (dates.length - uniqueDates.size) * 20;
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Check source reliability
 */
function checkSourceReliability(data: DataPoint[]): {
  score: number;
  issues: QualityIssue[];
} {
  const issues: QualityIssue[] = [];
  let score = 100;

  const _reliableSources = [
    "federal reserve",
    "world bank",
    "imf",
    "oecd",
    "eurostat",
    "bureau of labor statistics",
    "census bureau",
  ];

  const unreliableSources = [
    "unknown blog",
    "random website",
    "unverified source",
  ];

  for (const point of data) {
    if (point.source) {
      const source = point.source.toLowerCase();
      if (unreliableSources.some((us) => source.includes(us))) {
        issues.push({
          severity: "warning",
          type: "unreliable_sources",
          message: `Potentially unreliable source: ${point.source}`,
          affectedData: point,
        });
        score -= 15;
      }
    }
  }

  return { score: Math.max(0, score), issues };
}
