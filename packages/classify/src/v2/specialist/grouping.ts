/**
 * Specialist Stage - Indicator Grouping by Family
 * @module
 */

import type { Indicator } from "../../types.ts";
import type { IndicatorFamily, RouterResult } from "../types.ts";

/**
 * Indicator with router result attached
 */
export interface IndicatorWithFamily extends Indicator {
  router_family: IndicatorFamily;
  router_confidence: number;
  router_reasoning?: string;
}

/**
 * Group indicators by router-assigned family
 */
export function groupIndicatorsByFamily(
  indicators: Indicator[],
  routerResults: RouterResult[],
): Map<IndicatorFamily, IndicatorWithFamily[]> {
  const grouped = new Map<IndicatorFamily, IndicatorWithFamily[]>();

  // Create lookup map for router results
  const routerMap = new Map<string, RouterResult>();
  for (const result of routerResults) {
    routerMap.set(result.indicator_id, result);
  }

  // Group indicators
  for (const indicator of indicators) {
    if (!indicator.id) continue;

    const routerResult = routerMap.get(indicator.id);
    if (!routerResult) continue;

    const family = routerResult.family;

    if (!grouped.has(family)) {
      grouped.set(family, []);
    }

    grouped.get(family)!.push({
      ...indicator,
      router_family: family,
      router_confidence: routerResult.confidence_family,
      router_reasoning: routerResult.reasoning,
    });
  }

  return grouped;
}

/**
 * Create batches for a family
 */
export function createFamilyBatches(
  indicators: IndicatorWithFamily[],
  batchSize: number = 25,
): IndicatorWithFamily[][] {
  const batches: IndicatorWithFamily[][] = [];

  for (let i = 0; i < indicators.length; i += batchSize) {
    batches.push(indicators.slice(i, i + batchSize));
  }

  return batches;
}

/**
 * Get family distribution summary
 */
export function getFamilyDistribution(
  grouped: Map<IndicatorFamily, IndicatorWithFamily[]>,
): Record<IndicatorFamily, number> {
  const distribution: Record<IndicatorFamily, number> = {} as any;

  for (const [family, indicators] of grouped.entries()) {
    distribution[family] = indicators.length;
  }

  return distribution;
}
