# Database Seeding Flowchart

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Get Indicators from PostgreSQL                    │
│  ─────────────────────────────────────────────────────────  │
│  ✅ Already done! 100 indicators fetched via MCP            │
│  📝 Save as: scripts/indicators.json                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Seed Indicators into SQLite                       │
│  ─────────────────────────────────────────────────────────  │
│  $ deno task db:seed scripts/indicators.json               │
│                                                             │
│  Creates:                                                   │
│  • source_indicators (100 rows)                            │
│  • source_country_indicators (0 rows)                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Get Time Series from PostgreSQL                   │
│  ─────────────────────────────────────────────────────────  │
│  1. Open GET_TIME_SERIES.sql in Postico                    │
│  2. Run the query (gets 10 values per indicator)           │
│  3. Export result as JSON                                   │
│  4. Copy JSON array                                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Paste Time Series Data                            │
│  ─────────────────────────────────────────────────────────  │
│  Open: data/country_indicators.ts                           │
│                                                             │
│  export const COUNTRY_INDICATORS = [                        │
│    // PASTE JSON HERE ⬅️                                   │
│    { id: "...", indicator_id: "...", ... },                │
│    ...                                                      │
│  ];                                                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Seed Time Series into SQLite                      │
│  ─────────────────────────────────────────────────────────  │
│  $ deno task db:seed-timeseries                            │
│                                                             │
│  Updates:                                                   │
│  • source_country_indicators (~1000 rows)                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  ✅ DONE! Database Ready                                    │
│  ─────────────────────────────────────────────────────────  │
│  SQLite database now contains:                              │
│  • 100 indicators (metadata)                                │
│  • ~1000 time series values (10 per indicator)              │
│                                                             │
│  Ready for V2 classification pipeline! 🎉                   │
└─────────────────────────────────────────────────────────────┘
```

## Quick Commands

```bash
# Verify what's in the database
sqlite3 classify_v2.db ".tables"
sqlite3 classify_v2.db "SELECT COUNT(*) FROM source_indicators;"
sqlite3 classify_v2.db "SELECT COUNT(*) FROM source_country_indicators;"

# See sample data
sqlite3 classify_v2.db "
  SELECT si.name, COUNT(sci.id) as values
  FROM source_indicators si
  LEFT JOIN source_country_indicators sci ON sci.indicator_id = si.id
  GROUP BY si.id, si.name
  LIMIT 5;
"
```

## Files You Need to Create

### 1. `scripts/indicators.json`
```json
[
  {
    "id": "CHN1DRRR",
    "name": "14-Day Reverse Repo Rate",
    "source_name": "People's Bank of China",
    "units": "%",
    ...
  }
]
```

### 2. `data/country_indicators.ts`
```typescript
export const COUNTRY_INDICATORS: CountryIndicatorData[] = [
  {
    "id": "...",
    "indicator_id": "CHN1DRRR",
    "date": "2024-12-31",
    "value": 1.85,
    ...
  }
];
```

That's it! Two files, two commands. 🚀
