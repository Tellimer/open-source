/**
 * Database Repository - Unified abstraction for database operations
 * Provides async methods that work with both SQLite and PostgreSQL
 * @module
 */

import { getDatabaseType } from "./client.ts";
import type { DatabaseClient } from "./types.ts";

/**
 * Database Repository
 * Provides async methods for database operations that work across SQLite and PostgreSQL
 */
export class DatabaseRepository {
  constructor(private db: DatabaseClient) {}

  // transient TLS/ECONNRESET retry wrapper for postgres.js
  private async retry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (e: any) {
        if (attempt >= 2) throw e;
        if (
          e &&
          (e.code === "ECONNRESET" || /TLS|ssl/i.test(String(e.message)))
        ) {
          await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
          attempt++;
          continue;
        }
        throw e;
      }
    }
  }

  /**
   * Execute a query and return all results
   */
  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const dbType = getDatabaseType();

    if (dbType === "postgres") {
      // Use underlying postgres driver directly for true async
      const sqlClient: any = (this.db as any).getSql?.();
      if (!sqlClient) {
        // Fallback to legacy path
        return Promise.resolve(this.db.query<T>(sql, params));
      }
      const rows = await this.retry(() =>
        params.length === 0
          ? sqlClient.unsafe(sql)
          : sqlClient.unsafe(sql, params)
      );
      return rows as T[];
    } else {
      // SQLite is synchronous, wrap in promise
      return Promise.resolve(this.db.query<T>(sql, params));
    }
  }

  /**
   * Execute a query and return first result
   */
  async queryOne<T = unknown>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute a statement (INSERT, UPDATE, DELETE)
   */
  async run(
    sql: string,
    params: unknown[] = [],
  ): Promise<{ changes: number; lastInsertRowid?: number }> {
    const dbType = getDatabaseType();

    if (dbType === "postgres") {
      const sqlClient: any = (this.db as any).getSql?.();
      if (!sqlClient) {
        return Promise.resolve(this.db.run(sql, params));
      }
      const result = await this.retry(() =>
        params.length === 0
          ? sqlClient.unsafe(sql)
          : sqlClient.unsafe(sql, params)
      );
      const count = result && typeof result.count === "number"
        ? result.count
        : 0;
      return { changes: count };
    } else {
      return Promise.resolve(this.db.run(sql, params));
    }
  }

  /**
   * Execute within a transaction
   */
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    // Use underlying postgres transaction when available for true async
    const dbType = getDatabaseType();
    if (dbType === "postgres") {
      const sqlClient: any = (this.db as any).getSql?.();
      if (sqlClient && typeof sqlClient.begin === "function") {
        return await sqlClient.begin(async (sql: any) => {
          // temporarily expose a shim for nested calls
          const originalGetSql = (this.db as any).getSql;
          (this.db as any).getSql = () => sql;
          try {
            return await fn();
          } finally {
            (this.db as any).getSql = originalGetSql;
          }
        });
      }
    }
    // Fallback
    return await this.db.transaction(fn);
  }

  /**
   * Save a stage result (generic stage saver)
   */
  async saveStageResult(
    stage: string,
    indicator_id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
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

    const tableName = tableMap[stage];
    if (!tableName) {
      throw new Error(`Unknown stage: ${stage}`);
    }

    const columns = ["indicator_id", ...Object.keys(data)];
    const values = [indicator_id, ...Object.values(data)];
    const dbType = getDatabaseType();

    let sql: string;

    if (dbType === "sqlite") {
      // SQLite: use ? placeholders
      const placeholders = columns.map(() => "?").join(", ");
      sql = `
        INSERT INTO ${tableName} (${columns.join(", ")})
        VALUES (${placeholders})
        ON CONFLICT (indicator_id) DO UPDATE SET
          ${
        Object.keys(data)
          .map((col) => `${col} = EXCLUDED.${col}`)
          .join(", ")
      }
      `;
    } else {
      // PostgreSQL: use $1, $2, etc. placeholders
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      sql = `
        INSERT INTO ${tableName} (${columns.join(", ")})
        VALUES (${placeholders})
        ON CONFLICT (indicator_id) DO UPDATE SET
          ${
        Object.keys(data)
          .map((col) => `${col} = EXCLUDED.${col}`)
          .join(", ")
      }
      `;
    }

    await this.run(sql, values);
  }

  /**
   * Get a stage result
   */
  async getStageResult<T = unknown>(
    stage: string,
    indicator_id: string,
  ): Promise<T | null> {
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

    const tableName = tableMap[stage];
    if (!tableName) {
      throw new Error(`Unknown stage: ${stage}`);
    }

    const dbType = getDatabaseType();
    const sql = dbType === "sqlite"
      ? `SELECT * FROM ${tableName} WHERE indicator_id = ?`
      : `SELECT * FROM ${tableName} WHERE indicator_id = $1`;

    return await this.queryOne<T>(sql, [indicator_id]);
  }

  /**
   * Save final classification
   */
  async saveClassification(data: {
    indicator_id: string;
    name: string;
    family?: string;
    indicator_type?: string;
    welfare_orientation?: string;
    [key: string]: unknown;
  }): Promise<void> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const dbType = getDatabaseType();

    let sql: string;

    if (dbType === "sqlite") {
      // SQLite: use ? placeholders
      const placeholders = columns.map(() => "?").join(", ");
      const updateCols = columns.filter((col) => col !== "indicator_id");
      const updateSet = updateCols
        .map((col) => `${col} = EXCLUDED.${col}`)
        .join(", ");

      sql = `
        INSERT INTO classifications (${columns.join(", ")})
        VALUES (${placeholders})
        ON CONFLICT (indicator_id) DO UPDATE SET
          ${updateSet},
          updated_at = CURRENT_TIMESTAMP
      `;
    } else {
      // PostgreSQL: use $1, $2, etc. placeholders
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      const updateCols = columns.filter((col) => col !== "indicator_id");
      const updateSet = updateCols
        .map((col) => `${col} = EXCLUDED.${col}`)
        .join(", ");

      sql = `
        INSERT INTO classifications (${columns.join(", ")})
        VALUES (${placeholders})
        ON CONFLICT (indicator_id) DO UPDATE SET
          ${updateSet},
          updated_at = CURRENT_TIMESTAMP
      `;
    }

    await this.run(sql, values);
  }

  /**
   * Get classification
   */
  async getClassification(indicator_id: string): Promise<any | null> {
    const dbType = getDatabaseType();
    const sql = dbType === "sqlite"
      ? `SELECT * FROM classifications WHERE indicator_id = ?`
      : `SELECT * FROM classifications WHERE indicator_id = $1`;

    return await this.queryOne(sql, [indicator_id]);
  }

  /**
   * Get source indicator
   */
  async getSourceIndicator(indicator_id: string): Promise<any | null> {
    const dbType = getDatabaseType();
    const sql = dbType === "sqlite"
      ? `SELECT * FROM source_indicators WHERE id = ?`
      : `SELECT * FROM source_indicators WHERE id = $1`;

    return await this.queryOne(sql, [indicator_id]);
  }

  /**
   * Get all classifications (with optional filters)
   */
  async getClassifications(filters?: {
    family?: string;
    indicator_type?: string;
    limit?: number;
  }): Promise<any[]> {
    const dbType = getDatabaseType();
    const placeholder = dbType === "sqlite" ? "?" : "$";

    let sql = "SELECT * FROM classifications WHERE 1=1";
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.family) {
      sql += ` AND family = ${dbType === "sqlite" ? "?" : `$${paramIndex}`}`;
      params.push(filters.family);
      paramIndex++;
    }

    if (filters?.indicator_type) {
      sql += ` AND indicator_type = ${
        dbType === "sqlite" ? "?" : `$${paramIndex}`
      }`;
      params.push(filters.indicator_type);
      paramIndex++;
    }

    sql += " ORDER BY updated_at DESC";

    if (filters?.limit) {
      sql += ` LIMIT ${dbType === "sqlite" ? "?" : `$${paramIndex}`}`;
      params.push(filters.limit);
    }

    return await this.query(sql, params);
  }

  /**
   * Log processing event
   */
  async logProcessing(data: {
    indicator_id: string;
    stage: string;
    status: "started" | "completed" | "failed";
    error_message?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const dbType = getDatabaseType();
    const sql = dbType === "sqlite"
      ? `INSERT INTO processing_log (
          indicator_id, stage, status, error_message, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      : `INSERT INTO processing_log (
          indicator_id, stage, status, error_message, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`;

    await this.run(sql, [
      data.indicator_id,
      data.stage,
      data.status,
      data.error_message || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]);
  }

  /**
   * Start batch stats (optional, skipped if problematic)
   */
  async startBatchStats(data: {
    batch_id: string;
    total_indicators: number;
    model: string;
    provider: string;
  }): Promise<void> {
    try {
      const dbType = getDatabaseType();
      const sql = dbType === "sqlite"
        ? `INSERT INTO pipeline_stats (
            batch_id, model, provider, total_indicators,
            batch_start_time
          ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
        : `INSERT INTO pipeline_stats (
            batch_id, model, provider, total_indicators,
            batch_start_time
          ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`;

      await this.run(sql, [
        data.batch_id,
        data.model,
        data.provider,
        data.total_indicators,
      ]);
    } catch (error) {
      console.warn("[DB] Failed to save batch stats (non-critical):", error);
    }
  }

  /**
   * Complete batch stats (optional)
   */
  async completeBatchStats(batch_id: string): Promise<void> {
    try {
      const dbType = getDatabaseType();
      const sql = dbType === "sqlite"
        ? `UPDATE pipeline_stats
           SET batch_end_time = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE batch_id = ?`
        : `UPDATE pipeline_stats
           SET batch_end_time = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE batch_id = $1`;

      await this.run(sql, [batch_id]);
    } catch (error) {
      console.warn("[DB] Failed to update batch stats (non-critical):", error);
    }
  }
}

/**
 * Create a repository instance from a database client
 */
export function createRepository(db: DatabaseClient): DatabaseRepository {
  return new DatabaseRepository(db);
}
