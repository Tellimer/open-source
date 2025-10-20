/**
 * Migration Script: Populate final_indicators table
 *
 * This script consolidates data from all three pipeline workflows into the
 * final_indicators table, which serves as the production-ready export.
 *
 * Usage:
 *   bun run src/scripts/migrate-to-final-indicators.ts [--force]
 */

import { DatabaseRepository } from "../db/repository.ts";

interface MigrationStats {
  total_indicators: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ indicator_id: string; error: string }>;
}

async function migrateToFinalIndicators(force: boolean = false): Promise<MigrationStats> {
  const repo = new DatabaseRepository();

  const stats: MigrationStats = {
    total_indicators: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  console.log("🚀 Starting migration to final_indicators table");
  console.log(`   Force mode: ${force ? "YES (will overwrite existing)" : "NO (will skip existing)"}`);
  console.log();

  try {
    // Get all indicators from source_indicators
    const sourceIndicators = await repo.query<{ id: string }>(
      `SELECT id FROM source_indicators WHERE deleted_at IS NULL ORDER BY id`
    );

    stats.total_indicators = sourceIndicators.length;
    console.log(`📊 Found ${stats.total_indicators} source indicators`);
    console.log();

    let processed = 0;

    for (const source of sourceIndicators) {
      const indicator_id = source.id;
      processed++;

      try {
        // Check if already exists in final_indicators
        if (!force) {
          const existing = await repo.queryOne(
            `SELECT id FROM final_indicators WHERE id = $1`,
            [indicator_id]
          );

          if (existing) {
            stats.skipped++;
            if (processed % 100 === 0) {
              console.log(`⏭️  Progress: ${processed}/${stats.total_indicators} (${stats.skipped} skipped)`);
            }
            continue;
          }
        }

        // Fetch data from all three pipeline tables
        const [source_data, classification, data_quality, consensus_data] = await Promise.all([
          // Source indicator data
          repo.queryOne<{
            id: string;
            name: string;
            source_name: string | null;
            source_url: string | null;
            long_name: string | null;
            category_group: string | null;
            dataset: string | null;
            aggregation_method: string | null;
            definition: string | null;
            units: string | null;
            scale: string | null;
            periodicity: string | null;
            topic: string | null;
            currency_code: string | null;
            created_at: Date;
            updated_at: Date;
          }>(
            `SELECT * FROM source_indicators WHERE id = $1`,
            [indicator_id]
          ),

          // Classification data
          repo.queryOne<{
            parsed_scale: string;
            parsed_unit_type: string;
            reporting_frequency: string;
            parsed_currency: string | null;
            indicator_type: string;
            temporal_aggregation: string;
            heat_map_orientation: string;
            is_cumulative: boolean;
            time_basis: string;
            overall_confidence: number;
            created_at: Date;
          }>(
            `SELECT parsed_scale, parsed_unit_type, reporting_frequency, parsed_currency,
                    indicator_type, temporal_aggregation, heat_map_orientation,
                    is_cumulative, time_basis, overall_confidence, created_at
             FROM classifications WHERE indicator_id = $1`,
            [indicator_id]
          ),

          // Data quality data
          repo.queryOne<{
            overall_score: number;
            status: string;
            flagged_count: number;
            critical_count: number;
            staleness_result: any;
            magnitude_result: any;
            false_readings_result: any;
            unit_changes_result: any;
            consistency_result: any;
            llm_review: any;
            checked_at: Date;
          }>(
            `SELECT overall_score, status, flagged_count, critical_count,
                    staleness_result, magnitude_result, false_readings_result,
                    unit_changes_result, consistency_result, llm_review, checked_at
             FROM data_quality_reports WHERE indicator_id = $1`,
            [indicator_id]
          ),

          // Consensus data (via indicator name)
          repo.query<{
            indicator_name: string;
            status: string;
            requires_standardization: boolean;
            total_indicators: number;
          }>(
            `SELECT ca.indicator_name, ca.status, ca.requires_standardization, ca.total_indicators
             FROM consensus_analysis_reports ca
             JOIN source_indicators si ON si.name = ca.indicator_name
             WHERE si.id = $1`,
            [indicator_id]
          ),
        ]);

        // Check if we have minimum required data (classification is mandatory)
        if (!classification) {
          stats.skipped++;
          console.log(`⚠️  ${indicator_id}: No classification data, skipping`);
          continue;
        }

        // Get consensus outlier info
        const consensusOutliers = await repo.query<{
          dimension: string;
        }>(
          `SELECT dimension FROM consensus_outliers WHERE indicator_id = $1`,
          [indicator_id]
        );

        const consensus = consensus_data.length > 0 ? consensus_data[0] : null;

        // Determine usability verdict from LLM review
        let usability_verdict = "use_as_is";
        if (data_quality?.llm_review) {
          usability_verdict = data_quality.llm_review.usability_verdict || "use_as_is";
        } else if (data_quality?.status === "unusable") {
          usability_verdict = "do_not_use";
        } else if (data_quality?.status === "major_issues") {
          usability_verdict = "investigate_first";
        } else if (data_quality?.status === "minor_issues") {
          usability_verdict = "use_with_caution";
        }

        // Build quality flags
        const has_staleness = data_quality?.staleness_result?.has_staleness === true;
        const has_magnitude = data_quality?.magnitude_result?.has_anomalies === true;
        const has_false_readings = data_quality?.false_readings_result?.has_issues === true;
        const has_unit_changes = data_quality?.unit_changes_result?.has_changes === true;
        const has_consistency = data_quality?.consistency_result?.is_consistent === false;

        // Insert or update final_indicators
        await repo.run(
          `INSERT INTO final_indicators (
            id, name, source_name, source_url, long_name, category_group, dataset,
            aggregation_method, definition,
            original_units, original_scale, original_periodicity, original_topic, original_currency_code,
            validated_units, validated_scale, validated_frequency, validated_currency,
            indicator_type, temporal_aggregation, heat_map_orientation,
            is_cumulative, time_basis, classification_confidence,
            quality_score, quality_status, usability_verdict,
            has_data_quality_issues, has_staleness_issues, has_magnitude_anomalies,
            has_false_readings, has_unit_changes, has_consistency_issues,
            quality_flags_count, quality_critical_count, last_quality_check,
            is_consensus_outlier, consensus_outlier_dimensions, requires_standardization,
            indicator_group_size, consensus_status,
            pipeline_status, pipeline_version,
            classified_at, quality_checked_at,
            overall_confidence,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14,
            $15, $16, $17, $18,
            $19, $20, $21,
            $22, $23, $24,
            $25, $26, $27,
            $28, $29, $30,
            $31, $32, $33,
            $34, $35, $36,
            $37, $38, $39,
            $40, $41,
            $42, $43,
            $44, $45,
            $46,
            $47, $48
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            validated_units = EXCLUDED.validated_units,
            validated_scale = EXCLUDED.validated_scale,
            validated_frequency = EXCLUDED.validated_frequency,
            validated_currency = EXCLUDED.validated_currency,
            indicator_type = EXCLUDED.indicator_type,
            temporal_aggregation = EXCLUDED.temporal_aggregation,
            heat_map_orientation = EXCLUDED.heat_map_orientation,
            is_cumulative = EXCLUDED.is_cumulative,
            time_basis = EXCLUDED.time_basis,
            classification_confidence = EXCLUDED.classification_confidence,
            quality_score = EXCLUDED.quality_score,
            quality_status = EXCLUDED.quality_status,
            usability_verdict = EXCLUDED.usability_verdict,
            has_data_quality_issues = EXCLUDED.has_data_quality_issues,
            has_staleness_issues = EXCLUDED.has_staleness_issues,
            has_magnitude_anomalies = EXCLUDED.has_magnitude_anomalies,
            has_false_readings = EXCLUDED.has_false_readings,
            has_unit_changes = EXCLUDED.has_unit_changes,
            has_consistency_issues = EXCLUDED.has_consistency_issues,
            quality_flags_count = EXCLUDED.quality_flags_count,
            quality_critical_count = EXCLUDED.quality_critical_count,
            last_quality_check = EXCLUDED.last_quality_check,
            is_consensus_outlier = EXCLUDED.is_consensus_outlier,
            consensus_outlier_dimensions = EXCLUDED.consensus_outlier_dimensions,
            requires_standardization = EXCLUDED.requires_standardization,
            indicator_group_size = EXCLUDED.indicator_group_size,
            consensus_status = EXCLUDED.consensus_status,
            pipeline_status = EXCLUDED.pipeline_status,
            classified_at = EXCLUDED.classified_at,
            quality_checked_at = EXCLUDED.quality_checked_at,
            overall_confidence = EXCLUDED.overall_confidence,
            updated_at = CURRENT_TIMESTAMP
          `,
          [
            // Original source fields
            source_data?.id,
            source_data?.name,
            source_data?.source_name,
            source_data?.source_url,
            source_data?.long_name,
            source_data?.category_group,
            source_data?.dataset,
            source_data?.aggregation_method,
            source_data?.definition,
            source_data?.units,
            source_data?.scale,
            source_data?.periodicity,
            source_data?.topic,
            source_data?.currency_code,
            // Validated fields from classification
            classification.parsed_unit_type,
            classification.parsed_scale,
            classification.reporting_frequency,
            classification.parsed_currency,
            classification.indicator_type,
            classification.temporal_aggregation,
            classification.heat_map_orientation,
            classification.is_cumulative,
            classification.time_basis,
            classification.overall_confidence,
            // Quality metrics
            data_quality?.overall_score || 0,
            data_quality?.status || "pending",
            usability_verdict,
            (data_quality?.flagged_count || 0) > 0,
            has_staleness,
            has_magnitude,
            has_false_readings,
            has_unit_changes,
            has_consistency,
            data_quality?.flagged_count || 0,
            data_quality?.critical_count || 0,
            data_quality?.checked_at || null,
            // Consensus data
            consensusOutliers.length > 0,
            consensusOutliers.length > 0 ? consensusOutliers.map(o => o.dimension) : null,
            consensus?.requires_standardization || false,
            consensus?.total_indicators || null,
            consensus?.status || null,
            // Pipeline status
            data_quality ? "complete" : "classified",
            "2.0.0", // Pipeline version
            classification.created_at,
            data_quality?.checked_at || null,
            classification.overall_confidence,
            source_data?.created_at || new Date(),
            source_data?.updated_at || new Date(),
          ]
        );

        stats.migrated++;

        if (processed % 100 === 0) {
          console.log(`✅ Progress: ${processed}/${stats.total_indicators} (${stats.migrated} migrated)`);
        }

      } catch (error) {
        stats.failed++;
        stats.errors.push({
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(`❌ ${indicator_id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log();
    console.log("✨ Migration complete!");
    console.log();
    console.log("📊 Summary:");
    console.log(`   Total indicators: ${stats.total_indicators}`);
    console.log(`   ✅ Migrated: ${stats.migrated}`);
    console.log(`   ⏭️  Skipped: ${stats.skipped}`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    console.log();

    if (stats.errors.length > 0 && stats.errors.length <= 20) {
      console.log("❌ Errors:");
      for (const err of stats.errors) {
        console.log(`   ${err.indicator_id}: ${err.error}`);
      }
      console.log();
    }

    return stats;

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Main execution
if (import.meta.main) {
  const force = Deno.args.includes("--force");

  migrateToFinalIndicators(force)
    .then((stats) => {
      if (stats.failed > 0) {
        Deno.exit(1);
      } else {
        Deno.exit(0);
      }
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      Deno.exit(1);
    });
}

export { migrateToFinalIndicators };
