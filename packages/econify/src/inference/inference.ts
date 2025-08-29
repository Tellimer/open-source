/**
 * Smart unit inference from context
 */

import { parseUnit } from "../units/units.ts";
import { classifyIndicator } from "../classification/classification.ts";
import type { Scale } from "../types.ts";

/** Company metadata used to improve unit inference. */
export interface CompanyContext {
  name?: string;
  currency?: string;
  reportingScale?: Scale;
  sector?: string;
  country?: string;
}

/**
 * Context object used by inferUnit to improve detection quality.
 */
export interface InferenceContext {
  text?: string;
  context?: string;
  indicatorName?: string;
  company?: CompanyContext;
  country?: string;
  period?: string;
  documentType?: "earnings" | "economic_report" | "research" | "news";
  previousValues?: Array<{ value: number; unit: string }>;
}

/** Inference result with confidence and alternative candidates. */
export interface InferredUnit {
  unit: string;
  confidence: number;
  reasoning: string[];
  alternatives?: Array<{ unit: string; confidence: number }>;
}

// Common patterns for different contexts
const CONTEXT_PATTERNS: Record<string, RegExp[]> = {
  quarterly_earnings: [
    /quarterly\s+(revenue|earnings|sales)/i,
    /Q[1-4]\s+\d{4}/i,
    /three\s+months\s+ended/i,
  ],
  annual_report: [
    /annual\s+(revenue|earnings|sales)/i,
    /fiscal\s+year/i,
    /twelve\s+months\s+ended/i,
  ],
  millions_context: [/millions?/i, /mn\b/i, /MM\b/],
  billions_context: [/billions?/i, /bn\b/i, /BB\b/],
  percentage_context: [
    /percent/i,
    /\d+\.?\d*\s*%/,
    /growth\s+rate/i,
    /margin/i,
  ],
};

// Industry-specific defaults
const SECTOR_DEFAULTS: Record<string, { scale: Scale; timeScale?: string }> = {
  technology: { scale: "millions", timeScale: "quarter" },
  banking: { scale: "billions", timeScale: "quarter" },
  retail: { scale: "millions", timeScale: "month" },
  oil_gas: { scale: "billions", timeScale: "quarter" },
  pharmaceuticals: { scale: "millions", timeScale: "year" },
};

/**
 * Infer unit from text and structured context.
 */
export function inferUnit(
  value: string | number,
  context: InferenceContext,
): InferredUnit {
  const reasoning: string[] = [];
  const candidates: Array<{
    unit: string;
    confidence: number;
    source: string;
  }> = [];

  // Extract value if string
  const numericValue = typeof value === "string" ? extractNumber(value) : value;

  // 1. Check for explicit unit in text
  if (context.text) {
    const explicitUnit = extractExplicitUnit(context.text);
    if (explicitUnit) {
      candidates.push({
        unit: explicitUnit,
        confidence: 0.95,
        source: "explicit in text",
      });
      reasoning.push(`Found explicit unit "${explicitUnit}" in text`);
    }
  }

  // 2. Infer from indicator name
  if (context.indicatorName) {
    const indicatorUnit = inferFromIndicatorName(context.indicatorName);
    if (indicatorUnit) {
      candidates.push({
        unit: indicatorUnit,
        confidence: 0.85,
        source: "indicator name",
      });
      reasoning.push(`Inferred "${indicatorUnit}" from indicator name`);
    }
  }

  // 3. Infer from company context
  if (context.company) {
    const companyUnit = inferFromCompany(context.company, context.period);
    if (companyUnit) {
      candidates.push({
        unit: companyUnit,
        confidence: 0.8,
        source: "company context",
      });
      reasoning.push(`Inferred "${companyUnit}" from company context`);
    }
  }

  // 4. Infer from document type and context
  if (context.documentType && context.context) {
    const docUnit = inferFromDocumentContext(
      context.documentType,
      context.context,
    );
    if (docUnit) {
      candidates.push({
        unit: docUnit,
        confidence: 0.75,
        source: "document context",
      });
      reasoning.push(`Inferred "${docUnit}" from document type`);
    }
  }

  // 5. Infer from value magnitude
  if (numericValue !== null) {
    const magnitudeUnit = inferFromMagnitude(numericValue, context);
    if (magnitudeUnit) {
      candidates.push({
        unit: magnitudeUnit,
        confidence: 0.6,
        source: "value magnitude",
      });
      reasoning.push(`Inferred "${magnitudeUnit}" from value magnitude`);
    }
  }

  // 6. Check previous values for consistency
  if (context.previousValues && context.previousValues.length > 0) {
    const historicalUnit = inferFromHistory(context.previousValues);
    if (historicalUnit) {
      candidates.push({
        unit: historicalUnit,
        confidence: 0.7,
        source: "historical values",
      });
      reasoning.push(`Inferred "${historicalUnit}" from previous values`);
    }
  }

  // Sort candidates by confidence
  candidates.sort((a, b) => b.confidence - a.confidence);

  if (candidates.length === 0) {
    return {
      unit: "unknown",
      confidence: 0,
      reasoning: ["Could not infer unit from available context"],
    };
  }

  // Return best candidate with alternatives
  return {
    unit: candidates[0].unit,
    confidence: candidates[0].confidence,
    reasoning,
    alternatives: candidates.slice(1).map((c) => ({
      unit: c.unit,
      confidence: c.confidence,
    })),
  };
}

/**
 * Extract number from text
 */
function extractNumber(text: string): number | null {
  const match = text.match(/[-+]?\d*\.?\d+/);
  return match ? parseFloat(match[0]) : null;
}

/**
 * Extract explicit unit from text
 */
function extractExplicitUnit(text: string): string | null {
  // Look for common unit patterns
  const patterns = [
    /(\w{3})\s+(billion|million|thousand)/i,
    /in\s+(\w{3})\s*$/i,
    /\(([^)]+)\)/, // Units in parentheses
    /expressed\s+in\s+([^,\.]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Infer unit from indicator name
 */
function inferFromIndicatorName(name: string): string | null {
  const lower = name.toLowerCase();

  // Check for percentage indicators
  if (
    lower.includes("rate") ||
    lower.includes("ratio") ||
    lower.includes("margin")
  ) {
    return "percent";
  }

  // Check for index
  if (lower.includes("index")) {
    return "index";
  }

  // Check for physical units
  if (lower.includes("barrel")) {
    return "BBL/D/1K";
  }

  // Check for currency indicators
  const currencyMatch = name.match(/\b([A-Z]{3})\b/);
  if (currencyMatch) {
    // Try to determine scale from indicator
    const classification = classifyIndicator({ name });
    if (classification.type === "flow") {
      return `${currencyMatch[1]} Million per year`;
    }
    return `${currencyMatch[1]} Million`;
  }

  return null;
}

/**
 * Infer from company context
 */
function inferFromCompany(
  company: CompanyContext,
  period?: string,
): string | null {
  if (!company.currency) return null;

  const parts: string[] = [company.currency];

  // Add scale
  if (company.reportingScale) {
    parts.push(company.reportingScale);
  } else if (company.sector && SECTOR_DEFAULTS[company.sector]) {
    parts.push(SECTOR_DEFAULTS[company.sector].scale);
  } else {
    parts.push("millions"); // Default
  }

  // Add time period
  if (period) {
    if (period.includes("Q") || period.includes("quarter")) {
      parts.push("per quarter");
    } else if (period.includes("year") || period.includes("annual")) {
      parts.push("per year");
    }
  } else if (company.sector && SECTOR_DEFAULTS[company.sector]?.timeScale) {
    parts.push(`per ${SECTOR_DEFAULTS[company.sector].timeScale}`);
  }

  return parts.join(" ");
}

/**
 * Infer from document context
 */
function inferFromDocumentContext(
  docType: string,
  context: string,
): string | null {
  // Check for scale indicators
  let scale: Scale = "millions";
  if (CONTEXT_PATTERNS.billions_context.some((p) => p.test(context))) {
    scale = "billions";
  } else if (CONTEXT_PATTERNS.millions_context.some((p) => p.test(context))) {
    scale = "millions";
  }

  // Check for time period
  let timePeriod = "";
  if (CONTEXT_PATTERNS.quarterly_earnings.some((p) => p.test(context))) {
    timePeriod = " per quarter";
  } else if (CONTEXT_PATTERNS.annual_report.some((p) => p.test(context))) {
    timePeriod = " per year";
  }

  // Check for percentage
  if (CONTEXT_PATTERNS.percentage_context.some((p) => p.test(context))) {
    return "percent";
  }

  // Default based on document type
  if (docType === "earnings") {
    return `USD ${scale}${timePeriod}`;
  }

  return null;
}

/**
 * Infer from value magnitude
 */
function inferFromMagnitude(
  value: number,
  context: InferenceContext,
): string | null {
  const absValue = Math.abs(value);

  // Percentage range
  if (absValue < 100 && context.context?.includes("percent")) {
    return "percent";
  }

  // Determine scale based on magnitude
  let scale: Scale;
  if (absValue >= 1000000) {
    scale = "ones";
  } else if (absValue >= 1000) {
    scale = "thousands";
  } else if (absValue >= 100) {
    scale = "millions";
  } else if (absValue >= 1) {
    scale = "billions";
  } else {
    scale = "trillions";
  }

  // Add currency if available
  const currency = context.company?.currency || context.country || "USD";

  return `${currency} ${scale}`;
}

/**
 * Infer from historical values
 */
function inferFromHistory(
  previousValues: Array<{ value: number; unit: string }>,
): string | null {
  if (previousValues.length === 0) return null;

  // Find most common unit
  const unitCounts = new Map<string, number>();
  for (const pv of previousValues) {
    unitCounts.set(pv.unit, (unitCounts.get(pv.unit) || 0) + 1);
  }

  let mostCommon = "";
  let maxCount = 0;
  for (const [unit, count] of unitCounts) {
    if (count > maxCount) {
      mostCommon = unit;
      maxCount = count;
    }
  }

  return mostCommon || null;
}

/**
 * Validate whether an inferred unit is plausible for a given value.
 */
export function validateInferredUnit(
  value: number,
  inferredUnit: string,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const parsed = parseUnit(inferredUnit);

  // Check if percentage value is reasonable
  if (parsed.category === "percentage" && Math.abs(value) > 1000) {
    warnings.push("Percentage value seems unusually large");
  }

  // Check if scale makes sense
  if (parsed.scale === "trillions" && value > 1000) {
    warnings.push("Value in trillions seems unusually large");
  }

  if (parsed.scale === "ones" && value < 0.001) {
    warnings.push("Value seems too small for base units");
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
