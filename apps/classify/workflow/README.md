# Classify Workflow

A Motia-based parallelized classification workflow for economic indicators. Each indicator runs through its own workflow pipeline, with up to 25 workflows executing concurrently.

## Features

- **Per-indicator workflows**: One workflow per indicator for independent processing
- **Parallel execution**: Process up to 25 indicators concurrently
- **Multi-stage LLM pipeline**: 8 stages of classification with review
- **Swappable LLM providers**: Defaults to local LM Studio (free!), supports OpenAI or Anthropic per stage
- **Token-efficient prompts**: Optimized for minimal token usage
- **SQLite persistence**: All results saved to SQLite database with WAL mode for concurrent writes
- **State-based coordination**: Motia state management for workflow coordination

## Architecture

### Classification Pipeline

```
1. Normalization       → Parse units/scale/currency (regex)
2. Time Inference      → Infer reporting frequency & time basis (LLM)
2.5 Cumulative Detect  → Detect YTD/running-total patterns (rule-based)
2.9 Merge Time/Cum     → Synchronize time + cumulative (router input)
3. Currency Router     → Branch to currency/non-currency paths
4/5. Family Assignment → Assign to 7 indicator families (LLM)
6. Type Classification → Classify specific indicator type (LLM)
7. Boolean Review      → Review for correctness (LLM)
8. Final Review        → Apply corrections if needed (LLM)
9. Complete            → Finalize and save results
```

### Indicator Families

1. **physical-fundamental**: stocks/flows/balances/capacity
2. **numeric-measurement**: counts/percentages/ratios
3. **price-value**: prices/yields/returns
4. **change-movement**: rates/volatility/gaps
5. **composite-derived**: indices/correlations/elasticities
6. **temporal**: durations/probabilities/thresholds
7. **qualitative**: sentiment/allocations

## Documentation

📚 **[Complete Documentation →](./docs/README.md)**

Key docs:

- [Usage Guide](./docs/USAGE_GUIDE.md) - Detailed usage instructions
- [LM Studio Setup](./docs/LM_STUDIO_SETUP.md) - Local LLM configuration
- [Database Persistence](./docs/DATABASE_PERSISTENCE.md) - Schema and persistence
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues

## Getting Started

### Prerequisites

- Deno 1.40+
- PostgreSQL (source data)
- **LM Studio** with Mistral model running (or OpenAI API key)
- Environment variables (see setup below)

### Installation

```bash
cd apps/motia/classify-workflow
deno task install
```

### Environment Setup

Create `.env` file:

```bash
# LLM API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

# SQLite Databases
CLASSIFY_DB_LOCAL_DEV=./data/classify-workflow-local-dev.db
CLASSIFY_DB_LOCAL_PROD=./data/classify-workflow-local-prod.db

# PostgreSQL (source)
DATABASE_URL=postgresql://user:pass@host/db

# Optional: Per-stage LLM provider override
LLM_PROVIDER_TIME_INFERENCE=openai
LLM_PROVIDER_BOOLEAN_REVIEW=anthropic
```

### Seed Database

Populate local SQLite from PostgreSQL:

```bash
deno task seed-db
```

This fetches 100+ indicators across all countries and stores them locally for classification.

### Run Development Server

```bash
deno task dev
```

The server starts on `http://localhost:3000` (or configured port).

## Usage

### Run Classification Pipeline (Recommended)

Run the classification pipeline on sampled indicators from your seeded database:

```bash
# Classify 100 diverse indicators (default local LLM)
deno task run:dev --100

# Use OpenAI or Anthropic
deno task run:dev -50 --provider openai
deno task run:dev -25 --provider anthropic
```

**What it does:**

- Samples diverse indicators across all indicator types
- Ensures variety across countries and indicator names
- Sends indicators in batches of 25 (max concurrent workflows)
- Provides progress tracking and trace IDs

**Output example:**

```
🔬 Classification Pipeline Runner

📂 Database: ./data/classify-workflow-local-dev.db
   Total indicators in DB: 11,224

🎲 Sampling 100 diverse indicators...
   Found 109 unique indicator types
   Sampling ~1 indicator(s) per type for variety
✅ Sampled 100 indicators

📊 Sample distribution (top 10):
   1× GDP
   1× Inflation Rate
   1× Unemployment Rate
   ...

🚀 Starting classification...
   API: http://localhost:3000
   Total indicators: 100
   Batches: 4 (max 25 per batch)

📦 Batch 1/4 (25 indicators)...
   ✅ Batch 1 submitted
   📊 Trace ID: abc-123
   Progress: 25/100
...
```

### Classify Individual Indicators

Send POST request to `/classify/batch`:

```bash
curl -X POST http://localhost:3000/classify/batch \
  -H "Content-Type: application/json" \
  -d '{
    "indicators": [
      {
        "indicator_id": "123",
        "name": "GDP Annual Growth Rate",
        "units": "Percent",
        "periodicity": "Annual",
        "sample_values": [
          { "date": "2023-12-31", "value": 2.5 },
          { "date": "2022-12-31", "value": 3.1 }
        ]
      }
    ]
  }'
```

### Query Classification Results

After running classifications, query the results from the SQLite database:

```bash
# View all results (default: 25 limit)
deno task query

# Query with custom limit
deno task query -- --limit 10

# Filter by family
deno task query -- --family physical-fundamental

# Filter by indicator type
deno task query -- --type balance-of-payments

# Filter by review status
deno task query -- --status passed

# Combine filters
deno task query -- --family price-value --status passed --limit 5
```

**Output includes:**

- Overall statistics (total count, family distribution, type distribution)
- Detailed results for each indicator
- Confidence scores for all stages
- LLM reasoning text
- Processing metadata

See `docs/DATABASE_PERSISTENCE.md` for schema details and `docs/CUMULATIVE_DETECTION.md` for the cumulative stage.

### Run Simple Example

Test with 3 hardcoded indicators:

```bash
deno task example
```

### Check Results

Results are persisted in two places:

1. **SQLite Database** (primary storage) - Use `deno task query` to view results
2. **Motia State** (workflow coordination) - Accessible in Motia steps

```typescript
// Query from SQLite (recommended)
import { getDatabase } from "./src/db/client.ts";
import { getClassification } from "./src/db/persist.ts";

const db = getDatabase();
const result = getClassification(db, indicator_id);

// Or access in Motia steps (ephemeral)
const classification = await state.get("final-classifications", indicator_id);
```

## Project Structure

```
apps/motia/classify-workflow/
├── deno.json                           # Deno config & tasks
├── README.md                           # This file
├── docs/                               # Documentation
│   ├── README.md                       # Documentation index
│   ├── USAGE_GUIDE.md                  # Detailed usage guide
│   ├── LM_STUDIO_SETUP.md              # LM Studio setup
│   ├── DATABASE_PERSISTENCE.md         # Database schema & persistence
│   ├── SQLITE_WAL_SETUP.md             # WAL mode setup
│   └── TROUBLESHOOTING.md              # Common issues & solutions
├── src/
│   ├── db/                             # Database layer
│   │   ├── index.ts                    # Module exports
│   │   ├── schema.ts                   # SQLite schema with WAL
│   │   ├── client.ts                   # Database connection management
│   │   └── persist.ts                  # Persistence helpers
│   ├── services/
│   │   └── classify/
│   │       ├── index.ts                # Service exports
│   │       ├── types.ts                # Classification types
│   │       ├── normalize.ts            # Unit normalization
│   │       ├── llm-clients.ts          # LLM client abstractions
│   │       └── prompts/                # Prompt templates
│   │           ├── time.ts
│   │           ├── scale.ts
│   │           ├── currency.ts
│   │           ├── family.ts
│   │           ├── type.ts
│   │           ├── boolean-review.ts
│   │           └── final-review.ts
│   ├── utils/
│   │   └── unit-classifier.ts          # Comprehensive unit classifier
│   └── scripts/
│       ├── seed-database.ts            # Database seeding script
│       ├── run-classification.ts       # Classification runner
│       └── query-results.ts            # Query results from SQLite
└── steps/
    └── classify-flow/
        ├── start-classify.step.ts      # API: Trigger workflow
        ├── normalize-indicator.step.ts # Event: Stage 1
        ├── infer-time-basis.step.ts    # Event: Stage 2
        ├── infer-scale.step.ts         # Event: Stage 3
        ├── check-currency.step.ts      # Event: Stage 4
        ├── assign-family.step.ts       # Event: Stage 5
        ├── classify-type.step.ts       # Event: Stage 6
        ├── boolean-review.step.ts      # Event: Stage 7
        ├── final-review.step.ts        # Event: Stage 8
        └── complete-classify.step.ts   # Event: Stage 9
```

## Configuration

### LLM Provider Selection

Default: `local` (LM Studio). Override per-run with `--provider` (see Usage). You can still set env overrides per stage if needed.

### Concurrency

Max concurrent workflows: **25** (default)

Adjust in `start-classify.step.ts`:

```typescript
bodySchema: z.object({
  indicators: z.array(indicatorInputSchema).min(1).max(25), // Change max
}),
```

## Development

### Generate Types

After modifying steps:

```bash
deno task generate-types
```

### Lint & Format

```bash
deno lint
deno fmt
```

### Build

```bash
deno task build
```

## Performance Targets

- **Concurrency**: 25 workflows simultaneously
- **Latency**: <2s per indicator with local LLM (future)
- **Tokens**: <500 total tokens per indicator
- **Cost**: <$0.001 per indicator with OpenAI
- **Accuracy**: >90% pass boolean review on first attempt

## State Groups

Results are stored in the following Motia state groups:

- `workflows` - Workflow tracking
- `normalizations` - Stage 1 results
- `time-inferences` - Stage 2 results
- `scale-inferences` - Stage 3 results
- `currency-checks` - Stage 4 results
- `family-assignments` - Stage 5 results
- `type-classifications` - Stage 6 results
- `boolean-reviews` - Stage 7 results
- `final-reviews` - Stage 8 results
- `final-classifications` - Final output

## Event Topics

- `indicator.normalize` - Trigger normalization
- `indicator.infer-time` - Trigger time inference
- `indicator.infer-scale` - Trigger scale inference
- `indicator.check-currency` - Trigger currency check
- `indicator.assign-family` - Trigger family assignment
- `indicator.classify-type` - Trigger type classification
- `indicator.boolean-review` - Trigger boolean review
- `indicator.final-review` - Trigger final review
- `indicator.complete` - Finalize classification

## Railway Deployment

### Overview

Deploy the workflow service to Railway for production-scale processing with horizontal scaling and PostgreSQL/TimescaleDB persistence.

**Performance:**

- **Local (M3)**: ~30-40 indicators/min
- **Railway (3 replicas)**: ~150 indicators/min (5-6× faster)
- **10,903 indicators**: ~73 minutes on Railway vs ~6 hours locally

### Prerequisites

- Railway account
- Railway CLI (optional): `npm install -g @railway/cli`
- OpenAI API key (Tier 1: 200K TPM)
- LibSQL/Turso database (for source indicators)

### Environment Variables

```bash
# Railway auto-provides
PORT=3000  # Auto-assigned by Railway

# Required
POSTGRES_URL=${{Postgres.DATABASE_URL}}  # Link to Railway Postgres service
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Optional
ANTHROPIC_API_KEY=sk-ant-...
NODE_ENV=production
```

### Deployment Steps

1. **Create Railway Project**
   ```bash
   railway init
   ```

2. **Add Postgres Service**
   - From Railway dashboard: Add Service → Database → PostgreSQL
   - Enable TimescaleDB:
     ```sql
     CREATE EXTENSION IF NOT EXISTS timescaledb;
     SELECT create_hypertable('classifications','created_at', if_not_exists => TRUE);
     ```

3. **Deploy Workflow Service**
   ```bash
   railway up
   ```

4. **Configure Service**
   - Set environment variables in Railway dashboard
   - Configure replicas: 3 (recommended for 150 indicators/min)
   - Health check: `GET /health`
   - Region: us-west (closest to OpenAI)

5. **Initialize Schema**
   ```bash
   railway run deno task init:postgres
   ```

### API Usage

**Health Check:**

```bash
curl https://your-service.up.railway.app/health
# Response: {"status":"ok","timestamp":"...","service":"classify-workflow"}
```

**Classify Batch:**

```bash
curl -X POST https://your-service.up.railway.app/classify/batch \
  -H "Content-Type: application/json" \
  -d '{
    "indicators": [...],
    "llm_provider": "openai"
  }'
```

### Rate Limits & Scaling

**OpenAI GPT-4o-mini Tier 1:**

- TPM: 200,000 tokens/minute
- Per indicator: ~1,000 tokens (2-3 LLM calls)
- Max throughput: ~200 indicators/minute

**Recommended Configuration:**

- 3 replicas × 50 concurrent each = 150 concurrent total
- TPM usage: 75% (150K/200K)
- 25% headroom for variance/retries

**Scaling:**

- 2 replicas: ~100 indicators/min (safe, 50% TPM)
- 3 replicas: ~150 indicators/min (recommended, 75% TPM)
- 4 replicas: ~200 indicators/min (max Tier 1, 100% TPM)

### Monitoring

**Track Performance:**

```sql
-- View batch statistics
SELECT * FROM pipeline_stats ORDER BY batch_start_time DESC LIMIT 10;

-- Check processing status
SELECT stage, status, COUNT(*) FROM processing_log GROUP BY stage, status;

-- Monitor throughput
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour
FROM classifications;
```

**Railway Metrics:**

- Service health via `/health` endpoint
- CPU/Memory usage in Railway dashboard
- Request rate and latency

### Cost Analysis

**API Costs (OpenAI GPT-4o-mini):**

- Per indicator: ~$0.00382
- 10,903 indicators: ~$42
- Same cost regardless of replicas!

**Infrastructure (Railway):**

- Workflow service: ~$10-20/month (3 replicas)
- Postgres: ~$10-20/month
- Total: ~$20-40/month

**Time Savings:**

- Local: ~6 hours per 10.9K run
- Railway: ~1.2 hours per 10.9K run
- Saves: ~4.8 hours per run

### Feeder Service (Optional)

For automated batch processing, deploy the companion feeder service to orchestrate LibSQL → Railway workflow → Postgres pipeline.

See: [../feeder/README.md](../feeder/README.md)

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

See [LICENSE](../../LICENSE) for details.
