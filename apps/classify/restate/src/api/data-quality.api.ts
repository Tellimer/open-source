/**
 * Data Quality API Service
 * REST endpoints for triggering data quality checks
 */

import * as restate from "@restatedev/restate-sdk";
import { DatabaseRepository } from "../db/repository.ts";
import { dataQualityCheckRequestSchema } from "../types.ts";

const dataQualityApi = restate.service({
  name: "data-quality-api",
  handlers: {
    /**
     * Health check endpoint
     */
    health: async (_ctx: restate.Context) => {
      return {
        status: "healthy",
        service: "data-quality-api",
        timestamp: new Date().toISOString(),
      };
    },

    /**
     * Check data quality for specific indicators
     * POST /data-quality-api/check
     */
    check: async (
      ctx: restate.Context,
      request: {
        indicator_ids: string[];
        llm_provider?: "local" | "openai" | "anthropic";
      }
    ) => {
      ctx.console.info("Data quality check requested", {
        indicator_count: request.indicator_ids.length,
        llm_provider: request.llm_provider || "openai",
      });

      try {
        // Validate request
        const validated = dataQualityCheckRequestSchema.parse(request);

        const { indicator_ids, llm_provider } = validated;

        // Trigger workflow for each indicator
        const workflowPromises = indicator_ids.map((indicator_id) => {
          return ctx
            .workflowClient({
              name: "data-quality-workflow",
            })
            .workflowSubmit(indicator_id, {
              indicator_id,
              llm_provider,
            });
        });

        await Promise.all(workflowPromises);

        ctx.console.info("Data quality workflows triggered", {
          indicator_count: indicator_ids.length,
        });

        return {
          success: true,
          message: `Data quality check triggered for ${indicator_ids.length} indicator(s)`,
          indicator_ids,
          llm_provider,
        };
      } catch (error) {
        ctx.console.error("Data quality check request failed", {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    /**
     * Check data quality for ALL indicators in database
     * POST /data-quality-api/check-all
     */
    checkAll: async (
      ctx: restate.Context,
      request: { llm_provider?: "local" | "openai" | "anthropic"; limit?: number }
    ) => {
      const { llm_provider = "openai", limit } = request;

      ctx.console.info("Data quality check-all requested", {
        llm_provider,
        limit,
      });

      try {
        // Fetch all indicator IDs from classifications table
        const repo = new DatabaseRepository();
        const query = limit
          ? `SELECT indicator_id FROM classifications LIMIT ${limit}`
          : `SELECT indicator_id FROM classifications`;

        const indicators = await repo.query<{ indicator_id: string }>(query);

        if (indicators.length === 0) {
          return {
            success: true,
            message: "No indicators found in database",
            indicator_count: 0,
          };
        }

        const indicator_ids = indicators.map((i) => i.indicator_id);

        ctx.console.info("Found indicators to check", {
          count: indicator_ids.length,
        });

        // Trigger workflows in batches of 10
        const batchSize = 10;
        for (let i = 0; i < indicator_ids.length; i += batchSize) {
          const batch = indicator_ids.slice(i, i + batchSize);

          const batchPromises = batch.map((indicator_id) => {
            return ctx
              .workflowClient({
                name: "data-quality-workflow",
              })
              .workflowSubmit(indicator_id, {
                indicator_id,
                llm_provider,
              });
          });

          await Promise.all(batchPromises);

          ctx.console.info(`Batch ${Math.floor(i / batchSize) + 1} triggered`, {
            batch_size: batch.length,
          });
        }

        return {
          success: true,
          message: `Data quality check triggered for ${indicator_ids.length} indicator(s)`,
          indicator_count: indicator_ids.length,
          llm_provider,
        };
      } catch (error) {
        ctx.console.error("Data quality check-all failed", {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    /**
     * Get quality report for specific indicator
     * GET /data-quality-api/report/:indicator_id
     */
    getReport: async (
      ctx: restate.Context,
      request: { indicator_id: string }
    ) => {
      const { indicator_id } = request;

      ctx.console.info("Fetching quality report", { indicator_id });

      try {
        const repo = new DatabaseRepository();

        const report = await repo.queryOne(
          `SELECT * FROM data_quality_reports WHERE indicator_id = $1`,
          [indicator_id]
        );

        if (!report) {
          return {
            success: false,
            error: `No quality report found for indicator ${indicator_id}`,
          };
        }

        return {
          success: true,
          report,
        };
      } catch (error) {
        ctx.console.error("Failed to fetch report", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    /**
     * Get all indicators with quality issues
     * GET /data-quality-api/issues?severity=high&status=major_issues
     */
    getIssues: async (
      ctx: restate.Context,
      request: {
        severity?: "critical" | "high" | "medium" | "low";
        status?: "clean" | "minor_issues" | "major_issues" | "unusable";
        requires_attention?: boolean;
        limit?: number;
      }
    ) => {
      const {
        severity,
        status,
        requires_attention,
        limit = 100,
      } = request;

      ctx.console.info("Fetching quality issues", {
        severity,
        status,
        requires_attention,
        limit,
      });

      try {
        const repo = new DatabaseRepository();

        // Build dynamic query
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (status) {
          conditions.push(`status = $${paramIndex}`);
          params.push(status);
          paramIndex++;
        }

        if (requires_attention !== undefined) {
          conditions.push(`requires_attention = $${paramIndex}`);
          params.push(requires_attention);
          paramIndex++;
        }

        if (severity) {
          // Query all_flags JSONB array for severity
          const severityMap = {
            critical: 5,
            high: 4,
            medium: 3,
            low: 2,
          };
          conditions.push(
            `EXISTS (
              SELECT 1 FROM jsonb_array_elements(all_flags) AS flag
              WHERE (flag->>'severity')::int >= $${paramIndex}
            )`
          );
          params.push(severityMap[severity]);
          paramIndex++;
        }

        const whereClause =
          conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const query = `
          SELECT indicator_id, name, status, overall_score,
                 flagged_count, critical_count, requires_attention,
                 checked_at
          FROM data_quality_reports
          ${whereClause}
          ORDER BY critical_count DESC, flagged_count DESC, checked_at DESC
          LIMIT $${paramIndex}
        `;
        params.push(limit);

        const issues = await repo.query(query, params);

        return {
          success: true,
          issues,
          count: issues.length,
        };
      } catch (error) {
        ctx.console.error("Failed to fetch issues", {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    /**
     * Get workflow status for specific indicator
     * GET /data-quality-api/status/:indicator_id
     */
    getStatus: async (
      ctx: restate.Context,
      request: { indicator_id: string }
    ) => {
      const { indicator_id } = request;

      try {
        const workflowState = await ctx
          .workflowClient({
            name: "data-quality-workflow",
          })
          .workflowCall(indicator_id, "getState", {});

        return {
          success: true,
          indicator_id,
          state: workflowState,
        };
      } catch (error) {
        return {
          success: false,
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  },
});

export default dataQualityApi;
