# Cluster Scaling Guide

Complete guide to scaling the classification system from 5+5 to 5+10 and beyond.

## Table of Contents
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Performance Targets](#performance-targets)
- [Cost Analysis](#cost-analysis)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Using `--ipm` (Indicators Per Minute) - Recommended

The intuitive way to configure throughput:

```bash
# 800 indicators/min (balanced performance)
bun run all-in-one:10 -- --ipm=800 --force

# 1200 indicators/min (aggressive)
bun run all-in-one:10 -- --ipm=1200 --force

# 1500 indicators/min (maximum)
bun run all-in-one:10 -- --ipm=1500 --force
```

### Using `--rpm` (Requests Per Minute) - Legacy

If you prefer to specify API rate directly:

```bash
# 5600 RPM = 800 indicators/min (5600 ÷ 7 stages)
bun run all-in-one:10 -- --rpm=5600 --force
```

**Note:** Each indicator requires 7 LLM requests (stages), so `--ipm=800` automatically calculates `--rpm=5600`.

## Configuration

### Cluster Sizes

Generate different cluster configurations:

```bash
# 5 nodes + 10 services (recommended)
bun run generate:cluster:10    # --nodes=5 --services=10

# 5 nodes + 20 services (2x service capacity)
bun run generate:cluster:20    # --nodes=5 --services=20

# 10 nodes + 20 services (mega cluster)
bun run generate:cluster:mega  # --nodes=5 --services=20
```

### Environment Configuration

**For Docker services** (`.env.docker`):
```bash
POSTGRES_HOST=timescaledb
DATABASE_URL=postgres://classify:classify@timescaledb:5432/classify
```

**For local scripts** (`.env`):
```bash
POSTGRES_HOST=localhost
DATABASE_URL=postgres://classify:classify@localhost:5432/classify
OPENAI_MODEL=gpt-5-mini
OPENAI_API_KEY=sk-...
```

### Port Mappings

The cluster uses 10,000 port offsets:

| Node | Ingress | Admin |
|------|---------|-------|
| Node 1 | 8080 | 9070 |
| Node 2 | 18080 | 19070 |
| Node 3 | 28080 | 29070 |
| Node 4 | 38080 | 39070 |
| Node 5 | 48080 | 49070 |

## Performance Targets

### Throughput Benchmarks (5 Nodes + 10 Services)

| IPM Target | RPM | Batch Delay | Use Case |
|-----------|-----|-------------|----------|
| 428 | 3,000 | 700ms | Conservative (proven stable) |
| 600 | 4,200 | 500ms | Balanced (good performance) |
| 800 | 5,600 | 375ms | **Recommended** (99% efficiency) |
| 1,200 | 8,400 | 250ms | Aggressive (untested) |
| 1,500 | 10,500 | 200ms | Maximum (needs validation) |

### Measured Performance @ 800 ipm

Based on actual production run with 10,903 indicators:

```
✅ Target: 800 indicators/min
✅ Actual: 791.6 indicators/min (99% efficiency!)
✅ API Load: ~5,541 RPM
✅ Success Rate: 100% (0 failures)
✅ Time: ~14 minutes for full dataset
```

### Resource Usage @ 800 ipm

**Restate Nodes:**
- CPU: 22-43% per node
- RAM: 650MB - 1.1GB per node
- Status: ✅ Plenty of headroom

**Classification Services (10 total):**
- CPU: 13-20% per service
- RAM: ~95-101 MB per service
- Status: ✅ Very lightweight

**TimescaleDB:**
- CPU: 8.6%
- RAM: 644 MB
- Connections: 112/2000 (5.6% utilization)
- Status: ✅ Excellent - no stress

**Traefik Load Balancer:**
- CPU: 19.8%
- RAM: 163 MB
- Status: ✅ Healthy

## Cost Analysis

### GPT-5-mini Pricing (2025)

Official OpenAI pricing:
- **Input tokens:** $0.25 per 1M tokens
- **Output tokens:** $2.00 per 1M tokens
- **Cached tokens:** $0.03 per 1M tokens (if using prompt caching)

### Actual Cost Breakdown

Based on production run of 10,903 indicators costing $35:

**Token Usage:**
- Input tokens: ~112M tokens (~10,275 per indicator)
- Output tokens: ~3.5M tokens (~321 per indicator)
- Per stage: ~2,055 input + ~64 output tokens

**Cost Per Indicator:**
- $35 ÷ 10,903 = **$0.0032 per indicator**
- Or **$3.21 per 1,000 indicators**

### Cost Projections

| Indicators | Cost @ gpt-5-mini | Time @ 800 ipm |
|-----------|-------------------|----------------|
| 1,000 | $3.21 | 1.25 minutes |
| 10,000 | $32.10 | 12.5 minutes |
| 10,903 | **$35.00** | 13.6 minutes |
| 50,000 | $160.50 | 62.5 minutes |
| 100,000 | **$321.00** | 125 minutes |

### LLM Stages (5 of 7 use LLMs)

1. **Normalization** - Rule-based (NO LLM COST) ✅
2. **Time Inference** - Uses LLM 💰
3. **Cumulative Detection** - Uses LLM 💰
4. **Family Assignment** - Uses LLM 💰
5. **Type Classification** - Uses LLM 💰
6. **Orientation** - Uses LLM (if implemented) 💰
7. **Save** - Database write (NO LLM COST) ✅

## Troubleshooting

### Zero Duplicates Guarantee

The system ensures each indicator is processed exactly once:

```sql
-- Verify no duplicates
SELECT
  COUNT(*) as total,
  COUNT(DISTINCT indicator_id) as unique,
  COUNT(*) - COUNT(DISTINCT indicator_id) as duplicates
FROM classifications;

-- Expected: duplicates = 0
```

### Check System Health

```bash
# Container resources
docker stats --no-stream

# Database connections
docker exec restate-timescaledb-1 psql -U classify -d classify -c \
  "SELECT state, count(*) FROM pg_stat_activity WHERE datname = 'classify' GROUP BY state;"

# Latest classifications
docker exec restate-timescaledb-1 psql -U classify -d classify -c \
  "SELECT COUNT(*), MAX(created_at), NOW() - MAX(created_at) as idle FROM classifications;"

# Service logs (check for errors)
docker logs restate-classify-service-1-1 2>&1 | grep -iE "error|exception" | tail -10
```

### Common Issues

**Issue: Node 5 failing with "Unable to connect"**
- **Cause:** Wrong port in CLUSTER_NODES array (58080 instead of 48080)
- **Fix:** Ports use 10,000 increments: 8080, 18080, 28080, 38080, **48080**

**Issue: Database writes failing "Connection closed"**
- **Cause:** Services trying to connect to `localhost` instead of `timescaledb`
- **Fix:** Use `.env.docker` for containers with `POSTGRES_HOST=timescaledb`

**Issue: Service count showing 5 instead of 10**
- **Cause:** `detectServiceCount()` function not querying Traefik correctly
- **Fix:** Updated to query `classify@docker` service and count load balancer servers

**Issue: Wrong throughput calculations**
- **Cause:** Using 3 stages instead of 7 in calculations
- **Fix:** Set `estimatedRequestsPerIndicator = 7`

### Performance Tuning

**If you see high failure rates:**
- Reduce throughput: `--ipm=600` or `--ipm=400`
- Check OpenAI rate limits
- Monitor database connection pool

**If services are idle:**
- Increase throughput: `--ipm=1200` or `--ipm=1500`
- Monitor CPU usage on nodes
- Check for bottlenecks

**If you hit OpenAI rate limits:**
- Most tiers: 30,000 RPM limit
- At 10,500 RPM (1500 ipm) you're still under 35% capacity
- Consider upgrading OpenAI tier if needed

## Architecture

### Request Flow

```
Script (Local Mac)
    ↓ --ipm=800 (calculates 5600 RPM)
    ↓ Round-robin across 5 Restate nodes
    ↓
┌────────┬────────┬────────┬────────┬────────┐
│ Node 1 │ Node 2 │ Node 3 │ Node 4 │ Node 5 │
│  8080  │ 18080  │ 28080  │ 38080  │ 48080  │
└────┬───┴────┬───┴────┬───┴────┬───┴────┬───┘
     │        │        │        │        │
     └────────┴────────┴────────┴────────┘
                      ↓
              Traefik Load Balancer
              (HTTP/2, round-robin)
                      ↓
     ┌────────────────┴────────────────┐
     │  10 Classification Services     │
     │  (classify-service-1..10)       │
     └────────────────┬────────────────┘
                      ↓
              TimescaleDB
           (localhost:5432)
```

### Key Components

**5 Restate Nodes:**
- Orchestration layer
- Shared cluster state via MinIO
- Each node accepts requests independently
- Load balanced by script (round-robin)

**10 Classification Services:**
- Behind Traefik load balancer
- Traefik distributes to services (round-robin)
- Each service handles workflows independently
- All write to same database

**TimescaleDB:**
- max_connections=2000 (2000 pool size)
- Handles ~112 concurrent connections @ 800 ipm
- Plenty of headroom (5.6% utilization)

## Scripts Reference

```bash
# All-in-one (recommended)
bun run all-in-one:10 -- --ipm=800 --force

# Step-by-step
bun run generate:cluster:10     # Generate config
bun run cluster:start           # Start containers
# Wait for startup...
bun run classify-cluster -- --ipm=800 --openai --force

# Management
bun run cluster:stop            # Stop (preserve data)
bun run cluster:clean           # Stop + remove volumes
docker-compose -f docker-compose.cluster.yml logs -f  # View logs
```

## Database Schema

The system writes to multiple tables:

```sql
-- Main output
classifications (10,903 rows)

-- Stage results
normalization_results (10,903 rows)
time_inference_results (10,903 rows)
cumulative_detection_results (10,903 rows)
family_assignment_results (10,903 rows)
type_classification_results (10,903 rows)
```

All tables should have equal row counts when processing completes.

## Next Steps

1. **Test current config**: Run @ 800 ipm and validate 99% efficiency
2. **Push higher**: Try 1200 ipm and monitor failure rate
3. **Scale services**: If CPU/RAM allows, try 20 services
4. **Scale nodes**: For massive datasets, try 10-node cluster

**Recommendation:** Start at 800 ipm for production workloads. It's proven stable with 99% efficiency and zero failures.
