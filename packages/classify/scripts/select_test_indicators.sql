-- Select 100 diverse indicators for test fixtures
-- Goal: Broad coverage across families and types

WITH categorized_indicators AS (
  SELECT
    id,
    name,
    units,
    periodicity,
    category_group,
    -- Heuristic categorization based on name and units for diversity
    CASE
      -- Physical-fundamental indicators (stock, flow, balance, capacity, volume)
      WHEN name LIKE '%GDP%' OR name LIKE '%Output%' OR name LIKE '%Production%' OR name LIKE '%Exports%' OR name LIKE '%Imports%' THEN 'physical-fundamental'
      WHEN name LIKE '%Reserves%' OR name LIKE '%Stock%' OR name LIKE '%Inventory%' OR name LIKE '%Balance%' THEN 'physical-fundamental'
      WHEN name LIKE '%Debt%' AND units NOT LIKE '%' THEN 'physical-fundamental'

      -- Numeric-measurement indicators (count, percentage, ratio, spread, share)
      WHEN units LIKE '%' THEN 'numeric-measurement'
      WHEN name LIKE '%Rate%' AND units LIKE '%' THEN 'numeric-measurement'
      WHEN name LIKE '%Unemployment%' OR name LIKE '%Inflation%' THEN 'numeric-measurement'
      WHEN name LIKE '%Ratio%' OR name LIKE '%Share%' THEN 'numeric-measurement'

      -- Price-value indicators (price, yield)
      WHEN name LIKE '%Price%' OR name LIKE '%Cost%' THEN 'price-value'
      WHEN name LIKE '%Yield%' OR name LIKE '%Bond%' THEN 'price-value'
      WHEN name LIKE '%FX Rate%' OR name LIKE '%Exchange Rate%' THEN 'price-value'

      -- Change-movement indicators (rate, volatility, gap)
      WHEN name LIKE '%Growth%' OR name LIKE '%Change%' OR name LIKE '%YoY%' THEN 'change-movement'
      WHEN name LIKE '%Volatility%' OR name LIKE '%Spread%' THEN 'change-movement'

      -- Composite-derived indicators (index, correlation, elasticity, multiplier)
      WHEN name LIKE '%Index%' OR name LIKE '%PMI%' OR name LIKE '%Indicator%' THEN 'composite-derived'
      WHEN name LIKE '%Confidence%' OR name LIKE '%Sentiment%' THEN 'composite-derived'

      -- Temporal indicators (duration, probability, threshold)
      WHEN name LIKE '%Duration%' OR name LIKE '%Maturity%' OR name LIKE '%Term%' THEN 'temporal'

      -- Qualitative indicators (sentiment, allocation)
      WHEN name LIKE '%Sentiment%' OR name LIKE '%Outlook%' THEN 'qualitative'

      ELSE 'other'
    END as estimated_family,

    CASE
      WHEN units LIKE '%' THEN 'percentage_or_rate'
      WHEN units LIKE 'USD%' OR units LIKE 'EUR%' OR units LIKE '%Million' OR units LIKE '%Billion' THEN 'monetary'
      WHEN units LIKE 'points' OR units LIKE 'index' THEN 'index_points'
      WHEN units LIKE '%Thousand%' OR units LIKE 'persons' THEN 'count'
      ELSE 'other_units'
    END as unit_category,

    ROW_NUMBER() OVER (PARTITION BY
      CASE
        WHEN name LIKE '%GDP%' OR name LIKE '%Output%' OR name LIKE '%Production%' OR name LIKE '%Exports%' OR name LIKE '%Imports%' THEN 'physical-fundamental'
        WHEN name LIKE '%Reserves%' OR name LIKE '%Stock%' OR name LIKE '%Inventory%' OR name LIKE '%Balance%' THEN 'physical-fundamental'
        WHEN name LIKE '%Debt%' AND units NOT LIKE '%' THEN 'physical-fundamental'
        WHEN units LIKE '%' THEN 'numeric-measurement'
        WHEN name LIKE '%Rate%' AND units LIKE '%' THEN 'numeric-measurement'
        WHEN name LIKE '%Unemployment%' OR name LIKE '%Inflation%' THEN 'numeric-measurement'
        WHEN name LIKE '%Ratio%' OR name LIKE '%Share%' THEN 'numeric-measurement'
        WHEN name LIKE '%Price%' OR name LIKE '%Cost%' THEN 'price-value'
        WHEN name LIKE '%Yield%' OR name LIKE '%Bond%' THEN 'price-value'
        WHEN name LIKE '%FX Rate%' OR name LIKE '%Exchange Rate%' THEN 'price-value'
        WHEN name LIKE '%Growth%' OR name LIKE '%Change%' OR name LIKE '%YoY%' THEN 'change-movement'
        WHEN name LIKE '%Volatility%' OR name LIKE '%Spread%' THEN 'change-movement'
        WHEN name LIKE '%Index%' OR name LIKE '%PMI%' OR name LIKE '%Indicator%' THEN 'composite-derived'
        WHEN name LIKE '%Confidence%' OR name LIKE '%Sentiment%' THEN 'composite-derived'
        WHEN name LIKE '%Duration%' OR name LIKE '%Maturity%' OR name LIKE '%Term%' THEN 'temporal'
        WHEN name LIKE '%Sentiment%' OR name LIKE '%Outlook%' THEN 'qualitative'
        ELSE 'other'
      END
      ORDER BY RANDOM()
    ) as family_rank
  FROM source_indicators
  WHERE deleted_at IS NULL
)
SELECT
  id,
  name,
  units,
  periodicity,
  category_group,
  estimated_family
FROM categorized_indicators
WHERE family_rank <= 15  -- Get up to 15 from each category
ORDER BY estimated_family, name
LIMIT 100;
