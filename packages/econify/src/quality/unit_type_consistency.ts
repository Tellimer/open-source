/**
 * Unit Type Consistency Detection
 *
 * Detects when an indicator group has mixed unit types (e.g., mostly counts but some index values).
 * Similar to scale outlier detection but focuses on semantic unit type compatibility.
 */

import type { ParsedData } from "../workflows/economic-data-workflow.ts";
import {
  areUnitsCompatible,
  classifyUnitType,
  getUnitTypeDescription,
  type UnitSemanticType,
} from "./unit_type_classifier.ts";

export interface UnitTypeConsistencyOptions {
  /**
   * Minimum percentage of items that must share a unit type to be considered the "dominant" type.
   * Default: 0.67 (67% - i.e., 2/3 majority)
   */
  dominantTypeThreshold?: number;

  /**
   * Include detailed classification info in warnings
   * Default: false
   */
  includeDetails?: boolean;

  /**
   * Filter out items with incompatible unit types
   * Default: false (only add warnings)
   */
  filterIncompatible?: boolean;
}

export interface UnitTypeConsistencyResult {
  data: ParsedData[];
  incompatible?: ParsedData[];
}

interface UnitTypeInfo {
  type: UnitSemanticType;
  confidence: number;
  originalUnit: string;
  count: number;
  items: ParsedData[];
}

/**
 * Detect unit type inconsistencies within indicator groups
 *
 * Groups items by indicator, classifies each item's unit type, and flags
 * items that don't match the dominant unit type in their group.
 *
 * Example:
 * - Group "Tourism": 4 items with "Thousand" (count) + 1 item with "Index (2020=100)" (index)
 * - Result: Index item flagged as incompatible with dominant type (count)
 */
export function detectUnitTypeInconsistencies(
  data: ParsedData[],
  options: UnitTypeConsistencyOptions = {},
): UnitTypeConsistencyResult {
  const {
    dominantTypeThreshold = 0.67,
    includeDetails = false,
    filterIncompatible = false,
  } = options;

  if (data.length === 0) {
    return { data };
  }

  // Group by indicator name
  const indicatorGroups = new Map<string, ParsedData[]>();

  for (const item of data) {
    const indicatorName = item.name || "unknown";
    if (!indicatorGroups.has(indicatorName)) {
      indicatorGroups.set(indicatorName, []);
    }
    indicatorGroups.get(indicatorName)!.push(item);
  }

  const results: ParsedData[] = [];
  const incompatible: ParsedData[] = [];
  const shouldFilter = filterIncompatible;

  // Process each indicator group
  for (const [indicatorName, items] of indicatorGroups.entries()) {
    // Need at least 2 items to detect inconsistency
    if (items.length < 2) {
      results.push(...items);
      continue;
    }

    // Classify unit types for all items
    const typeMap = new Map<UnitSemanticType, UnitTypeInfo>();

    for (const item of items) {
      const classification = classifyUnitType(item.unit);

      if (!typeMap.has(classification.type)) {
        typeMap.set(classification.type, {
          type: classification.type,
          confidence: classification.confidence,
          originalUnit: item.unit || "unknown",
          count: 0,
          items: [],
        });
      }

      const typeInfo = typeMap.get(classification.type)!;
      typeInfo.count++;
      typeInfo.items.push(item);
    }

    // Find dominant unit type (most common)
    let dominantType: UnitTypeInfo | null = null;
    let maxCount = 0;

    for (const typeInfo of typeMap.values()) {
      if (typeInfo.count > maxCount) {
        maxCount = typeInfo.count;
        dominantType = typeInfo;
      }
    }

    if (!dominantType) {
      // Should not happen, but handle gracefully
      results.push(...items);
      continue;
    }

    // Check if dominant type meets threshold
    const dominantPercentage = dominantType.count / items.length;
    const hasDominantType = dominantPercentage >= dominantTypeThreshold;

    // If no dominant type (too fragmented), don't flag anything
    if (!hasDominantType) {
      results.push(...items);
      continue;
    }

    // Flag items that are incompatible with dominant type
    for (const item of items) {
      const classification = classifyUnitType(item.unit);
      const isCompatible = areUnitsCompatible(
        classification.type,
        dominantType.type,
      );

      if (!isCompatible && classification.type !== dominantType.type) {
        // Item is incompatible with dominant type
        const warning = buildWarning(
          item,
          classification,
          dominantType,
          indicatorName,
          items.length,
          includeDetails,
        );

        const explain = item.explain || {};
        const qualityWarnings = explain.qualityWarnings || [];

        const warningObject = {
          type: "data-quality" as const,
          severity: "warning" as const,
          message: warning,
          details: {
            itemType: classification.type,
            dominantType: dominantType.type,
            itemUnit: item.unit,
            confidence: classification.confidence,
          },
        };

        const markedItem: ParsedData = {
          ...item,
          explain: {
            ...explain,
            qualityWarnings: [...qualityWarnings, warningObject],
          },
        };

        if (shouldFilter) {
          incompatible.push(markedItem);
        } else {
          results.push(markedItem);
        }
      } else {
        // Compatible with dominant type
        results.push(item);
      }
    }
  }

  return {
    data: results,
    incompatible: shouldFilter && incompatible.length > 0
      ? incompatible
      : undefined,
  };
}

function buildWarning(
  item: ParsedData,
  classification: ReturnType<typeof classifyUnitType>,
  dominantType: UnitTypeInfo,
  indicatorName: string,
  groupSize: number,
  includeDetails: boolean,
): string {
  const itemTypeDesc = getUnitTypeDescription(classification.type);
  const dominantTypeDesc = getUnitTypeDescription(dominantType.type);

  let warning =
    `Unit type mismatch: This item has unit type "${classification.type}" ` +
    `(unit: "${item.unit}") but the majority of "${indicatorName}" items ` +
    `(${dominantType.count}/${groupSize}) have unit type "${dominantType.type}". ` +
    `These types are incompatible and should not be mixed.`;

  if (includeDetails) {
    warning += `\n  Item type: ${itemTypeDesc}` +
      `\n  Dominant type: ${dominantTypeDesc}` +
      `\n  Confidence: ${classification.confidence}`;
  }

  return warning;
}

/**
 * Get summary statistics about unit types in the data
 * Useful for understanding the distribution of unit types
 */
export function getUnitTypeStats(data: ParsedData[]): {
  totalItems: number;
  byType: Record<UnitSemanticType, number>;
  byIndicator: Record<string, Record<UnitSemanticType, number>>;
} {
  const byType: Record<UnitSemanticType, number> = {
    percentage: 0,
    index: 0,
    count: 0,
    "currency-amount": 0,
    physical: 0,
    rate: 0,
    ratio: 0,
    duration: 0,
    unknown: 0,
  };

  const byIndicator: Record<string, Record<UnitSemanticType, number>> = {};

  for (const item of data) {
    const classification = classifyUnitType(item.unit);
    byType[classification.type]++;

    const indicatorName = item.name || "unknown";
    if (!byIndicator[indicatorName]) {
      byIndicator[indicatorName] = {
        percentage: 0,
        index: 0,
        count: 0,
        "currency-amount": 0,
        physical: 0,
        rate: 0,
        ratio: 0,
        duration: 0,
        unknown: 0,
      };
    }

    byIndicator[indicatorName][classification.type]++;
  }

  return {
    totalItems: data.length,
    byType,
    byIndicator,
  };
}
