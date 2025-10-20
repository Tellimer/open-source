/**
 * ============================================================================
 * TIME SERIES DATA API
 * ============================================================================
 *
 * REST API for managing time series data for indicators.
 *
 * Endpoints:
 *   POST /upload          - Upload time series data for an indicator
 *   POST /upload-batch    - Upload time series data for multiple indicators
 *   GET  /get/{id}        - Get time series data for an indicator
 *   GET  /stats/{id}      - Get statistics for an indicator's time series
 *   DELETE /delete/{id}   - Delete time series data for an indicator
 *   GET  /health          - Health check
 */

import * as restate from "@restatedev/restate-sdk";
import { DatabaseRepository } from "../db/repository.ts";

interface TimeSeriesPoint {
  date: string;
  value: number;
  source_version?: string;
}

interface UploadRequest {
  indicator_id: string;
  data: TimeSeriesPoint[];
  upsert?: boolean;
}

interface UploadBatchRequest {
  indicators: {
    indicator_id: string;
    data: TimeSeriesPoint[];
  }[];
  upsert?: boolean;
}

interface GetRequest {
  indicator_id: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

interface StatsRequest {
  indicator_id: string;
}

interface DeleteRequest {
  indicator_id: string;
  start_date?: string;
  end_date?: string;
}

const timeSeriesApi = restate.service({
  name: "time-series-api",
  handlers: {
    /**
     * Upload time series data for a single indicator
     */
    upload: async (ctx: restate.Context, request: UploadRequest) => {
      const repo = new DatabaseRepository();

      try {
        const { indicator_id, data, upsert = false } = request;

        // Validate indicator exists
        const indicator = await repo.queryOne(
          `SELECT id, name FROM source_indicators WHERE id = $1`,
          [indicator_id]
        );

        if (!indicator) {
          return {
            success: false,
            error: `Indicator not found: ${indicator_id}`,
          };
        }

        // Validate data
        if (!Array.isArray(data) || data.length === 0) {
          return {
            success: false,
            error: "Data must be a non-empty array",
          };
        }

        // Insert/upsert time series points
        let inserted = 0;
        let updated = 0;

        for (const point of data) {
          if (!point.date || point.value === undefined) {
            continue;
          }

          if (upsert) {
            const result = await repo.run(
              `INSERT INTO time_series_data (indicator_id, date, value, source_version)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (indicator_id, date)
               DO UPDATE SET
                 value = EXCLUDED.value,
                 source_version = EXCLUDED.source_version,
                 updated_at = CURRENT_TIMESTAMP
               RETURNING (xmax = 0) AS inserted`,
              [indicator_id, new Date(point.date), point.value, point.source_version || null]
            );

            if (result[0]?.inserted) {
              inserted++;
            } else {
              updated++;
            }
          } else {
            await repo.run(
              `INSERT INTO time_series_data (indicator_id, date, value, source_version)
               VALUES ($1, $2, $3, $4)`,
              [indicator_id, new Date(point.date), point.value, point.source_version || null]
            );
            inserted++;
          }
        }

        return {
          success: true,
          indicator_id,
          indicator_name: indicator.name,
          inserted,
          updated,
          total: data.length,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    },

    /**
     * Upload time series data for multiple indicators
     */
    uploadBatch: async (ctx: restate.Context, request: UploadBatchRequest) => {
      const repo = new DatabaseRepository();

      try {
        const { indicators, upsert = false } = request;

        const results = [];

        for (const indicator of indicators) {
          // Call upload for each indicator
          const result = await ctx.serviceClient({ name: "time-series-api" }).upload({
            indicator_id: indicator.indicator_id,
            data: indicator.data,
            upsert,
          });

          results.push(result);
        }

        const successCount = results.filter((r: any) => r.success).length;
        const failureCount = results.length - successCount;

        return {
          success: true,
          total_indicators: indicators.length,
          successful: successCount,
          failed: failureCount,
          results,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    },

    /**
     * Get time series data for an indicator
     */
    get: async (ctx: restate.Context, request: GetRequest) => {
      const repo = new DatabaseRepository();

      try {
        const { indicator_id, start_date, end_date, limit = 1000, offset = 0 } = request;

        // Build query
        let query = `
          SELECT date, value, source_version, created_at, updated_at
          FROM time_series_data
          WHERE indicator_id = $1
        `;
        const params: any[] = [indicator_id];
        let paramIndex = 2;

        if (start_date) {
          query += ` AND date >= $${paramIndex}`;
          params.push(new Date(start_date));
          paramIndex++;
        }

        if (end_date) {
          query += ` AND date <= $${paramIndex}`;
          params.push(new Date(end_date));
          paramIndex++;
        }

        query += ` ORDER BY date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const data = await repo.query(query, params);

        // Get total count
        let countQuery = `SELECT COUNT(*) as total FROM time_series_data WHERE indicator_id = $1`;
        const countParams: any[] = [indicator_id];
        let countParamIndex = 2;

        if (start_date) {
          countQuery += ` AND date >= $${countParamIndex}`;
          countParams.push(new Date(start_date));
          countParamIndex++;
        }

        if (end_date) {
          countQuery += ` AND date <= $${countParamIndex}`;
          countParams.push(new Date(end_date));
        }

        const countResult = await repo.queryOne(countQuery, countParams);
        const total = parseInt(countResult.total);

        return {
          success: true,
          indicator_id,
          data,
          total,
          limit,
          offset,
          has_more: offset + data.length < total,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    },

    /**
     * Get statistics for an indicator's time series
     */
    stats: async (ctx: restate.Context, request: StatsRequest) => {
      const repo = new DatabaseRepository();

      try {
        const { indicator_id } = request;

        // Get basic stats
        const stats = await repo.queryOne(
          `SELECT
            COUNT(*) as total_points,
            MIN(date) as earliest_date,
            MAX(date) as latest_date,
            MIN(value) as min_value,
            MAX(value) as max_value,
            AVG(value) as avg_value,
            STDDEV(value) as stddev_value,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as median_value
           FROM time_series_data
           WHERE indicator_id = $1`,
          [indicator_id]
        );

        // Get indicator info
        const indicator = await repo.queryOne(
          `SELECT id, name FROM source_indicators WHERE id = $1`,
          [indicator_id]
        );

        return {
          success: true,
          indicator_id,
          indicator_name: indicator?.name || null,
          stats: {
            total_points: parseInt(stats.total_points || "0"),
            earliest_date: stats.earliest_date,
            latest_date: stats.latest_date,
            min_value: parseFloat(stats.min_value || "0"),
            max_value: parseFloat(stats.max_value || "0"),
            avg_value: parseFloat(stats.avg_value || "0"),
            stddev_value: parseFloat(stats.stddev_value || "0"),
            median_value: parseFloat(stats.median_value || "0"),
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    },

    /**
     * Delete time series data for an indicator
     */
    delete: async (ctx: restate.Context, request: DeleteRequest) => {
      const repo = new DatabaseRepository();

      try {
        const { indicator_id, start_date, end_date } = request;

        let query = `DELETE FROM time_series_data WHERE indicator_id = $1`;
        const params: any[] = [indicator_id];
        let paramIndex = 2;

        if (start_date) {
          query += ` AND date >= $${paramIndex}`;
          params.push(new Date(start_date));
          paramIndex++;
        }

        if (end_date) {
          query += ` AND date <= $${paramIndex}`;
          params.push(new Date(end_date));
        }

        const result = await repo.run(query, params);

        return {
          success: true,
          indicator_id,
          deleted_count: result.length,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    },

    /**
     * Health check
     */
    health: async () => {
      return {
        status: "healthy",
        service: "time-series-api",
        timestamp: new Date().toISOString(),
      };
    },
  },
});

export default timeSeriesApi;
