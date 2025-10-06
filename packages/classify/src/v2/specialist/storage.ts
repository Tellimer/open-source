/**
 * Specialist Stage Storage Layer
 * @module
 */

import type { V2DatabaseClient } from '../db/client.ts';
import type { SpecialistResult } from '../types.ts';
import { INDICATOR_TYPE_TO_CATEGORY } from '../../types.ts';

/**
 * Write specialist results to database (upsert)
 */
export function writeSpecialistResults(
  db: V2DatabaseClient,
  results: SpecialistResult[]
): void {
  if (results.length === 0) return;

  db.transaction(() => {
    // Get family from classifications table (set by router)
    const getFamilyStmt = db.prepare(`
      SELECT family FROM classifications WHERE indicator_id = ?
    `);

    const stmt = db.prepare(`
      INSERT INTO specialist_results (
        indicator_id,
        indicator_type,
        indicator_category,
        temporal_aggregation,
        is_monetary,
        confidence_cls,
        family,
        reasoning
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(indicator_id) DO UPDATE SET
        indicator_type = excluded.indicator_type,
        indicator_category = excluded.indicator_category,
        temporal_aggregation = excluded.temporal_aggregation,
        is_monetary = excluded.is_monetary,
        confidence_cls = excluded.confidence_cls,
        family = excluded.family,
        reasoning = excluded.reasoning,
        created_at = CURRENT_TIMESTAMP
    `);

    for (const result of results) {
      const category = INDICATOR_TYPE_TO_CATEGORY[result.indicator_type];
      const familyRow = getFamilyStmt.get(result.indicator_id) as any;
      const family = familyRow?.family || 'qualitative';

      stmt.run(
        result.indicator_id,
        result.indicator_type,
        category,
        result.temporal_aggregation,
        result.is_monetary ? 1 : 0,
        result.confidence_cls,
        family,
        result.reasoning || null
      );
    }

    // Also update main classifications table
    const updateClassifications = db.prepare(`
      UPDATE classifications
      SET
        indicator_type = ?,
        temporal_aggregation = ?,
        is_monetary = ?,
        confidence_cls = ?,
        reasoning_specialist = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE indicator_id = ?
    `);

    for (const result of results) {
      updateClassifications.run(
        result.indicator_type,
        result.temporal_aggregation,
        result.is_monetary ? 1 : 0,
        result.confidence_cls,
        result.reasoning || null,
        result.indicator_id
      );
    }
  });
}

/**
 * Read specialist results from database
 */
export function readSpecialistResults(
  db: V2DatabaseClient,
  indicatorIds?: string[]
): SpecialistResult[] {
  let query = `
    SELECT
      indicator_id,
      indicator_type,
      indicator_category,
      temporal_aggregation,
      is_monetary,
      confidence_cls,
      reasoning
    FROM specialist_results
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
    indicator_type: row.indicator_type,
    indicator_category: row.indicator_category,
    temporal_aggregation: row.temporal_aggregation,
    is_monetary: row.is_monetary === 1,
    confidence_cls: row.confidence_cls,
    reasoning: row.reasoning,
  }));
}

/**
 * Check if indicator has specialist result
 */
export function hasSpecialistResult(
  db: V2DatabaseClient,
  indicatorId: string
): boolean {
  const result = db
    .prepare(
      'SELECT 1 FROM specialist_results WHERE indicator_id = ? LIMIT 1'
    )
    .value(indicatorId);

  return result !== undefined;
}
