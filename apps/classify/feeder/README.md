# Classify Feeder

Orchestrates batch processing from LibSQL/Turso → Motia workflow API → Postgres/TimescaleDB.

## Overview

The feeder service manages the end-to-end pipeline for processing economic indicators at scale:

1. **Fetch** indicators from LibSQL (Turso) database
2. **Batch** into configurable groups (default: 10 per batch)
3. **Submit** multiple batches concurrently to workflow API (default: 5 concurrent)
4. **Track** progress in LibSQL with status fields
5. **Monitor** results in Postgres classifications table

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   LibSQL    │─────▶│ classify/feeder  │─────▶│ classify/workflow│
│  (Turso)    │      │  (this service)  │      │  (Motia API)     │
│  Source DB  │      │                  │      │                  │
└─────────────┘      └──────────────────┘      └─────────────────┘
                             │                          │
                             │                          ▼
                             │                  ┌─────────────────┐
                             └─────────────────▶│ Railway Postgres│
                                                │  (TimescaleDB)  │
                                                │  Final Results  │
                                                └─────────────────┘
```

## Features

- **Concurrent batch submission** - Process 5+ batches in parallel
- **Exponential backoff** - Automatic retry for rate limit errors (429)
- **Progress tracking** - Resume capability via LibSQL status fields
- **Rate limit safety** - Configurable concurrency for TPM limits
- **Status monitoring** - Check progress without restarting

## Prerequisites

- Deno 1.40+
- LibSQL/Turso database with source indicators
- Motia workflow API (local or Railway-deployed)
- Postgres/TimescaleDB for results

## Installation

```bash
cd apps/classify/feeder
```

## Configuration

Create `.env` file (see [.env.example](./.env.example)):

```bash
# Motia Workflow API
MOTIA_API_URL=https://classify-workflow.up.railway.app

# LibSQL (Turso)
LIBSQL_URL=libsql://your-database.turso.io
LIBSQL_AUTH_TOKEN=your_token_here

# Postgres (results)
POSTGRES_URL=postgresql://user:pass@host/db

# Batch config (recommended for 10.9K indicators)
BATCH_SIZE=10
CONCURRENCY=5
INTER_BATCH_DELAY_MS=300
PROVIDER=openai
```

### Rate Limit Configuration

**OpenAI GPT-4o-mini Tier 1:**
- TPM limit: 200,000 tokens/minute
- Per indicator: ~1,000 tokens (2-3 LLM calls)

**Recommended configs:**

| BATCH_SIZE | CONCURRENCY | Concurrent | TPM Usage | Throughput | Safe for |
|------------|-------------|------------|-----------|------------|----------|
| 10 | 3 | 30 | 45% | ~90/min | Conservative |
| 10 | 5 | 50 | 75% | ~150/min | **Recommended** |
| 10 | 8 | 80 | 100% | ~200/min | Max Tier 1 |

## Usage

### Start Batch Processing

Process all queued indicators:

```bash
deno task start
```

With custom config:

```bash
export BATCH_SIZE=10
export CONCURRENCY=5
deno task start
```

**Output:**
```
🚀 Starting batch processing

📊 Progress:
   Total queued: 10,903
   Already sent: 0
   Processed: 0
   Remaining: 10,903

📥 Fetched 10,903 indicators from LibSQL

📦 Batch Configuration:
   Batch size: 10
   Concurrency: 5
   Total batches: 1,091
   Processing groups: 219
   Provider: openai

📋 Group 1/219: Processing 5 batches...
   📦 Batch 1/1091: Submitting indicators 1-10...
      ✅ Batch 1 accepted (trace: abc-123)
   ...
```

### Resume Interrupted Run

If the process is interrupted, resume where you left off:

```bash
deno task resume
```

The feeder tracks which indicators have been sent via LibSQL `sent_at` field, so resuming will only process remaining indicators.

### Check Status

Monitor progress without starting a new run:

```bash
deno task status
```

**Output:**
```
📊 Checking batch status

LibSQL Source Database:
   Total queued: 10,903
   Sent to workflow: 5,200
   Processed: 4,850
   Remaining: 5,703

Progress:
   Sent: 47.7%
   Processed: 44.5%
```

## LibSQL Schema Requirements

The source database must have these status tracking columns:

```sql
-- Add to source_indicators table
ALTER TABLE source_indicators ADD COLUMN IF NOT EXISTS queued BOOLEAN DEFAULT FALSE;
ALTER TABLE source_indicators ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;
ALTER TABLE source_indicators ADD COLUMN IF NOT EXISTS sent_trace_id TEXT;
ALTER TABLE source_indicators ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;
```

**Mark indicators for processing:**

```sql
-- Queue all indicators
UPDATE source_indicators SET queued = TRUE;

-- Or queue selectively
UPDATE source_indicators
SET queued = TRUE
WHERE country = 'US' AND topic = 'Inflation';
```

## How It Works

### 1. Fetch Indicators

Queries LibSQL for indicators where `queued = TRUE` and `sent_at IS NULL`:

```sql
SELECT * FROM source_indicators
WHERE queued = 1 AND sent_at IS NULL
ORDER BY updated_at DESC
LIMIT ?
```

### 2. Batch & Submit

- Splits indicators into batches of `BATCH_SIZE` (e.g., 10)
- Submits `CONCURRENCY` batches in parallel (e.g., 5)
- Uses exponential backoff for 429 rate limit errors

### 3. Track Progress

After successful submission:

```sql
UPDATE source_indicators
SET sent_at = CURRENT_TIMESTAMP, sent_trace_id = ?
WHERE id IN (...)
```

### 4. Pace Between Groups

Waits `INTER_BATCH_DELAY_MS` (default: 300ms) between batch groups to avoid rate limit spikes.

## Error Handling

### Rate Limit Errors (429)

Automatic retry with exponential backoff:
- Attempt 1: Wait 1 second
- Attempt 2: Wait 2 seconds
- Attempt 3: Wait 4 seconds
- Max: 10 seconds

**Example output:**
```
   ⚠️  Retry attempt 1: Rate limited (429), retrying in 1000ms (attempt 1/3)
   ✅ Batch 42 accepted (trace: xyz-789)
```

### Network Errors

Retries up to 3 times with exponential backoff.

### Batch Failures

If a batch fails after retries, the entire group stops to prevent cascading failures. Fix the issue and run `deno task resume`.

## Performance

### Expected Throughput (10,903 indicators)

| Config | Concurrent | Time | TPM Usage |
|--------|------------|------|-----------|
| Conservative (3 concurrent) | 30 | ~2.0 hours | 45% |
| **Recommended (5 concurrent)** | 50 | **~1.2 hours** | **75%** |
| Maximum Tier 1 (8 concurrent) | 80 | ~55 minutes | 100% |

### Cost

**OpenAI GPT-4o-mini:**
- Per indicator: ~$0.00382
- 10,903 indicators: ~$42
- Same cost regardless of concurrency!

## Deployment Options

### Option 1: Local → Railway API

Run feeder locally, post to Railway-hosted workflow:

```bash
export MOTIA_API_URL=https://classify-workflow.up.railway.app
deno task start
```

**Pros:**
- Simple setup
- Can monitor logs directly
- Easy to stop/resume

**Cons:**
- Requires laptop to stay online
- Local network dependency

### Option 2: Railway Cron Job

Deploy feeder as Railway service, trigger via cron:

```yaml
# railway.toml
[build]
  builder = "NIXPACKS"

[deploy]
  startCommand = "deno task start"
  healthcheckPath = "/"
  healthcheckTimeout = 10
```

**Pros:**
- Runs in cloud (always online)
- Can trigger via Railway UI
- Logs in Railway dashboard

**Cons:**
- More setup required
- Harder to debug

### Option 3: Railway One-off Task

Trigger manually via Railway CLI:

```bash
railway run deno task start
```

## Monitoring

### Via LibSQL Status Query

```sql
SELECT
  COUNT(*) FILTER (WHERE queued = 1) as total_queued,
  COUNT(*) FILTER (WHERE sent_at IS NOT NULL) as sent,
  COUNT(*) FILTER (WHERE processed = 1) as processed
FROM source_indicators;
```

### Via Postgres Results

```sql
SELECT COUNT(*) as completed
FROM classifications
WHERE created_at > NOW() - INTERVAL '1 hour';
```

### Via Railway Dashboard

- Service logs
- Health check status
- CPU/Memory usage

## Troubleshooting

### "MOTIA_API_URL environment variable is required"

Create `.env` file with required variables (see [Configuration](#configuration)).

### Batch failures with 429 errors

Reduce concurrency to lower TPM usage:

```bash
export CONCURRENCY=3  # Down from 5
deno task resume
```

### Indicators not processing

Check Motia workflow logs:

```bash
# If running locally
Check http://localhost:3000/health

# If on Railway
railway logs --service classify-workflow
```

### Progress stuck

Check both LibSQL (sent) and Postgres (completed):

```bash
deno task status
```

If sent but not completed, workflow may be processing. Wait or check Postgres:

```sql
SELECT COUNT(*) FROM classifications;
```

## Related

- [Workflow Service](../workflow/README.md) - Motia classification API
- [Railway Deployment](../workflow/README.md#railway-deployment) - Deploy workflow to Railway

## License

See [LICENSE](../../LICENSE) for details.
