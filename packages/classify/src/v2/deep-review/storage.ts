/**
 * Deep Review Stage Storage Layer
 * @module
 */

import type { V2DatabaseClient } from "../db/client.ts";
import type {
  ClassifiedMetadata,
  DeepReviewDecision,
  SuggestedFix,
} from "../types.ts";

/**
 * Read suggested fixes from review_decisions table
 * Returns indicators where action = 'suggest-fix'
 */
export function readSuggestedFixes(
  db: V2DatabaseClient,
): SuggestedFix[] {
  const query = `
    SELECT
      r.indicator_id,
      r.diff_json as suggested_diff_json,
      r.reason as review_reason,
      r.confidence as review_confidence,
      c.name as indicator_name,
      c.family,
      c.indicator_type,
      c.temporal_aggregation,
      c.is_currency_denominated,
      c.heat_map_orientation,
      c.units,
      c.description
    FROM review_decisions r
    JOIN classifications c ON r.indicator_id = c.indicator_id
    LEFT JOIN deep_review_decisions d ON r.indicator_id = d.indicator_id
    WHERE r.action = 'suggest-fix'
      AND d.indicator_id IS NULL
    ORDER BY r.reviewed_at ASC
  `;

  const rows = db.prepare(query).all();

  return rows.map((row: any) => {
    const original_classification: ClassifiedMetadata = {
      family: row.family,
      indicator_type: row.indicator_type,
      temporal_aggregation: row.temporal_aggregation,
      is_currency_denominated: row.is_currency_denominated === 1,
      heat_map_orientation: row.heat_map_orientation,
    };

    const suggested_diff = row.suggested_diff_json
      ? JSON.parse(row.suggested_diff_json)
      : {};

    // Fetch sample values for this indicator
    const sampleQuery = `
      SELECT sample_values
      FROM classifications
      WHERE indicator_id = ?
    `;
    const sampleRow: any = db.prepare(sampleQuery).get(row.indicator_id);
    const sample_values = sampleRow?.sample_values
      ? JSON.parse(sampleRow.sample_values)
      : undefined;

    return {
      indicator_id: row.indicator_id,
      original_classification,
      suggested_diff,
      review_reason: row.review_reason,
      review_confidence: row.review_confidence,
      indicator_name: row.indicator_name,
      indicator_context: {
        units: row.units,
        description: row.description,
        sample_values,
      },
    };
  });
}

/**
 * Write deep review decisions to database
 */
export function writeDeepReviewDecisions(
  db: V2DatabaseClient,
  decisions: DeepReviewDecision[],
): void {
  if (decisions.length === 0) return;

  db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO deep_review_decisions (
        indicator_id,
        action,
        reason,
        confidence,
        final_diff_json
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(indicator_id) DO UPDATE SET
        action = excluded.action,
        reason = excluded.reason,
        confidence = excluded.confidence,
        final_diff_json = excluded.final_diff_json,
        deep_reviewed_at = CURRENT_TIMESTAMP
    `);

    for (const decision of decisions) {
      stmt.run(
        decision.indicator_id,
        decision.action,
        decision.reason,
        decision.confidence,
        decision.final_diff ? JSON.stringify(decision.final_diff) : null,
      );
    }
  });
}

/**
 * Apply accepted fixes to classifications table
 */
export function applyAcceptedFixes(
  db: V2DatabaseClient,
  decisions: DeepReviewDecision[],
): void {
  const acceptedFixes = decisions.filter((d) => d.action === "accept-fix");
  if (acceptedFixes.length === 0) return;

  db.transaction(() => {
    for (const decision of acceptedFixes) {
      if (!decision.final_diff) continue;

      const diff = decision.final_diff;
      const fields = Object.keys(diff);
      if (fields.length === 0) continue;

      const setClauses = fields.map((field) => `${field} = ?`).join(", ");
      const values = fields.map((field) => (diff as any)[field]);

      const query = `
        UPDATE classifications
        SET
          ${setClauses},
          review_status = 'accept-fix',
          review_reason = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE indicator_id = ?
      `;

      db.prepare(query).run(...values, decision.reason, decision.indicator_id);
    }
  });
}

/**
 * Get escalated indicators from deep review
 */
export function getDeepReviewEscalated(
  db: V2DatabaseClient,
): Array<{ indicator_id: string; name: string; reason: string }> {
  const query = `
    SELECT
      d.indicator_id,
      c.name,
      d.reason
    FROM deep_review_decisions d
    JOIN classifications c ON d.indicator_id = c.indicator_id
    WHERE d.action = 'escalate'
    ORDER BY d.deep_reviewed_at DESC
  `;

  const rows = db.prepare(query).all();

  return rows.map((row: any) => ({
    indicator_id: row.indicator_id,
    name: row.name,
    reason: row.reason,
  }));
}

/**
 * Get all escalated indicators (from both review and deep-review)
 */
export function getAllEscalated(
  db: V2DatabaseClient,
): Array<
  {
    indicator_id: string;
    name: string;
    reason: string;
    stage: string;
  }
> {
  const query = `
    SELECT
      r.indicator_id,
      c.name,
      r.reason,
      'review' as stage
    FROM review_decisions r
    JOIN classifications c ON r.indicator_id = c.indicator_id
    WHERE r.action = 'escalate'

    UNION ALL

    SELECT
      d.indicator_id,
      c.name,
      d.reason,
      'deep-review' as stage
    FROM deep_review_decisions d
    JOIN classifications c ON d.indicator_id = c.indicator_id
    WHERE d.action = 'escalate'

    ORDER BY indicator_id
  `;

  const rows = db.prepare(query).all();

  return rows.map((row: any) => ({
    indicator_id: row.indicator_id,
    name: row.name,
    reason: row.reason,
    stage: row.stage,
  }));
}
