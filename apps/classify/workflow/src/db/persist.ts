/**
 * Database persistence helpers for classification results
 * @module
 */

import type { DatabaseClient } from "./types.ts";

/**
 * Initialize batch statistics tracking
 */
export function startBatchStats(
  db: DatabaseClient,
  data: {
    batch_id: string;
    total_indicators: number;
    model: string;
    provider: string;
  },
): void {
  // Skip stats tracking for PostgreSQL to avoid sync issues
  // This is a temporary workaround until we refactor to async
  const dbType = (db as any).constructor.name;
  if (dbType === "PostgresClient") {
    console.log("[DB] Skipping batch stats for PostgreSQL (async limitation)");
    return;
  }

  const sql = `
    INSERT INTO pipeline_stats (
      batch_id, model, provider, total_indicators,
      batch_start_time, created_at, updated_at
    ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
  `;

  const stmt = db.prepare(sql);
  stmt.run([data.batch_id, data.model, data.provider, data.total_indicators]);
}

/**
 * Update batch statistics when complete
 */
export function completeBatchStats(
  db: DatabaseClient,
  batch_id: string,
): void {
  // Skip stats tracking for PostgreSQL to avoid sync issues
  const dbType = (db as any).constructor.name;
  if (dbType === "PostgresClient") {
    console.log(
      "[DB] Skipping batch completion stats for PostgreSQL (async limitation)",
    );
    return;
  }
  // Calculate stats from completed classifications
  const statsQuery = `
    SELECT
      COUNT(*) as completed,
      AVG(overall_confidence) as avg_confidence,
      (julianday(MAX(updated_at)) - julianday(MIN(created_at))) * 24 * 60 * 60 * 1000 as duration_ms
    FROM classifications
    WHERE provider = (SELECT provider FROM pipeline_stats WHERE batch_id = ?)
      AND datetime(created_at) >= (SELECT batch_start_time FROM pipeline_stats WHERE batch_id = ?)
  `;

  const stmt = db.prepare(statsQuery);
  const stats = stmt.get([batch_id, batch_id]) as any;

  // Update batch stats
  const updateSql = `
    UPDATE pipeline_stats
    SET
      successful_indicators = ?,
      batch_end_time = datetime('now'),
      total_duration_ms = ?,
      avg_time_per_indicator_ms = CASE
        WHEN ? > 0 THEN CAST(? AS INTEGER) / ?
        ELSE NULL
      END,
      avg_confidence = ?,
      updated_at = datetime('now')
    WHERE batch_id = ?
  `;

  const updateStmt = db.prepare(updateSql);
  updateStmt.run([
    stats.completed || 0,
    stats.duration_ms || 0,
    stats.completed || 0,
    stats.duration_ms || 0,
    stats.completed || 0,
    stats.avg_confidence || null,
    batch_id,
  ]);
}

/**
 * Save final classification to database
 */
export function saveFinalClassification(
  db: Database.Database,
  data: {
    indicator_id: string;
    name: string;
    // Source metadata
    original_units?: string;
    source_name?: string;
    long_name?: string;
    category_group?: string;
    dataset?: string;
    topic?: string;
    source_scale?: string;
    source_periodicity?: string;
    aggregation_method?: string;
    source_currency_code?: string;
    // Normalization
    parsed_scale?: string;
    parsed_unit_type?: string;
    parsed_currency?: string;
    parsing_confidence?: number;
    // Time inference
    reporting_frequency?: string;
    time_basis?: string;
    time_confidence?: number;
    time_reasoning?: string;
    time_source_used?: string;
    // Cumulative detection
    is_cumulative?: boolean;
    cumulative_pattern_type?: string;
    cumulative_confidence?: number;
    cumulative_reasoning?: string;
    // Scale inference
    scale?: string;
    scale_confidence?: number;
    scale_reasoning?: string;
    // Currency check
    is_currency_denominated?: boolean;
    detected_currency?: string;
    currency_confidence?: number;
    currency_reasoning?: string;
    // Family assignment
    family?: string;
    family_confidence?: number;
    family_reasoning?: string;
    // Type classification
    indicator_type?: string;
    temporal_aggregation?: string;
    heat_map_orientation?: string;
    type_confidence?: number;
    type_reasoning?: string;
    // Boolean review
    boolean_review_passed?: boolean;
    boolean_review_fields_wrong?: string[];
    boolean_review_reason?: string;
    boolean_review_confidence?: number;
    // Final review
    final_review_status?: string;
    final_review_corrections?: Record<string, unknown>;
    final_review_reason?: string;
    final_review_confidence?: number;
    // Overall
    overall_confidence?: number;
    review_status?: string;
    provider?: string;
    model?: string;
  },
): void {
  const sql = `
    INSERT OR REPLACE INTO classifications (
      indicator_id, name,
      original_units, source_name, long_name, category_group, dataset, topic,
      source_scale, source_periodicity, aggregation_method, source_currency_code,
      parsed_scale, parsed_unit_type, parsed_currency, parsing_confidence,
      reporting_frequency, time_basis, time_confidence, time_reasoning, time_source_used,
      is_cumulative, cumulative_pattern_type, cumulative_confidence, cumulative_reasoning,
      scale, scale_confidence, scale_reasoning,
      is_currency_denominated, detected_currency, currency_confidence, currency_reasoning,
      family, family_confidence, family_reasoning,
      indicator_type, temporal_aggregation, heat_map_orientation, type_confidence, type_reasoning,
      boolean_review_passed, boolean_review_fields_wrong, boolean_review_reason, boolean_review_confidence,
      final_review_status, final_review_corrections, final_review_reason, final_review_confidence,
      overall_confidence, review_status, provider, model,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;

  const stmt = db.prepare(sql);
  stmt.run(
    data.indicator_id,
    data.name,
    data.original_units ?? null,
    data.source_name ?? null,
    data.long_name ?? null,
    data.category_group ?? null,
    data.dataset ?? null,
    data.topic ?? null,
    data.source_scale ?? null,
    data.source_periodicity ?? null,
    data.aggregation_method ?? null,
    data.source_currency_code ?? null,
    data.parsed_scale ?? null,
    data.parsed_unit_type ?? null,
    data.parsed_currency ?? null,
    data.parsing_confidence ?? null,
    data.reporting_frequency ?? null,
    data.time_basis ?? null,
    data.time_confidence ?? null,
    data.time_reasoning ?? null,
    data.time_source_used ?? null,
    data.is_cumulative !== undefined ? data.is_cumulative ? 1 : 0 : null,
    data.cumulative_pattern_type ?? null,
    data.cumulative_confidence ?? null,
    data.cumulative_reasoning ?? null,
    data.scale ?? null,
    data.scale_confidence ?? null,
    data.scale_reasoning ?? null,
    data.is_currency_denominated !== undefined
      ? data.is_currency_denominated ? 1 : 0
      : null,
    data.detected_currency ?? null,
    data.currency_confidence ?? null,
    data.currency_reasoning ?? null,
    data.family ?? null,
    data.family_confidence ?? null,
    data.family_reasoning ?? null,
    data.indicator_type ?? null,
    data.temporal_aggregation ?? null,
    data.heat_map_orientation ?? null,
    data.type_confidence ?? null,
    data.type_reasoning ?? null,
    data.boolean_review_passed !== undefined
      ? data.boolean_review_passed ? 1 : 0
      : null,
    data.boolean_review_fields_wrong
      ? JSON.stringify(data.boolean_review_fields_wrong)
      : null,
    data.boolean_review_reason ?? null,
    data.boolean_review_confidence ?? null,
    data.final_review_status ?? null,
    data.final_review_corrections
      ? JSON.stringify(data.final_review_corrections)
      : null,
    data.final_review_reason ?? null,
    data.final_review_confidence ?? null,
    data.overall_confidence ?? null,
    data.review_status ?? null,
    data.provider ?? null,
    data.model ?? null,
  );
}

/**
 * Log processing event
 */
export function logProcessing(
  db: Database.Database,
  data: {
    indicator_id: string;
    stage: string;
    status: "started" | "completed" | "failed";
    error_message?: string;
    processing_time_ms?: number;
  },
): void {
  const sql = `
    INSERT INTO processing_log (
      indicator_id, stage, status, error_message, processing_time_ms
    ) VALUES (?, ?, ?, ?, ?)
  `;

  const stmt = db.prepare(sql);
  stmt.run(
    data.indicator_id,
    data.stage,
    data.status,
    data.error_message ?? null,
    data.processing_time_ms ?? null,
  );
}

/**
 * Save stage-specific result
 */
export function saveStageResult(
  db: Database.Database,
  stage: string,
  indicator_id: string,
  data: Record<string, unknown>,
): void {
  const tableMap: Record<string, string> = {
    normalize: "normalization_results",
    time: "time_inference_results",
    "cumulative-detection": "cumulative_detection_results",
    scale: "scale_inference_results",
    currency: "currency_check_results",
    family: "family_assignment_results",
    type: "type_classification_results",
    "boolean-review": "boolean_review_results",
    "final-review": "final_review_results",
  };

  const table = tableMap[stage];
  if (!table) {
    throw new Error(`Unknown stage: ${stage}`);
  }

  // Build dynamic INSERT OR REPLACE query
  const columns = ["indicator_id", ...Object.keys(data)];
  const placeholders = columns.map(() => "?").join(", ");
  const values = [
    indicator_id,
    ...Object.values(data).map((v) => {
      // Convert booleans to 0/1 for SQLite
      if (typeof v === "boolean") return v ? 1 : 0;
      // Convert objects to JSON
      if (typeof v === "object" && v !== null) return JSON.stringify(v);
      // Return primitives as-is
      return v;
    }),
  ];

  const sql = `
    INSERT OR REPLACE INTO ${table} (${columns.join(", ")})
    VALUES (${placeholders})
  `;

  const stmt = db.prepare(sql);
  stmt.run(...values);
}

/**
 * Get classification by indicator ID
 */
export function getClassification(
  db: Database.Database,
  indicator_id: string,
): Record<string, unknown> | null {
  const sql = "SELECT * FROM classifications WHERE indicator_id = ?";
  const stmt = db.prepare(sql);
  const row = stmt.get(indicator_id);

  return row as Record<string, unknown> | null;
}

/**
 * Get all classifications with optional filters
 */
export function getClassifications(
  db: Database.Database,
  filters?: {
    family?: string;
    indicator_type?: string;
    review_status?: string;
    limit?: number;
    offset?: number;
  },
): Array<Record<string, unknown>> {
  let sql = "SELECT * FROM classifications WHERE 1=1";
  const params: unknown[] = [];

  if (filters?.family) {
    sql += " AND family = ?";
    params.push(filters.family);
  }
  if (filters?.indicator_type) {
    sql += " AND indicator_type = ?";
    params.push(filters.indicator_type);
  }
  if (filters?.review_status) {
    sql += " AND review_status = ?";
    params.push(filters.review_status);
  }

  sql += " ORDER BY created_at DESC";

  if (filters?.limit) {
    sql += " LIMIT ?";
    params.push(filters.limit);
  }
  if (filters?.offset) {
    sql += " OFFSET ?";
    params.push(filters.offset);
  }

  const stmt = db.prepare(sql);
  const results = stmt.all(...params);

  return results as Array<Record<string, unknown>>;
}
