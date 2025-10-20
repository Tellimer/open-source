/**
 * Final Indicators API
 * Production-ready endpoint for querying validated indicator metadata
 */

import * as restate from "@restatedev/restate-sdk";
import { DatabaseRepository } from "../db/repository.ts";

const finalIndicatorsApi = restate.service({
  name: "final-indicators-api",
  handlers: {
    /**
     * Health check
     */
    health: async (_ctx: restate.Context) => {
      return {
        status: "healthy",
        service: "final-indicators-api",
        timestamp: new Date().toISOString(),
      };
    },

    /**
     * Get single indicator by ID
     * GET /final-indicators-api/get/:id
     */
    get: async (
      ctx: restate.Context,
      request: { id: string }
    ) => {
      const { id } = request;

      try {
        const repo = new DatabaseRepository();

        const indicator = await repo.queryOne(
          `SELECT * FROM final_indicators WHERE id = $1 AND deleted_at IS NULL`,
          [id]
        );

        if (!indicator) {
          return {
            success: false,
            error: `Indicator not found: ${id}`,
          };
        }

        return {
          success: true,
          indicator,
        };
      } catch (error) {
        ctx.console.error("Failed to fetch indicator", {
          id,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    /**
     * List indicators with filters
     * GET /final-indicators-api/list
     */
    list: async (
      ctx: restate.Context,
      request: {
        // Filters
        source_name?: string;
        indicator_type?: string;
        quality_status?: string;
        min_quality_score?: number;
        usability_verdict?: string;
        is_consensus_outlier?: boolean;
        has_issues?: boolean;

        // Pagination
        limit?: number;
        offset?: number;

        // Sorting
        sort_by?: string;
        sort_order?: "asc" | "desc";
      }
    ) => {
      const {
        source_name,
        indicator_type,
        quality_status,
        min_quality_score,
        usability_verdict,
        is_consensus_outlier,
        has_issues,
        limit = 100,
        offset = 0,
        sort_by = "name",
        sort_order = "asc",
      } = request;

      try {
        const repo = new DatabaseRepository();

        // Build dynamic query
        const conditions: string[] = ["deleted_at IS NULL"];
        const params: any[] = [];
        let paramIndex = 1;

        if (source_name) {
          conditions.push(`source_name = $${paramIndex}`);
          params.push(source_name);
          paramIndex++;
        }

        if (indicator_type) {
          conditions.push(`indicator_type = $${paramIndex}`);
          params.push(indicator_type);
          paramIndex++;
        }

        if (quality_status) {
          conditions.push(`quality_status = $${paramIndex}`);
          params.push(quality_status);
          paramIndex++;
        }

        if (min_quality_score !== undefined) {
          conditions.push(`quality_score >= $${paramIndex}`);
          params.push(min_quality_score);
          paramIndex++;
        }

        if (usability_verdict) {
          conditions.push(`usability_verdict = $${paramIndex}`);
          params.push(usability_verdict);
          paramIndex++;
        }

        if (is_consensus_outlier !== undefined) {
          conditions.push(`is_consensus_outlier = $${paramIndex}`);
          params.push(is_consensus_outlier);
          paramIndex++;
        }

        if (has_issues !== undefined) {
          conditions.push(`has_data_quality_issues = $${paramIndex}`);
          params.push(has_issues);
          paramIndex++;
        }

        const whereClause = conditions.join(" AND ");

        // Count total
        const countQuery = `SELECT COUNT(*) as total FROM final_indicators WHERE ${whereClause}`;
        const countResult = await repo.queryOne<{ total: number }>(countQuery, params);
        const total = countResult?.total || 0;

        // Fetch data
        const validSortColumns = [
          "name",
          "source_name",
          "indicator_type",
          "quality_score",
          "classification_confidence",
          "created_at",
          "updated_at",
        ];
        const sortColumn = validSortColumns.includes(sort_by) ? sort_by : "name";
        const sortDirection = sort_order === "desc" ? "DESC" : "ASC";

        const dataQuery = `
          SELECT * FROM final_indicators
          WHERE ${whereClause}
          ORDER BY ${sortColumn} ${sortDirection}
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);

        const indicators = await repo.query(dataQuery, params);

        return {
          success: true,
          indicators,
          total,
          limit,
          offset,
          has_more: offset + indicators.length < total,
        };
      } catch (error) {
        ctx.console.error("Failed to list indicators", {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    /**
     * Get production-ready indicators only (high quality)
     * GET /final-indicators-api/production-ready
     */
    productionReady: async (
      ctx: restate.Context,
      request: {
        limit?: number;
        offset?: number;
      }
    ) => {
      const { limit = 100, offset = 0 } = request;

      try {
        const repo = new DatabaseRepository();

        const indicators = await repo.query(
          `SELECT * FROM final_indicators
           WHERE quality_status IN ('clean', 'minor_issues')
             AND usability_verdict IN ('use_as_is', 'use_with_caution')
             AND pipeline_status = 'complete'
             AND deleted_at IS NULL
           ORDER BY quality_score DESC, name ASC
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );

        const countResult = await repo.queryOne<{ total: number }>(
          `SELECT COUNT(*) as total FROM final_indicators
           WHERE quality_status IN ('clean', 'minor_issues')
             AND usability_verdict IN ('use_as_is', 'use_with_caution')
             AND pipeline_status = 'complete'
             AND deleted_at IS NULL`
        );

        const total = countResult?.total || 0;

        return {
          success: true,
          indicators,
          total,
          limit,
          offset,
          has_more: offset + indicators.length < total,
        };
      } catch (error) {
        ctx.console.error("Failed to fetch production-ready indicators", {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    /**
     * Get indicators requiring attention
     * GET /final-indicators-api/requiring-attention
     */
    requiresAttention: async (
      ctx: restate.Context,
      request: {
        limit?: number;
        offset?: number;
      }
    ) => {
      const { limit = 100, offset = 0 } = request;

      try {
        const repo = new DatabaseRepository();

        const indicators = await repo.query(
          `SELECT * FROM final_indicators
           WHERE (
             has_data_quality_issues = true
             OR is_consensus_outlier = true
             OR requires_standardization = true
             OR quality_status IN ('major_issues', 'unusable')
           )
           AND deleted_at IS NULL
           ORDER BY quality_score ASC, quality_critical_count DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );

        const countResult = await repo.queryOne<{ total: number }>(
          `SELECT COUNT(*) as total FROM final_indicators
           WHERE (
             has_data_quality_issues = true
             OR is_consensus_outlier = true
             OR requires_standardization = true
             OR quality_status IN ('major_issues', 'unusable')
           )
           AND deleted_at IS NULL`
        );

        const total = countResult?.total || 0;

        return {
          success: true,
          indicators,
          total,
          limit,
          offset,
          has_more: offset + indicators.length < total,
        };
      } catch (error) {
        ctx.console.error("Failed to fetch indicators requiring attention", {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    /**
     * Get statistics summary
     * GET /final-indicators-api/stats
     */
    stats: async (ctx: restate.Context) => {
      try {
        const repo = new DatabaseRepository();

        const [
          total,
          by_quality_status,
          by_indicator_type,
          by_source,
          quality_distribution,
        ] = await Promise.all([
          // Total count
          repo.queryOne<{ count: number }>(
            `SELECT COUNT(*) as count FROM final_indicators WHERE deleted_at IS NULL`
          ),

          // By quality status
          repo.query<{ quality_status: string; count: number }>(
            `SELECT quality_status, COUNT(*) as count
             FROM final_indicators
             WHERE deleted_at IS NULL
             GROUP BY quality_status
             ORDER BY count DESC`
          ),

          // By indicator type
          repo.query<{ indicator_type: string; count: number }>(
            `SELECT indicator_type, COUNT(*) as count
             FROM final_indicators
             WHERE deleted_at IS NULL
             GROUP BY indicator_type
             ORDER BY count DESC`
          ),

          // By source
          repo.query<{ source_name: string; count: number; avg_quality: number }>(
            `SELECT source_name, COUNT(*) as count, AVG(quality_score)::REAL as avg_quality
             FROM final_indicators
             WHERE deleted_at IS NULL AND source_name IS NOT NULL
             GROUP BY source_name
             ORDER BY count DESC
             LIMIT 20`
          ),

          // Quality score distribution
          repo.query<{ range: string; count: number }>(
            `SELECT
               CASE
                 WHEN quality_score >= 90 THEN '90-100'
                 WHEN quality_score >= 80 THEN '80-89'
                 WHEN quality_score >= 70 THEN '70-79'
                 WHEN quality_score >= 60 THEN '60-69'
                 ELSE '0-59'
               END as range,
               COUNT(*) as count
             FROM final_indicators
             WHERE deleted_at IS NULL
             GROUP BY range
             ORDER BY range DESC`
          ),
        ]);

        return {
          success: true,
          stats: {
            total_indicators: total?.count || 0,
            by_quality_status,
            by_indicator_type,
            by_source,
            quality_distribution,
          },
        };
      } catch (error) {
        ctx.console.error("Failed to fetch stats", {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  },
});

export default finalIndicatorsApi;
