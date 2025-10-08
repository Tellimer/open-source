/**
 * Validation Stage - Time Series Analysis
 * Validates temporal_aggregation using statistical analysis of time series data
 * @module
 */

import type { Indicator, TemporalDataPoint } from '../../types.ts';
import type { SpecialistResult, ValidationResult } from '../types.ts';
import {
  analyzeTimeSeriesPattern,
  formatAnalysisForLLM,
  type TimeSeriesAnalysis,
} from './timeSeriesAnalysis.ts';

/**
 * Indicator types that CAN be cumulative (YTD)
 */
const CUMULABLE_TYPES = new Set([
  'flow',    // GDP YTD, Revenue YTD, Spending YTD
  'volume',  // Exports YTD, Imports YTD, Sales YTD
  'balance', // Trade Balance YTD, Budget Balance YTD
  'count',   // Housing Starts YTD, Job Losses YTD
]);

/**
 * Extract time series from indicator sample_values
 */
function extractTimeSeries(
  sample_values?: number[] | TemporalDataPoint[]
): TemporalDataPoint[] | null {
  if (!sample_values || !Array.isArray(sample_values)) return null;
  if (sample_values.length === 0) return null;

  // Check if it's temporal data (has date field)
  const first = sample_values[0];
  if (typeof first === 'object' && first !== null && 'date' in first) {
    return sample_values as TemporalDataPoint[];
  }

  return null;
}

/**
 * Select indicators that need validation
 */
function selectIndicatorsForValidation(
  indicators: Indicator[],
  specialistResults: SpecialistResult[]
): Array<{ indicator: Indicator; specialist: SpecialistResult; timeSeries: TemporalDataPoint[] }> {
  const selected: Array<{ indicator: Indicator; specialist: SpecialistResult; timeSeries: TemporalDataPoint[] }> = [];

  let skippedNoSpecialist = 0;
  let skippedNoTimeSeries = 0;
  let skippedNonCumulable = 0;
  let skippedHighConfidence = 0;

  for (const ind of indicators) {
    const specialist = specialistResults.find((s) => s.indicator_id === ind.id);
    if (!specialist) {
      skippedNoSpecialist++;
      continue;
    }

    // Must have sufficient time series data
    const timeSeries = extractTimeSeries(ind.sample_values);
    if (!timeSeries || timeSeries.length < 6) {
      skippedNoTimeSeries++;
      continue;
    }

    // CRITICAL: Only validate types that CAN be cumulative
    if (!CUMULABLE_TYPES.has(specialist.indicator_type)) {
      skippedNonCumulable++;
      continue; // Skip non-cumulable types (index, percentage, price, etc.)
    }

    // Validate ALL cumulable types with time series data
    // This builds a comprehensive validation database for analysis and flagging
    selected.push({ indicator: ind, specialist, timeSeries });
  }

  // Debug logging (can be enabled via env var if needed)
  const debugValidation = Deno.env.get('DEBUG_VALIDATION') === '1';
  if (debugValidation) {
    console.log(`[Validation Filter] Total indicators: ${indicators.length}`);
    console.log(`[Validation Filter] Selected for validation: ${selected.length}`);
    console.log(`[Validation Filter] Skipped - no specialist result: ${skippedNoSpecialist}`);
    console.log(`[Validation Filter] Skipped - insufficient time series: ${skippedNoTimeSeries}`);
    console.log(`[Validation Filter] Skipped - non-cumulable type: ${skippedNonCumulable}`);
  }

  return selected;
}

/**
 * Generate suggested temporal aggregation based on analysis
 */
function suggestTemporalAggregation(
  analysis: TimeSeriesAnalysis,
  currentTemporal: string
): string | undefined {
  if (analysis.is_cumulative && analysis.cumulative_confidence > 0.7) {
    if (currentTemporal !== 'period-cumulative') {
      return 'period-cumulative';
    }
  } else if (!analysis.is_cumulative && analysis.cumulative_confidence > 0.6) {
    if (currentTemporal === 'period-cumulative') {
      return 'period-total';
    }
  }
  return undefined;
}

/**
 * Run validation stage
 */
export function validateIndicators(
  indicators: Indicator[],
  specialistResults: SpecialistResult[],
  options: { quiet?: boolean } = {}
): ValidationResult[] {
  const { quiet = false } = options;

  const toValidate = selectIndicatorsForValidation(indicators, specialistResults);

  if (!quiet) {
    console.log(`  📊 Filtered ${toValidate.length} cumulable indicators for validation (from ${indicators.length} total)`);
  }

  if (toValidate.length === 0) {
    if (!quiet) {
      console.log('  ℹ️  No indicators selected for validation');
    }
    return [];
  }


  const results: ValidationResult[] = [];

  for (const { indicator, specialist, timeSeries } of toValidate) {
    const analysis = analyzeTimeSeriesPattern(timeSeries);
    const suggestion = suggestTemporalAggregation(analysis, specialist.temporal_aggregation);

    const result: ValidationResult = {
      indicator_id: indicator.id!,
      is_cumulative: analysis.is_cumulative,
      cumulative_confidence: analysis.cumulative_confidence,
      has_seasonal_reset: analysis.has_seasonal_reset,
      is_monotonic_within_year: analysis.is_monotonic_within_year,
      dec_jan_ratio: analysis.evidence.dec_jan_ratio,
      within_year_increase_pct: analysis.evidence.within_year_increase_pct,
      year_boundaries: analysis.evidence.year_boundaries,
      reset_at_boundary_pct: analysis.evidence.reset_at_boundary_pct,
      suggested_temporal: suggestion,
      validation_reasoning: formatAnalysisForLLM(analysis),
      data_points_analyzed: timeSeries.length,
    };

    results.push(result);

    if (!quiet) {
      const status = suggestion
        ? `🔧 ${specialist.temporal_aggregation} → ${suggestion}`
        : `✅ ${specialist.temporal_aggregation}`;
      console.log(`  ${status} ${indicator.name} (${(analysis.cumulative_confidence * 100).toFixed(0)}%)`);
    }
  }

  if (!quiet) {
    console.log(`  ✓ Validated ${results.length} indicators`);
  }

  return results;
}
