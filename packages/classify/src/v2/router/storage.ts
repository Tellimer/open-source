/**
 * Router Stage Storage Layer
 * @module
 */

import type { V2DatabaseClient } from '../db/client.ts';
import type { RouterResult } from '../types.ts';
import type { Indicator } from '../../types.ts';

/**
 * Write router results to database (upsert)
 */
export function writeRouterResults(
  db: V2DatabaseClient,
  results: RouterResult[],
  indicators: Array<{ id?: string; name: string; units?: string; definition?: string }>
): void {
  if (results.length === 0) return;

  db.transaction(() => {
    // First, update main classifications table (must exist before router_results due to FK)
    const updateClassifications = db.prepare(`
      INSERT INTO classifications (
        indicator_id,
        name,
        units,
        description,
        family,
        confidence_family,
        reasoning_router
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(indicator_id) DO UPDATE SET
        family = excluded.family,
        confidence_family = excluded.confidence_family,
        reasoning_router = excluded.reasoning_router,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const result of results) {
      const indicator = indicators.find(ind => ind.id === result.indicator_id);

      // Generate description if not provided
      let description = indicator?.definition;
      if (!description && indicator) {
        description = indicator.units
          ? `${indicator.name} measured in ${indicator.units}`
          : indicator.name;
      }

      updateClassifications.run(
        result.indicator_id,
        indicator?.name || '',
        indicator?.units || null,
        description || null,
        result.family,
        result.confidence_family,
        result.reasoning || null
      );
    }

    // Then insert into router_results
    const stmt = db.prepare(`
      INSERT INTO router_results (
        indicator_id,
        family,
        confidence_family,
        reasoning
      ) VALUES (?, ?, ?, ?)
      ON CONFLICT(indicator_id) DO UPDATE SET
        family = excluded.family,
        confidence_family = excluded.confidence_family,
        reasoning = excluded.reasoning,
        created_at = CURRENT_TIMESTAMP
    `);

    for (const result of results) {
      stmt.run(
        result.indicator_id,
        result.family,
        result.confidence_family,
        result.reasoning || null
      );
    }
  });
}

/**
 * Read router results from database
 */
export function readRouterResults(
  db: V2DatabaseClient,
  indicatorIds?: string[]
): RouterResult[] {
  let query = `
    SELECT
      indicator_id,
      family,
      confidence_family,
      reasoning
    FROM router_results
  `;

  const params: string[] = [];

  if (indicatorIds && indicatorIds.length > 0) {
    const placeholders = indicatorIds.map(() => '?').join(',');
    query += ` WHERE indicator_id IN (${placeholders})`;
    params.push(...indicatorIds);
  }

  query += ' ORDER BY created_at ASC';

  const rows = db.prepare(query).all(...params);

  return rows.map((row: any) => ({
    indicator_id: row.indicator_id,
    family: row.family,
    confidence_family: row.confidence_family,
    reasoning: row.reasoning,
  }));
}

/**
 * Check if indicator has been routed
 */
export function hasRouterResult(
  db: V2DatabaseClient,
  indicatorId: string
): boolean {
  const result = db
    .prepare('SELECT 1 FROM router_results WHERE indicator_id = ? LIMIT 1')
    .value(indicatorId);

  return result !== undefined;
}

/**
 * Get indicators that need routing (not yet routed)
 */
export function getIndicatorsNeedingRouting(
  db: V2DatabaseClient,
  allIndicators: Indicator[]
): Indicator[] {
  const needsRouting: Indicator[] = [];

  for (const indicator of allIndicators) {
    if (indicator.id && !hasRouterResult(db, indicator.id)) {
      needsRouting.push(indicator);
    }
  }

  return needsRouting;
}

/**
 * Update main classifications table with indicator metadata
 */
export function updateClassificationsMetadata(
  db: V2DatabaseClient,
  indicators: Indicator[]
): void {
  if (indicators.length === 0) return;

  db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO classifications (
        indicator_id,
        name,
        units,
        description
      ) VALUES (?, ?, ?, ?)
      ON CONFLICT(indicator_id) DO UPDATE SET
        name = COALESCE(excluded.name, name),
        units = COALESCE(excluded.units, units),
        description = COALESCE(excluded.description, description),
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const indicator of indicators) {
      if (indicator.id) {
        stmt.run(
          indicator.id,
          indicator.name || '',
          indicator.units || null,
          indicator.description || null
        );
      }
    }
  });
}
