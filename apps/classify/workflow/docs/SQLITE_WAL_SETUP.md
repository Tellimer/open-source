# SQLite WAL Setup - Summary

## What Was Added

### 1. Database Schema with WAL Mode

**File:** `src/db/schema.ts`

- Comprehensive schema with 11 tables
- WAL mode enabled via PRAGMA statements
- Indexes for performance
- Foreign key constraints for data integrity
- Schema versioning

### 2. Database Client

**File:** `src/db/client.ts`

- Singleton database connection management
- Automatic WAL mode initialization
- Schema initialization helper
- Transaction support
- Connection cleanup

### 3. Persistence Layer

**File:** `src/db/persist.ts`

- `saveFinalClassification()` - Main classification persistence
- `logProcessing()` - Audit trail logging
- `saveStageResult()` - Stage-specific result persistence
- `getClassification()` - Single result query
- `getClassifications()` - Filtered bulk query

### 4. Module Index

**File:** `src/db/index.ts`

- Clean exports for all database functionality

### 5. Complete Step Updated

**File:** `steps/classify-flow/complete-classify.step.ts`

- Now saves to SQLite database
- Aggregates all stage results
- Logs processing events
- Error handling with database logging
- Backward compatible with Motia state

### 6. Seed Script Updated

**File:** `src/scripts/seed-database.ts`

- Uses new schema initialization
- WAL mode enabled during seeding
- Imports from centralized schema

### 7. Query Results Script

**File:** `src/scripts/query-results.ts`

- Interactive querying of classification results
- Statistics dashboard
- Filter support (family, type, status)
- Detailed result display

### 8. New Deno Task

**Added to `deno.json`:**

```json
"query": "deno run --allow-read --allow-env --env src/scripts/query-results.ts"
```

## How to Use

### 1. Seed the Database (if not already done)

```bash
deno task seed-db
```

This will:

- Initialize the SQLite database
- Enable WAL mode
- Create all tables and indexes
- Populate source indicators from PostgreSQL

### 2. Run Classifications

```bash
deno task run:dev -- --10
```

This will:

- Process 10 diverse indicators
- Save results to SQLite database
- Log all processing events

### 3. Query Results

```bash
# View all results
deno task query

# Filter by family
deno task query -- --family physical-fundamental

# Filter by type
deno task query -- --type balance-of-payments

# Custom limit
deno task query -- --limit 50

# Combine filters
deno task query -- --family price-value --status passed --limit 10
```

## WAL Mode Benefits

### Performance

- **Concurrent Reads:** Multiple readers don't block each other
- **Non-blocking Reads:** Reads don't block writes
- **Better Write Throughput:** Faster write performance
- **Typical Latency:** < 5ms per classification write

### Reliability

- **Better Crash Recovery:** WAL provides better durability
- **Atomic Commits:** All-or-nothing transaction semantics
- **Checkpointing:** Automatic background checkpointing

### Files Created

When WAL is enabled, you'll see:

- `classify-workflow-local-dev.db` - Main database
- `classify-workflow-local-dev.db-wal` - Write-ahead log
- `classify-workflow-local-dev.db-shm` - Shared memory

These are all managed automatically by SQLite.

## Database Schema

### Main Output Table: `classifications`

This table contains the final aggregated results with:

- Source metadata (name, units, periodicity, etc.)
- Normalization results (parsed scale, unit type, currency)
- Time inference (reporting frequency, time basis)
- Scale inference (scale, confidence)
- Currency check (is_currency_denominated, detected_currency)
- Family assignment (family, confidence)
- Type classification (indicator_type, temporal_aggregation)
- Boolean review (passed, fields_wrong, reason)
- Final review (status, corrections)
- Overall confidence score
- LLM provider and model information
- Timestamps

### Stage-Specific Tables

Each stage has its own table to track intermediate results:

1. `normalization_results`
2. `time_inference_results`
3. `scale_inference_results`
4. `currency_check_results`
5. `family_assignment_results`
6. `type_classification_results`
7. `boolean_review_results`
8. `final_review_results`

### Audit Table: `processing_log`

Tracks all processing events:

- Indicator ID
- Stage name
- Status (started/completed/failed)
- Error messages (if failed)
- Processing time in milliseconds
- Timestamp

## Integration Points

### 1. Classification Pipeline

The `complete-classify.step.ts` handler now:

- Retrieves all stage results from Motia state
- Aggregates into a single classification record
- Saves to `classifications` table
- Logs processing events
- Handles errors gracefully

### 2. Data Flow

```
PostgreSQL (source)
    ↓
SQLite (seeded)
    ↓
Motia Pipeline (processing)
    ↓
Motia State (ephemeral)
    ↓
SQLite (persistent results)
```

### 3. Query Interface

```
SQLite Database
    ↓
query-results.ts script
    ↓
Console output (statistics + filtered results)
```

## Verification

After running classifications, you can verify results:

```bash
# Check total count
sqlite3 data/classify-workflow-local-dev.db "SELECT COUNT(*) FROM classifications;"

# View WAL status
sqlite3 data/classify-workflow-local-dev.db "PRAGMA journal_mode;"
# Should return: wal

# Check recent classifications
deno task query -- --limit 5
```

## Troubleshooting

### Database Locked

If you see "database is locked" errors:

- WAL mode should prevent this
- Check if another process has the database open
- Verify `busy_timeout` is set (5000ms by default)

### WAL Files Growing

WAL files are automatically checkpointed by SQLite. To manually checkpoint:

```bash
sqlite3 data/classify-workflow-local-dev.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

### Schema Version Mismatch

Check current schema version:

```bash
sqlite3 data/classify-workflow-local-dev.db "SELECT * FROM schema_version;"
```

## Next Steps

1. **Run seed-db** to initialize the database (if not done)
2. **Run classifications** with `deno task run:dev`
3. **Query results** with `deno task query`
4. **Verify WAL mode** is working correctly
5. **Monitor performance** with processing_log table

## Documentation

See also:

- `DATABASE_PERSISTENCE.md` - Detailed database documentation
- `USAGE_GUIDE.md` - Full application usage guide
- `README.md` - Project overview
