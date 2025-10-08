/**
 * Validation Results Storage
 * @module
 */

import type { V2DatabaseClient } from "../db/client.ts";
import type { ValidationResult } from "../types.ts";

/**
 * Write validation results to database
 */
export function writeValidationResults(
  db: V2DatabaseClient,
  results: ValidationResult[],
): void {
  if (results.length === 0) return;

  db.transaction(() => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO validation_results (
        indicator_id,
        is_cumulative,
        cumulative_confidence,
        has_seasonal_reset,
        is_monotonic_within_year,
        dec_jan_ratio,
        within_year_increase_pct,
        year_boundaries,
        reset_at_boundary_pct,
        suggested_temporal,
        validation_reasoning,
        data_points_analyzed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const result of results) {
      stmt.run(
        result.indicator_id,
        result.is_cumulative ? 1 : 0,
        result.cumulative_confidence,
        result.has_seasonal_reset ? 1 : 0,
        result.is_monotonic_within_year ? 1 : 0,
        result.dec_jan_ratio ?? null,
        result.within_year_increase_pct ?? null,
        result.year_boundaries ?? null,
        result.reset_at_boundary_pct ?? null,
        result.suggested_temporal ?? null,
        result.validation_reasoning,
        result.data_points_analyzed,
      );
    }

    stmt.finalize();
  });

  // Update classifications table with validation flags
  db.transaction(() => {
    const updateStmt = db.prepare(`
      UPDATE classifications
      SET validated = 1,
          validation_confidence = ?
      WHERE indicator_id = ?
    `);

    for (const result of results) {
      updateStmt.run(result.cumulative_confidence, result.indicator_id);
    }

    updateStmt.finalize();
  });
}

/**
 * Read validation results from database
 */
export function readValidationResults(
  db: V2DatabaseClient,
  indicatorIds: string[],
): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  if (indicatorIds.length === 0) return results;

  const placeholders = indicatorIds.map(() => "?").join(",");
  const stmt = db.prepare(`
    SELECT * FROM validation_results
    WHERE indicator_id IN (${placeholders})
  `);

  const rows = stmt.all(...indicatorIds) as any[];
  stmt.finalize();

  for (const row of rows) {
    results.set(row.indicator_id, {
      indicator_id: row.indicator_id,
      is_cumulative: Boolean(row.is_cumulative),
      cumulative_confidence: row.cumulative_confidence,
      has_seasonal_reset: Boolean(row.has_seasonal_reset),
      is_monotonic_within_year: Boolean(row.is_monotonic_within_year),
      dec_jan_ratio: row.dec_jan_ratio,
      within_year_increase_pct: row.within_year_increase_pct,
      year_boundaries: row.year_boundaries,
      reset_at_boundary_pct: row.reset_at_boundary_pct,
      suggested_temporal: row.suggested_temporal,
      validation_reasoning: row.validation_reasoning,
      data_points_analyzed: row.data_points_analyzed,
    });
  }

  return results;
}
