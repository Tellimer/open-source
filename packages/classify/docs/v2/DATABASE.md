# V2 Database Guide

V2 uses SQLite for persistent state storage. This enables resume capability, audit trails, and stage-by-stage result tracking.

## Quick Start

Create and initialize a local database:

```typescript
import { createLocalDatabase } from '@tellimer/classify';

const db = createLocalDatabase('./data/classify_v2.db');
await db.initialize();

// Use with V2 pipeline
const result = await classifyIndicatorsV2(indicators, llmConfig, {
  database: db
});

db.close();
```

## Database Tables

V2 creates the following tables automatically:

### 1. Core Tables

#### `classifications`
Main table with final classifications for each indicator.

```sql
CREATE TABLE classifications (
  id TEXT PRIMARY KEY,              -- Indicator ID
  name TEXT NOT NULL,
  family TEXT,                      -- From router
  indicator_type TEXT,              -- From specialist
  temporal_aggregation TEXT,        -- From specialist
  is_monetary INTEGER,              -- From specialist
  heat_map_orientation TEXT,        -- From orientation
  confidence_family REAL,           -- Router confidence
  confidence_cls REAL,              -- Specialist confidence
  confidence_orient REAL,           -- Orientation confidence
  created_at TEXT,
  updated_at TEXT
);
```

### 2. Stage Tables

#### `router_results`
Family routing results.

```sql
CREATE TABLE router_results (
  indicator_id TEXT PRIMARY KEY,
  family TEXT NOT NULL,
  confidence REAL,
  reasoning TEXT,
  created_at TEXT
);
```

#### `specialist_results`
Type classification results.

```sql
CREATE TABLE specialist_results (
  indicator_id TEXT PRIMARY KEY,
  indicator_type TEXT NOT NULL,
  temporal_aggregation TEXT,
  is_monetary INTEGER,
  confidence REAL,
  reasoning TEXT,
  created_at TEXT
);
```

#### `orientation_results`
Heat map orientation results.

```sql
CREATE TABLE orientation_results (
  indicator_id TEXT PRIMARY KEY,
  heat_map_orientation TEXT NOT NULL,
  confidence REAL,
  reasoning TEXT,
  created_at TEXT
);
```

### 3. Quality Control Tables

#### `flagging_results`
Quality flags for problematic indicators.

```sql
CREATE TABLE flagging_results (
  indicator_id TEXT PRIMARY KEY,
  flags TEXT,                       -- JSON array of flags
  created_at TEXT
);
```

#### `review_decisions`
LLM review decisions for flagged indicators.

```sql
CREATE TABLE review_decisions (
  indicator_id TEXT PRIMARY KEY,
  action TEXT,                      -- 'confirm', 'fix', 'escalate'
  diff TEXT,                        -- Changes applied (if action=fix)
  reasoning TEXT,
  created_at TEXT
);
```

### 4. Telemetry Tables

#### `pipeline_executions`
Execution tracking and audit log.

```sql
CREATE TABLE pipeline_executions (
  id TEXT PRIMARY KEY,
  status TEXT,                      -- 'running', 'completed', 'failed'
  start_time TEXT,
  end_time TEXT,
  indicators_total INTEGER,
  indicators_successful INTEGER,
  error_message TEXT
);
```

## Local Database

Use local SQLite for development and small-scale processing:

```typescript
import { createLocalDatabase } from '@tellimer/classify';

// Default path
const db = createLocalDatabase('./data/classify_v2.db');

// Custom path
const db = createLocalDatabase('/path/to/custom.db');

await db.initialize();
```

**Features:**
- WAL mode for better concurrency
- Automatic migrations
- Transaction support
- Fast local access

## Remote Database (Railway)

Use Railway for remote SQLite hosting:

```typescript
import { createRemoteDatabase } from '@tellimer/classify';

const db = createRemoteDatabase(
  'https://your-project.railway.app',
  { token: process.env.RAILWAY_TOKEN }
);

await db.initialize();
```

**Benefits:**
- Shared access across multiple machines
- Centralized storage
- Automatic backups (Railway feature)

## Seeding Real Data

Populate your database with real indicator data for testing.

### Option 1: Manual Seeding Script

Create `scripts/seed.ts`:

```typescript
#!/usr/bin/env -S deno run --allow-all

import { createLocalDatabase } from '../src/v2/db/client.ts';

const db = createLocalDatabase('./data/classify_v2.db');
await db.initialize();

// Your indicator data
const indicators = [
  {
    id: "GDP_USA",
    name: "Gross Domestic Product",
    units: "USD billions",
    category_group: "National Accounts"
  },
  // ... more indicators
];

// Insert into source_indicators table
const stmt = db.prepare(`
  INSERT OR REPLACE INTO source_indicators (
    id, name, units, category_group
  ) VALUES (?, ?, ?, ?)
`);

for (const ind of indicators) {
  stmt.run(ind.id, ind.name, ind.units, ind.category_group);
}

console.log(`✅ Seeded ${indicators.length} indicators`);
db.close();
```

Run: `deno task seed` (add to deno.json tasks)

### Option 2: PostgreSQL Export

If you have PostgreSQL data, export to JSON:

```sql
-- Get unique indicators
SELECT
  id, name, units, category_group, periodicity, source_name
FROM indicators
WHERE deleted_at IS NULL
LIMIT 100;
```

Save as JSON and import:

```typescript
import indicators from './indicators.json' assert { type: 'json' };

const db = createLocalDatabase('./data/classify_v2.db');
await db.initialize();

db.transaction(() => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO source_indicators (
      id, name, units, category_group, periodicity, source_name
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const ind of indicators) {
    stmt.run(
      ind.id,
      ind.name,
      ind.units,
      ind.category_group,
      ind.periodicity,
      ind.source_name
    );
  }
});

db.close();
```

## Querying Results

Access classification results from the database:

```typescript
import { createLocalDatabase } from '@tellimer/classify';

const db = createLocalDatabase('./data/classify_v2.db');
await db.initialize();

// Get all classifications
const classifications = db.prepare(`
  SELECT * FROM classifications
`).all();

// Get classifications by family
const physicalIndicators = db.prepare(`
  SELECT * FROM classifications
  WHERE family = 'physical-fundamental'
`).all();

// Get flagged indicators
const flagged = db.prepare(`
  SELECT c.*, f.flags
  FROM classifications c
  JOIN flagging_results f ON f.indicator_id = c.id
`).all();

// Get escalated indicators (need human review)
const escalated = db.prepare(`
  SELECT c.*, r.reasoning
  FROM classifications c
  JOIN review_decisions r ON r.indicator_id = c.id
  WHERE r.action = 'escalate'
`).all();

db.close();
```

## Resume Capability

V2 automatically resumes from database state:

```typescript
const db = createLocalDatabase('./data/classify_v2.db');
await db.initialize();

// First run - may fail after router stage
try {
  await classifyIndicatorsV2(indicators, llmConfig, { database: db });
} catch (error) {
  console.error('Pipeline failed, state saved to database');
}

// Second run - automatically skips router, starts from specialist
const result = await classifyIndicatorsV2(indicators, llmConfig, {
  database: db
});

// V2 checks each stage:
// - Router results exist? ✅ Skip router
// - Specialist results exist? ❌ Run specialist
// - ... continues from where it failed
```

## Database Utilities

### Check Status

```typescript
const db = createLocalDatabase('./data/classify_v2.db');
await db.initialize();

// Count classifications
const { count } = db.prepare(`
  SELECT COUNT(*) as count FROM classifications
`).get();

console.log(`Total classifications: ${count}`);

// Get stage completion
const routerCount = db.prepare(`
  SELECT COUNT(*) FROM router_results
`).get().count;

const specialistCount = db.prepare(`
  SELECT COUNT(*) FROM specialist_results
`).get().count;

console.log(`Router complete: ${routerCount}`);
console.log(`Specialist complete: ${specialistCount}`);
```

### Reset Database

Clear all results (keeps schema):

```typescript
const db = createLocalDatabase('./data/classify_v2.db');
await db.initialize();

db.transaction(() => {
  db.prepare('DELETE FROM classifications').run();
  db.prepare('DELETE FROM router_results').run();
  db.prepare('DELETE FROM specialist_results').run();
  db.prepare('DELETE FROM orientation_results').run();
  db.prepare('DELETE FROM flagging_results').run();
  db.prepare('DELETE FROM review_decisions').run();
  db.prepare('DELETE FROM pipeline_executions').run();
});

console.log('✅ Database reset complete');
```

### Export Results

Export classifications to JSON:

```typescript
const db = createLocalDatabase('./data/classify_v2.db');
await db.initialize();

const classifications = db.prepare(`
  SELECT * FROM classifications
`).all();

await Deno.writeTextFile(
  './classifications.json',
  JSON.stringify(classifications, null, 2)
);

console.log(`✅ Exported ${classifications.length} classifications`);
```

## Troubleshooting

### Database Locked Error

**Cause:** Multiple processes accessing the same database.

**Solution:** Close other connections or use WAL mode (enabled by default for local DB).

```typescript
// WAL mode is automatic for local databases
const db = createLocalDatabase('./data/classify_v2.db');
await db.initialize(); // WAL mode enabled
```

### Table Not Found

**Cause:** Database not initialized.

**Solution:** Always call `await db.initialize()` before use.

```typescript
const db = createLocalDatabase('./data/classify_v2.db');
await db.initialize(); // ← Required!
```

### Migration Issues

**Cause:** Schema version mismatch.

**Solution:** Delete the database file and reinitialize:

```bash
rm -rf data/classify_v2.db*
```

Then run your pipeline again - tables will be recreated automatically.

## Best Practices

1. **Always initialize:** Call `await db.initialize()` before use
2. **Close connections:** Call `db.close()` when done
3. **Use transactions:** Wrap bulk inserts in `db.transaction()`
4. **WAL mode:** Enabled by default for local (better concurrency)
5. **Backup regularly:** Copy `.db` file for backups
6. **Monitor size:** SQLite can handle millions of rows efficiently

## Database Schema Diagram

```
┌─────────────────┐
│ classifications │ ← Main table
└─────────────────┘
        ↑
        │ (joined via indicator_id)
        │
┌───────┴─────────┬──────────────┬────────────────┬─────────────────┐
│                 │              │                │                 │
│ router_results  │ specialist_  │ orientation_   │ flagging_       │
│                 │ results      │ results        │ results         │
│                 │              │                │                 │
└─────────────────┴──────────────┴────────────────┴─────────────────┘
                                                          │
                                                          ↓
                                                  ┌─────────────────┐
                                                  │ review_         │
                                                  │ decisions       │
                                                  └─────────────────┘
```

All stage tables link to `classifications` via `indicator_id`.

## Next Steps

- [V2 Overview](./README.md) - Main V2 documentation
- [Architecture](./ARCHITECTURE.md) - 6-stage pipeline details
- [AI SDK Guide](./AI_SDK.md) - Type-safe structured output
