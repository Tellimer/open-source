/**
 * Data Quality Workflow
 * Orchestrates parallel data quality checks and LLM validation
 * Separate from classification workflow
 */

import * as restate from "@restatedev/restate-sdk";
import type {
  WorkflowContext,
  WorkflowSharedContext,
} from "@restatedev/restate-sdk";
import { DatabaseRepository } from "../db/repository.ts";
import type {
  TimeSeriesPoint,
  StalenessResult,
  MagnitudeResult,
  FalseReadingResult,
  UnitChangeResult,
  ConsistencyResult,
  ConsolidatedQualityReport,
  LLMQualityReview,
  DataQualityReport,
} from "../types.ts";
import type {
  StalenessDetectorService,
  MagnitudeDetectorService,
  FalseReadingDetectorService,
  UnitChangeDetectorService,
  ConsistencyCheckerService,
  QualityConsolidatorService,
  QualityReviewService,
} from "./service-types.ts";

interface WorkflowState {
  indicator_id: string;
  name: string;
  llm_provider?: string;
  status:
    | "pending"
    | "fetching_data"
    | "detecting"
    | "consolidating"
    | "reviewing"
    | "saving"
    | "completed"
    | "failed";

  // Detector results
  staleness?: StalenessResult;
  magnitude?: MagnitudeResult;
  false_readings?: FalseReadingResult;
  unit_changes?: UnitChangeResult;
  consistency?: ConsistencyResult;

  // Consolidated report
  consolidated_report?: ConsolidatedQualityReport;

  // LLM review (if issues found)
  llm_review?: LLMQualityReview & {
    provider: string;
    model: string;
    created_at: string;
  };

  // Time series metadata
  time_series_count?: number;
  date_range?: { start: string; end: string };

  error?: string;
  startedAt: string;
  completedAt?: string;
}

const dataQualityWorkflow = restate.workflow({
  name: "data-quality-workflow",
  handlers: {
    /**
     * Run data quality workflow for an indicator
     */
    run: async (
      ctx: WorkflowContext,
      input: { indicator_id: string; llm_provider?: "local" | "openai" | "anthropic" }
    ) => {
      const indicator_id = ctx.key; // workflow ID = indicator_id
      const { llm_provider = "openai" } = input;

      ctx.console.info("Starting data quality workflow", {
        indicator_id,
        provider: llm_provider,
      });

      // Initialize workflow state
      const startedAt = await ctx.run("get-start-time", () => {
        return new Date().toISOString();
      });

      const state: WorkflowState = {
        indicator_id,
        name: "", // Will be fetched from DB
        llm_provider,
        status: "pending",
        startedAt,
      };

      ctx.set("state", state);

      try {
        // Step 1: Fetch indicator metadata and time series data
        ctx.console.info("Step 1: Fetching data", { indicator_id });
        state.status = "fetching_data";
        ctx.set("state", state);

        const { name, timeSeriesData, classification } = await ctx.run(
          "fetch-indicator-data",
          async () => {
            const repo = new DatabaseRepository();

            // Fetch from classifications table for metadata
            const classificationData = await repo.queryOne<{
              name: string;
              reporting_frequency: string;
              normalized_scale: string;
              indicator_type: string;
              is_cumulative: boolean;
              temporal_aggregation: string;
            }>(
              `SELECT name, reporting_frequency, normalized_scale, indicator_type,
                      is_cumulative, temporal_aggregation
               FROM classifications WHERE indicator_id = $1`,
              [indicator_id]
            );

            if (!classificationData) {
              throw new Error(
                `Indicator ${indicator_id} not found in classifications`
              );
            }

            // Fetch time series data from source_indicators.sample_values (JSON)
            const sourceData = await repo.queryOne<{
              sample_values: string;
            }>(
              `SELECT sample_values FROM source_indicators WHERE id = $1`,
              [indicator_id]
            );

            if (!sourceData) {
              throw new Error(
                `Indicator ${indicator_id} not found in source_indicators`
              );
            }

            // Parse sample_values JSON and filter out invalid dates
            let timeSeriesData: Array<{ date: string; value: number }> = [];
            try {
              const samples = JSON.parse(sourceData.sample_values) as Array<{
                date: string;
                value: number;
              }>;

              // Filter out non-date values (e.g., "last10YearsAvg") and sort by date
              timeSeriesData = samples
                .filter((point) => {
                  const parsedDate = new Date(point.date);
                  return !isNaN(parsedDate.getTime());
                })
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            } catch (error) {
              ctx.console.warn("Failed to parse sample_values", {
                indicator_id,
                error: error instanceof Error ? error.message : String(error),
              });
            }

            return {
              name: classificationData.name,
              timeSeriesData,
              classification: {
                reporting_frequency: classificationData.reporting_frequency,
                normalized_scale: classificationData.normalized_scale,
                indicator_type: classificationData.indicator_type,
                is_cumulative: classificationData.is_cumulative,
                temporal_aggregation: classificationData.temporal_aggregation,
              },
            };
          }
        );

        state.name = name;
        state.time_series_count = timeSeriesData.length;

        if (timeSeriesData.length > 0) {
          state.date_range = {
            start: timeSeriesData[0].date,
            end: timeSeriesData[timeSeriesData.length - 1].date,
          };
        }

        ctx.set("state", state);

        if (timeSeriesData.length === 0) {
          ctx.console.warn("No time series data found", { indicator_id });
          // Still proceed to flag this as an issue
        }

        // Step 2: Run all detectors in PARALLEL
        ctx.console.info("Step 2: Running detectors in parallel", {
          indicator_id,
        });
        state.status = "detecting";
        ctx.set("state", state);

        // Execute all 5 detectors concurrently
        const [
          stalenessResult,
          magnitudeResult,
          falseReadingsResult,
          unitChangesResult,
          consistencyResult,
        ] = await Promise.all([
          // Staleness detector
          (ctx.serviceClient({
            name: "staleness-detector",
          }) as unknown as StalenessDetectorService).detect({
            indicator_id,
            time_series: timeSeriesData,
            expected_frequency: classification.reporting_frequency,
            llm_provider,
          }),

          // Magnitude detector
          (ctx.serviceClient({
            name: "magnitude-detector",
          }) as unknown as MagnitudeDetectorService).detect({
            indicator_id,
            time_series: timeSeriesData,
            indicator_type: classification.indicator_type,
            is_cumulative: classification.is_cumulative,
            llm_provider,
          }),

          // False reading detector
          (ctx.serviceClient({
            name: "false-reading-detector",
          }) as unknown as FalseReadingDetectorService).detect({
            indicator_id,
            time_series: timeSeriesData,
            indicator_type: classification.indicator_type,
            llm_provider,
          }),

          // Unit change detector
          (ctx.serviceClient({
            name: "unit-change-detector",
          }) as unknown as UnitChangeDetectorService).detect({
            indicator_id,
            time_series: timeSeriesData,
            expected_scale: classification.normalized_scale,
            llm_provider,
          }),

          // Consistency checker
          (ctx.serviceClient({
            name: "consistency-checker",
          }) as unknown as ConsistencyCheckerService).check({
            indicator_id,
            time_series: timeSeriesData,
            is_cumulative: classification.is_cumulative,
            temporal_aggregation: classification.temporal_aggregation,
            llm_provider,
          }),
        ]);

        // Store detector results
        state.staleness = stalenessResult.result;
        state.magnitude = magnitudeResult.result;
        state.false_readings = falseReadingsResult.result;
        state.unit_changes = unitChangesResult.result;
        state.consistency = consistencyResult.result;
        ctx.set("state", state);

        ctx.console.info("All detectors completed", {
          indicator_id,
          staleness_flags: state.staleness.flags.length,
          magnitude_flags: state.magnitude.flags.length,
          false_reading_flags: state.false_readings.flags.length,
          unit_change_flags: state.unit_changes.flags.length,
          consistency_flags: state.consistency.flags.length,
        });

        // Step 3: Consolidate results
        ctx.console.info("Step 3: Consolidating results", { indicator_id });
        state.status = "consolidating";
        ctx.set("state", state);

        const consolidatedResult = await (ctx.serviceClient({
          name: "quality-consolidator",
        }) as unknown as QualityConsolidatorService).consolidate({
          indicator_id,
          staleness: state.staleness,
          magnitude: state.magnitude,
          false_readings: state.false_readings,
          unit_changes: state.unit_changes,
          consistency: state.consistency,
        });

        state.consolidated_report = consolidatedResult.result;
        ctx.set("state", state);

        // Step 4: LLM review (ONLY if issues found)
        const hasIssues =
          state.consolidated_report.flagged_count > 0 ||
          state.consolidated_report.critical_count > 0;

        if (hasIssues) {
          ctx.console.info("Step 4: LLM review (issues found)", {
            indicator_id,
            flagged_count: state.consolidated_report.flagged_count,
            critical_count: state.consolidated_report.critical_count,
          });
          state.status = "reviewing";
          ctx.set("state", state);

          // Calculate time series summary for LLM context
          const values = timeSeriesData.map((p) => p.value);
          const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
          const variance =
            values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
            values.length;
          const stdDev = Math.sqrt(variance);

          const llmReviewResult = await (ctx.serviceClient({
            name: "quality-review",
          }) as unknown as QualityReviewService).review({
            indicator_id,
            name: state.name,
            consolidated_report: state.consolidated_report,
            time_series_summary: {
              count: timeSeriesData.length,
              date_range: state.date_range!,
              mean,
              std_dev: stdDev,
            },
            llm_provider,
          });

          state.llm_review = llmReviewResult.result;
          ctx.set("state", state);

          ctx.console.info("LLM review complete", {
            indicator_id,
            overall_assessment: state.llm_review.overall_assessment,
            usability_verdict: state.llm_review.usability_verdict,
          });
        } else {
          ctx.console.info("Step 4: LLM review skipped (no issues)", {
            indicator_id,
          });
        }

        // Step 5: Save comprehensive report
        ctx.console.info("Step 5: Saving quality report", { indicator_id });
        state.status = "saving";
        ctx.set("state", state);

        await ctx.run("save-quality-report", async () => {
          const repo = new DatabaseRepository();

          // Determine status
          let reportStatus: "clean" | "minor_issues" | "major_issues" | "unusable";
          if (!hasIssues) {
            reportStatus = "clean";
          } else if (state.llm_review) {
            reportStatus = state.llm_review.overall_assessment;
          } else {
            // Fallback if LLM review didn't run
            reportStatus =
              state.consolidated_report!.critical_count > 0
                ? "major_issues"
                : "minor_issues";
          }

          const requiresAttention =
            reportStatus === "major_issues" || reportStatus === "unusable";

          // Save to data_quality_reports table
          await repo.run(
            `INSERT INTO data_quality_reports (
              indicator_id, name,
              total_checks, passed_checks, flagged_count, critical_count,
              overall_score,
              staleness_result, magnitude_result, false_readings_result,
              unit_changes_result, consistency_result, all_flags,
              llm_review, llm_confidence, llm_provider, llm_model,
              status, requires_attention,
              time_series_count, date_range_start, date_range_end,
              checked_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
              $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
            )
            ON CONFLICT (indicator_id) DO UPDATE SET
              total_checks = EXCLUDED.total_checks,
              passed_checks = EXCLUDED.passed_checks,
              flagged_count = EXCLUDED.flagged_count,
              critical_count = EXCLUDED.critical_count,
              overall_score = EXCLUDED.overall_score,
              staleness_result = EXCLUDED.staleness_result,
              magnitude_result = EXCLUDED.magnitude_result,
              false_readings_result = EXCLUDED.false_readings_result,
              unit_changes_result = EXCLUDED.unit_changes_result,
              consistency_result = EXCLUDED.consistency_result,
              all_flags = EXCLUDED.all_flags,
              llm_review = EXCLUDED.llm_review,
              llm_confidence = EXCLUDED.llm_confidence,
              llm_provider = EXCLUDED.llm_provider,
              llm_model = EXCLUDED.llm_model,
              status = EXCLUDED.status,
              requires_attention = EXCLUDED.requires_attention,
              time_series_count = EXCLUDED.time_series_count,
              date_range_start = EXCLUDED.date_range_start,
              date_range_end = EXCLUDED.date_range_end,
              checked_at = EXCLUDED.checked_at,
              updated_at = CURRENT_TIMESTAMP`,
            [
              indicator_id,
              state.name,
              state.consolidated_report!.total_checks,
              state.consolidated_report!.passed_checks,
              state.consolidated_report!.flagged_count,
              state.consolidated_report!.critical_count,
              state.consolidated_report!.overall_score,
              JSON.stringify(state.staleness),
              JSON.stringify(state.magnitude),
              JSON.stringify(state.false_readings),
              JSON.stringify(state.unit_changes),
              JSON.stringify(state.consistency),
              JSON.stringify(state.consolidated_report!.all_flags),
              state.llm_review ? JSON.stringify(state.llm_review) : null,
              state.llm_review?.confidence || null,
              state.llm_review?.provider || null,
              state.llm_review?.model || null,
              reportStatus,
              requiresAttention,
              state.time_series_count,
              state.date_range?.start || null,
              state.date_range?.end || null,
              new Date().toISOString(),
            ]
          );
        });

        state.status = "completed";
        state.completedAt = await ctx.run("get-completion-time", () => {
          return new Date().toISOString();
        });
        ctx.set("state", state);

        const totalTime =
          new Date(state.completedAt!).getTime() -
          new Date(state.startedAt).getTime();

        ctx.console.info("Data quality workflow completed", {
          indicator_id,
          total_time_ms: totalTime,
          status: state.llm_review?.overall_assessment || "clean",
          overall_score: state.consolidated_report!.overall_score,
          requires_attention:
            state.llm_review?.usability_verdict === "investigate_first" ||
            state.llm_review?.usability_verdict === "do_not_use",
        });

        return {
          success: true,
          indicator_id,
          status: state.llm_review?.overall_assessment || "clean",
          overall_score: state.consolidated_report!.overall_score,
          flagged_count: state.consolidated_report!.flagged_count,
          critical_count: state.consolidated_report!.critical_count,
          usability_verdict: state.llm_review?.usability_verdict || "use_as_is",
          total_time_ms: totalTime,
        };
      } catch (error) {
        ctx.console.error("Data quality workflow failed", {
          indicator_id,
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
          indicator_id,
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

export default dataQualityWorkflow;
