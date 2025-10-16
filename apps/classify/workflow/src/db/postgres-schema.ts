/**
 * PostgreSQL Database Schema
 * @module
 */

export const SCHEMA_VERSION = 5;

/**
 * PostgreSQL schema for classify workflow pipeline
 * Key differences from SQLite:
 * - Uses SERIAL for auto-increment instead of AUTOINCREMENT
 * - Uses TIMESTAMP instead of TEXT for dates
 * - Uses BOOLEAN instead of INTEGER for booleans
 * - No PRAGMA statements
 */
export const CLASSIFY_WORKFLOW_POSTGRES_SCHEMA = `
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_version (version) VALUES (${SCHEMA_VERSION})
ON CONFLICT (version) DO NOTHING;

-- Source indicators table (from PostgreSQL)
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

  -- Stage 3: Scale Inference
  scale TEXT,
  scale_confidence REAL,
  scale_reasoning TEXT,

  -- Stage 4: Currency Check
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

-- Scale inference results (DEPRECATED in v4)
CREATE TABLE IF NOT EXISTS scale_inference_results (
  indicator_id TEXT PRIMARY KEY,
  scale TEXT NOT NULL,
  confidence REAL NOT NULL,
  reasoning TEXT,
  provider TEXT,
  model TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Currency check results (DEPRECATED in v4)
CREATE TABLE IF NOT EXISTS currency_check_results (
  indicator_id TEXT PRIMARY KEY,
  is_currency_denominated BOOLEAN NOT NULL,
  detected_currency TEXT,
  confidence REAL NOT NULL,
  reasoning TEXT,
  provider TEXT,
  model TEXT,
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
`;
