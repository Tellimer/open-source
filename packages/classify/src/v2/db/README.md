# V2 Pipeline Database Layer

SQLite-based persistence layer for the V2 classification pipeline.

## Overview

The V2 pipeline uses SQLite to persist:

- **Router results** (family classification)
- **Specialist results** (type, temporal, monetary classification)
- **Orientation results** (heat map orientation)
- **Flagging results** (quality control flags)
- **Review decisions** (LLM-based corrections)
- **Pipeline executions** (telemetry & metrics)

## Quick Start

### Setup Database

```bash
# 1. Initialize database with schema
deno task db:setup

# 2. Seed with data from JSON files
deno task db:seed

# Other commands:
deno task db:reset   # Reset database (delete all data)
deno task db:clean   # Clean old data (>30 days)
```

### Using in Code

```typescript
import { createLocalDatabase } from "./src/v2/db/client.ts";

// Create and initialize database
const db = createLocalDatabase("./data/classify_v2.db");
await db.initialize();

// Use in pipeline
import { classifyIndicatorsV2 } from "./src/v2/pipeline.ts";

const result = await classifyIndicatorsV2(
  indicators,
  llmConfig,
  {
    database: {
      type: "local",
      path: "./data/classify_v2.db",
    },
  },
);

// Close when done
db.close();
```

## Database Seeding

The V2 pipeline requires source data to be seeded into SQLite. The seeding
process uses JSON data files.

### How It Works

The seeding script (`scripts/seed_database.ts`) performs the following:

1. **Creates Source Tables**: Sets up `source_indicators` and
   `source_country_indicators`
2. **Loads Data**: Reads indicators and country indicators from `data/` folder
3. **Inserts Data**: Inserts all data into SQLite in transactions
4. **Shows Statistics**: Displays final counts and averages

### Data Files

The seed data is stored in TypeScript files in the `data/` folder:

- `data/indicators.ts` - Indicator metadata (exported as `INDICATORS_DATA`)
- `data/country_indicators.ts` - Time series values (exported as
  `COUNTRY_INDICATORS`)

### Example Output

```
🌱 Seeding SQLite Database
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Database: ./data/classify_v2.db
📊 Indicators: 100
📊 Country Indicators: 982

⚙️  Initializing SQLite database...
📦 Creating source tables...
✅ Source tables ready

💾 Inserting indicators...
✅ Inserted 100 indicators

💾 Inserting country indicators...
✅ Inserted 982 country indicators

📊 Final Statistics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Total Indicators:              100
   Total Country Indicators:      982
   Avg Values per Indicator:      9.8
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Database seeding complete!
```

## Database Schema

The V2 pipeline uses a two-tier table structure:

1. **Source Tables** - Raw data from PostgreSQL (seed data)
2. **Pipeline Tables** - Classification results from each stage

### Pipeline Data Flow

The pipeline persists state at each stage, with subsequent stages reading from
the database:

```
Stage 1 (Router)      → writes to → router_results
                      → writes to → classifications (family fields)

Stage 2 (Specialist)  → reads from → router_results
                      → writes to → specialist_results

Stage 3 (Orientation) → writes to → orientation_results

Stage 4 (Flagging)    → reads from → router_results, specialist_results, orientation_results
                      → writes to → classifications (ALL fields combined)
                      → writes to → flagging_results

Stage 5 (Review)      → reads from → flagging_results
                      → updates → classifications (review_status)
                      → writes to → review_decisions

Stage 6 (Output)      → reads from → classifications (final state)
```

### Source Tables (PostgreSQL Mirrors)

#### `source_indicators`

Economic indicators metadata (mirrors PostgreSQL `indicators` table):

```sql
CREATE TABLE source_indicators (
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
```

#### `source_country_indicators`

Time series values (mirrors PostgreSQL `country_indicators` table):

```sql
CREATE TABLE source_country_indicators (
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
  FOREIGN KEY (indicator_id) REFERENCES source_indicators(id)
);
```

### Pipeline Tables

#### 1. `classifications` (Master Table)

**Purpose**: The single source of truth for final classification state. Combines
results from all pipeline stages into one consolidated record per indicator.

**When Written**:

- Stage 4 (Flagging) writes the initial combined state
- Stage 5 (Review) updates review fields if corrections are made

**When Read**:

- Stage 6 (Output) reads final classifications for return to caller

```sql
CREATE TABLE classifications (
  indicator_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  units TEXT,
  description TEXT,

  -- Stage 1: Router
  family TEXT,
  confidence_family REAL,

  -- Stage 2: Specialist
  indicator_type TEXT,
  indicator_category TEXT,
  temporal_aggregation TEXT,
  is_monetary INTEGER,
  confidence_cls REAL,

  -- Stage 3: Orientation
  heat_map_orientation TEXT,
  confidence_orient REAL,

  -- Stage 5: Review
  review_status TEXT,
  review_reason TEXT,

  -- Metadata
  provider TEXT,
  model TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

**Why Both Stage Tables AND Classifications?**

- **Stage tables** (`router_results`, `specialist_results`, etc.) = Historical
  record of each stage's raw output
- **Classifications table** = Current consolidated state, optimized for queries

This allows you to:

- Query final state easily: `SELECT * FROM classifications`
- Debug by examining individual stage results
- Track changes if re-running the pipeline

#### 2. `router_results`

Stage 1 family classification:

```sql
CREATE TABLE router_results (
  indicator_id TEXT PRIMARY KEY,
  family TEXT NOT NULL,
  confidence_family REAL NOT NULL,
  reasoning TEXT,
  created_at TEXT
);
```

#### 3. `specialist_results`

Stage 2 detailed classification:

```sql
CREATE TABLE specialist_results (
  indicator_id TEXT PRIMARY KEY,
  indicator_type TEXT NOT NULL,
  indicator_category TEXT NOT NULL,
  temporal_aggregation TEXT NOT NULL,
  is_monetary INTEGER NOT NULL,
  confidence_cls REAL NOT NULL,
  family TEXT NOT NULL,
  created_at TEXT
);
```

#### 4. `orientation_results`

Stage 3 heat map orientation:

```sql
CREATE TABLE orientation_results (
  indicator_id TEXT PRIMARY KEY,
  heat_map_orientation TEXT NOT NULL,
  confidence_orient REAL NOT NULL,
  created_at TEXT
);
```

#### 5. `flagging_results`

Quality control flags:

```sql
CREATE TABLE flagging_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_id TEXT NOT NULL,
  flag_type TEXT NOT NULL,
  flag_reason TEXT NOT NULL,
  current_value TEXT,
  expected_value TEXT,
  confidence REAL,
  flagged_at TEXT
);
```

#### 6. `review_decisions`

LLM review corrections:

```sql
CREATE TABLE review_decisions (
  indicator_id TEXT PRIMARY KEY,
  action TEXT NOT NULL, -- confirm|fix|escalate
  diff_json TEXT,
  reason TEXT NOT NULL,
  confidence REAL NOT NULL,
  reviewed_at TEXT
);
```

#### 7. `pipeline_executions`

Execution telemetry:

```sql
CREATE TABLE pipeline_executions (
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
  config_json TEXT,
  telemetry_json TEXT,
  created_at TEXT
);
```

## Storage Layers

Each stage has a storage module:

### Router Storage (`router/storage.ts`)

```typescript
import { readRouterResults, writeRouterResults } from "./router/storage.ts";

// Write results
writeRouterResults(db, routerResults);

// Read results
const results = readRouterResults(db, ["indicator-1", "indicator-2"]);
```

### Specialist Storage (`specialist/storage.ts`)

```typescript
import {
  readSpecialistResults,
  writeSpecialistResults,
} from "./specialist/storage.ts";

writeSpecialistResults(db, specialistResults);
const results = readSpecialistResults(db);
```

### Orientation Storage (`orientation/storage.ts`)

```typescript
import {
  readOrientationResults,
  writeOrientationResults,
} from "./orientation/storage.ts";

writeOrientationResults(db, orientationResults);
const results = readOrientationResults(db);
```

### Review Storage (`review/storage.ts`)

```typescript
import {
  applyReviewDiff,
  readFlaggedIndicators,
  writeFlaggingResults,
  writeReviewDecisions,
} from "./review/storage.ts";

// Write flags
writeFlaggingResults(db, flaggedIndicators);

// Read flagged indicators
const flagged = readFlaggedIndicators(db);

// Write review decisions
writeReviewDecisions(db, decisions);

// Apply corrections
applyReviewDiff(db, indicatorId, diff, reason);
```

### Output Storage (`output/storage.ts`)

```typescript
import {
  getClassificationStats,
  readClassifications,
} from "./output/storage.ts";

// Get final classifications
const classifications = readClassifications(db);

// Get statistics
const stats = getClassificationStats(db);
console.log(stats);
// {
//   total: 100,
//   byFamily: { 'physical-fundamental': 30, ... },
//   byType: { 'flow': 25, ... },
//   reviewed: 5,
//   escalated: 2
// }
```

## Database Configuration

### Local Database (Default)

```typescript
const config = {
  type: "local",
  path: "./data/classify_v2.db",
  walMode: true, // Enable WAL for better concurrency
  autoMigrate: true, // Auto-apply schema migrations
};
```

### Remote Database (Railway)

```typescript
const config = {
  type: "remote",
  path: "https://your-railway-db.railway.app",
  auth: {
    token: process.env.RAILWAY_DB_TOKEN,
  },
  autoMigrate: true,
};
```

## Performance Features

### WAL Mode

Write-Ahead Logging enabled by default for better concurrency:

- Multiple readers don't block writers
- Better performance for concurrent access

### Indexes

Optimized indexes for common queries:

- Family-based lookups
- Type-based filtering
- Review status queries
- Time-based queries

### Transactions

All write operations use transactions:

- Atomic batch inserts
- Rollback on error
- Consistent state

## Maintenance

### Clean Old Data

```typescript
import { CLEANUP_OLD_DATA } from "./schema.ts";

db.exec(CLEANUP_OLD_DATA);
// Deletes executions >30 days old
// Runs VACUUM to reclaim space
```

### Reset Database

```bash
# CLI
deno task db:reset

# Programmatic
import { resetDatabase } from './setup.ts';
await resetDatabase('./classify_v2.db');
```

### Backup

```bash
# SQLite backup
sqlite3 classify_v2.db ".backup classify_v2_backup.db"

# Copy files
cp classify_v2.db* backups/
```

## Queries

### Get Family Distribution

```typescript
const stmt = db.prepare(`
  SELECT family, COUNT(*) as count
  FROM classifications
  GROUP BY family
  ORDER BY count DESC
`);

const distribution = stmt.all();
```

### Get Recent Executions

```typescript
const stmt = db.prepare(`
  SELECT
    execution_id,
    total_indicators,
    successful_indicators,
    total_duration_ms,
    total_cost
  FROM pipeline_executions
  ORDER BY created_at DESC
  LIMIT 10
`);

const recent = stmt.all();
```

### Get Flagged Indicators

```typescript
const stmt = db.prepare(`
  SELECT
    c.name,
    c.family,
    f.flag_type,
    f.flag_reason,
    f.current_value,
    f.expected_value
  FROM flagging_results f
  JOIN classifications c ON c.indicator_id = f.indicator_id
  WHERE f.flag_type = ?
`);

const flags = stmt.all("low_confidence");
```

## Migration Strategy

Schema versions tracked in `schema_version` table:

1. Check current version
2. Apply migrations if needed
3. Update version number

```typescript
// In client.ts
private async migrate(): Promise<void> {
  let currentVersion = 0;

  try {
    const result = db.prepare(
      'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
    ).value<[number]>();

    if (result) currentVersion = result[0];
  } catch {
    // No schema_version table yet
  }

  if (currentVersion < SCHEMA_VERSION) {
    await db.exec(V2_SCHEMA);
  }
}
```

## Seeding Helper Functions

The `seed_mcp.ts` file provides helper functions for working with seeded data:

### Get Indicators for Classification

```typescript
import { createLocalDatabase } from "./client.ts";
import { getIndicatorsForClassification } from "./seed_mcp.ts";

const db = createLocalDatabase();
await db.initialize();

// Get first 10 indicators for classification
const indicators = getIndicatorsForClassification(db, 10);
console.log(indicators);
// [
//   { id: '...', name: 'GDP Growth', units: '%', description: '...' },
//   ...
// ]

db.close();
```

### Get Seeding Statistics

```typescript
import { getSeededStats } from "./seed_mcp.ts";

const stats = getSeededStats(db);
console.log(stats);
// {
//   indicators: 100,
//   timeSeriesValues: 982,
//   avgValuesPerIndicator: 9.8
// }
```

## Troubleshooting

### Missing Data Files

If you get errors about missing data files, ensure the `data/` folder contains:

- `indicators.ts` with `INDICATORS_DATA` export
- `country_indicators.ts` with `COUNTRY_INDICATORS` export

**Solution**: Add your indicator and country indicator data to the files in the
`data/` folder.

### Database Locked

If you get "database is locked" errors:

- Ensure WAL mode is enabled
- Close connections when done
- Use transactions properly

### Large Database

Clean old data periodically:

```bash
deno task db:clean
```

### Corrupted Database

Reset and rebuild:

```bash
rm -rf data/classify_v2.db*
deno task db:setup
deno task db:seed
# Re-run pipeline
```
