/**
 * PostgreSQL Database Schema for Classify Workflow
 * Uses Bun's native SQL with PostgreSQL
 * @module
 */

export const SCHEMA_VERSION = 5;

/**
 * PostgreSQL schema for classify workflow pipeline
 */
export const CLASSIFY_WORKFLOW_POSTGRES_SCHEMA = `
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_version (version) VALUES (${SCHEMA_VERSION})
ON CONFLICT (version) DO NOTHING;

-- Source indicators table
CREATE TABLE IF NOT EXISTS source_indicators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_name TEXT,
  source_url TEXT,
  long_name TEXT,
  category_group TEXT,
  dataset TEXT,
  aggregation_method TEXT,
  definition TEXT,
  units TEXT,
  scale TEXT,
  periodicity TEXT,
  topic TEXT,
  currency_code TEXT,
  sample_values TEXT, -- JSON array
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP
);

-- Main classifications table
CREATE TABLE IF NOT EXISTS classifications (
  indicator_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,

  -- Source metadata
  original_units TEXT,
  source_name TEXT,
  long_name TEXT,
  category_group TEXT,
  dataset TEXT,
  topic TEXT,
  source_scale TEXT,
  source_periodicity TEXT,
  aggregation_method TEXT,
  source_currency_code TEXT,

  -- Stage 1: Normalization
  parsed_scale TEXT,
  parsed_unit_type TEXT,
  parsed_currency TEXT,
  parsing_confidence REAL,

  -- Stage 2: Time Inference
  reporting_frequency TEXT,
  time_basis TEXT,
  time_confidence REAL,
  time_reasoning TEXT,
  time_source_used TEXT,

  -- Stage 2.5: Cumulative Pattern Detection
  is_cumulative BOOLEAN,
  cumulative_pattern_type TEXT,
  cumulative_confidence REAL,
  cumulative_reasoning TEXT,

  -- Stage 3: Scale Inference (DEPRECATED but kept for compatibility)
  scale TEXT,
  scale_confidence REAL,
  scale_reasoning TEXT,

  -- Stage 4: Currency Check (DEPRECATED but kept for compatibility)
  is_currency_denominated BOOLEAN,
  detected_currency TEXT,
  currency_confidence REAL,
  currency_reasoning TEXT,

  -- Stage 5: Family Assignment
  family TEXT,
  family_confidence REAL,
  family_reasoning TEXT,

  -- Stage 6: Type Classification
  indicator_type TEXT,
  temporal_aggregation TEXT,
  heat_map_orientation TEXT,
  type_confidence REAL,
  type_reasoning TEXT,

  -- Stage 7: Boolean Review
  boolean_review_passed BOOLEAN,
  boolean_review_fields_wrong TEXT,
  boolean_review_reason TEXT,
  boolean_review_confidence REAL,

  -- Stage 8: Final Review
  final_review_status TEXT,
  final_review_corrections TEXT,
  final_review_reason TEXT,
  final_review_confidence REAL,

  -- Overall metrics
  overall_confidence REAL,
  review_status TEXT,

  -- LLM metadata
  provider TEXT,
  model TEXT,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (indicator_id) REFERENCES source_indicators(id) ON DELETE CASCADE
);

-- Normalization results
CREATE TABLE IF NOT EXISTS normalization_results (
  indicator_id TEXT PRIMARY KEY,
  original_units TEXT,
  parsed_scale TEXT,
  normalized_scale TEXT,
  parsed_unit_type TEXT,
  parsed_currency TEXT,
  parsing_confidence REAL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Time inference results
CREATE TABLE IF NOT EXISTS time_inference_results (
  indicator_id TEXT PRIMARY KEY,
  reporting_frequency TEXT NOT NULL,
  time_basis TEXT NOT NULL,
  confidence REAL NOT NULL,
  reasoning TEXT,
  source_used TEXT,
  provider TEXT,
  model TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Cumulative pattern detection results
CREATE TABLE IF NOT EXISTS cumulative_detection_results (
  indicator_id TEXT PRIMARY KEY,
  is_cumulative BOOLEAN NOT NULL,
  pattern_type TEXT NOT NULL,
  confidence REAL NOT NULL,
  evidence TEXT,
  reasoning TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Family assignment results
CREATE TABLE IF NOT EXISTS family_assignment_results (
  indicator_id TEXT PRIMARY KEY,
  family TEXT NOT NULL,
  confidence REAL NOT NULL,
  reasoning TEXT,
  provider TEXT,
  model TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Type classification results
CREATE TABLE IF NOT EXISTS type_classification_results (
  indicator_id TEXT PRIMARY KEY,
  indicator_type TEXT NOT NULL,
  temporal_aggregation TEXT NOT NULL,
  heat_map_orientation TEXT NOT NULL,
  confidence REAL NOT NULL,
  reasoning TEXT,
  provider TEXT,
  model TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Boolean review results
CREATE TABLE IF NOT EXISTS boolean_review_results (
  indicator_id TEXT PRIMARY KEY,
  passed BOOLEAN NOT NULL,
  fields_wrong TEXT,
  reason TEXT,
  confidence REAL NOT NULL,
  provider TEXT,
  model TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Final review results
CREATE TABLE IF NOT EXISTS final_review_results (
  indicator_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  corrections TEXT,
  reason TEXT,
  confidence REAL NOT NULL,
  provider TEXT,
  model TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Processing audit trail
CREATE TABLE IF NOT EXISTS processing_log (
  id SERIAL PRIMARY KEY,
  indicator_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  processing_time_ms INTEGER,
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Pipeline batch statistics
CREATE TABLE IF NOT EXISTS pipeline_stats (
  id SERIAL PRIMARY KEY,
  batch_id TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  total_indicators INTEGER NOT NULL,
  successful_indicators INTEGER DEFAULT 0,
  failed_indicators INTEGER DEFAULT 0,
  batch_start_time TIMESTAMP NOT NULL,
  batch_end_time TIMESTAMP,
  total_duration_ms INTEGER,
  avg_time_per_indicator_ms INTEGER,
  avg_confidence REAL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_classifications_family
  ON classifications(family);
CREATE INDEX IF NOT EXISTS idx_classifications_indicator_type
  ON classifications(indicator_type);
CREATE INDEX IF NOT EXISTS idx_classifications_review_status
  ON classifications(review_status);
CREATE INDEX IF NOT EXISTS idx_classifications_created_at
  ON classifications(created_at);
CREATE INDEX IF NOT EXISTS idx_processing_log_indicator_id
  ON processing_log(indicator_id);
CREATE INDEX IF NOT EXISTS idx_processing_log_stage
  ON processing_log(stage);

--
-- ============================================================================
-- DATA QUALITY TABLES
-- ============================================================================
--

-- Time series data storage
CREATE TABLE IF NOT EXISTS time_series_data (
  id SERIAL PRIMARY KEY,
  indicator_id TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  value NUMERIC NOT NULL,
  source_version TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (indicator_id) REFERENCES source_indicators(id) ON DELETE CASCADE,
  UNIQUE(indicator_id, date)
);

-- Data quality checks (individual detector results)
CREATE TABLE IF NOT EXISTS data_quality_checks (
  id SERIAL PRIMARY KEY,
  indicator_id TEXT NOT NULL,
  check_type TEXT NOT NULL, -- 'staleness', 'magnitude_change', 'false_reading', 'unit_change', 'consistency'
  status TEXT NOT NULL, -- 'passed', 'flagged', 'critical'
  severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5),
  message TEXT NOT NULL,
  details JSONB NOT NULL,
  affected_dates JSONB, -- Array of date strings
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (indicator_id) REFERENCES source_indicators(id) ON DELETE CASCADE
);

-- Data quality reports (consolidated results)
CREATE TABLE IF NOT EXISTS data_quality_reports (
  id SERIAL PRIMARY KEY,
  indicator_id TEXT NOT NULL,
  name TEXT NOT NULL,

  -- Summary metrics
  total_checks INTEGER NOT NULL,
  passed_checks INTEGER NOT NULL,
  flagged_count INTEGER NOT NULL,
  critical_count INTEGER NOT NULL,
  overall_score REAL NOT NULL, -- 0-100

  -- Consolidated detector results (JSONB)
  staleness_result JSONB NOT NULL,
  magnitude_result JSONB NOT NULL,
  false_readings_result JSONB NOT NULL,
  unit_changes_result JSONB NOT NULL,
  consistency_result JSONB NOT NULL,
  all_flags JSONB NOT NULL,

  -- LLM review (NULL if no issues flagged)
  llm_review JSONB,
  llm_confidence REAL,
  llm_provider TEXT,
  llm_model TEXT,

  -- Status
  status TEXT NOT NULL, -- 'clean', 'minor_issues', 'major_issues', 'unusable'
  requires_attention BOOLEAN NOT NULL DEFAULT false,

  -- Time series metadata
  time_series_count INTEGER NOT NULL,
  date_range_start TIMESTAMP NOT NULL,
  date_range_end TIMESTAMP NOT NULL,

  -- Timestamps
  checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (indicator_id) REFERENCES source_indicators(id) ON DELETE CASCADE
);

-- Staleness detector results
CREATE TABLE IF NOT EXISTS staleness_detector_results (
  indicator_id TEXT PRIMARY KEY,
  has_staleness BOOLEAN NOT NULL,
  expected_frequency_days REAL NOT NULL,
  actual_gap_days REAL NOT NULL,
  last_data_point TIMESTAMP NOT NULL,
  days_since_last_update REAL NOT NULL,
  flags JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (indicator_id) REFERENCES source_indicators(id) ON DELETE CASCADE
);

-- Magnitude detector results
CREATE TABLE IF NOT EXISTS magnitude_detector_results (
  indicator_id TEXT PRIMARY KEY,
  has_anomalies BOOLEAN NOT NULL,
  mean_value REAL NOT NULL,
  std_dev REAL NOT NULL,
  outliers JSONB NOT NULL,
  sudden_changes JSONB NOT NULL,
  flags JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (indicator_id) REFERENCES source_indicators(id) ON DELETE CASCADE
);

-- False reading detector results
CREATE TABLE IF NOT EXISTS false_reading_detector_results (
  indicator_id TEXT PRIMARY KEY,
  has_issues BOOLEAN NOT NULL,
  impossible_values JSONB NOT NULL,
  flat_periods JSONB NOT NULL,
  repeating_patterns JSONB NOT NULL,
  decimal_errors JSONB NOT NULL,
  flags JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (indicator_id) REFERENCES source_indicators(id) ON DELETE CASCADE
);

-- Unit change detector results
CREATE TABLE IF NOT EXISTS unit_change_detector_results (
  indicator_id TEXT PRIMARY KEY,
  has_changes BOOLEAN NOT NULL,
  regime_shifts JSONB NOT NULL,
  flags JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (indicator_id) REFERENCES source_indicators(id) ON DELETE CASCADE
);

-- Consistency checker results
CREATE TABLE IF NOT EXISTS consistency_checker_results (
  indicator_id TEXT PRIMARY KEY,
  is_consistent BOOLEAN NOT NULL,
  monotonicity_violations JSONB NOT NULL,
  temporal_inconsistencies JSONB NOT NULL,
  flags JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (indicator_id) REFERENCES source_indicators(id) ON DELETE CASCADE
);

-- Quality review results (LLM validation)
CREATE TABLE IF NOT EXISTS quality_review_results (
  indicator_id TEXT PRIMARY KEY,
  overall_assessment TEXT NOT NULL, -- 'clean', 'minor_issues', 'major_issues', 'unusable'
  validated_issues JSONB NOT NULL,
  recommended_actions JSONB NOT NULL,
  usability_verdict TEXT NOT NULL, -- 'use_as_is', 'use_with_caution', 'investigate_first', 'do_not_use'
  confidence REAL NOT NULL,
  summary TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (indicator_id) REFERENCES source_indicators(id) ON DELETE CASCADE
);

-- Create indexes for data quality performance
CREATE INDEX IF NOT EXISTS idx_time_series_data_indicator_id
  ON time_series_data(indicator_id);
CREATE INDEX IF NOT EXISTS idx_time_series_data_date
  ON time_series_data(date);
CREATE INDEX IF NOT EXISTS idx_data_quality_checks_indicator_id
  ON data_quality_checks(indicator_id);
CREATE INDEX IF NOT EXISTS idx_data_quality_checks_check_type
  ON data_quality_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_data_quality_checks_status
  ON data_quality_checks(status);
CREATE INDEX IF NOT EXISTS idx_data_quality_reports_indicator_id
  ON data_quality_reports(indicator_id);
CREATE INDEX IF NOT EXISTS idx_data_quality_reports_status
  ON data_quality_reports(status);
CREATE INDEX IF NOT EXISTS idx_data_quality_reports_requires_attention
  ON data_quality_reports(requires_attention);
CREATE INDEX IF NOT EXISTS idx_data_quality_reports_checked_at
  ON data_quality_reports(checked_at);

--
-- ============================================================================
-- CONSENSUS ANALYSIS TABLES
-- ============================================================================
--

-- Consensus analysis reports (main consolidated table)
CREATE TABLE IF NOT EXISTS consensus_analysis_reports (
  id SERIAL PRIMARY KEY,
  indicator_name TEXT NOT NULL UNIQUE, -- e.g., "Temperature", "GDP"

  -- Summary metrics
  total_indicators INTEGER NOT NULL,
  total_checks INTEGER NOT NULL, -- 5 dimensions checked
  dimensions_with_consensus INTEGER NOT NULL,
  dimensions_with_issues INTEGER NOT NULL,
  total_outliers INTEGER NOT NULL,

  -- Consensus results per dimension (JSONB)
  unit_consensus JSONB NOT NULL,
  scale_consensus JSONB NOT NULL,
  frequency_consensus JSONB NOT NULL,
  currency_consensus JSONB NOT NULL,
  time_basis_consensus JSONB NOT NULL,

  -- All outliers combined (for querying)
  all_outliers JSONB NOT NULL,

  -- LLM review (NULL if no outliers)
  llm_review JSONB,
  llm_confidence REAL,
  llm_provider TEXT,
  llm_model TEXT,

  -- Status
  status TEXT NOT NULL, -- 'highly_consistent', 'mostly_consistent', 'inconsistent', 'critical_inconsistency'
  requires_standardization BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  analyzed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Individual consensus outliers (for easy querying and bulk operations)
CREATE TABLE IF NOT EXISTS consensus_outliers (
  id SERIAL PRIMARY KEY,
  indicator_name TEXT NOT NULL,
  indicator_id TEXT NOT NULL,
  dimension TEXT NOT NULL, -- 'unit', 'scale', 'frequency', 'currency', 'time_basis'

  -- Outlier details
  outlier_value TEXT NOT NULL,
  consensus_value TEXT NOT NULL,
  deviation_percentage REAL NOT NULL,

  -- Metadata
  source_name TEXT,
  country TEXT,
  region TEXT,

  -- LLM validation (if review was performed)
  is_valid_outlier BOOLEAN, -- NULL if not yet validated, true = intentional difference, false = error
  validation_reasoning TEXT,
  recommended_action TEXT, -- 'no_action', 'document_difference', 'investigate', 'correct_error', 'standardize'

  -- Timestamps
  detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  validated_at TIMESTAMP,

  FOREIGN KEY (indicator_id) REFERENCES source_indicators(id) ON DELETE CASCADE
);

-- Unit consensus detector results
CREATE TABLE IF NOT EXISTS unit_consensus_results (
  indicator_name TEXT PRIMARY KEY,
  consensus_value TEXT NOT NULL,
  consensus_percentage REAL NOT NULL,
  total_indicators INTEGER NOT NULL,
  value_distribution JSONB NOT NULL, -- { "celsius": 95, "fahrenheit": 20 }
  outlier_count INTEGER NOT NULL,
  has_strong_consensus BOOLEAN NOT NULL, -- true if >= 75%
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Scale consensus detector results
CREATE TABLE IF NOT EXISTS scale_consensus_results (
  indicator_name TEXT PRIMARY KEY,
  consensus_value TEXT NOT NULL,
  consensus_percentage REAL NOT NULL,
  total_indicators INTEGER NOT NULL,
  value_distribution JSONB NOT NULL, -- { "ones": 100, "millions": 15 }
  outlier_count INTEGER NOT NULL,
  has_strong_consensus BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Frequency consensus detector results
CREATE TABLE IF NOT EXISTS frequency_consensus_results (
  indicator_name TEXT PRIMARY KEY,
  consensus_value TEXT NOT NULL,
  consensus_percentage REAL NOT NULL,
  total_indicators INTEGER NOT NULL,
  value_distribution JSONB NOT NULL, -- { "monthly": 80, "quarterly": 35 }
  outlier_count INTEGER NOT NULL,
  has_strong_consensus BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Currency consensus detector results
CREATE TABLE IF NOT EXISTS currency_consensus_results (
  indicator_name TEXT PRIMARY KEY,
  consensus_value TEXT NOT NULL,
  consensus_percentage REAL NOT NULL,
  total_indicators INTEGER NOT NULL,
  value_distribution JSONB NOT NULL, -- { "usd": 70, "local": 45 }
  outlier_count INTEGER NOT NULL,
  has_strong_consensus BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Time basis consensus detector results
CREATE TABLE IF NOT EXISTS time_basis_consensus_results (
  indicator_name TEXT PRIMARY KEY,
  consensus_value TEXT NOT NULL,
  consensus_percentage REAL NOT NULL,
  total_indicators INTEGER NOT NULL,
  value_distribution JSONB NOT NULL, -- { "point": 90, "cumulative": 25 }
  outlier_count INTEGER NOT NULL,
  has_strong_consensus BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Consensus review results (LLM validation)
CREATE TABLE IF NOT EXISTS consensus_review_results (
  indicator_name TEXT PRIMARY KEY,
  overall_assessment TEXT NOT NULL, -- 'highly_consistent', 'mostly_consistent', 'inconsistent', 'critical_inconsistency'
  validated_outliers JSONB NOT NULL,
  standardization_recommendations JSONB NOT NULL,
  confidence REAL NOT NULL,
  summary TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for consensus analysis performance
CREATE INDEX IF NOT EXISTS idx_consensus_analysis_reports_indicator_name
  ON consensus_analysis_reports(indicator_name);
CREATE INDEX IF NOT EXISTS idx_consensus_analysis_reports_status
  ON consensus_analysis_reports(status);
CREATE INDEX IF NOT EXISTS idx_consensus_analysis_reports_requires_standardization
  ON consensus_analysis_reports(requires_standardization);
CREATE INDEX IF NOT EXISTS idx_consensus_analysis_reports_analyzed_at
  ON consensus_analysis_reports(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_consensus_outliers_indicator_name
  ON consensus_outliers(indicator_name);
CREATE INDEX IF NOT EXISTS idx_consensus_outliers_indicator_id
  ON consensus_outliers(indicator_id);
CREATE INDEX IF NOT EXISTS idx_consensus_outliers_dimension
  ON consensus_outliers(dimension);
CREATE INDEX IF NOT EXISTS idx_consensus_outliers_is_valid_outlier
  ON consensus_outliers(is_valid_outlier);
CREATE INDEX IF NOT EXISTS idx_consensus_outliers_recommended_action
  ON consensus_outliers(recommended_action);
`;
