/**
 * V2 Pipeline Database Schema
 * @module
 */

/**
 * Database schema version
 */
export const SCHEMA_VERSION = 4;

/**
 * SQL schema for V2 pipeline
 */
export const V2_SCHEMA = `
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert current schema version
INSERT OR IGNORE INTO schema_version (version) VALUES (${SCHEMA_VERSION});

-- Source indicators table (mirrors production PostgreSQL)
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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  currency_code TEXT
);

-- Source country indicators table (time series data)
CREATE TABLE IF NOT EXISTS source_country_indicators (
  id TEXT PRIMARY KEY,
  country_iso TEXT NOT NULL,
  indicator_id TEXT NOT NULL,
  date TEXT NOT NULL,
  is_forecasted INTEGER NOT NULL,
  value REAL,
  source_updated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (indicator_id) REFERENCES source_indicators(id) ON DELETE CASCADE
);

-- Main classifications table (combines all stages)
CREATE TABLE IF NOT EXISTS classifications (
  indicator_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  units TEXT,
  description TEXT,

  -- Stage 1: Router
  family TEXT,
  confidence_family REAL,
  reasoning_router TEXT,

  -- Stage 2: Specialist
  indicator_type TEXT,
  temporal_aggregation TEXT,
  is_currency_denominated INTEGER,
  confidence_cls REAL,
  reasoning_specialist TEXT,

  -- Stage 3: Validation (time series analysis)
  validated INTEGER DEFAULT 0,
  validation_confidence REAL,

  -- Stage 4: Orientation
  heat_map_orientation TEXT,
  confidence_orient REAL,
  reasoning_orientation TEXT,

  -- Review
  review_status TEXT, -- pending|confirmed|corrected|escalated
  review_reason TEXT,

  -- Metadata
  provider TEXT,
  model TEXT,
  prompt_version TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Router results (Stage 1)
CREATE TABLE IF NOT EXISTS router_results (
  indicator_id TEXT PRIMARY KEY,
  family TEXT NOT NULL,
  confidence_family REAL NOT NULL,
  reasoning TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (indicator_id) REFERENCES classifications(indicator_id) ON DELETE CASCADE
);

-- Specialist results (Stage 2)
CREATE TABLE IF NOT EXISTS specialist_results (
  indicator_id TEXT PRIMARY KEY,
  indicator_type TEXT NOT NULL,
  indicator_category TEXT NOT NULL,
  temporal_aggregation TEXT NOT NULL,
  is_currency_denominated INTEGER NOT NULL,
  confidence_cls REAL NOT NULL,
  family TEXT NOT NULL,
  reasoning TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (indicator_id) REFERENCES classifications(indicator_id) ON DELETE CASCADE
);

-- Validation results (Stage 3 - Time Series Analysis)
CREATE TABLE IF NOT EXISTS validation_results (
  indicator_id TEXT PRIMARY KEY,

  -- Analysis results
  is_cumulative INTEGER NOT NULL,
  cumulative_confidence REAL NOT NULL,
  has_seasonal_reset INTEGER NOT NULL,
  is_monotonic_within_year INTEGER NOT NULL,

  -- Statistical evidence
  dec_jan_ratio REAL,
  within_year_increase_pct REAL,
  year_boundaries INTEGER,
  reset_at_boundary_pct REAL,

  -- Suggestions
  suggested_temporal TEXT,
  validation_reasoning TEXT,

  -- Metadata
  data_points_analyzed INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

  -- Note: No foreign key to classifications because validation runs before classifications are written
);

-- Orientation results (Stage 4)
CREATE TABLE IF NOT EXISTS orientation_results (
  indicator_id TEXT PRIMARY KEY,
  heat_map_orientation TEXT NOT NULL,
  confidence_orient REAL NOT NULL,
  reasoning TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (indicator_id) REFERENCES classifications(indicator_id) ON DELETE CASCADE
);

-- Flagging results
CREATE TABLE IF NOT EXISTS flagging_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_id TEXT NOT NULL,
  flag_type TEXT NOT NULL,
  flag_reason TEXT NOT NULL,
  current_value TEXT,
  expected_value TEXT,
  confidence REAL,
  flagged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (indicator_id) REFERENCES classifications(indicator_id) ON DELETE CASCADE,
  UNIQUE(indicator_id, flag_type)
);

-- Review decisions
CREATE TABLE IF NOT EXISTS review_decisions (
  indicator_id TEXT PRIMARY KEY,
  action TEXT NOT NULL, -- confirm|fix|escalate
  diff_json TEXT, -- JSON string of ClassificationDiff
  reason TEXT NOT NULL,
  confidence REAL NOT NULL,
  reviewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (indicator_id) REFERENCES classifications(indicator_id) ON DELETE CASCADE
);

-- Pipeline executions (telemetry)
CREATE TABLE IF NOT EXISTS pipeline_executions (
  execution_id TEXT PRIMARY KEY,
  start_time TEXT NOT NULL,
  end_time TEXT,
  total_duration_ms INTEGER,
  total_indicators INTEGER,
  successful_indicators INTEGER,
  failed_indicators INTEGER,
  total_cost REAL,
  provider TEXT,
  model TEXT,
  config_json TEXT, -- JSON string of V2Config
  telemetry_json TEXT, -- JSON string of V2PipelineTelemetry
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_classifications_family ON classifications(family);
CREATE INDEX IF NOT EXISTS idx_classifications_type ON classifications(indicator_type);
CREATE INDEX IF NOT EXISTS idx_classifications_review_status ON classifications(review_status);

CREATE INDEX IF NOT EXISTS idx_router_family ON router_results(family);
CREATE INDEX IF NOT EXISTS idx_specialist_family ON specialist_results(family);
CREATE INDEX IF NOT EXISTS idx_specialist_type ON specialist_results(indicator_type);

CREATE INDEX IF NOT EXISTS idx_validation_cumulative ON validation_results(is_cumulative);
CREATE INDEX IF NOT EXISTS idx_validation_confidence ON validation_results(cumulative_confidence);

CREATE INDEX IF NOT EXISTS idx_flagging_indicator ON flagging_results(indicator_id);
CREATE INDEX IF NOT EXISTS idx_flagging_type ON flagging_results(flag_type);

CREATE INDEX IF NOT EXISTS idx_review_action ON review_decisions(action);

CREATE INDEX IF NOT EXISTS idx_executions_created ON pipeline_executions(created_at DESC);

-- Source table indexes
CREATE INDEX IF NOT EXISTS idx_source_indicators_name ON source_indicators(name);
CREATE INDEX IF NOT EXISTS idx_source_country_indicators_indicator ON source_country_indicators(indicator_id);
CREATE INDEX IF NOT EXISTS idx_source_country_indicators_country ON source_country_indicators(country_iso);
CREATE INDEX IF NOT EXISTS idx_source_country_indicators_date ON source_country_indicators(date);
`;

/**
 * Clean up old data (optional maintenance)
 */
export const CLEANUP_OLD_DATA = `
-- Delete executions older than 30 days
DELETE FROM pipeline_executions
WHERE created_at < datetime('now', '-30 days');

-- Vacuum to reclaim space
VACUUM;
`;
