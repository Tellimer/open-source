/**
 * Consensus Analysis API Service
 * REST endpoints for triggering consensus analysis on indicator name groups
 */

import * as restate from "@restatedev/restate-sdk";
import { DatabaseRepository } from "../db/repository.ts";
import { consensusAnalysisRequestSchema } from "../types.ts";

const consensusAnalysisApi = restate.service({
  name: "consensus-analysis-api",
  handlers: {
    /**
     * Health check endpoint
     */
    health: async (_ctx: restate.Context) => {
      return {
        status: "healthy",
        service: "consensus-analysis-api",
        timestamp: new Date().toISOString(),
      };
    },

    /**
     * Analyze consensus for specific indicator name groups
     * POST /consensus-analysis-api/analyze
     */
    analyze: async (
      ctx: restate.Context,
      request: {
        indicator_names: string[];
        consensus_threshold?: number; // 0.75 = 75%
        llm_provider?: "local" | "openai" | "anthropic";
      }
    ) => {
      ctx.console.info("Consensus analysis requested", {
        indicator_count: request.indicator_names.length,
        threshold: request.consensus_threshold || 0.75,
        llm_provider: request.llm_provider || "openai",
      });

      try {
        // Validate request
        const validated = consensusAnalysisRequestSchema.parse(request);

        const { indicator_names, consensus_threshold, llm_provider } = validated;

        // Trigger workflow for each indicator name
        const workflowPromises = indicator_names.map((indicator_name) => {
          return ctx
            .workflowClient({
              name: "consensus-analysis-workflow",
            })
            .workflowSubmit(indicator_name, {
              indicator_name,
              consensus_threshold,
              llm_provider,
            });
        });

        await Promise.all(workflowPromises);

        ctx.console.info("Consensus analysis workflows triggered", {
          indicator_count: indicator_names.length,
        });

        return {
          success: true,
          message: `Consensus analysis triggered for ${indicator_names.length} indicator name group(s)`,
          indicator_names,
          consensus_threshold: consensus_threshold || 0.75,
          llm_provider: llm_provider || "openai",
        };
      } catch (error) {
        ctx.console.error("Consensus analysis request failed", {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    /**
     * Analyze consensus for ALL unique indicator names in database
     * POST /consensus-analysis-api/analyze-all
     */
    analyzeAll: async (
      ctx: restate.Context,
      request: {
        consensus_threshold?: number;
        llm_provider?: "local" | "openai" | "anthropic";
        min_indicators?: number; // Only analyze groups with at least N indicators
        limit?: number;
      }
    ) => {
      const {
        consensus_threshold = 0.75,
        llm_provider = "openai",
        min_indicators = 2, // Need at least 2 indicators for consensus
        limit,
      } = request;

      ctx.console.info("Consensus analyze-all requested", {
        threshold: consensus_threshold,
        llm_provider,
        min_indicators,
        limit,
      });

      try {
        // Fetch all unique indicator names with counts
        const repo = new DatabaseRepository();
        const query = limit
          ? `SELECT name, COUNT(*) as count
             FROM classifications
             GROUP BY name
             HAVING COUNT(*) >= ${min_indicators}
             ORDER BY COUNT(*) DESC
             LIMIT ${limit}`
          : `SELECT name, COUNT(*) as count
             FROM classifications
             GROUP BY name
             HAVING COUNT(*) >= ${min_indicators}
             ORDER BY COUNT(*) DESC`;

        const indicatorGroups = await repo.query<{
          name: string;
          count: number;
        }>(query);

        if (indicatorGroups.length === 0) {
          return {
            success: true,
            message: `No indicator groups found with at least ${min_indicators} indicators`,
            indicator_group_count: 0,
          };
        }

        const indicator_names = indicatorGroups.map((g) => g.name);

        ctx.console.info("Found indicator groups to analyze", {
          count: indicator_names.length,
          total_indicators: indicatorGroups.reduce((sum, g) => sum + g.count, 0),
        });

        // Trigger workflows in batches of 5
        const batchSize = 5;
        for (let i = 0; i < indicator_names.length; i += batchSize) {
          const batch = indicator_names.slice(i, i + batchSize);

          const batchPromises = batch.map((indicator_name) => {
            return ctx
              .workflowClient({
                name: "consensus-analysis-workflow",
              })
              .workflowSubmit(indicator_name, {
                indicator_name,
                consensus_threshold,
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
          message: `Consensus analysis triggered for ${indicator_names.length} indicator name group(s)`,
          indicator_group_count: indicator_names.length,
          total_indicators: indicatorGroups.reduce((sum, g) => sum + g.count, 0),
          consensus_threshold,
          llm_provider,
        };
      } catch (error) {
        ctx.console.error("Consensus analyze-all failed", {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    /**
     * Get consensus report for specific indicator name
     * GET /consensus-analysis-api/report/:indicator_name
     */
    getReport: async (
      ctx: restate.Context,
      request: { indicator_name: string }
    ) => {
      const { indicator_name } = request;

      ctx.console.info("Fetching consensus report", { indicator_name });

      try {
        const repo = new DatabaseRepository();

        const report = await repo.queryOne(
          `SELECT * FROM consensus_analysis_reports WHERE indicator_name = $1`,
          [indicator_name]
        );

        if (!report) {
          return {
            success: false,
            error: `No consensus report found for indicator name "${indicator_name}"`,
          };
        }

        return {
          success: true,
          report,
        };
      } catch (error) {
        ctx.console.error("Failed to fetch consensus report", {
          indicator_name,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    /**
     * Get all indicator groups with consensus issues
     * GET /consensus-analysis-api/issues?status=inconsistent&requires_standardization=true
     */
    getIssues: async (
      ctx: restate.Context,
      request: {
        status?:
          | "highly_consistent"
          | "mostly_consistent"
          | "inconsistent"
          | "critical_inconsistency";
        requires_standardization?: boolean;
        min_outliers?: number;
        limit?: number;
      }
    ) => {
      const {
        status,
        requires_standardization,
        min_outliers,
        limit = 100,
      } = request;

      ctx.console.info("Fetching consensus issues", {
        status,
        requires_standardization,
        min_outliers,
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

        if (requires_standardization !== undefined) {
          conditions.push(`requires_standardization = $${paramIndex}`);
          params.push(requires_standardization);
          paramIndex++;
        }

        if (min_outliers !== undefined) {
          conditions.push(`total_outliers >= $${paramIndex}`);
          params.push(min_outliers);
          paramIndex++;
        }

        const whereClause =
          conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const query = `
          SELECT indicator_name, total_indicators, dimensions_with_consensus,
                 dimensions_with_issues, total_outliers, status,
                 requires_standardization, analyzed_at
          FROM consensus_analysis_reports
          ${whereClause}
          ORDER BY total_outliers DESC, analyzed_at DESC
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
        ctx.console.error("Failed to fetch consensus issues", {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    /**
     * Get outliers for specific indicator name
     * GET /consensus-analysis-api/outliers/:indicator_name
     */
    getOutliers: async (
      ctx: restate.Context,
      request: {
        indicator_name: string;
        dimension?:
          | "unit"
          | "scale"
          | "frequency"
          | "currency"
          | "time_basis";
        is_valid_outlier?: boolean;
        recommended_action?:
          | "no_action"
          | "document_difference"
          | "investigate"
          | "correct_error"
          | "standardize";
      }
    ) => {
      const {
        indicator_name,
        dimension,
        is_valid_outlier,
        recommended_action,
      } = request;

      ctx.console.info("Fetching outliers", { indicator_name, dimension });

      try {
        const repo = new DatabaseRepository();

        // Build dynamic query
        const conditions: string[] = ["indicator_name = $1"];
        const params: any[] = [indicator_name];
        let paramIndex = 2;

        if (dimension) {
          conditions.push(`dimension = $${paramIndex}`);
          params.push(dimension);
          paramIndex++;
        }

        if (is_valid_outlier !== undefined) {
          conditions.push(`is_valid_outlier = $${paramIndex}`);
          params.push(is_valid_outlier);
          paramIndex++;
        }

        if (recommended_action) {
          conditions.push(`recommended_action = $${paramIndex}`);
          params.push(recommended_action);
          paramIndex++;
        }

        const query = `
          SELECT * FROM consensus_outliers
          WHERE ${conditions.join(" AND ")}
          ORDER BY deviation_percentage DESC, detected_at DESC
        `;

        const outliers = await repo.query(query, params);

        return {
          success: true,
          outliers,
          count: outliers.length,
        };
      } catch (error) {
        ctx.console.error("Failed to fetch outliers", {
          indicator_name,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    /**
     * Get workflow status for specific indicator name
     * GET /consensus-analysis-api/status/:indicator_name
     */
    getStatus: async (
      ctx: restate.Context,
      request: { indicator_name: string }
    ) => {
      const { indicator_name } = request;

      try {
        const workflowState = await ctx
          .workflowClient({
            name: "consensus-analysis-workflow",
          })
          .workflowCall(indicator_name, "getState", {});

        return {
          success: true,
          indicator_name,
          state: workflowState,
        };
      } catch (error) {
        return {
          success: false,
          indicator_name,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  },
});

export default consensusAnalysisApi;
