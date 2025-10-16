# Classify - Indicator Classification System

A durable workflow system for classifying economic indicators using LLMs and Restate for orchestration.

## Quick Start

```bash
# 1. Start infrastructure
docker-compose -f docker-compose.dev.yml up -d
bun run db:init

# 2. Terminal 1: Start Restate server
npx restate-server

# 3. Terminal 2: Start service
bun run dev

# 4. Terminal 3: Register & test
curl -X POST http://localhost:9070/deployments \
  -H 'content-type: application/json' \
  -d '{"uri": "http://localhost:9080"}'

# 5. Classify 200 random indicators
bun run classify -- --200 --random --openai
```

**See [docs/QUICKSTART.md](docs/QUICKSTART.md) for detailed setup.**

## What This Does

**Input:** Raw economic indicators from `source_indicators` table
**Process:** 6-stage LLM pipeline (normalization → classification → review)
**Output:** Fully classified indicators in `classifications` table
**Parallelism:** 200 workflows run simultaneously, ~60-120s total time

### Single Node vs Cluster

| Setup | Throughput | Time for 10,903 indicators |
|-------|-----------|---------------------------|
| **Single Node** | 300 RPM | ~36 minutes |
| **3-Node Cluster** | 900 RPM | ~12 minutes (3x faster!) |

**TL;DR:** Use `bun run all-in-one:fast --force` for instant 3x speedup with cluster.

## System Architecture

```mermaid
graph TB
    subgraph "Input"
        DB[(source_indicators<br/>PostgreSQL table)]
    end

    subgraph "Classification System"
        API[classify-api<br/>HTTP Endpoint]
        WF[Restate Workflows<br/>200+ parallel]

        subgraph "6 LLM Services"
            S1[1. normalization]
            S2[2. time-inference]
            S3[3. family-assignment]
            S4[4. type-classification]
            S5[5. boolean-review]
            S6[6. final-review]
        end
    end

    subgraph "Output"
        RESULTS[(classifications<br/>+ 6 result tables)]
    end

    DB -->|bun run classify| API
    API -->|workflowSendClient| WF
    WF -->|Stage 1| S1
    S1 -->|Stage 2| S2
    S2 -->|Stage 3| S3
    S3 -->|Stage 4| S4
    S4 -->|Stage 5| S5
    S5 -->|Stage 6| S6
    S6 -->|Store| RESULTS

    style API fill:#fff4e1
    style WF fill:#e1f5ff
    style RESULTS fill:#e8f5e9
```

## Classification Pipeline

Each indicator goes through 6 sequential stages:

| Stage | Purpose | Input | Output |
|-------|---------|-------|--------|
| 1. **Normalization** | Parse units & currency | Raw units ("USD Mn") | Scale, currency, unit type |
| 2. **Time Inference** | Temporal properties | Sample values | Stock/flow, cumulative |
| 3. **Family Assignment** | Economic category | Name, description | Price/Activity/Rate |
| 4. **Type Classification** | Specific type | Family + properties | CPI/GDP/Interest Rate |
| 5. **Boolean Review** | Extract flags | All previous | Seasonally adjusted, etc. |
| 6. **Final Review** | Aggregation rules | Complete data | Sum/average/last value |

**Key Feature:** Stages 3 & 4 use different prompts for currency vs non-currency indicators.

## Parallel Execution

Restate provides automatic parallelism:

```
1 API call (200 indicators)
    ↓
Split into 2 batches of 100 (max per request)
    ↓
200 parallel workflow instances
    ↓
Each workflow: 6 sequential stages
    ↓
Complete in 60-120 seconds
```

**See [docs/PARALLEL_EXECUTION.md](docs/PARALLEL_EXECUTION.md) for details.**

## Project Structure

```
apps/classify/restate/
├── src/
│   ├── index.ts                          # Service entrypoint
│   ├── workflows/
│   │   ├── classification.workflow.ts    # Main orchestrator
│   │   └── service-types.ts              # TypeScript interfaces
│   ├── services/                         # 6 LLM services
│   ├── prompts/                          # LLM prompts (currency-aware)
│   ├── api/
│   │   └── classify.api.ts               # HTTP endpoints
│   ├── llm/
│   │   └── client.ts                     # Multi-provider (OpenAI/Anthropic/LM Studio)
│   ├── db/
│   │   ├── client.ts                     # Database client
│   │   ├── init.ts                       # Schema initialization
│   │   └── schema.sql                    # Complete schema
│   └── scripts/
│       └── classify-indicators.ts        # Trigger classification
├── docs/                                 # Documentation
│   ├── QUICKSTART.md                     # Setup guide
│   ├── PARALLEL_EXECUTION.md             # How parallelism works
│   ├── API.md                            # API reference
│   └── ARCHITECTURE.md                   # Detailed architecture
├── docker-compose.dev.yml                # Local dev (TimescaleDB)
├── docker-compose.cluster.yml            # Production (3-node cluster)
├── package.json                          # Scripts & dependencies
└── README.md                             # This file
```

## Usage

### Classify Indicators

```bash
# 200 random indicators with OpenAI
bun run classify -- --200 --random --openai

# 50 quick test
bun run classify -- --50 --random --openai

# All unclassified
bun run classify -- --random --openai

# With Anthropic
bun run classify -- --200 --random --anthropic
```

### Monitor Progress

**Restate UI:**
```bash
open http://localhost:9070
```

**Database:**
```sql
-- Progress percentage
SELECT
  COUNT(*) as total,
  COUNT(c.indicator_id) as completed,
  ROUND(100.0 * COUNT(c.indicator_id) / COUNT(*), 2) as pct
FROM source_indicators si
LEFT JOIN classifications c ON si.id = c.indicator_id;

-- By current stage
SELECT
  CASE
    WHEN n.indicator_id IS NULL THEN 'normalizing'
    WHEN t.indicator_id IS NULL THEN 'time-inferring'
    WHEN f.indicator_id IS NULL THEN 'family-assigning'
    WHEN ty.indicator_id IS NULL THEN 'type-classifying'
    WHEN b.indicator_id IS NULL THEN 'reviewing'
    WHEN fr.indicator_id IS NULL THEN 'final-reviewing'
    ELSE 'completed'
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
GROUP BY stage;
```

## API Reference

### POST /classify-api/batch

Classify up to 100 indicators.

**Request:**
```json
{
  "indicators": [
    {
      "indicator_id": "GDP_USA",
      "name": "Gross Domestic Product",
      "units": "USD Million",
      "periodicity": "Quarterly",
      "sample_values": [{"date": "2023-Q1", "value": 25000000}]
    }
  ],
  "llm_provider": "openai"
}
```

**Response:**
```json
{
  "message": "Classification started",
  "count": 1,
  "trace_id": "550e8400-..."
}
```

### GET /classify-api/getStatus

Check workflow status.

**Request:**
```json
{"indicatorId": "GDP_USA"}
```

**Response:**
```json
{
  "indicator_id": "GDP_USA",
  "status": "completed",
  "started_at": "2025-10-16T10:00:00Z"
}
```

## Configuration

Create `.env`:

```bash
# Database
DATABASE_URL=postgres://classify:classify@localhost:5432/classify

# LLM Providers (choose one or more)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-mini

ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

LM_STUDIO_URL=http://127.0.0.1:1234/v1
LM_STUDIO_MODEL=mistral-7b-instruct

# Service
PORT=9080
HOST=0.0.0.0
```

## Key Features

- **Durable Workflows**: Survive crashes, restarts, and failures
- **Automatic Parallelism**: 200+ workflows execute simultaneously
- **Multi-LLM Support**: OpenAI, Anthropic, or local LM Studio
- **Currency-Aware**: Specialized prompts for currency vs non-currency indicators
- **Observable**: Restate Admin UI shows real-time workflow state
- **Type-Safe**: Full TypeScript with Zod schemas

## Performance

| Metric | Value |
|--------|-------|
| **Throughput** | 1000s indicators/minute |
| **Latency per indicator** | 12-30 seconds (6 LLM calls) |
| **API response time** | <10ms (fire-and-forget) |
| **Parallel workflows** | Unlimited (cluster scales horizontally) |
| **Bottleneck** | LLM API latency |

## Why Restate?

Traditional workflow engines require manual state management, retry logic, and distributed tracing. Restate provides:

✅ **Automatic durability** - State persisted transparently
✅ **Exactly-once semantics** - No duplicate LLM calls
✅ **Built-in observability** - Full execution trace
✅ **Simple code** - Write async/await, get durability

## Documentation

- **[docs/QUICKSTART.md](docs/QUICKSTART.md)** - Single node setup (7 steps)
- **[docs/CLUSTER.md](docs/CLUSTER.md)** - 3-node cluster for 3x throughput 🚀
- **[docs/PARALLEL_EXECUTION.md](docs/PARALLEL_EXECUTION.md)** - How parallelism works
- **[docs/API.md](docs/API.md)** - Complete API reference
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture deep dive

## Troubleshooting

**Service won't start:**
```bash
lsof -ti:9080 | xargs kill -9  # Kill conflicting process
bun run dev
```

**Classification fails:**
```bash
echo $OPENAI_API_KEY  # Check API key is set
curl http://localhost:9080  # Check service is running
```

**Workflows stuck:**
```sql
-- Find stuck workflows
SELECT si.id, si.name
FROM source_indicators si
LEFT JOIN normalization_results n ON si.id = n.indicator_id
WHERE n.indicator_id IS NULL
LIMIT 10;
```

See [docs/QUICKSTART.md](docs/QUICKSTART.md#troubleshooting) for more.

## Development

```bash
# Run locally
bun run dev

# Initialize database
bun run db:init

# Classify indicators
bun run classify -- --200 --random --openai

# Format code
bun run format
```

## Production Deployment: 3-Node Cluster

For **3x throughput** and high availability, use the Restate cluster:

### Quick Start - Cluster

```bash
# All-in-one: Start cluster + classify all indicators
bun run all-in-one:fast --force

# Or step-by-step:
bun run cluster:start      # Start 3-node cluster
bun run dev                # Start classification service
bun run cluster:classify   # Distribute work across nodes
```

### How Clustering Works

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Restate    │   │  Restate    │   │  Restate    │
│  Node 1     │   │  Node 2     │   │  Node 3     │
│  :8080      │   │  :28080     │   │  :38080     │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       │   Shared cluster state (MinIO)    │
       │   Load balanced round-robin        │
       │                 │                 │
       └─────────┬───────┴─────────┬───────┘
                 │                 │
                 ▼                 ▼
         ┌───────────────────────────┐
         │  Classification Service   │
         │  (Single Instance)        │
         │  :9080                    │
         └────────────┬──────────────┘
                      │
                      ▼
         ┌───────────────────────────┐
         │   TimescaleDB (Local)     │
         │   localhost:5432          │
         └───────────────────────────┘
```

**Key Points:**
- **Shared State**: All 3 nodes share cluster state via MinIO (S3-compatible storage)
- **Load Distribution**: Batches distributed round-robin (Node 1 → 2 → 3 → 1...)
- **Single Service**: ONE classification service instance that all nodes call
- **Same Database**: All nodes write to the SAME local TimescaleDB at `localhost:5432`
- **3x Throughput**: 900 RPM total (300 RPM per node) vs 300 RPM single node

### Cluster Management

```bash
# Start cluster
bun run cluster:start

# Check status
docker-compose -f docker-compose.cluster.yml exec restate-1 restatectl status

# View logs
docker-compose -f docker-compose.cluster.yml logs -f

# Stop cluster (preserve data)
bun run cluster:stop

# Clean everything (remove all data)
bun run cluster:clean
```

### Access Points

**Restate Admin UIs** (all show same cluster state):
- Node 1: http://localhost:9070
- Node 2: http://localhost:29070
- Node 3: http://localhost:39070

**Restate Ingress** (all accept requests):
- Node 1: http://localhost:8080
- Node 2: http://localhost:28080
- Node 3: http://localhost:38080

**MinIO S3 Console**: http://localhost:9000 (minioadmin/minioadmin)

### Performance Comparison

| Setup | RPM | Time for 10,903 indicators |
|-------|-----|---------------------------|
| **Single Node** | 300 | ~36 minutes |
| **3-Node Cluster** | 900 | ~12 minutes |

### Scripts

| Script | Description |
|--------|-------------|
| `bun run all-in-one:fast --force` | Start cluster + service + classify all |
| `bun run cluster:start` | Start 3-node cluster |
| `bun run cluster:stop` | Stop cluster (preserve data) |
| `bun run cluster:clean` | Stop + remove all data |
| `bun run cluster:classify` | Distribute work across cluster |

See [docs/CLUSTER.md](docs/CLUSTER.md) for detailed cluster documentation.

## License

MIT
