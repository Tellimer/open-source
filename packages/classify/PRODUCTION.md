# Production Deployment Guide

This guide covers deploying and running the V2 classification pipeline against your Railway-hosted production database.

## Quick Start

### 1. Set Environment Variables

Create a `.env` file:

```bash
# Railway libSQL Database
RAILWAY_DATABASE_URL=libsql://libsql-production-classify.up.railway.app:443
RAILWAY_DATABASE_TOKEN=your_auth_token

# AI Provider
ANTHROPIC_API_KEY=your_anthropic_key
```

### 2. First-Time Setup

```bash
# Setup schema
deno task prod:setup

# Seed with 668 indicators + time series
deno task prod:seed

# Run classification pipeline
deno task prod:run
```

That's it! Your production database is now populated with classifications for all 668 indicators.

## Commands

| Command | Description | Duration |
|---------|-------------|----------|
| `deno task prod:setup` | Create database schema | ~5s |
| `deno task prod:seed` | Load 668 indicators + time series | ~30s |
| `deno task prod:run` | Run V2 pipeline on all indicators | ~20min |
| `deno task prod:reset` | Clear results (keeps source data) | ~5s |

## Architecture

```
Railway libSQL (Production)
├── Source Tables (Input)
│   ├── source_indicators (668 rows)
│   └── source_country_indicators (~200k rows)
└── Pipeline Tables (Output)
    ├── classifications
    ├── router_results
    ├── specialist_results
    ├── validation_results
    ├── orientation_results
    ├── flagging_results
    └── review_decisions
```

## Pipeline Stages

The V2 pipeline processes indicators through 6 stages:

```
668 Indicators
    ↓
Stage 1: Router (Family Assignment)
    ↓
Stage 2: Specialist (Type Classification)
    ↓
Stage 3: Validation (Time Series Analysis)
    ↓
Stage 4: Orientation (Heat Map Direction)
    ↓
Stage 5: Flagging (Quality Control)
    ↓
Stage 6: Review (LLM Correction)
    ↓
Final Classifications
```

## Cost & Performance

### Expected Metrics (668 indicators)

- **Time**: 20-30 minutes
- **API Calls**: ~150-200
- **Tokens**: ~800k-1M
- **Cost**: $20-30 USD (Anthropic Claude Sonnet 4)
- **Success Rate**: >98%

### Token Breakdown

| Stage | Tokens | Cost |
|-------|--------|------|
| Router | ~50k | $1.50 |
| Specialist | ~600k | $18.00 |
| Validation | 0 (local) | $0 |
| Orientation | ~100k | $3.00 |
| Flagging | 0 (rules) | $0 |
| Review | ~100k | $3.00 |
| **Total** | **~850k** | **~$25.50** |

## Output Example

After running `deno task prod:run`:

```
📊 PRODUCTION PIPELINE SUMMARY
============================================================
⏱️  Total Time: 1200.5s
📈 Success Rate: 98.5%
✅ Successful: 658/668
❌ Failed: 10/668
🚩 Flagged: 15/658

📋 Stage Breakdown:
  Router:      668/668 (45s)
  Specialist:  658/668 (850s)
  Validation:  450 analyzed (120s)
  Orientation: 658/658 (50s)
  Flagging:    15 flagged
  Review:      12/15 reviewed

💰 Cost Analysis:
  Total Tokens:      845,234
  API Calls:         156
  Estimated Cost:    $25.36
```

## Querying Results

### Get All Classifications

```sql
SELECT
  i.name,
  c.indicator_family,
  c.indicator_type,
  c.temporal_aggregation,
  c.is_currency_denominated,
  c.heat_map_orientation
FROM classifications c
JOIN source_indicators i ON c.indicator_id = i.id
ORDER BY i.name;
```

### Get Flagged Indicators

```sql
SELECT
  i.name,
  f.flag_type,
  f.flag_reason,
  f.current_value,
  f.expected_value
FROM flagging_results f
JOIN source_indicators i ON f.indicator_id = i.id;
```

### Get Cumulative Indicators (YTD)

```sql
SELECT
  i.name,
  v.cumulative_confidence,
  v.suggested_temporal,
  v.validation_reasoning
FROM validation_results v
JOIN source_indicators i ON v.indicator_id = i.id
WHERE v.is_cumulative = 1
ORDER BY v.cumulative_confidence DESC;
```

### Get Review Decisions

```sql
SELECT
  i.name,
  r.action,
  r.reasoning,
  r.confidence
FROM review_decisions r
JOIN source_indicators i ON r.indicator_id = i.id
WHERE r.action IN ('fix', 'escalate');
```

## Workflow Patterns

### Update and Re-Run

If you've updated prompts or logic:

```bash
# Clear old results (keeps source data)
deno task prod:reset

# Run pipeline with updated logic
deno task prod:run
```

### Update Source Data

If you have new indicators or updated time series:

```bash
# Re-seed (replaces existing data)
deno task prod:seed

# Run pipeline
deno task prod:run
```

### Incremental Updates

To classify only new indicators (requires custom script):

```sql
-- Get indicators without classifications
SELECT i.* FROM source_indicators i
LEFT JOIN classifications c ON i.id = c.indicator_id
WHERE c.indicator_id IS NULL;
```

## Monitoring

### Check Pipeline Status

```sql
-- Last pipeline execution
SELECT * FROM pipeline_executions
ORDER BY started_at DESC LIMIT 1;

-- Success rate by stage
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN confidence_family > 0.75 THEN 1 ELSE 0 END) as high_confidence
FROM router_results;
```

### Alert on Failures

```sql
-- Indicators that failed all stages
SELECT i.name, i.id
FROM source_indicators i
LEFT JOIN classifications c ON i.id = c.indicator_id
WHERE c.indicator_id IS NULL;
```

## Troubleshooting

### Connection Failures

```bash
# Test connection
deno run --allow-net --allow-env -e "
import { createClient } from '@libsql/client';
const client = createClient({
  url: Deno.env.get('RAILWAY_DATABASE_URL'),
  authToken: Deno.env.get('RAILWAY_DATABASE_TOKEN'),
});
await client.execute('SELECT 1');
console.log('✅ Connected');
"
```

### API Rate Limits

If you hit Anthropic rate limits:
- Reduce `concurrency` in `run_pipeline.ts`
- Add delays between batches
- Use smaller `batchSize`

### Memory Issues

For large datasets:
- Process indicators in chunks
- Reduce batch size
- Increase Railway memory allocation

## Best Practices

1. **Always backup before reset**
   ```bash
   # Export classifications before reset
   deno run --allow-all scripts/export_classifications.ts
   ```

2. **Monitor costs**
   - Check token usage in pipeline summary
   - Set up Anthropic billing alerts
   - Consider cheaper models for non-critical runs

3. **Validate results**
   - Review flagged indicators
   - Check escalated items
   - Spot-check random samples

4. **Schedule regular runs**
   - Daily for new indicators
   - Weekly for full re-classification
   - After prompt updates

## Security

- ✅ Never commit `.env` file
- ✅ Use Railway secret management for tokens
- ✅ Rotate API keys regularly
- ✅ Limit database access by IP
- ✅ Use read-only credentials for queries

## Support

For issues or questions:
1. Check logs in Railway dashboard
2. Review [scripts/production/README.md](scripts/production/README.md)
3. Open GitHub issue with error details
4. Contact: s@seanknowles.dev

## Next Steps

After successful deployment:
1. ✅ Set up monitoring/alerting
2. ✅ Create export scripts for your app
3. ✅ Schedule regular pipeline runs
4. ✅ Document any custom workflows
5. ✅ Train team on querying results
