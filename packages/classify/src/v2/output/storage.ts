/**
 * Output Stage Storage Layer
 * Reads and writes final classifications to database
 * @module
 */

import type { V2DatabaseClient } from '../db/client.ts';
import type { V2Classification } from '../types.ts';
import type { ClassificationData } from '../types.ts';

/**
 * Read final classifications from database
 */
export function readClassifications(
  db: V2DatabaseClient,
  indicatorIds?: string[]
): V2Classification[] {
  let query = `
    SELECT
      indicator_id,
      name,
      units,
      description,
      family,
      confidence_family,
      reasoning_router,
      indicator_type,
      temporal_aggregation,
      is_monetary,
      confidence_cls,
      reasoning_specialist,
      heat_map_orientation,
      confidence_orient,
      review_status,
      review_reason,
      provider,
      model,
      prompt_version,
      created_at,
      updated_at
    FROM classifications
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
    name: row.name,
    units: row.units,
    description: row.description,
    family: row.family,
    confidence_family: row.confidence_family,
    reasoning_router: row.reasoning_router,
    indicator_type: row.indicator_type,
    temporal_aggregation: row.temporal_aggregation,
    is_monetary: row.is_monetary === 1,
    confidence_cls: row.confidence_cls,
    reasoning_specialist: row.reasoning_specialist,
    heat_map_orientation: row.heat_map_orientation,
    confidence_orient: row.confidence_orient,
    review_status: row.review_status,
    review_reason: row.review_reason,
    provider: row.provider,
    model: row.model,
    prompt_version: row.prompt_version,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Read a single classification
 */
export function readClassification(
  db: V2DatabaseClient,
  indicatorId: string
): V2Classification | null {
  const results = readClassifications(db, [indicatorId]);
  return results[0] || null;
}

/**
 * Write classifications to database (upsert)
 */
export function writeClassifications(
  db: V2DatabaseClient,
  classifications: ClassificationData[],
  provider: string,
  model: string
): void {
  const stmt = db.prepare(`
    INSERT INTO classifications (
      indicator_id,
      name,
      units,
      description,
      family,
      confidence_family,
      indicator_type,
      temporal_aggregation,
      is_monetary,
      confidence_cls,
      heat_map_orientation,
      confidence_orient,
      review_status,
      review_reason,
      provider,
      model,
      prompt_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(indicator_id) DO UPDATE SET
      indicator_type = excluded.indicator_type,
      temporal_aggregation = excluded.temporal_aggregation,
      is_monetary = excluded.is_monetary,
      confidence_cls = excluded.confidence_cls,
      heat_map_orientation = excluded.heat_map_orientation,
      confidence_orient = excluded.confidence_orient,
      review_status = excluded.review_status,
      review_reason = excluded.review_reason,
      provider = excluded.provider,
      model = excluded.model,
      prompt_version = excluded.prompt_version,
      updated_at = CURRENT_TIMESTAMP
  `);

  for (const cls of classifications) {
    stmt.run(
      cls.indicator_id,
      cls.name,
      cls.units || null,
      cls.description || null,
      cls.family,
      cls.confidence_family,
      cls.indicator_type,
      cls.temporal_aggregation,
      cls.is_monetary !== undefined ? (cls.is_monetary ? 1 : 0) : null,
      cls.confidence_cls,
      cls.heat_map_orientation,
      cls.confidence_orient,
      cls.review_status || null,
      cls.review_reason || null,
      provider,
      model,
      'v2' // prompt version
    );
  }
}

/**
 * Get classification statistics
 */
export function getClassificationStats(db: V2DatabaseClient): {
  total: number;
  byFamily: Record<string, number>;
  byType: Record<string, number>;
  byOrientation: Record<string, number>;
  reviewed: number;
  escalated: number;
} {
  const totalResult = db.prepare('SELECT COUNT(*) as count FROM classifications').value();
  const total = (totalResult as any)?.[0] || 0;

  const byFamily: Record<string, number> = {};
  const familyRows = db.prepare('SELECT family, COUNT(*) as count FROM classifications GROUP BY family').all();
  for (const row of familyRows as any[]) {
    byFamily[row.family] = row.count;
  }

  const byType: Record<string, number> = {};
  const typeRows = db.prepare('SELECT indicator_type, COUNT(*) as count FROM classifications GROUP BY indicator_type').all();
  for (const row of typeRows as any[]) {
    byType[row.indicator_type] = row.count;
  }

  const byOrientation: Record<string, number> = {};
  const orientRows = db.prepare('SELECT heat_map_orientation, COUNT(*) as count FROM classifications GROUP BY heat_map_orientation').all();
  for (const row of orientRows as any[]) {
    byOrientation[row.heat_map_orientation] = row.count;
  }

  const reviewedResult = db.prepare('SELECT COUNT(*) as count FROM classifications WHERE review_status IS NOT NULL').value();
  const reviewed = (reviewedResult as any)?.[0] || 0;

  const escalatedResult = db.prepare("SELECT COUNT(*) as count FROM classifications WHERE review_status = 'escalate'").value();
  const escalated = (escalatedResult as any)?.[0] || 0;

  return {
    total,
    byFamily,
    byType,
    byOrientation,
    reviewed,
    escalated,
  };
}
