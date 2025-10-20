# Time Series Data Ingestion Guide

Complete guide for ingesting time series data into the data quality workflow.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Data Sources](#data-sources)
4. [Ingestion Methods](#ingestion-methods)
5. [Data Format](#data-format)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The data quality workflow requires time series data stored in the `time_series_data` table to perform checks like:

- **Staleness Detection** - Identify gaps in data updates
- **Magnitude Anomaly Detection** - Find unusual spikes or drops
- **False Reading Detection** - Detect implausible values
- **Unit Change Detection** - Identify unit conversions
- **Consistency Checking** - Validate data consistency

### Database Schema

```sql
CREATE TABLE time_series_data (
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
```

---

## Quick Start

### Method 1: Database Seed (Recommended for Development)

The simplest way to get time series data is through the database seed script:

```bash
# Seed with all indicators (requires SOURCE_DATABASE_URL)
bun run seed

# Seed with limited indicators for testing
bun run seed -- --200
```

This automatically:
1. Fetches 25 most recent time series values per indicator from production
2. Populates `source_indicators` table
3. Populates `time_series_data` table
4. Ready for data quality checks immediately

### Method 2: CSV/JSON Import

For bulk imports from files:

```bash
# Import from CSV
bun run timeseries:ingest --file data.csv

# Import from JSON
bun run timeseries:ingest --file data.json --format json

# Import with upsert (update existing values)
bun run timeseries:ingest --file data.csv --upsert
```

### Method 3: API Upload

For programmatic integration:

```bash
# Upload time series for single indicator
curl -X POST http://localhost:8080/time-series-api/upload \
  -H "Content-Type: application/json" \
  -d '{
    "indicator_id": "GDP_USA_123",
    "data": [
      {"date": "2023-01-01", "value": 25.5},
      {"date": "2023-02-01", "value": 26.1}
    ],
    "upsert": true
  }'

# Upload batch for multiple indicators
curl -X POST http://localhost:8080/time-series-api/upload-batch \
  -H "Content-Type: application/json" \
  -d '{
    "indicators": [
      {
        "indicator_id": "GDP_USA_123",
        "data": [{"date": "2023-01-01", "value": 25.5}]
      },
      {
        "indicator_id": "CPI_USA_456",
        "data": [{"date": "2023-01-01", "value": 105.2}]
      }
    ],
    "upsert": true
  }'
```

---

## Data Sources

### Source 1: Production Database (Recommended)

The seed script fetches data from your production database:

```bash
# Set environment variable
export SOURCE_DATABASE_URL="postgres://user:pass@host:5432/production_db"

# Run seed
bun run seed
```

**Advantages:**
- Most recent data
- Automatic extraction
- Bulk import
- Production-quality data

### Source 2: CSV Files

Export time series data from any source to CSV:

```csv
indicator_id,date,value,source_version
GDP_USA_123,2023-01-01,25.5,v2.0
GDP_USA_123,2023-02-01,26.1,v2.0
CPI_USA_456,2023-01-01,105.2,v2.0
```

Import:
```bash
bun run timeseries:ingest --file export.csv
```

### Source 3: JSON Files

Two JSON formats supported:

**Array format:**
```json
[
  {"indicator_id": "GDP_USA_123", "date": "2023-01-01", "value": 25.5},
  {"indicator_id": "GDP_USA_123", "date": "2023-02-01", "value": 26.1}
]
```

**Nested format:**
```json
{
  "GDP_USA_123": [
    {"date": "2023-01-01", "value": 25.5},
    {"date": "2023-02-01", "value": 26.1}
  ],
  "CPI_USA_456": [
    {"date": "2023-01-01", "value": 105.2}
  ]
}
```

Import:
```bash
bun run timeseries:ingest --file data.json --format json
```

### Source 4: REST API

Upload via REST API from any external system:

```python
import requests

data = {
    "indicator_id": "GDP_USA_123",
    "data": [
        {"date": "2023-01-01", "value": 25.5},
        {"date": "2023-02-01", "value": 26.1}
    ],
    "upsert": True
}

response = requests.post(
    "http://localhost:8080/time-series-api/upload",
    json=data
)
print(response.json())
```

---

## Ingestion Methods

### Method 1: Database Seed Script

**File:** `src/scripts/seed-database.ts`

**Purpose:** Bulk import from production database

**Usage:**
```bash
# All indicators
bun run seed

# Limited for testing
bun run seed -- --100

# With environment variable
SOURCE_DATABASE_URL=postgres://... bun run seed
```

**What it does:**
1. Connects to production database
2. Fetches indicators matching TARGET_INDICATORS list
3. Fetches 25 most recent time series values per indicator
4. Inserts into `source_indicators` table
5. **NEW:** Inserts into `time_series_data` table for quality checks
6. Shows summary statistics

**Output:**
```
📦 Seeding database from remote PostgreSQL...
✅ Connected to source PostgreSQL
✅ Connected to local PostgreSQL
🔍 Fetching indicators...
✅ Found 1250 indicators
📊 Fetching sample time series...
✅ Fetched time series samples
💾 Populating local PostgreSQL database...
   Inserted 1250/1250...
📊 Populating time_series_data table...
   Found 31250 total time series points
   Inserted 31250/31250 time series points...
✅ Populated 31250 time series points

🎉 Database seeding complete!
📋 Summary:
   - Indicators seeded: 1250
   - Time series points: 31250
   - Ready for: Classification → Data Quality → Consensus Analysis
```

---

### Method 2: Ingestion Script

**File:** `src/scripts/ingest-time-series.ts`

**Purpose:** Import from CSV/JSON files

**Basic Usage:**
```bash
# CSV import
bun run src/scripts/ingest-time-series.ts --file data.csv

# JSON import
bun run src/scripts/ingest-time-series.ts --file data.json --format json

# With upsert (update existing)
bun run src/scripts/ingest-time-series.ts --file data.csv --upsert

# Override indicator_id for all rows
bun run src/scripts/ingest-time-series.ts --file data.csv --indicator-id GDP_USA_123

# Set source version
bun run src/scripts/ingest-time-series.ts --file data.csv --source-version v2.0

# Custom batch size
bun run src/scripts/ingest-time-series.ts --file data.csv --batch-size 500
```

**Parameters:**

| Parameter | Required | Description | Default |
|-----------|----------|-------------|---------|
| `--file` | Yes | Path to CSV/JSON file | - |
| `--format` | No | File format (csv/json) | Auto-detect |
| `--indicator-id` | No | Override indicator_id for all rows | From file |
| `--source-version` | No | Set source_version for all rows | null |
| `--batch-size` | No | Batch size for inserts | 1000 |
| `--upsert` | No | Update existing values | false |

**Output:**
```
🚀 Starting time series data ingestion...
📁 File: data.csv
📊 Format: csv
📖 Parsing CSV file...
✅ Parsed 5000 valid rows
📊 Found 10 unique indicator(s)

💾 Ingesting 5000 rows in 5 batch(es)...
  ✅ Batch 1/5: 1000 rows
  ✅ Batch 2/5: 1000 rows
  ...
  ✅ Batch 5/5: 1000 rows

✅ Ingestion complete!
   Ingested: 5000
   Failed: 0

📊 Time series data stats:

   GDP_USA_123:
     Total points: 500
     Date range: 2020-01-01 to 2024-12-31
     Value range: 20.5 to 28.3
     Average: 24.8
```

**Error Handling:**

The script validates:
- File exists
- Required fields present (indicator_id, date, value)
- Date format parseable
- Value is numeric
- Indicator exists in source_indicators (warning only)

Invalid rows are skipped with warnings.

---

### Method 3: REST API

**Endpoint:** `time-series-api`

**Base URL:** `http://localhost:8080/time-series-api`

#### Upload Single Indicator

**Endpoint:** `POST /upload`

**Request:**
```json
{
  "indicator_id": "GDP_USA_123",
  "data": [
    {"date": "2023-01-01", "value": 25.5, "source_version": "v2.0"},
    {"date": "2023-02-01", "value": 26.1, "source_version": "v2.0"}
  ],
  "upsert": true
}
```

**Response:**
```json
{
  "success": true,
  "indicator_id": "GDP_USA_123",
  "indicator_name": "GDP",
  "inserted": 1,
  "updated": 1,
  "total": 2
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8080/time-series-api/upload \
  -H "Content-Type: application/json" \
  -d '{
    "indicator_id": "GDP_USA_123",
    "data": [
      {"date": "2023-01-01", "value": 25.5},
      {"date": "2023-02-01", "value": 26.1}
    ],
    "upsert": true
  }'
```

#### Upload Multiple Indicators (Batch)

**Endpoint:** `POST /upload-batch`

**Request:**
```json
{
  "indicators": [
    {
      "indicator_id": "GDP_USA_123",
      "data": [
        {"date": "2023-01-01", "value": 25.5}
      ]
    },
    {
      "indicator_id": "CPI_USA_456",
      "data": [
        {"date": "2023-01-01", "value": 105.2}
      ]
    }
  ],
  "upsert": true
}
```

**Response:**
```json
{
  "success": true,
  "total_indicators": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "success": true,
      "indicator_id": "GDP_USA_123",
      "inserted": 1,
      "updated": 0,
      "total": 1
    },
    {
      "success": true,
      "indicator_id": "CPI_USA_456",
      "inserted": 1,
      "updated": 0,
      "total": 1
    }
  ]
}
```

#### Get Time Series Data

**Endpoint:** `POST /get`

**Request:**
```json
{
  "indicator_id": "GDP_USA_123",
  "start_date": "2023-01-01",
  "end_date": "2023-12-31",
  "limit": 100,
  "offset": 0
}
```

**Response:**
```json
{
  "success": true,
  "indicator_id": "GDP_USA_123",
  "data": [
    {
      "date": "2023-12-01",
      "value": 27.8,
      "source_version": "v2.0",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 12,
  "limit": 100,
  "offset": 0,
  "has_more": false
}
```

#### Get Statistics

**Endpoint:** `POST /stats`

**Request:**
```json
{
  "indicator_id": "GDP_USA_123"
}
```

**Response:**
```json
{
  "success": true,
  "indicator_id": "GDP_USA_123",
  "indicator_name": "GDP",
  "stats": {
    "total_points": 500,
    "earliest_date": "2020-01-01T00:00:00Z",
    "latest_date": "2024-12-31T00:00:00Z",
    "min_value": 20.5,
    "max_value": 28.3,
    "avg_value": 24.8,
    "stddev_value": 1.2,
    "median_value": 24.9
  }
}
```

#### Delete Time Series

**Endpoint:** `POST /delete`

**Request:**
```json
{
  "indicator_id": "GDP_USA_123",
  "start_date": "2023-01-01",
  "end_date": "2023-12-31"
}
```

**Response:**
```json
{
  "success": true,
  "indicator_id": "GDP_USA_123",
  "deleted_count": 12
}
```

---

## Data Format

### CSV Format

**Required columns:**
- `indicator_id` - Unique indicator identifier (must exist in source_indicators)
- `date` - ISO 8601 date (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
- `value` - Numeric value

**Optional columns:**
- `source_version` - Version identifier for data source

**Example:**
```csv
indicator_id,date,value,source_version
GDP_USA_123,2023-01-01,25.5,v2.0
GDP_USA_123,2023-02-01,26.1,v2.0
GDP_USA_123,2023-03-01,26.8,v2.0
CPI_USA_456,2023-01-01,105.2,v2.0
CPI_USA_456,2023-02-01,105.8,v2.0
```

### JSON Format

**Array format:**
```json
[
  {
    "indicator_id": "GDP_USA_123",
    "date": "2023-01-01",
    "value": 25.5,
    "source_version": "v2.0"
  },
  {
    "indicator_id": "GDP_USA_123",
    "date": "2023-02-01",
    "value": 26.1,
    "source_version": "v2.0"
  }
]
```

**Nested format (grouped by indicator):**
```json
{
  "GDP_USA_123": [
    {"date": "2023-01-01", "value": 25.5, "source_version": "v2.0"},
    {"date": "2023-02-01", "value": 26.1, "source_version": "v2.0"}
  ],
  "CPI_USA_456": [
    {"date": "2023-01-01", "value": 105.2, "source_version": "v2.0"}
  ]
}
```

### Date Formats Supported

All ISO 8601 formats:
- `2023-01-01`
- `2023-01-01T00:00:00`
- `2023-01-01T00:00:00Z`
- `2023-01-01T00:00:00+00:00`

---

## API Reference

### Time Series API Service

**Service Name:** `time-series-api`

**Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/upload` | POST | Upload time series for single indicator |
| `/upload-batch` | POST | Upload for multiple indicators |
| `/get` | POST | Get time series data with filters |
| `/stats` | POST | Get statistics for indicator |
| `/delete` | POST | Delete time series data |
| `/health` | POST | Health check |

**Full API Documentation:** See [src/api/time-series.api.ts](../src/api/time-series.api.ts)

---

## Troubleshooting

### Problem: "Indicator not found"

**Error:**
```json
{
  "success": false,
  "error": "Indicator not found: GDP_USA_123"
}
```

**Solution:**
Ensure indicator exists in `source_indicators` table first:

```sql
SELECT id, name FROM source_indicators WHERE id = 'GDP_USA_123';
```

If missing, seed database or create indicator:
```bash
bun run seed
```

---

### Problem: "Duplicate key violation"

**Error:**
```
ERROR: duplicate key value violates unique constraint "time_series_data_indicator_id_date_key"
```

**Solution:**
Use `--upsert` flag to update existing values:

```bash
bun run timeseries:ingest --file data.csv --upsert
```

Or via API:
```json
{
  "indicator_id": "GDP_USA_123",
  "data": [...],
  "upsert": true
}
```

---

### Problem: "Invalid date format"

**Error:**
```
Failed to parse time series for GDP_USA_123
```

**Solution:**
Ensure dates are in ISO 8601 format:
- ✅ `2023-01-01`
- ✅ `2023-01-01T00:00:00Z`
- ❌ `01/01/2023`
- ❌ `Jan 1, 2023`

---

### Problem: "No time series data for indicator"

The data quality workflow requires time series data. If missing:

```bash
# Check if data exists
SELECT COUNT(*) FROM time_series_data WHERE indicator_id = 'GDP_USA_123';
```

If 0 rows, ingest data:
```bash
# Via seed script
bun run seed

# Or via ingestion script
bun run timeseries:ingest --file data.csv --indicator-id GDP_USA_123
```

---

### Problem: "Foreign key constraint violation"

**Error:**
```
ERROR: insert or update on table "time_series_data" violates foreign key constraint
```

**Solution:**
The indicator must exist in `source_indicators` before inserting time series:

```sql
-- Check indicator exists
SELECT id FROM source_indicators WHERE id = 'GDP_USA_123';

-- If not, insert it first (or run seed script)
INSERT INTO source_indicators (id, name, units, ...)
VALUES ('GDP_USA_123', 'GDP', 'Billions USD', ...);
```

---

## Complete Workflow

### Development/Testing Workflow

1. **Seed Database** (includes time series)
   ```bash
   bun run seed -- --100
   ```

2. **Run Classification**
   ```bash
   bun run classify
   ```

3. **Run Data Quality Checks** (uses time_series_data)
   ```bash
   bun run quality:check
   ```

4. **Run Consensus Analysis**
   ```bash
   bun run consensus:analyze
   ```

5. **Migrate to Final Indicators**
   ```bash
   bun run final:migrate
   ```

### Production Workflow

1. **Seed Full Database**
   ```bash
   SOURCE_DATABASE_URL=postgres://... bun run seed
   ```

2. **Run Full Pipeline**
   ```bash
   bun run pipeline:full
   ```

3. **Get Production-Ready Indicators**
   ```bash
   bun run final:production
   ```

---

## Next Steps

- **Classification Workflow:** [CLASSIFICATION.md](./CLASSIFICATION.md)
- **Data Quality Workflow:** [DATA-QUALITY.md](./DATA-QUALITY.md)
- **Consensus Analysis:** [CONSENSUS-ANALYSIS.md](./CONSENSUS-ANALYSIS.md)
- **Final Indicators:** [FINAL-INDICATORS.md](./FINAL-INDICATORS.md)
- **Deployment:** [RAILWAY.md](./RAILWAY.md) | [AWS-SPOT-PULUMI.md](./AWS-SPOT-PULUMI.md)
