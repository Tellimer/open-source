-- ============================================================================
-- FINAL INDICATORS TABLE
-- ============================================================================
--
-- This is the production-ready, validated indicators table that consolidates
-- data from all three pipeline workflows:
-- 1. Classification workflow (validated metadata)
-- 2. Data quality workflow (quality scores and flags)
-- 3. Consensus analysis workflow (outlier detection)
--
-- This table is designed to be exported/replicated to other systems as the
-- single source of truth for validated indicator metadata.
-- ============================================================================

CREATE TABLE IF NOT EXISTS final_indicators (
  -- ============================================================================
  -- ORIGINAL SOURCE FIELDS (preserved from source_indicators)
  -- ============================================================================
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_name TEXT,
  source_url TEXT,
  long_name TEXT,
  category_group TEXT,
  dataset TEXT,
  aggregation_method TEXT,
  definition TEXT,

  -- Original raw metadata (as provided by source)
  original_units TEXT,
  original_scale TEXT,
  original_periodicity TEXT,
  original_topic TEXT,
  original_currency_code TEXT,

  -- ============================================================================
  -- VALIDATED FIELDS (from classification workflow)
  -- ============================================================================

  -- Normalized metadata (cleaned and validated)
  validated_units TEXT NOT NULL,           -- e.g., "celsius", "percent", "index"
  validated_scale TEXT NOT NULL,           -- e.g., "ones", "thousands", "millions", "billions"
  validated_frequency TEXT NOT NULL,       -- e.g., "daily", "monthly", "quarterly", "annual"
  validated_currency TEXT,                 -- e.g., "usd", "eur", null (for non-currency indicators)

  -- Indicator classification
  indicator_type TEXT NOT NULL,            -- "rate", "level", "balance", "index", "count"
  temporal_aggregation TEXT NOT NULL,      -- "point", "average", "sum", "eop" (end of period)
  heat_map_orientation TEXT NOT NULL,      -- "positive", "negative", "neutral"

  -- Time characteristics
  is_cumulative BOOLEAN NOT NULL DEFAULT false,
  time_basis TEXT NOT NULL,                -- "point-in-time", "cumulative", "rolling"

  -- Confidence scores (from classification)
  classification_confidence REAL NOT NULL CHECK (classification_confidence >= 0 AND classification_confidence <= 1),

  -- ============================================================================
  -- DATA QUALITY METRICS (from data quality workflow)
  -- ============================================================================

  quality_score REAL NOT NULL DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
  quality_status TEXT NOT NULL,            -- "clean", "minor_issues", "major_issues", "unusable"
  usability_verdict TEXT NOT NULL,         -- "use_as_is", "use_with_caution", "investigate_first", "do_not_use"

  -- Quality flags (quick filters)
  has_data_quality_issues BOOLEAN NOT NULL DEFAULT false,
  has_staleness_issues BOOLEAN NOT NULL DEFAULT false,
  has_magnitude_anomalies BOOLEAN NOT NULL DEFAULT false,
  has_false_readings BOOLEAN NOT NULL DEFAULT false,
  has_unit_changes BOOLEAN NOT NULL DEFAULT false,
  has_consistency_issues BOOLEAN NOT NULL DEFAULT false,

  -- Quality check metadata
  quality_flags_count INTEGER NOT NULL DEFAULT 0,
  quality_critical_count INTEGER NOT NULL DEFAULT 0,
  last_quality_check TIMESTAMP,

  -- ============================================================================
  -- CONSENSUS ANALYSIS (from consensus workflow)
  -- ============================================================================

  -- Consensus status (relative to indicators with same name)
  is_consensus_outlier BOOLEAN NOT NULL DEFAULT false,
  consensus_outlier_dimensions TEXT[],     -- e.g., ["unit", "scale"] - which dimensions are outliers
  consensus_deviation_severity TEXT,       -- "low", "medium", "high" - how far from consensus
  requires_standardization BOOLEAN NOT NULL DEFAULT false,

  -- Consensus metadata
  indicator_group_size INTEGER,            -- How many indicators share this name
  consensus_status TEXT,                   -- "highly_consistent", "mostly_consistent", "inconsistent", "critical_inconsistency"

  -- ============================================================================
  -- PROCESSING METADATA
  -- ============================================================================

  pipeline_status TEXT NOT NULL DEFAULT 'pending',  -- "pending", "classified", "quality_checked", "complete", "failed"
  pipeline_version TEXT,                   -- Version of pipeline that processed this (e.g., "v2.1.0")

  -- Processing timestamps
  classified_at TIMESTAMP,
  quality_checked_at TIMESTAMP,
  consensus_analyzed_at TIMESTAMP,
  last_processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Overall confidence (aggregated from all workflows)
  overall_confidence REAL CHECK (overall_confidence >= 0 AND overall_confidence <= 1),

  -- Metadata timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  -- Reference to source indicator
  FOREIGN KEY (id) REFERENCES source_indicators(id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Primary query patterns
CREATE INDEX IF NOT EXISTS idx_final_indicators_name
  ON final_indicators(name);

CREATE INDEX IF NOT EXISTS idx_final_indicators_source
  ON final_indicators(source_name);

CREATE INDEX IF NOT EXISTS idx_final_indicators_type
  ON final_indicators(indicator_type);

-- Quality filtering
CREATE INDEX IF NOT EXISTS idx_final_indicators_quality_score
  ON final_indicators(quality_score)
  WHERE quality_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_final_indicators_quality_status
  ON final_indicators(quality_status);

CREATE INDEX IF NOT EXISTS idx_final_indicators_usability
  ON final_indicators(usability_verdict);

CREATE INDEX IF NOT EXISTS idx_final_indicators_has_issues
  ON final_indicators(has_data_quality_issues)
  WHERE has_data_quality_issues = true;

-- Consensus filtering
CREATE INDEX IF NOT EXISTS idx_final_indicators_consensus_outlier
  ON final_indicators(is_consensus_outlier)
  WHERE is_consensus_outlier = true;

CREATE INDEX IF NOT EXISTS idx_final_indicators_requires_standardization
  ON final_indicators(requires_standardization)
  WHERE requires_standardization = true;

-- Pipeline status
CREATE INDEX IF NOT EXISTS idx_final_indicators_pipeline_status
  ON final_indicators(pipeline_status);

CREATE INDEX IF NOT EXISTS idx_final_indicators_last_processed
  ON final_indicators(last_processed_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_final_indicators_quality_type
  ON final_indicators(indicator_type, quality_status);

CREATE INDEX IF NOT EXISTS idx_final_indicators_source_quality
  ON final_indicators(source_name, quality_score);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- High-quality indicators only (production-ready)
CREATE OR REPLACE VIEW production_ready_indicators AS
SELECT * FROM final_indicators
WHERE quality_status IN ('clean', 'minor_issues')
  AND usability_verdict IN ('use_as_is', 'use_with_caution')
  AND pipeline_status = 'complete'
  AND deleted_at IS NULL;

-- Indicators requiring attention
CREATE OR REPLACE VIEW indicators_requiring_attention AS
SELECT * FROM final_indicators
WHERE (
  has_data_quality_issues = true
  OR is_consensus_outlier = true
  OR requires_standardization = true
  OR quality_status IN ('major_issues', 'unusable')
)
AND deleted_at IS NULL;

-- Consensus outliers by dimension
CREATE OR REPLACE VIEW consensus_outliers_summary AS
SELECT
  unnest(consensus_outlier_dimensions) as dimension,
  COUNT(*) as outlier_count,
  consensus_status,
  AVG(quality_score) as avg_quality_score
FROM final_indicators
WHERE is_consensus_outlier = true
  AND deleted_at IS NULL
GROUP BY unnest(consensus_outlier_dimensions), consensus_status;

-- Quality score distribution
CREATE OR REPLACE VIEW quality_distribution AS
SELECT
  source_name,
  indicator_type,
  COUNT(*) as total_indicators,
  AVG(quality_score) as avg_quality_score,
  COUNT(*) FILTER (WHERE quality_status = 'clean') as clean_count,
  COUNT(*) FILTER (WHERE quality_status = 'minor_issues') as minor_issues_count,
  COUNT(*) FILTER (WHERE quality_status = 'major_issues') as major_issues_count,
  COUNT(*) FILTER (WHERE quality_status = 'unusable') as unusable_count
FROM final_indicators
WHERE deleted_at IS NULL
GROUP BY source_name, indicator_type;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE final_indicators IS
'Production-ready indicator metadata validated through classification, data quality, and consensus analysis workflows. This is the single source of truth for downstream applications.';

COMMENT ON COLUMN final_indicators.validated_units IS
'Normalized and validated units (from classification workflow). Prefer this over original_units.';

COMMENT ON COLUMN final_indicators.quality_score IS
'Overall data quality score (0-100). Higher is better. Use >= 80 for production applications.';

COMMENT ON COLUMN final_indicators.usability_verdict IS
'LLM-validated usability assessment. "use_as_is" = safe for production, "do_not_use" = unsuitable for analysis.';

COMMENT ON COLUMN final_indicators.is_consensus_outlier IS
'True if this indicator differs from the consensus of other indicators with the same name (e.g., reports in different units).';

COMMENT ON COLUMN final_indicators.pipeline_status IS
'Processing status: pending → classified → quality_checked → complete';
