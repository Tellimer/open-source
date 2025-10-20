/**
 * Consensus Analysis Workflow
 * Orchestrates parallel consensus detection across 5 dimensions for indicator groups
 * Separate from classification and data quality workflows
 */

import * as restate from "@restatedev/restate-sdk";
import type {
  WorkflowContext,
  WorkflowSharedContext,
} from "@restatedev/restate-sdk";
import { DatabaseRepository } from "../db/repository.ts";
import type {
  IndicatorMetadata,
  ConsensusResult,
  ConsensusSummaryReport,
  LLMConsensusReview,
} from "../types.ts";
import type {
  UnitConsensusDetectorService,
  ScaleConsensusDetectorService,
  FrequencyConsensusDetectorService,
  CurrencyConsensusDetectorService,
  TimeBasisConsensusDetectorService,
  ConsensusConsolidatorService,
  ConsensusReviewService,
} from "./service-types.ts";

interface WorkflowState {
  indicator_name: string;
  llm_provider?: string;
  status:
    | "pending"
    | "fetching_indicators"
    | "detecting"
    | "consolidating"
    | "reviewing"
    | "saving"
    | "completed"
    | "failed";

  // Detector results
  unit_consensus?: ConsensusResult;
  scale_consensus?: ConsensusResult;
  frequency_consensus?: ConsensusResult;
  currency_consensus?: ConsensusResult;
  time_basis_consensus?: ConsensusResult;

  // Consolidated report
  summary?: ConsensusSummaryReport;

  // LLM review (if outliers found)
  llm_review?: LLMConsensusReview & {
    provider: string;
    model: string;
    created_at: string;
  };

  // Metadata
  total_indicators?: number;

  error?: string;
  startedAt: string;
  completedAt?: string;
}

const consensusAnalysisWorkflow = restate.workflow({
  name: "consensus-analysis-workflow",
  handlers: {
    /**
     * Run consensus analysis workflow for an indicator name group
     */
    run: async (
      ctx: WorkflowContext,
      input: {
        indicator_name: string;
        consensus_threshold?: number;
        llm_provider?: "local" | "openai" | "anthropic";
      }
    ) => {
      const indicator_name = ctx.key; // workflow ID = indicator_name
      const { consensus_threshold = 0.75, llm_provider = "openai" } = input;

      ctx.console.info("Starting consensus analysis workflow", {
        indicator_name,
        threshold: consensus_threshold,
        provider: llm_provider,
      });

      // Initialize workflow state
      const startedAt = await ctx.run("get-start-time", () => {
        return new Date().toISOString();
      });

      const state: WorkflowState = {
        indicator_name,
        llm_provider,
        status: "pending",
        startedAt,
      };

      ctx.set("state", state);

      try {
        // Step 1: Fetch all indicators with this name
        ctx.console.info("Step 1: Fetching indicators", { indicator_name });
        state.status = "fetching_indicators";
        ctx.set("state", state);

        const indicators = await ctx.run(
          "fetch-indicator-metadata",
          async () => {
            const repo = new DatabaseRepository();

            // Fetch all indicators with this name from classifications table
            const indicatorRows = await repo.query<{
              indicator_id: string;
              name: string;
              original_units: string | null;
              parsed_scale: string;
              parsed_currency: string | null;
              reporting_frequency: string;
              time_basis: string;
              source_name: string | null;
            }>(
              `SELECT indicator_id, name, original_units, parsed_scale,
                      parsed_currency, reporting_frequency, time_basis, source_name
               FROM classifications WHERE name = $1`,
              [indicator_name]
            );

            if (indicatorRows.length === 0) {
              throw new Error(
                `No indicators found with name "${indicator_name}"`
              );
            }

            const metadata: IndicatorMetadata[] = indicatorRows.map((row) => ({
              indicator_id: row.indicator_id,
              name: row.name,
              units: row.original_units || undefined,
              normalized_scale: row.parsed_scale,
              reporting_frequency: row.reporting_frequency,
              parsed_currency: row.parsed_currency,
              time_basis: row.time_basis,
              source_name: row.source_name || undefined,
              country: undefined, // TODO: Extract from indicator_id or source metadata
              region: undefined, // TODO: Extract from indicator_id or source metadata
            }));

            return metadata;
          }
        );

        state.total_indicators = indicators.length;
        ctx.set("state", state);

        ctx.console.info("Found indicators", {
          indicator_name,
          count: indicators.length,
        });

        if (indicators.length < 2) {
          ctx.console.info(
            "Insufficient indicators for consensus analysis (need at least 2)",
            { indicator_name, count: indicators.length }
          );

          state.status = "completed";
          state.completedAt = await ctx.run("get-completion-time", () => {
            return new Date().toISOString();
          });
          ctx.set("state", state);

          return {
            success: true,
            indicator_name,
            message:
              "Insufficient indicators for consensus analysis (need at least 2)",
            total_indicators: indicators.length,
          };
        }

        // Step 2: Run all 5 consensus detectors in PARALLEL
        ctx.console.info("Step 2: Running consensus detectors in parallel", {
          indicator_name,
        });
        state.status = "detecting";
        ctx.set("state", state);

        const [
          unitResult,
          scaleResult,
          frequencyResult,
          currencyResult,
          timeBasisResult,
        ] = await Promise.all([
          // Unit consensus detector
          (ctx.serviceClient({
            name: "unit-consensus-detector",
          }) as unknown as UnitConsensusDetectorService).detect({
            indicator_name,
            indicators,
            consensus_threshold,
          }),

          // Scale consensus detector
          (ctx.serviceClient({
            name: "scale-consensus-detector",
          }) as unknown as ScaleConsensusDetectorService).detect({
            indicator_name,
            indicators,
            consensus_threshold,
          }),

          // Frequency consensus detector
          (ctx.serviceClient({
            name: "frequency-consensus-detector",
          }) as unknown as FrequencyConsensusDetectorService).detect({
            indicator_name,
            indicators,
            consensus_threshold,
          }),

          // Currency consensus detector
          (ctx.serviceClient({
            name: "currency-consensus-detector",
          }) as unknown as CurrencyConsensusDetectorService).detect({
            indicator_name,
            indicators,
            consensus_threshold,
          }),

          // Time basis consensus detector
          (ctx.serviceClient({
            name: "time-basis-consensus-detector",
          }) as unknown as TimeBasisConsensusDetectorService).detect({
            indicator_name,
            indicators,
            consensus_threshold,
          }),
        ]);

        // Store detector results
        state.unit_consensus = unitResult.result;
        state.scale_consensus = scaleResult.result;
        state.frequency_consensus = frequencyResult.result;
        state.currency_consensus = currencyResult.result;
        state.time_basis_consensus = timeBasisResult.result;
        ctx.set("state", state);

        ctx.console.info("All consensus detectors completed", {
          indicator_name,
          unit_outliers: state.unit_consensus.outliers.length,
          scale_outliers: state.scale_consensus.outliers.length,
          frequency_outliers: state.frequency_consensus.outliers.length,
          currency_outliers: state.currency_consensus.outliers.length,
          time_basis_outliers: state.time_basis_consensus.outliers.length,
        });

        // Step 3: Consolidate results
        ctx.console.info("Step 3: Consolidating results", { indicator_name });
        state.status = "consolidating";
        ctx.set("state", state);

        const consolidatedResult = await (ctx.serviceClient({
          name: "consensus-consolidator",
        }) as unknown as ConsensusConsolidatorService).consolidate({
          indicator_name,
          total_indicators: indicators.length,
          unit_consensus: state.unit_consensus,
          scale_consensus: state.scale_consensus,
          frequency_consensus: state.frequency_consensus,
          currency_consensus: state.currency_consensus,
          time_basis_consensus: state.time_basis_consensus,
        });

        state.summary = consolidatedResult.result;
        ctx.set("state", state);

        // Step 4: LLM review (ONLY if outliers found)
        const hasOutliers = state.summary.total_outliers > 0;

        if (hasOutliers) {
          ctx.console.info("Step 4: LLM review (outliers found)", {
            indicator_name,
            total_outliers: state.summary.total_outliers,
          });
          state.status = "reviewing";
          ctx.set("state", state);

          const llmReviewResult = await (ctx.serviceClient({
            name: "consensus-review",
          }) as unknown as ConsensusReviewService).review({
            indicator_name,
            summary: state.summary,
            llm_provider,
          });

          state.llm_review = llmReviewResult.result;
          ctx.set("state", state);

          ctx.console.info("LLM review complete", {
            indicator_name,
            overall_assessment: state.llm_review.overall_assessment,
            validated_outliers_count: state.llm_review.validated_outliers.length,
          });
        } else {
          ctx.console.info("Step 4: LLM review skipped (no outliers)", {
            indicator_name,
          });
        }

        // Step 5: Save comprehensive report
        ctx.console.info("Step 5: Saving consensus report", {
          indicator_name,
        });
        state.status = "saving";
        ctx.set("state", state);

        await ctx.run("save-consensus-report", async () => {
          const repo = new DatabaseRepository();

          // Determine if standardization is recommended
          const requiresStandardization =
            state.summary!.status === "inconsistent" ||
            state.summary!.status === "critical_inconsistency" ||
            (state.llm_review &&
              state.llm_review.standardization_recommendations.some(
                (rec) =>
                  rec.priority === "high" || rec.priority === "critical"
              ));

          // Save to consensus_analysis_reports table
          await repo.run(
            `INSERT INTO consensus_analysis_reports (
              indicator_name, total_indicators, total_checks,
              dimensions_with_consensus, dimensions_with_issues, total_outliers,
              unit_consensus, scale_consensus, frequency_consensus,
              currency_consensus, time_basis_consensus, all_outliers,
              llm_review, llm_confidence, llm_provider, llm_model,
              status, requires_standardization, analyzed_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
              $13, $14, $15, $16, $17, $18, $19
            )
            ON CONFLICT (indicator_name) DO UPDATE SET
              total_indicators = EXCLUDED.total_indicators,
              total_checks = EXCLUDED.total_checks,
              dimensions_with_consensus = EXCLUDED.dimensions_with_consensus,
              dimensions_with_issues = EXCLUDED.dimensions_with_issues,
              total_outliers = EXCLUDED.total_outliers,
              unit_consensus = EXCLUDED.unit_consensus,
              scale_consensus = EXCLUDED.scale_consensus,
              frequency_consensus = EXCLUDED.frequency_consensus,
              currency_consensus = EXCLUDED.currency_consensus,
              time_basis_consensus = EXCLUDED.time_basis_consensus,
              all_outliers = EXCLUDED.all_outliers,
              llm_review = EXCLUDED.llm_review,
              llm_confidence = EXCLUDED.llm_confidence,
              llm_provider = EXCLUDED.llm_provider,
              llm_model = EXCLUDED.llm_model,
              status = EXCLUDED.status,
              requires_standardization = EXCLUDED.requires_standardization,
              analyzed_at = EXCLUDED.analyzed_at,
              updated_at = CURRENT_TIMESTAMP`,
            [
              indicator_name,
              state.total_indicators,
              state.summary!.total_checks,
              state.summary!.dimensions_with_consensus,
              state.summary!.dimensions_with_issues,
              state.summary!.total_outliers,
              JSON.stringify(state.unit_consensus),
              JSON.stringify(state.scale_consensus),
              JSON.stringify(state.frequency_consensus),
              JSON.stringify(state.currency_consensus),
              JSON.stringify(state.time_basis_consensus),
              JSON.stringify(state.summary!.all_outliers),
              state.llm_review ? JSON.stringify(state.llm_review) : null,
              state.llm_review?.confidence || null,
              state.llm_review?.provider || null,
              state.llm_review?.model || null,
              state.summary!.status,
              requiresStandardization,
              new Date().toISOString(),
            ]
          );

          // Save individual outliers to consensus_outliers table
          if (hasOutliers) {
            for (const outlier of state.summary!.all_outliers) {
              // Find validation result from LLM review if available
              const validation = state.llm_review?.validated_outliers.find(
                (v) => v.indicator_id === outlier.indicator_id &&
                      v.dimension === outlier.dimension
              );

              await repo.run(
                `INSERT INTO consensus_outliers (
                  indicator_name, indicator_id, dimension,
                  outlier_value, consensus_value, deviation_percentage,
                  source_name, country, region,
                  is_valid_outlier, validation_reasoning, recommended_action,
                  detected_at, validated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (id) DO NOTHING`,
                [
                  indicator_name,
                  outlier.indicator_id,
                  outlier.dimension,
                  outlier.outlier_value,
                  outlier.consensus_value,
                  outlier.deviation_percentage,
                  outlier.source_name || null,
                  outlier.country || null,
                  outlier.region || null,
                  validation?.is_valid_outlier ?? null,
                  validation?.reasoning || null,
                  validation?.recommended_action || null,
                  new Date().toISOString(),
                  validation ? new Date().toISOString() : null,
                ]
              );
            }
          }
        });

        state.status = "completed";
        state.completedAt = await ctx.run("get-completion-time", () => {
          return new Date().toISOString();
        });
        ctx.set("state", state);

        const totalTime =
          new Date(state.completedAt!).getTime() -
          new Date(state.startedAt).getTime();

        ctx.console.info("Consensus analysis workflow completed", {
          indicator_name,
          total_time_ms: totalTime,
          status: state.summary!.status,
          total_outliers: state.summary!.total_outliers,
          requires_standardization:
            state.summary!.status === "inconsistent" ||
            state.summary!.status === "critical_inconsistency",
        });

        return {
          success: true,
          indicator_name,
          status: state.summary!.status,
          total_indicators: state.total_indicators,
          dimensions_with_consensus: state.summary!.dimensions_with_consensus,
          dimensions_with_issues: state.summary!.dimensions_with_issues,
          total_outliers: state.summary!.total_outliers,
          requires_standardization:
            state.summary!.status === "inconsistent" ||
            state.summary!.status === "critical_inconsistency",
          total_time_ms: totalTime,
        };
      } catch (error) {
        ctx.console.error("Consensus analysis workflow failed", {
          indicator_name,
          error: error instanceof Error ? error.message : String(error),
          stage: state.status,
        });

        state.status = "failed";
        state.error = error instanceof Error ? error.message : String(error);
        state.completedAt = await ctx.run("get-failure-time", () => {
          return new Date().toISOString();
        });
        ctx.set("state", state);

        return {
          success: false,
          indicator_name,
          error: state.error,
          failed_at_stage: state.status,
        };
      }
    },

    /**
     * Get current workflow state (shared handler - read-only)
     */
    getState: async (ctx: WorkflowSharedContext) => {
      const state = await ctx.get<WorkflowState>("state");
      return state || null;
    },
  },
});

export default consensusAnalysisWorkflow;
