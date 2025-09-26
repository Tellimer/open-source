/**
 * Count-specific normalization logic
 *
 * This module handles normalization for count-type indicators
 * that don't have currency units.
 */

import { rescaleMagnitude } from "../scale/scale.ts";
import { parseUnit } from "../units/units.ts";
import type { Scale } from "../types.ts";

export interface CountDataPoint {
  country: string;
  value: number;
  unit: string;
  date?: string;
  metadata?: Record<string, unknown>;
}

export interface NormalizedCountData {
  country: string;
  originalValue: number;
  originalUnit: string;
  normalizedValue: number;
  normalizedUnit: string;
  dataType: "count";
  date?: string;
  metadata?: Record<string, unknown>;
}

export interface CountNormalizationOptions {
  targetScale?: Scale;
  includeMetadata?: boolean;
}

/**
 * Check if an indicator represents count data (like car registrations)
 */
export function isCountIndicator(
  indicatorName?: string,
  unit?: string,
): boolean {
  if (!indicatorName && !unit) return false;

  const text = `${indicatorName || ""} ${unit || ""}`.toLowerCase();

  // Check for count-related patterns
  const countPatterns = [
    /car\s+registrations?/i,
    /vehicle\s+registrations?/i,
    /registrations?/i,
    /births?/i,
    /deaths?/i,
    /arrivals?/i,
    /departures?/i,
    /licenses?/i,
    /permits?/i,
  ];

  return countPatterns.some((pattern) => pattern.test(text));
}

/**
 * Check if a unit represents count data that should not have currency conversion
 */
export function isCountUnit(unitText: string): boolean {
  if (!unitText) return false;

  const parsed = parseUnit(unitText);
  const lowerUnit = unitText.toLowerCase().trim();

  // Direct count units or parsed as count
  if (
    lowerUnit === "units" ||
    lowerUnit === "number" ||
    lowerUnit === "count" ||
    parsed.category === "count"
  ) {
    return true;
  }

  // If the unit clearly represents monetary/composite with an actual currency code, it's not a count unit
  if (parsed.currency || parsed.category === "composite") {
    return false;
  }

  // Treat bare magnitude tokens as count units only when not paired with a currency or physical unit
  const hasScaleToken =
    /\bhundreds?\b|\bthousands?\b|\bmillions?\b|\bbillions?\b/i.test(lowerUnit);
  const hasPhysicalUnit =
    /(tonnes?|tons?|barrels?|gallons?|bushels?|ounces?|metric tons?)/i.test(
      lowerUnit,
    );
  if (hasScaleToken && !hasPhysicalUnit) {
    return true;
  }

  return false;
}

/**
 * Normalize count data by scale only (no currency conversion)
 */
export function normalizeCountData(
  countData: CountDataPoint[],
  options: CountNormalizationOptions = {},
): NormalizedCountData[] {
  const {
    targetScale = "ones",
    includeMetadata = true,
  } = options;

  const results: NormalizedCountData[] = [];

  for (const dataPoint of countData) {
    const parsed = parseUnit(dataPoint.unit);

    const result: NormalizedCountData = {
      country: dataPoint.country,
      originalValue: dataPoint.value,
      originalUnit: dataPoint.unit,
      normalizedValue: dataPoint.value,
      normalizedUnit: targetScale,
      dataType: "count",
      date: dataPoint.date,
    };

    // Apply scale normalization only
    if (parsed.scale && parsed.scale !== targetScale) {
      result.normalizedValue = rescaleMagnitude(
        dataPoint.value,
        parsed.scale,
        targetScale,
      );
    }

    // Include metadata if requested
    if (includeMetadata && dataPoint.metadata) {
      result.metadata = dataPoint.metadata;
    }

    results.push(result);
  }

  return results;
}

/**
 * Detect if the data appears to be count-related
 */
export function detectCountData(
  data: Array<{ name?: string; unit?: string }>,
): boolean {
  if (data.length === 0) return false;

  // Check if any items have count-like names or units
  return data.some((item) =>
    isCountIndicator(item.name, item.unit) || isCountUnit(item.unit || "")
  );
}
