-- Get up to 10 most recent time series values for each of the 100 indicators
-- Run this in Postico and export as JSON

WITH TargetIndicators AS (
  -- First, get the 100 unique indicators
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY id ASC) as rn
  FROM indicators
  WHERE deleted_at IS NULL
),
UniqueIndicators AS (
  SELECT id, name
  FROM TargetIndicators
  WHERE rn = 1
  ORDER BY name ASC
  LIMIT 100
),
RankedValues AS (
  -- Get time series values ranked by date (most recent first)
  SELECT
    ci.id,
    ci.country_iso,
    ci.indicator_id,
    ci.date,
    ci.is_forecasted,
    ci.value,
    ci.source_updated_at,
    ci.created_at,
    ci.updated_at,
    ci.deleted_at,
    ROW_NUMBER() OVER (PARTITION BY ci.indicator_id ORDER BY ci.date DESC) as value_rank
  FROM country_indicators ci
  INNER JOIN UniqueIndicators ui ON ui.id = ci.indicator_id
  WHERE ci.deleted_at IS NULL
)
-- Select up to 10 values per indicator
SELECT
  id,
  country_iso,
  indicator_id,
  date,
  is_forecasted,
  value,
  source_updated_at,
  created_at,
  updated_at,
  deleted_at
FROM RankedValues
WHERE value_rank <= 10
ORDER BY indicator_id, date DESC;
