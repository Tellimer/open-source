/**
 * Exemption utilities for skipping normalization on specific indicators
 */

import type { NormalizationExemptions } from "../types.ts";

/**
 * Data item that can be checked for exemptions
 */
export interface ExemptionCheckData {
  /** Indicator ID (e.g., 'TEL_CCR', 'GDP_GROWTH') */
  id?: string | number;
  /** Indicator name (e.g., 'Credit Rating', 'GDP Growth Rate') */
  name?: string;
  /** Category group (e.g., 'IMF WEO', 'Tellimer', 'World Bank') */
  categoryGroup?: string;
  /** Additional metadata that might contain exemption-relevant info */
  metadata?: Record<string, unknown>;
}

/**
 * Check if an indicator should be exempted from normalization
 *
 * @param data The data item to check
 * @param exemptions The exemption configuration
 * @returns true if the item should be exempted, false otherwise
 */
export function shouldExemptFromNormalization(
  data: ExemptionCheckData,
  exemptions?: NormalizationExemptions,
): boolean {
  if (!exemptions) {
    return false;
  }

  const { indicatorIds, categoryGroups, indicatorNames } = exemptions;

  // Check indicator ID exemptions
  if (indicatorIds && data.id) {
    const idStr = String(data.id);
    if (indicatorIds.includes(idStr)) {
      return true;
    }
  }

  // Check category group exemptions
  if (categoryGroups && data.categoryGroup) {
    if (categoryGroups.includes(data.categoryGroup)) {
      return true;
    }
  }

  // Check indicator name exemptions (partial matches)
  if (indicatorNames && data.name) {
    const nameStr = String(data.name).toLowerCase();
    for (const exemptName of indicatorNames) {
      if (nameStr.includes(exemptName.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Filter a list of data items, separating exempted from non-exempted items
 *
 * @param data Array of data items to filter
 * @param exemptions The exemption configuration
 * @returns Object with exempted and nonExempted arrays
 */
export function filterExemptions<T extends ExemptionCheckData>(
  data: T[],
  exemptions?: NormalizationExemptions,
): { exempted: T[]; nonExempted: T[] } {
  const exempted: T[] = [];
  const nonExempted: T[] = [];

  for (const item of data) {
    if (shouldExemptFromNormalization(item, exemptions)) {
      exempted.push(item);
    } else {
      nonExempted.push(item);
    }
  }

  return { exempted, nonExempted };
}

/**
 * Create exemption summary for logging/reporting
 *
 * @param exempted Array of exempted items
 * @param total Total number of items processed
 * @returns Summary object
 */
export function createExemptionSummary(
  exempted: ExemptionCheckData[],
  total: number,
): {
  count: number;
  percentage: number;
  reasons: Record<string, number>;
  items: Array<{ id?: string | number; name?: string; reason: string }>;
} {
  const reasons: Record<string, number> = {};
  const items: Array<{ id?: string | number; name?: string; reason: string }> =
    [];

  // This is a simplified version - in practice you'd want to track the specific exemption reason
  for (const item of exempted) {
    let reason = "unknown";
    if (item.categoryGroup) {
      reason = `category: ${item.categoryGroup}`;
    } else if (item.name) {
      reason = `name pattern`;
    } else if (item.id) {
      reason = `indicator ID`;
    }

    reasons[reason] = (reasons[reason] || 0) + 1;
    items.push({
      id: item.id,
      name: item.name,
      reason,
    });
  }

  return {
    count: exempted.length,
    percentage: total > 0 ? (exempted.length / total) * 100 : 0,
    reasons,
    items,
  };
}
