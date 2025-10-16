# Quickstart Guide

Get classify running and classify your first 200 indicators in under 5 minutes.

## Prerequisites

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Navigate to project
cd apps/classify/restate

# Install dependencies
bun install
```

## Setup (4 Steps)

### 1. Start Database

```bash
docker-compose -f docker-compose.dev.yml up -d
```

Starts TimescaleDB on port 5432.

### 2. Initialize Schema

```bash
bun run db:init
```

Creates all tables needed for classification storage.

### 3. Configure LLM Provider (Optional)

```bash
cp .env.example .env
```

Edit `.env` and add your API key:

```bash
# For OpenAI
OPENAI_API_KEY=sk-...

# For Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# For local LM Studio (default)
LM_STUDIO_URL=http://localhost:1234/v1
```

### 4. Start Services (3 Terminals)

**Terminal 1 - Restate Server:**
```bash
npx restate-server
```

Starts:
- Admin UI: http://localhost:9070
- Ingress API: http://localhost:8080

**Terminal 2 - Classification Service:**
```bash
bun run dev
```

Starts your service on port 9080.

**Terminal 3 - Register Service:**
```bash
curl -X POST http://localhost:9070/deployments \
  -H 'content-type: application/json' \
  -d '{"uri": "http://localhost:9080"}'
```

You should see JSON response with all registered services.

## Verify Setup

```bash
# Health check
curl -X POST http://localhost:8080/classify-api/health \
  -H 'content-type: application/json'

# Expected: {"status":"ok","service":"classify-api","timestamp":"..."}
```

## Classify Indicators

### From Existing `source_indicators` Table

Your indicators are already in the `source_indicators` table. Now classify them:

```bash
# Classify 200 random indicators with OpenAI
bun run classify -- --200 --random --openai
```

**What this does:**
1. Queries 200 random unclassified indicators from `source_indicators`
2. Splits into 2 batches of 100 (API max)
3. Sends both batches to Restate
4. Returns immediately (fire-and-forget)
5. 200 workflows execute in parallel
6. Completes in 60-120 seconds

### Command Options

```bash
# 200 random with OpenAI (recommended for testing)
bun run classify -- --200 --random --openai

# 50 random for quick test
bun run classify -- --50 --random --openai

# 200 random with Anthropic
bun run classify -- --200 --random --anthropic

# All unclassified indicators (random order)
bun run classify -- --random --openai

# Re-classify 200 (ignore existing classifications)
bun run classify -- --200 --random --force --openai
```

## Monitor Progress

### Option 1: Restate Admin UI (Best)

```bash
open http://localhost:9070
```

Navigate to **Invocations** → Filter by "classification-workflow"

### Option 2: Database Query

```bash
# Quick check
psql -U classify -h localhost -d classify -c "SELECT COUNT(*) as completed FROM classifications;"
```

### Option 3: Full Progress

```sql
SELECT
  CASE
    WHEN n.indicator_id IS NULL THEN '1-normalizing'
    WHEN t.indicator_id IS NULL THEN '2-time-inferring'
    WHEN f.indicator_id IS NULL THEN '3-family-assigning'
    WHEN ty.indicator_id IS NULL THEN '4-type-classifying'
    WHEN b.indicator_id IS NULL THEN '5-reviewing'
    WHEN fr.indicator_id IS NULL THEN '6-final-reviewing'
    ELSE '7-completed'
  END as stage,
  COUNT(*) as count
FROM source_indicators si
LEFT JOIN normalization_results n ON si.id = n.indicator_id
LEFT JOIN time_inference_results t ON si.id = t.indicator_id
LEFT JOIN family_assignment_results f ON si.id = f.indicator_id
LEFT JOIN type_classification_results ty ON si.id = ty.indicator_id
LEFT JOIN boolean_review_results b ON si.id = b.indicator_id
LEFT JOIN final_review_results fr ON si.id = fr.indicator_id
WHERE n.indicator_id IS NOT NULL
GROUP BY stage
ORDER BY stage;
```

## View Results

```sql
-- Recent classifications
SELECT
  c.indicator_id,
  si.name,
  c.family,
  c.indicator_type,
  c.temporal_aggregation
FROM classifications c
JOIN source_indicators si ON c.indicator_id = si.id
ORDER BY c.classified_at DESC
LIMIT 20;

-- Export to CSV
\copy (
  SELECT * FROM classifications c
  JOIN source_indicators si ON c.indicator_id = si.id
) TO '/tmp/classifications.csv' CSV HEADER;
```

## Troubleshooting

### Port Already in Use
```bash
lsof -ti:8080 | xargs kill -9
lsof -ti:9070 | xargs kill -9
lsof -ti:9080 | xargs kill -9
```

### Service Registration Failed
```bash
# Check Restate is running
curl http://localhost:9070/health

# Check service is running
curl http://localhost:9080

# Re-register
curl -X POST http://localhost:9070/deployments \
  -H 'content-type: application/json' \
  -d '{"uri": "http://localhost:9080"}'
```

### No Indicators Found
```bash
# Check source_indicators table
psql -U classify -h localhost -d classify -c "SELECT COUNT(*) FROM source_indicators;"
```

## Quick Reference

**Ports:**
- 5432: TimescaleDB
- 8080: Restate Ingress
- 9070: Restate Admin UI
- 9080: Service

**Commands:**
```bash
bun run dev                                  # Start service
bun run db:init                              # Initialize DB
bun run classify -- --200 --random --openai  # Classify
npx restate-server                           # Start Restate
```

## Next Steps

- **Scale up**: `bun run classify -- --500 --random --openai`
- **Monitor**: http://localhost:9070
- **Learn more**: [PARALLEL_EXECUTION.md](PARALLEL_EXECUTION.md)
