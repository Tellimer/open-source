# Database Persistence

The classify-workflow persists all classification results to SQLite (WAL mode) and supports syncing to PostgreSQL for shared/production use.

## Schema

The database schema is defined in `src/db/schema.ts` and includes:

### Main Tables

1. **source_indicators** - Original indicator metadata from PostgreSQL
2. **source_country_indicators** - Time series data for each indicator
3. **classifications** - Final aggregated classification results (main output table)

### Stage-Specific Result Tables (v5)

Each pipeline stage has its own table to store intermediate results:

- **normalization_results** - Stage 1: Regex-based parsing
- **time_inference_results** - Stage 2: LLM time basis inference
- **cumulative_detection_results** - Stage 2.5: Rule-based cumulative/YTD detection (v5)
- DEPRECATED since v4 (kept for backward compatibility):
  - **scale_inference_results** (scale now determined during normalization)
  - **currency_check_results** (currency now determined during normalization)
- **family_assignment_results** - Stage 5: LLM family assignment
- **type_classification_results** - Stage 6: LLM type classification
- **boolean_review_results** - Stage 7: LLM boolean review
- **final_review_results** - Stage 8: LLM final review

### Audit Table

- **processing_log** - Audit trail of all processing events (start/complete/fail)

## WAL Mode

The database is configured with Write-Ahead Logging (WAL) for better concurrent write performance:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
```

**Benefits:**

- Multiple readers can access the database while a write is in progress
- Better performance for write-heavy workloads
- Improved crash recovery

**Files Created:**

- `classify-workflow-local-dev.db` - Main database file
- `classify-workflow-local-dev.db-wal` - Write-ahead log file
- `classify-workflow-local-dev.db-shm` - Shared memory file

## Database Client

The database client is defined in `src/db/client.ts` and provides:

- **getDatabase()** - Get or create a singleton database connection with WAL enabled
- **initializeSchema()** - Initialize all tables and indexes
- **closeDatabase()** - Close the database connection
- **withTransaction()** - Execute a function within a transaction

## Persistence Layer

The persistence layer is defined in `src/db/persist.ts` and provides:

### Functions

1. **saveFinalClassification(db, data)** - Save final classification to `classifications` table
2. **logProcessing(db, data)** - Log processing events to `processing_log` table
3. **saveStageResult(db, stage, indicator_id, data)** - Save stage-specific results
4. **getClassification(db, indicator_id)** - Get a single classification by ID
5. **getClassifications(db, filters)** - Get multiple classifications with filters

### Filters

The `getClassifications()` function supports:

- `family` - Filter by indicator family
- `indicator_type` - Filter by indicator type
- `review_status` - Filter by review status
- `limit` - Limit number of results
- `offset` - Pagination offset

## Integration

The `complete-classify.step.ts` event handler:

1. Gathers all results from Motia state
2. Retrieves source indicator metadata from SQLite
3. Aggregates all classification data
4. Saves to `classifications` table
5. Logs processing events to `processing_log` table
6. Handles errors and logs failures

## Querying Results

Use the `query-results.ts` script to query classification results:

```bash
# Query all results (default: 25 limit)
deno task query

# Query with custom limit
deno task query -- --limit 10

# Filter by family
deno task query -- --family physical-fundamental

# Filter by type
deno task query -- --type balance-of-payments

# Filter by review status
deno task query -- --status passed

# Combine filters
deno task query -- --family price-value --status passed --limit 5
```

The query script provides:

- Overall statistics (total count, family distribution, type distribution)
- Filtered results with full classification details
- Confidence scores for each stage
- Reasoning text from LLM inferences

## Seeding

The seed script (`src/scripts/seed-database.ts`) now:

1. Connects to remote PostgreSQL database
2. Fetches all target indicators and their time series data
3. Initializes SQLite schema with WAL mode
4. Populates `source_indicators` and `source_country_indicators` tables
5. Ready for classification pipeline

```bash
deno task seed-db
```

## Example Usage

```typescript
import { getDatabase } from "./src/db/client.ts";
import { getClassifications } from "./src/db/persist.ts";

// Get database connection
const db = getDatabase();

// Query classifications
const results = getClassifications(db, {
  family: "physical-fundamental",
  limit: 10,
});

console.log(`Found ${results.length} results`);
```

## Schema Version

Current schema version: **5**

Schema versioning is tracked in the `schema_version` table. Future schema migrations will increment this version.

## Performance

With WAL mode enabled:

- Concurrent reads do not block writes
- Writes do not block reads
- Better throughput for high-volume classification workloads
- Typical write latency: < 5ms per classification

## Backup

To backup the database with WAL:

```bash
# Full backup (includes WAL)
sqlite3 data/classify-workflow-local-dev.db ".backup backup.db"

# Or copy all files
cp data/classify-workflow-local-dev.db* backups/
```

## Migration from Motia State

The system now:

1. **Saves to SQLite** (primary storage)
2. **Saves to Motia state** (for backward compatibility and workflow coordination)

Future versions may remove Motia state persistence entirely and use SQLite as the sole source of truth.
