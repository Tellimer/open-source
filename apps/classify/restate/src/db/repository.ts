/**
 * Database Repository for Restate Classify Workflow
 * PostgreSQL implementation using Bun's native SQL
 * @module
 */

import { getDb } from './client.ts';

// Get singleton database instance
const db = getDb();

/**
 * Database Repository
 * Provides methods for database operations
 */
export class DatabaseRepository {
  /**
   * Execute a query and return all results
   */
  async query<T = any>(sqlText: string, params: any[] = []): Promise<T[]> {
    const result = await db.unsafe(sqlText, params);
    return result as T[];
  }

  /**
   * Execute a query and return first result
   */
  async queryOne<T = any>(sqlText: string, params: any[] = []): Promise<T | null> {
    const result = await db.unsafe(sqlText, params) as T[];
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Execute a statement (INSERT, UPDATE, DELETE)
   */
  async run(sqlText: string, params: any[] = []): Promise<{ changes: number }> {
    const result = await db.unsafe(sqlText, params);
    return { changes: Array.isArray(result) ? result.length : 0 };
  }

  /**
   * Save a stage result (generic stage saver)
   */
  async saveStageResult(
    stage: string,
    indicator_id: string,
    data: Record<string, any>
  ): Promise<void> {
    const tableMap: Record<string, string> = {
      normalize: 'normalization_results',
      time: 'time_inference_results',
      'cumulative-detection': 'cumulative_detection_results',
      family: 'family_assignment_results',
      type: 'type_classification_results',
      'boolean-review': 'boolean_review_results',
      'final-review': 'final_review_results',
    };

    const tableName = tableMap[stage];
    if (!tableName) {
      throw new Error(`Unknown stage: ${stage}`);
    }

    const columns = ['indicator_id', ...Object.keys(data)];
    const values = [indicator_id, ...Object.values(data)];

    // PostgreSQL: use $1, $2, etc. placeholders
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const updateSet = Object.keys(data)
      .map((col) => `${col} = EXCLUDED.${col}`)
      .join(', ');

    const sql = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (indicator_id) DO UPDATE SET
        ${updateSet}
    `;

    await this.run(sql, values);
  }

  /**
   * Get a stage result
   */
  async getStageResult<T = any>(
    stage: string,
    indicator_id: string
  ): Promise<T | null> {
    const tableMap: Record<string, string> = {
      normalize: 'normalization_results',
      time: 'time_inference_results',
      'cumulative-detection': 'cumulative_detection_results',
      family: 'family_assignment_results',
      type: 'type_classification_results',
      'boolean-review': 'boolean_review_results',
      'final-review': 'final_review_results',
    };

    const tableName = tableMap[stage];
    if (!tableName) {
      throw new Error(`Unknown stage: ${stage}`);
    }

    const sql = `SELECT * FROM ${tableName} WHERE indicator_id = $1`;
    return this.queryOne<T>(sql, [indicator_id]);
  }

  /**
   * Save final classification
   */
  async saveClassification(data: {
    indicator_id: string;
    name: string;
    [key: string]: any;
  }): Promise<void> {
    const columns = Object.keys(data);
    const values = Object.values(data);

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const updateCols = columns.filter((col) => col !== 'indicator_id');
    const updateSet = updateCols
      .map((col) => `${col} = EXCLUDED.${col}`)
      .join(', ');

    const sql = `
      INSERT INTO classifications (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (indicator_id) DO UPDATE SET
        ${updateSet},
        updated_at = CURRENT_TIMESTAMP
    `;

    await this.run(sql, values);
  }

  /**
   * Get classification
   */
  async getClassification(indicator_id: string): Promise<any | null> {
    const sql = `SELECT * FROM classifications WHERE indicator_id = $1`;
    return this.queryOne(sql, [indicator_id]);
  }

  /**
   * Get source indicator
   */
  async getSourceIndicator(indicator_id: string): Promise<any | null> {
    const sql = `SELECT * FROM source_indicators WHERE id = $1`;
    return this.queryOne(sql, [indicator_id]);
  }

  /**
   * Get all classifications (with optional filters)
   */
  async getClassifications(filters?: {
    family?: string;
    indicator_type?: string;
    limit?: number;
  }): Promise<any[]> {
    let sql = 'SELECT * FROM classifications WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.family) {
      sql += ` AND family = $${paramIndex}`;
      params.push(filters.family);
      paramIndex++;
    }

    if (filters?.indicator_type) {
      sql += ` AND indicator_type = $${paramIndex}`;
      params.push(filters.indicator_type);
      paramIndex++;
    }

    sql += ' ORDER BY updated_at DESC';

    if (filters?.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
    }

    return this.query(sql, params);
  }

  /**
   * Log processing event
   */
  async logProcessing(data: {
    indicator_id: string;
    stage: string;
    status: 'started' | 'completed' | 'failed';
    error_message?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const sql = `
      INSERT INTO processing_log (
        indicator_id, stage, status, error_message, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `;

    await this.run(sql, [
      data.indicator_id,
      data.stage,
      data.status,
      data.error_message || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]);
  }

  /**
   * Start batch stats
   */
  async startBatchStats(data: {
    batch_id: string;
    total_indicators: number;
    model: string;
    provider: string;
  }): Promise<void> {
    try {
      const sql = `
        INSERT INTO pipeline_stats (
          batch_id, model, provider, total_indicators,
          batch_start_time
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;

      await this.run(sql, [
        data.batch_id,
        data.model,
        data.provider,
        data.total_indicators,
      ]);
    } catch (error) {
      console.warn('[DB] Failed to save batch stats (non-critical):', error);
    }
  }

  /**
   * Update batch statistics with successful indicator
   */
  async incrementBatchSuccess(batch_id: string): Promise<void> {
    try {
      const sql = `
        UPDATE pipeline_stats
        SET successful_indicators = successful_indicators + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE batch_id = $1
      `;
      await this.run(sql, [batch_id]);
    } catch (error) {
      console.warn('[DB] Failed to update batch success count:', error);
    }
  }

  /**
   * Complete batch stats
   */
  async completeBatchStats(batch_id: string): Promise<void> {
    try {
      const sql = `
        UPDATE pipeline_stats
        SET batch_end_time = CURRENT_TIMESTAMP,
            total_duration_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - batch_start_time)) * 1000,
            avg_time_per_indicator_ms = CASE
              WHEN successful_indicators > 0
              THEN (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - batch_start_time)) * 1000) / successful_indicators
              ELSE 0
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE batch_id = $1
      `;

      await this.run(sql, [batch_id]);
    } catch (error) {
      console.warn('[DB] Failed to update batch stats (non-critical):', error);
    }
  }

  /**
   * Get batch stats
   */
  async getBatchStats(batch_id: string): Promise<any | null> {
    const sql = `SELECT * FROM pipeline_stats WHERE batch_id = $1`;
    return this.queryOne(sql, [batch_id]);
  }
}

/**
 * Create a repository instance
 */
export function createRepository(): DatabaseRepository {
  return new DatabaseRepository();
}
