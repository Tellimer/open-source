-- Script to fetch real indicators from staging database for test fixtures
-- Excludes IMFWEO source and gets indicators with multiple countries

-- Part 1: Get diverse indicators with good country coverage
SELECT 
    i.id,
    i.name,
    i.units,
    i.periodicity,
    i.source,
    i.description,
    COUNT(DISTINCT ci.country_id) as country_count
FROM indicators i
LEFT JOIN countries_indicators ci ON i.id = ci.indicator_id
WHERE i.source != 'IMFWEO'
    AND i.source IS NOT NULL
    AND i.units IS NOT NULL
    AND i.periodicity IS NOT NULL
    AND i.description IS NOT NULL
GROUP BY i.id, i.name, i.units, i.periodicity, i.source, i.description
HAVING COUNT(DISTINCT ci.country_id) >= 3
ORDER BY country_count DESC, i.source, i.name
LIMIT 30;

-- Part 2: For each selected indicator, get sample values from multiple countries
-- Example query structure (run for each indicator_id from Part 1):
-- 
-- SELECT 
--     c.code as country_code,
--     c.name as country_name,
--     ci.date,
--     ci.value
-- FROM countries_indicators ci
-- JOIN countries c ON ci.country_id = c.id
-- WHERE ci.indicator_id = 'SELECTED_INDICATOR_ID'
--     AND ci.value IS NOT NULL
--     AND ci.date IS NOT NULL
-- ORDER BY c.code, ci.date DESC
-- LIMIT 10 per country;

