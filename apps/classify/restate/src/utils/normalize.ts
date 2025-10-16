/**
 * Unit normalization service
 * Parses units to extract scale, type, and currency information
 */

import {
  classifyUnitType,
  CURRENCY_CODES,
} from "./unit-classifier.ts";

export interface NormalizationResult {
  originalUnits: string;
  parsedScale: string;
  normalizedScale: string;
  parsedUnitType: string;
  parsedCurrency: string | null;
  parsingConfidence: number;
  matchedPattern?: string;
}

/**
 * Extract scale from unit string
 */
function extractScale(units: string): string {
  const lower = units.toLowerCase();
  if (lower.includes("trillion")) return "trillions";
  if (lower.includes("billion")) return "billions";
  if (lower.includes("million")) return "millions";
  if (lower.includes("thousand")) return "thousands";
  if (lower.includes("hundred")) return "hundreds";
  return "raw";
}

/**
 * Normalize parsed scale to standard enum values
 * Maps the extracted scale to standardized values used by downstream stages
 */
function normalizeScale(parsedScale: string, unitType: string): string {
  const lower = parsedScale.toLowerCase();

  // Handle percentage/index types
  if (unitType === "percentage" || lower.includes("percent") || lower === "%") {
    return "percent";
  }
  if (unitType === "index") {
    return "index";
  }

  // Map scale values to standard enum
  if (lower === "raw" || lower === "raw-units" || lower === "ones") {
    return "raw-units";
  } else if (lower.includes("hundred")) {
    return "hundreds";
  } else if (lower.includes("thousand")) {
    return "thousands";
  } else if (lower.includes("million")) {
    return "millions";
  } else if (lower.includes("billion")) {
    return "billions";
  } else if (lower.includes("trillion")) {
    return "trillions";
  }

  // Default to raw-units for unknown scales
  return "raw-units";
}

/**
 * Extract currency code from unit string
 */
function extractCurrency(units: string): string | null {
  const lower = units.toLowerCase();
  for (const code of CURRENCY_CODES) {
    const regex = new RegExp(`\\b${code}\\b|${code}[-/]|[-/]${code}`);
    if (regex.test(lower)) {
      return code.toUpperCase();
    }
  }
  return null;
}

/**
 * Normalize units by extracting scale, type, and currency
 */
export function normalizeUnits(units: string): NormalizationResult {
  // Use comprehensive unit classifier
  const classification = classifyUnitType(units);

  // Extract scale
  const parsedScale = extractScale(units);

  // Always attempt to extract currency - classifier may miss it if "Million" overshadows currency code
  const currency = extractCurrency(units);

  // Override classification to currency-amount if we found a currency code
  const finalType = currency !== null ? "currency-amount" : classification.type;

  // Normalize scale to standard enum values
  const normalizedScale = normalizeScale(parsedScale, finalType);

  return {
    originalUnits: units,
    parsedScale: parsedScale,
    normalizedScale: normalizedScale, // Add normalized scale for downstream use
    parsedUnitType: finalType,
    parsedCurrency: currency,
    parsingConfidence: classification.confidence,
    matchedPattern: classification.matchedPattern,
  };
}
