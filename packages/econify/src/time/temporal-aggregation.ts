/**
 * Temporal aggregation utilities for time series resampling
 *
 * Uses temporal_aggregation metadata from @tellimer/classify to apply
 * semantically correct aggregation when resampling time series data.
 */

import type { TimeScale } from "../types.ts";
import { rescaleTime } from "../scale/scale.ts";

/**
 * Aggregate time series values based on temporal aggregation type
 *
 * This function applies the correct aggregation logic when combining multiple
 * values from a finer time scale to a coarser time scale (e.g., monthly → quarterly).
 *
 * Examples:
 * - period-total (total transactions): SUM monthly values → quarterly total
 * - period-average (avg temperature): MEAN of monthly values → quarterly average
 * - period-rate (GDP growth rate): ANNUALIZE properly using time scale conversion
 * - period-cumulative (YTD sales): TAKE LAST (already cumulative)
 * - point-in-time (stock level): TAKE LAST observation
 *
 * @param values - Array of values from the source time period
 * @param temporalAggregation - Temporal aggregation type from @tellimer/classify
 * @param fromPeriod - Source time scale (e.g., "month")
 * @param toPeriod - Target time scale (e.g., "quarter")
 * @returns Aggregated value for the target period
 */
export function aggregateByTemporalType(
  values: number[],
  temporalAggregation: string,
  fromPeriod: TimeScale,
  toPeriod: TimeScale,
): number {
  if (values.length === 0) {
    throw new Error("Cannot aggregate empty value array");
  }

  switch (temporalAggregation) {
    case "period-total": {
      // Sum over period - add all values together
      // Example: Monthly total transactions → Quarterly total
      return values.reduce((a, b) => a + b, 0);
    }

    case "period-average": {
      // Average over period - take mean
      // Example: Monthly average temperature → Quarterly average
      const sum = values.reduce((a, b) => a + b, 0);
      return sum / values.length;
    }

    case "period-rate": {
      // Flow rate during period - sum and then annualize
      // Example: Monthly GDP (already annualized) → Quarterly GDP
      // First sum the values, then convert to target time scale
      const total = values.reduce((a, b) => a + b, 0);
      return rescaleTime(total, fromPeriod, toPeriod, temporalAggregation);
    }

    case "period-cumulative": {
      // Running total - take last value (already cumulative)
      // Example: YTD sales for each month → YTD sales at end of quarter
      return values[values.length - 1];
    }

    case "point-in-time": {
      // Snapshot value - take last observation
      // Example: Monthly stock levels → Stock level at end of quarter
      return values[values.length - 1];
    }

    case "not-applicable": {
      // Dimensionless values - typically take last or average
      // Example: Debt-to-GDP ratio (%) → Ratio at end of quarter
      // For safety, we take the last value
      return values[values.length - 1];
    }

    default:
      throw new Error(
        `Unknown temporal aggregation type: "${temporalAggregation}". ` +
          `Expected one of: period-total, period-average, period-rate, ` +
          `period-cumulative, point-in-time, not-applicable.`,
      );
  }
}

/**
 * Check if a temporal aggregation type allows resampling to a coarser time scale
 *
 * @param temporalAggregation - Temporal aggregation type
 * @returns true if resampling is allowed
 */
export function allowsResampling(temporalAggregation: string): boolean {
  switch (temporalAggregation) {
    case "period-total":
    case "period-average":
    case "period-rate":
    case "period-cumulative":
    case "point-in-time":
      return true;
    case "not-applicable":
      // Dimensionless values - resampling may not be meaningful
      return false;
    default:
      return false;
  }
}

/**
 * Get human-readable description of aggregation behavior
 *
 * @param temporalAggregation - Temporal aggregation type
 * @returns Description of how values are aggregated
 */
export function describeAggregation(temporalAggregation: string): string {
  switch (temporalAggregation) {
    case "period-total":
      return "Sum values across period";
    case "period-average":
      return "Average values across period";
    case "period-rate":
      return "Sum and annualize flow rate";
    case "period-cumulative":
      return "Take last value (already cumulative)";
    case "point-in-time":
      return "Take last observation (snapshot)";
    case "not-applicable":
      return "Take last value (dimensionless)";
    default:
      return "Unknown aggregation method";
  }
}
