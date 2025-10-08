/**
 * Orientation Stage Storage Layer
 * @module
 */

import type { V2DatabaseClient } from '../db/client.ts';
import type { OrientationResult } from '../types.ts';

/**
 * Write orientation results to database (upsert)
 */
export function writeOrientationResults(
  db: V2DatabaseClient,
  results: OrientationResult[]
): void {
  if (results.length === 0) return;

  db.transaction(() => {
    // First update main classifications table (parent table)
    const updateClassifications = db.prepare(`
      UPDATE classifications
      SET
        heat_map_orientation = ?,
        confidence_orient = ?,
        reasoning_orientation = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE indicator_id = ?
    `);

    for (const result of results) {
      updateClassifications.run(
        result.heat_map_orientation,
        result.confidence_orient,
        result.reasoning || null,
        result.indicator_id
      );
    }

    // Then insert/update orientation_results table (child table with FK to classifications)
    const stmt = db.prepare(`
      INSERT INTO orientation_results (
        indicator_id,
        heat_map_orientation,
        confidence_orient,
        reasoning
      ) VALUES (?, ?, ?, ?)
      ON CONFLICT(indicator_id) DO UPDATE SET
        heat_map_orientation = excluded.heat_map_orientation,
        confidence_orient = excluded.confidence_orient,
        reasoning = excluded.reasoning,
        created_at = CURRENT_TIMESTAMP
    `);

    for (const result of results) {
      stmt.run(
        result.indicator_id,
        result.heat_map_orientation,
        result.confidence_orient,
        result.reasoning || null
      );
    }
  });
}

/**
 * Read orientation results from database
 */
export function readOrientationResults(
  db: V2DatabaseClient,
  indicatorIds?: string[]
): OrientationResult[] {
  let query = `
    SELECT
      indicator_id,
      heat_map_orientation,
      confidence_orient,
      reasoning
    FROM orientation_results
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
    heat_map_orientation: row.heat_map_orientation,
    confidence_orient: row.confidence_orient,
    reasoning: row.reasoning,
  }));
}

/**
 * Check if indicator has orientation result
 */
export function hasOrientationResult(
  db: V2DatabaseClient,
  indicatorId: string
): boolean {
  const result = db
    .prepare(
      'SELECT 1 FROM orientation_results WHERE indicator_id = ? LIMIT 1'
    )
    .value(indicatorId);

  return result !== undefined;
}
