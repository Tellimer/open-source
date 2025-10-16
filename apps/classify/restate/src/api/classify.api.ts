/**
 * Classification API Service
 * HTTP endpoint for batch classification requests
 */

import * as restate from "@restatedev/restate-sdk";
import { z } from "zod";
import { indicatorInputSchema } from "../types.ts";
import { DatabaseRepository } from "../db/repository.ts";

const batchClassifyRequestSchema = z.object({
  indicators: z.array(indicatorInputSchema).min(1).max(100),
  llm_provider: z.enum(["local", "openai", "anthropic"]).optional().default("openai"),
});

type BatchClassifyRequest = z.infer<typeof batchClassifyRequestSchema>;

const classifyApi = restate.service({
  name: "classify-api",
  handlers: {
    /**
     * Batch classification endpoint
     * Accepts 1-100 indicators and triggers workflows for each
     */
    batch: async (ctx: restate.Context, request: BatchClassifyRequest) => {
      const { indicators, llm_provider = "openai" } = request;

      const traceId = ctx.rand.uuidv4();

      ctx.console.info("Batch classification request", {
        count: indicators.length,
        llm_provider,
        traceId,
      });

      // Start workflow for each indicator using send() for fire-and-forget
      // This returns immediately without waiting for completion
      for (const indicator of indicators) {
        const workflowKey = indicator.indicator_id;

        // Send workflow invocation (non-blocking) using workflowSendClient
        ctx.workflowSendClient({
          name: "classification-workflow",
        }, workflowKey).run({
          ...indicator,
          llm_provider,
        });

        ctx.console.debug("Workflow triggered", {
          indicator_id: indicator.indicator_id,
          name: indicator.name,
        });
      }

      ctx.console.info("All workflows triggered", {
        count: indicators.length,
        traceId,
      });

      return {
        message: "Classification started",
        count: indicators.length,
        trace_id: traceId,
        provider: llm_provider,
      };
    },

    /**
     * Get status of a specific indicator's classification
     */
    getStatus: async (ctx: restate.Context, indicatorId: string) => {
      ctx.console.info("Getting classification status", { indicatorId });

      // Query workflow state using workflowClient
      const workflowState = await ctx.workflowClient({
        name: "classification-workflow",
      }, indicatorId).getState();

      if (!workflowState) {
        return {
          indicator_id: indicatorId,
          status: "not_found",
        };
      }

      return {
        indicator_id: indicatorId,
        status: workflowState.status,
        started_at: workflowState.startedAt,
        completed_at: workflowState.completedAt,
        error: workflowState.error,
      };
    },

    /**
     * Get batch statistics using Restate SQL introspection
     * Query all classification workflows and their status
     */
    batchStats: async (ctx: restate.Context, params?: { minutes?: number; limit?: number }) => {
      const minutes = params?.minutes || 60; // Default: last hour
      const limit = params?.limit || 1000;

      // Query Restate's SQL API to get workflow statistics
      // Note: This requires fetching from http://localhost:9070/query
      // We'll return a placeholder for now - actual implementation would use fetch

      ctx.console.info("Batch stats requested", { minutes, limit });

      return {
        message: "Use Restate SQL API at http://localhost:9070/query",
        example_query: `
          SELECT
            inv_target,
            inv_status,
            COUNT(*) as count,
            AVG(inv_duration) as avg_duration_ms,
            MIN(inv_created_at) as first_started,
            MAX(inv_created_at) as last_started
          FROM sys_invocation
          WHERE inv_target LIKE 'classification-workflow%'
            AND inv_created_at > NOW() - INTERVAL '${minutes} minutes'
          GROUP BY inv_target, inv_status
          ORDER BY count DESC
          LIMIT ${limit}
        `,
        sql_endpoint: "http://localhost:9070/query",
      };
    },

    /**
     * Health check endpoint
     */
    health: async (ctx: restate.Context) => {
      return {
        status: "ok",
        service: "classify-api",
        timestamp: new Date().toISOString(),
      };
    },
  },
});

export default classifyApi;
