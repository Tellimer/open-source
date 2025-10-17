# Cluster Scaling Results - 5+10 Configuration

## Configuration

- **Restate Nodes:** 5 orchestration nodes
- **Classification Services:** 10 processing services behind Traefik
- **Target RPM:** 3000 requests/minute
- **Database:** TimescaleDB with max_connections=2000
- **Load Balancer:** Traefik with HTTP/2 round-robin

## Performance Metrics (Batch 100/2181)

| Metric | Actual | Target | Accuracy |
|--------|--------|--------|----------|
| **Throughput** | 422.3 indicators/min | 428.6 indicators/min | 98.5% |
| **API Load** | ~2955 RPM | 3000 RPM | 98.5% |
| **Failed Batches** | 0/100 | 0 | 100% ✅ |
| **Node Distribution** | Perfect round-robin | Even distribution | 100% ✅ |

## Critical Fixes Applied

### 1. Database Connections (2000)
**Problem:** Parallel workflows across 10 services need adequate connection pool.

**Calculation:**
- 10 services × 20 parallel workflows × 2 connections = 400 peak
- 20 services would need 800 peak
- 2000 provides 2.5x headroom for scaling

**Files Changed:**
- [scripts/generate-compose.ts:165](../scripts/generate-compose.ts#L165)

### 2. Requests Per Indicator (7 stages)
**Problem:** Script calculated delays based on 3 requests instead of 7 stages.

**Impact:**
- Before: 3000 RPM ÷ 3 = 1000 indicators/min target → only achieved 240/min
- After: 3000 RPM ÷ 7 = 428 indicators/min target → achieving 422/min ✅

**Files Changed:**
- [src/scripts/classify-cluster.ts:176](../src/scripts/classify-cluster.ts#L176)

### 3. Node Port Offsets (10000 increments)
**Problem:** CLUSTER_NODES array had wrong port mappings, causing Node 5 to always fail.

**Before (WRONG):**
```typescript
Node 1: 8080   ✅
Node 2: 28080  ❌ (should be 18080)
Node 3: 38080  ❌ (should be 28080)
Node 4: 48080  ✅ (accidentally correct)
Node 5: 58080  ❌ (should be 48080)
```

**After (CORRECT):**
```typescript
Node 1: 8080
Node 2: 18080
Node 3: 28080
Node 4: 38080
Node 5: 48080
```

**Files Changed:**
- [src/scripts/classify-cluster.ts:38-44](../src/scripts/classify-cluster.ts#L38-L44)

### 4. YAML Anchor Compatibility
**Problem:** Docker-compose doesn't support YAML anchor syntax (`<<: *defaults`).

**Solution:** Use JavaScript spread operator (`...commonEnv`) instead.

**Files Changed:**
- [scripts/generate-compose.ts:21-74](../scripts/generate-compose.ts#L21-L74)

## Architecture Flow

```
Script (round-robin)
  ↓
Restate Nodes (5 nodes)
  → Node 1: localhost:8080
  → Node 2: localhost:18080
  → Node 3: localhost:28080
  → Node 4: localhost:38080
  → Node 5: localhost:48080
  ↓
All nodes call: http://traefik:9080 (registered deployment)
  ↓
Traefik Load Balancer (HTTP/2 round-robin)
  ↓
Classification Services (10 services)
  → classify-service-1
  → classify-service-2
  → ... (8 more)
  ↓
TimescaleDB (shared database)
  → max_connections=2000
  → localhost:5432
```

## Quick Start Commands

```bash
# Generate and start 5+10 cluster
bun run all-in-one:10 -- --rpm=3000 --force

# Generate and start 5+20 cluster
bun run all-in-one:20 -- --rpm=5000 --force

# Generate and start 10+20 mega cluster
bun run all-in-one:mega -- --rpm=5000 --force
```

## Capacity Planning

With **OpenAI Tier 5 (30,000 RPM)**:

| Configuration | Services | Target RPM | Expected Throughput | Time for 10,903 |
|---------------|----------|------------|---------------------|-----------------|
| 5+5 | 5 | 1000 | ~140/min | ~78 minutes |
| 5+10 | 10 | 3000 | ~420/min | ~26 minutes |
| 5+20 | 20 | 5000 | ~700/min | ~15 minutes |
| 10+20 | 20 | 5000 | ~700/min | ~15 minutes |

**Note:** Each indicator requires 7 sequential LLM calls (normalize, time, cumulative, family, type, orientation, save).

## Success Metrics

✅ **Perfect Node Distribution:** All 5 nodes receiving work evenly
✅ **Zero Failures:** 0 failed batches out of 100
✅ **98.5% Target Accuracy:** 422.3 vs 428.6 indicators/min
✅ **Stable API Load:** 2955 RPM sustained (98.5% of target)
✅ **All Services Active:** 10 services processing behind Traefik

## Next Steps (Optional)

1. **Test Higher RPM:** Try 5000-10000 RPM to utilize more of 30k capacity
2. **Scale to 5+20:** Double services for ~700 indicators/min
3. **Mega Cluster:** Test 10+20 configuration for maximum throughput
4. **Fine-tune Delays:** Adjust batch delays to achieve closer to 100% target

## See Also

- [CLUSTER.md](CLUSTER.md) - Cluster architecture and management
- [classify-cluster.ts](../src/scripts/classify-cluster.ts) - Classification script
- [generate-compose.ts](../scripts/generate-compose.ts) - Dynamic cluster generator
