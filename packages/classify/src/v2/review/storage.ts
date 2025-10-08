/**
 * Review Stage Storage Layer
 * @module
 */

import type { V2DatabaseClient } from "../db/client.ts";
import type { FlaggedIndicator, ReviewDecision } from "../types.ts";

/**
 * Write flagging results to database (upsert)
 */
export function writeFlaggingResults(
  db: V2DatabaseClient,
  flaggedIndicators: FlaggedIndicator[],
): void {
  if (flaggedIndicators.length === 0) return;

  db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO flagging_results (
        indicator_id,
        flag_type,
        flag_reason,
        current_value,
        expected_value,
        confidence
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(indicator_id, flag_type) DO UPDATE SET
        flag_reason = excluded.flag_reason,
        current_value = excluded.current_value,
        expected_value = excluded.expected_value,
        confidence = excluded.confidence,
        flagged_at = CURRENT_TIMESTAMP
    `);

    for (const flagged of flaggedIndicators) {
      stmt.run(
        flagged.indicator_id,
        flagged.flag_type,
        flagged.flag_reason,
        flagged.current_value || null,
        flagged.expected_value || null,
        flagged.confidence ?? null,
      );
    }
  });
}

/**
 * Write review decisions to database (upsert)
 */
export function writeReviewDecisions(
  db: V2DatabaseClient,
  decisions: ReviewDecision[],
): void {
  if (decisions.length === 0) return;

  db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO review_decisions (
        indicator_id,
        action,
        diff_json,
        reason,
        confidence
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(indicator_id) DO UPDATE SET
        action = excluded.action,
        diff_json = excluded.diff_json,
        reason = excluded.reason,
        confidence = excluded.confidence,
        reviewed_at = CURRENT_TIMESTAMP
    `);

    for (const decision of decisions) {
      stmt.run(
        decision.indicator_id,
        decision.action,
        decision.diff ? JSON.stringify(decision.diff) : null,
        decision.reason,
        decision.confidence,
      );
    }

    // Also update classifications table review_status
    const updateClassifications = db.prepare(`
      UPDATE classifications
      SET
        review_status = ?,
        review_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE indicator_id = ?
    `);

    for (const decision of decisions) {
      updateClassifications.run(
        decision.action,
        decision.reason,
        decision.indicator_id,
      );
    }
  });
}

/**
 * Apply review diff to classifications table
 */
export function applyReviewDiff(
  db: V2DatabaseClient,
  indicatorId: string,
  diff: Record<string, any>,
  reason: string,
): void {
  db.transaction(() => {
    // Build dynamic UPDATE query from diff fields
    const fields = Object.keys(diff);
    if (fields.length === 0) return;

    const setClauses = fields.map((field) => `${field} = ?`).join(", ");
    const values = fields.map((field) => diff[field]);

    const query = `
      UPDATE classifications
      SET
        ${setClauses},
        review_status = 'fix',
        review_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE indicator_id = ?
    `;

    db.prepare(query).run(...values, reason, indicatorId);
  });
}

/**
 * Read flagged indicators from database (with indicator names)
 * Returns one record per unique indicator (deduplicated)
 */
export function readFlaggedIndicators(
  db: V2DatabaseClient,
  indicatorIds?: string[],
): Array<FlaggedIndicator & { name: string }> {
  // Get unique indicators with their first flag (aggregating all flag info)
  let query = `
    SELECT
      f.indicator_id,
      f.flag_type,
      GROUP_CONCAT(f.flag_reason, '; ') as flag_reason,
      f.current_value,
      f.expected_value,
      MIN(f.confidence) as confidence,
      MIN(f.flagged_at) as flagged_at,
      c.name
    FROM flagging_results f
    JOIN classifications c ON f.indicator_id = c.indicator_id
    LEFT JOIN review_decisions r ON f.indicator_id = r.indicator_id
    WHERE r.indicator_id IS NULL
  `;

  const params: string[] = [];

  if (indicatorIds && indicatorIds.length > 0) {
    const placeholders = indicatorIds.map(() => "?").join(",");
    query += ` AND f.indicator_id IN (${placeholders})`;
    params.push(...indicatorIds);
  }

  query += " GROUP BY f.indicator_id ORDER BY MIN(f.flagged_at) ASC";

  const rows = db.prepare(query).all(...params);

  return rows.map((row: any) => ({
    indicator_id: row.indicator_id,
    flag_type: row.flag_type,
    flag_reason: row.flag_reason,
    current_value: row.current_value,
    expected_value: row.expected_value,
    confidence: row.confidence,
    flagged_at: row.flagged_at,
    name: row.name,
  }));
}

/**
 * Read review decisions from database
 */
export function readReviewDecisions(
  db: V2DatabaseClient,
  indicatorIds?: string[],
): ReviewDecision[] {
  let query = `
    SELECT
      indicator_id,
      action,
      diff_json,
      reason,
      confidence
    FROM review_decisions
  `;

  const params: string[] = [];

  if (indicatorIds && indicatorIds.length > 0) {
    const placeholders = indicatorIds.map(() => "?").join(",");
    query += ` WHERE indicator_id IN (${placeholders})`;
    params.push(...indicatorIds);
  }

  query += " ORDER BY reviewed_at ASC";

  const rows = db.prepare(query).all(...params);

  return rows.map((row: any) => ({
    indicator_id: row.indicator_id,
    action: row.action,
    diff: row.diff_json ? JSON.parse(row.diff_json) : undefined,
    reason: row.reason,
    confidence: row.confidence,
  }));
}

/**
 * Check if indicator has been flagged
 */
export function isFlagged(
  db: V2DatabaseClient,
  indicatorId: string,
): boolean {
  const result = db
    .prepare(
      "SELECT 1 FROM flagging_results WHERE indicator_id = ? LIMIT 1",
    )
    .value(indicatorId);

  return result !== undefined;
}

/**
 * Check if indicator has been reviewed
 */
export function hasReviewDecision(
  db: V2DatabaseClient,
  indicatorId: string,
): boolean {
  const result = db
    .prepare(
      "SELECT 1 FROM review_decisions WHERE indicator_id = ? LIMIT 1",
    )
    .value(indicatorId);

  return result !== undefined;
}

/**
 * Get escalated indicators (require human review)
 */
export function getEscalatedIndicators(
  db: V2DatabaseClient,
): Array<{ indicator_id: string; name: string; reason: string }> {
  const query = `
    SELECT
      r.indicator_id,
      c.name,
      r.reason
    FROM review_decisions r
    JOIN classifications c ON r.indicator_id = c.indicator_id
    WHERE r.action = 'escalate'
    ORDER BY r.created_at DESC
  `;

  const rows = db.prepare(query).all();

  return rows.map((row: any) => ({
    indicator_id: row.indicator_id,
    name: row.name,
    reason: row.reason,
  }));
}
