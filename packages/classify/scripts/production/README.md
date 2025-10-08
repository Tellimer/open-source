# Production Scripts

These scripts run the V2 classification pipeline on all 668 production
indicators using a local SQLite database, with optional sync to Railway.

## Environment Setup

Create a `.env` file in the project root:

```bash
# AI Provider (required for pipeline)
ANTHROPIC_API_KEY=your_anthropic_key_here

# Railway libSQL Database (optional - for syncing results)
RAILWAY_DATABASE_URL=libsql://libsql-production-xxxxx.up.railway.app:443
RAILWAY_DATABASE_TOKEN=your_auth_token_here
```

Your indicators and time series data should already be in:

- `data/indicators.ts` - All 668 indicators
- `data/country_indicators.ts` - Time series data

## Available Scripts

### 1. Run Classification Pipeline

Runs the full V2 pipeline on all 668 indicators locally:

```bash
deno task prod:run
```

**What it does:**

- Loads all 668 indicators from `data/indicators.ts`
- Loads time series data from `data/country_indicators.ts`
- Runs 6-stage pipeline (Router → Specialist → Validation → Orientation →
  Flagging → Review)
- Saves all results to local SQLite: `./data/classify_production_v2.db`
- Shows detailed summary with timing, costs, and flagged items

**Expected output:**

```
🚀 Running Production Classification Pipeline
============================================================
✅ Loaded 668 indicators
✅ Loaded time series for 668 indicators

🔄 Starting V2 Classification Pipeline...

📊 PRODUCTION PIPELINE SUMMARY
============================================================
⏱️  Total Time: 1200.5s (~20 minutes)
📈 Success Rate: 98.5%
✅ Successful: 658/668
❌ Failed: 10/668
🚩 Escalated: 15/658

📋 Stage Breakdown:
  Router:      668/668 (45s, 15 API calls)
  Specialist:  658/668 (850s, 120 API calls)
  Validation:  450 analyzed (120s)
  Orientation: 658/658 (50s, 15 API calls)
  Flagging:    15 flagged
  Review:      12/15 reviewed (15 API calls)

💰 Cost Analysis:
  Total API Calls:   165
  Total Time:        1200500ms

Results saved to: ./data/classify_production_v2.db
```

### 2. Sync to Railway (Optional)

After running locally, copy all results to Railway libSQL:

```bash
deno task prod:sync
```

**What it does:**

- Reads all classification results from local database
- Connects to Railway libSQL
- Copies all tables to Railway:
  - classifications
  - router_results
  - specialist_results
  - validation_results
  - orientation_results
  - flagging_results
  - review_decisions
- Shows progress and statistics

**Expected output:**

```
🔄 Syncing Local Database to Railway
============================================================
📍 Source: ./data/classify_production_v2.db
📍 Target: libsql://libsql-production-classify.up.railway.app:443

📤 Syncing classifications...
   Copied 668/668 rows
✅ Synced 668 rows from classifications

📤 Syncing router_results...
   Copied 668/668 rows
✅ Synced 668 rows from router_results

... (7 tables total)

============================================================
✅ Sync completed! Copied 2,500 total rows
============================================================
```

### 3. Setup Railway Schema (Optional)

If you need to create tables on Railway first:

```bash
deno task prod:setup
```

**What it does:**

- Connects to Railway libSQL
- Creates all V2 pipeline tables
- Verifies schema

### 4. Reset Railway (Optional)

Clears all classification results on Railway:

```bash
deno task prod:reset
```

**What it does:**

- Prompts for confirmation
- Deletes all pipeline results from Railway
- Shows before/after counts

## Workflow

### Running Locally (Recommended)

```bash
# 1. Run pipeline on all 668 indicators
deno task prod:run

# Results are saved to ./data/classify_production_v2.db
# Query locally with SQLite tools or use in your application
```

### Syncing to Railway (Optional)

If you want to make results available via Railway:

```bash
# 1. First time: setup schema on Railway
deno task prod:setup

# 2. Run pipeline locally
deno task prod:run

# 3. Sync results to Railway
deno task prod:sync
```

### Re-running Pipeline

If you've updated prompts or want to re-classify:

```bash
# Just delete the local database and run again
rm ./data/classify_production_v2.db
deno task prod:run

# Optionally sync to Railway
deno task prod:sync
```

## Database Tables

### Source Tables (Data Input)

- `source_indicators` - 668 economic indicators
- `source_country_indicators` - Time series values (~200k+ rows)

### Pipeline Results Tables

- `classifications` - Final classifications (1 row per indicator)
- `router_results` - Family assignments from Stage 1
- `specialist_results` - Type classifications from Stage 2
- `validation_results` - Time series analysis from Stage 3
- `orientation_results` - Heat map orientations from Stage 4
- `flagging_results` - Quality control flags from Stage 5
- `review_decisions` - LLM review decisions from Stage 6
- `pipeline_executions` - Execution metadata

## Querying Results

After running the pipeline, you can query results directly from Railway:

```sql
-- Get all classifications
SELECT * FROM classifications ORDER BY indicator_id;

-- Get flagged indicators
SELECT i.name, f.flag_type, f.flag_reason
FROM flagging_results f
JOIN source_indicators i ON f.indicator_id = i.id;

-- Get validation results (cumulative patterns)
SELECT i.name, v.is_cumulative, v.cumulative_confidence, v.suggested_temporal
FROM validation_results v
JOIN source_indicators i ON v.indicator_id = i.id
WHERE v.is_cumulative = 1;

-- Get review decisions
SELECT i.name, r.action, r.reasoning
FROM review_decisions r
JOIN source_indicators i ON r.indicator_id = i.id;
```

## Troubleshooting

### Connection Issues

If you get connection errors:

- Verify `RAILWAY_DATABASE_URL` is correct
- Check if `RAILWAY_DATABASE_TOKEN` is set (may be optional for public
  databases)
- Ensure Railway database is running

### Seeding Failures

If seeding fails partway through:

- Re-run `deno task prod:seed` - it uses `INSERT OR REPLACE` so it's idempotent
- Check Railway database size limits
- Verify data files exist: `data/indicators.ts`, `data/country_indicators.ts`

### Pipeline Failures

If pipeline fails:

- Check `ANTHROPIC_API_KEY` is valid
- Verify you have API credits
- Check network connectivity
- Review error messages for specific issues

### Out of Memory

If you run out of memory with 668 indicators:

- Reduce `batchSize` in `run_pipeline.ts`
- Process indicators in chunks (modify script)
- Increase Railway memory allocation

## Cost Estimates

Running the full pipeline on 668 indicators:

- **API Calls**: ~150-200 (depending on retries)
- **Tokens**: ~800k-1M total
- **Cost**: $20-30 (Anthropic Claude Sonnet 4)
- **Time**: ~20-30 minutes

Breakdown by stage:

- Router: ~50k tokens, ~$1.50
- Specialist: ~600k tokens, ~$18
- Validation: No API calls (time series analysis)
- Orientation: ~100k tokens, ~$3
- Flagging: No API calls (rule-based)
- Review: ~100k tokens, ~$3

## Safety Features

All scripts include:

- ✅ Connection validation before operations
- ✅ Confirmation prompts for destructive operations
- ✅ Detailed progress logging
- ✅ Error handling with rollback
- ✅ Statistics and verification after completion
- ✅ Preserved source data (never deleted)

## Next Steps

After successful pipeline execution:

1. Review flagged indicators in `flagging_results`
2. Examine review decisions in `review_decisions`
3. Export classifications for use in your application
4. Set up scheduled runs for new/updated indicators
