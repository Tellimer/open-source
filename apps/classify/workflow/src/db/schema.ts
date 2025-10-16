/**
 * Classify Workflow Database Schema
 * @module
 */

// v1: Initial schema
// v2: Added pipeline_stats table for batch performance tracking
// v3: Added heat_map_orientation to type classification
// v4: Simplified workflow - moved scale/currency to normalize step, deprecated scale_inference_results and currency_check_results
// v5: Added cumulative_detection_results for YTD/cumulative pattern detection (Stage 2.5)
export const SCHEMA_VERSION = 5;

/**
 * SQL schema for classify workflow pipeline
 */
export const CLASSIFY_WORKFLOW_SCHEMA = `
-- Enable WAL mode for better concurrent writes
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO schema_version (version) VALUES (${SCHEMA_VERSION});

-- Source indicators table (from PostgreSQL)
-- Each indicator is country-specific with embedded sample time series
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
  sample_values TEXT, -- JSON array of {date, value} objects (25 most recent)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Main classifications table (final results)
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
  
  -- Stage 1: Normalization (regex-based parsing)
  parsed_scale TEXT,
  parsed_unit_type TEXT,
  parsed_currency TEXT,
  parsing_confidence REAL,
  
  -- Stage 2: Time Inference (LLM)
  reporting_frequency TEXT, -- daily|monthly|quarterly|annual|point-in-time
  time_basis TEXT, -- per-period|point-in-time|cumulative
  time_confidence REAL,
  time_reasoning TEXT,
  time_source_used TEXT, -- units|periodicity|time-series|unknown

  -- Stage 2.5: Cumulative Pattern Detection (Rule-based)
  is_cumulative INTEGER, -- 0 or 1
  cumulative_pattern_type TEXT, -- ytd|running_total|periodic|unknown
  cumulative_confidence REAL,
  cumulative_reasoning TEXT,

  -- Stage 3: Scale Inference (LLM)
  scale TEXT, -- raw-units|percent|thousands|millions|billions
  scale_confidence REAL,
  scale_reasoning TEXT,
  
  -- Stage 4: Currency Check (LLM)
  is_currency_denominated INTEGER, -- 0 or 1
  detected_currency TEXT,
  currency_confidence REAL,
  currency_reasoning TEXT,
  
  -- Stage 5: Family Assignment (LLM)
  family TEXT, -- physical-fundamental|numeric-measurement|price-value|change-movement|composite-derived|temporal|qualitative
  family_confidence REAL,
  family_reasoning TEXT,
  
  -- Stage 6: Type Classification (LLM)
  indicator_type TEXT,
  temporal_aggregation TEXT, -- stock|flow|index
  heat_map_orientation TEXT, -- higher-is-positive|lower-is-positive|neutral
  type_confidence REAL,
  type_reasoning TEXT,
  
  -- Stage 7: Boolean Review (LLM)
  boolean_review_passed INTEGER, -- 0 or 1
  boolean_review_fields_wrong TEXT, -- JSON array of field names
  boolean_review_reason TEXT,
  boolean_review_confidence REAL,
  
  -- Stage 8: Final Review (LLM)
  final_review_status TEXT, -- passed|corrected|failed
  final_review_corrections TEXT, -- JSON object of corrections
  final_review_reason TEXT,
  final_review_confidence REAL,
  
  -- Overall metrics
  overall_confidence REAL,
  review_status TEXT, -- passed|corrected|failed
  
  -- LLM metadata
  provider TEXT, -- local|openai|anthropic
  model TEXT,
  
  -- Timestamps
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (indicator_id) REFERENCES source_indicators(id) ON DELETE CASCADE
);

-- Normalization results (Stage 1)
-- Now includes scale normalization and currency detection (v4+)
CREATE TABLE IF NOT EXISTS normalization_results (
  indicator_id TEXT PRIMARY KEY,
  original_units TEXT,
  parsed_scale TEXT,
  normalized_scale TEXT, -- v4: Standardized scale enum for downstream use
  parsed_unit_type TEXT,
  parsed_currency TEXT,
  parsing_confidence REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Time inference results (Stage 2)
CREATE TABLE IF NOT EXISTS time_inference_results (
  indicator_id TEXT PRIMARY KEY,
  reporting_frequency TEXT NOT NULL,
  time_basis TEXT NOT NULL,
  confidence REAL NOT NULL,
  reasoning TEXT,
  source_used TEXT,
  provider TEXT,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Cumulative pattern detection results (Stage 2.5) - v5+
-- Detects YTD/cumulative patterns by analyzing time series data
-- Runs in parallel with time inference to provide data-driven evidence
CREATE TABLE IF NOT EXISTS cumulative_detection_results (
  indicator_id TEXT PRIMARY KEY,
  is_cumulative INTEGER NOT NULL, -- 0 or 1
  pattern_type TEXT NOT NULL, -- ytd|running_total|periodic|unknown
  confidence REAL NOT NULL,
  evidence TEXT, -- JSON with year_resets_detected, within_year_increases, reset_points, etc.
  reasoning TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Scale inference results (Stage 3) - DEPRECATED in v4
-- Scale is now determined in normalization step (see normalization_results.normalized_scale)
-- Kept for backward compatibility with existing data
CREATE TABLE IF NOT EXISTS scale_inference_results (
  indicator_id TEXT PRIMARY KEY,
  scale TEXT NOT NULL,
  confidence REAL NOT NULL,
  reasoning TEXT,
  provider TEXT,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Currency check results (Stage 4) - DEPRECATED in v4
-- Currency is now detected in normalization step (see normalization_results.parsed_currency)
-- Kept for backward compatibility with existing data
CREATE TABLE IF NOT EXISTS currency_check_results (
  indicator_id TEXT PRIMARY KEY,
  is_currency_denominated INTEGER NOT NULL,
  detected_currency TEXT,
  confidence REAL NOT NULL,
  reasoning TEXT,
  provider TEXT,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Family assignment results (Stage 5)
CREATE TABLE IF NOT EXISTS family_assignment_results (
  indicator_id TEXT PRIMARY KEY,
  family TEXT NOT NULL,
  confidence REAL NOT NULL,
  reasoning TEXT,
  provider TEXT,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Type classification results (Stage 6)
CREATE TABLE IF NOT EXISTS type_classification_results (
  indicator_id TEXT PRIMARY KEY,
  indicator_type TEXT NOT NULL,
  temporal_aggregation TEXT NOT NULL,
  heat_map_orientation TEXT NOT NULL,
  confidence REAL NOT NULL,
  reasoning TEXT,
  provider TEXT,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Boolean review results (Stage 7)
CREATE TABLE IF NOT EXISTS boolean_review_results (
  indicator_id TEXT PRIMARY KEY,
  passed INTEGER NOT NULL,
  fields_wrong TEXT, -- JSON array
  reason TEXT,
  confidence REAL NOT NULL,
  provider TEXT,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Final review results (Stage 8)
CREATE TABLE IF NOT EXISTS final_review_results (
  indicator_id TEXT PRIMARY KEY,
  status TEXT NOT NULL, -- passed|corrected|failed
  corrections TEXT, -- JSON object
  reason TEXT,
  confidence REAL NOT NULL,
  provider TEXT,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Processing audit trail
CREATE TABLE IF NOT EXISTS processing_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_id TEXT NOT NULL,
  stage TEXT NOT NULL, -- normalize|time|scale|currency|family|type|boolean-review|final-review|complete
  status TEXT NOT NULL, -- started|completed|failed
  error_message TEXT,
  metadata TEXT, -- JSON object for additional context
  processing_time_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  -- No foreign key constraint - indicators might be processed without being in source_indicators
);

-- Pipeline batch statistics
CREATE TABLE IF NOT EXISTS pipeline_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL UNIQUE, -- trace_id from API call
  model TEXT NOT NULL, -- LLM model used (e.g., 'mistral-7b-instruct-v0.3')
  provider TEXT NOT NULL, -- local|openai|anthropic
  total_indicators INTEGER NOT NULL,
  successful_indicators INTEGER DEFAULT 0,
  failed_indicators INTEGER DEFAULT 0,
  batch_start_time TEXT NOT NULL,
  batch_end_time TEXT,
  total_duration_ms INTEGER, -- Total batch processing time
  avg_time_per_indicator_ms INTEGER, -- Average time per indicator
  avg_confidence REAL, -- Average overall confidence across batch
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
