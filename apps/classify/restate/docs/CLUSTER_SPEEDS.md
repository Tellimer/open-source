# Cluster Speed Guide

Quick reference for running the 3-node cluster at different speeds based on realistic performance (150 indicators/minute per node).

## Ready-to-Go Commands

### All-in-One Scripts (Recommended)

These start the cluster, service, and begin classification automatically:

| Speed | Command | Time | Throughput | When to Use |
|-------|---------|------|------------|-------------|
| **Conservative** | `bun run all-in-one:conservative --force` | ~36 min | 300 ind/min | ✅ First run, very safe |
| **Normal** ⭐ | `bun run all-in-one:normal --force` | ~24 min | 450 ind/min | ✅ **RECOMMENDED** - Optimal balance |
| **Aggressive** | `bun run all-in-one:aggressive --force` | ~16 min | 675 ind/min | ⚠️  May hit rate limits |
| **Ultra** | `bun run all-in-one:ultra --force` | ~12 min | 900 ind/min | ⚠️  High risk of timeouts |

### Classify-Only Scripts

If cluster and service are already running:

| Speed | Command | Time | Throughput |
|-------|---------|------|------------|
| **Conservative** | `bun run classify:cluster:conservative --force` | ~36 min | 300 ind/min |
| **Normal** ⭐ | `bun run classify:cluster:normal --force` | ~24 min | 450 ind/min |
| **Aggressive** | `bun run classify:cluster:aggressive --force` | ~16 min | 675 ind/min |
| **Ultra** | `bun run classify:cluster:ultra --force` | ~12 min | 900 ind/min |

## Speed Breakdown

### Conservative (600 RPM total)
```bash
bun run all-in-one:conservative --force
```

**Configuration:**
- Total RPM: 600
- RPM per node: 200
- Indicators/minute: 300
- Time for 10,903: **~36 minutes**

**When to use:**
- ✅ First time running cluster
- ✅ Cautious approach
- ✅ Previous runs hit rate limits
- ✅ Want guaranteed no issues

**Risk:** None - very safe

---

### Normal (900 RPM total) ⭐ RECOMMENDED
```bash
bun run all-in-one:normal --force
# OR shorthand:
bun run all-in-one --force
```

**Configuration:**
- Total RPM: 900
- RPM per node: 300
- Indicators/minute: 450
- Time for 10,903: **~24 minutes**

**When to use:**
- ✅ **Default choice** - optimal balance
- ✅ Tested and working perfectly
- ✅ Gets full benefit of 3 nodes
- ✅ Safe for most API tiers

**Risk:** Low - thoroughly tested

---

### Aggressive (1350 RPM total)
```bash
bun run all-in-one:aggressive --force
```

**Configuration:**
- Total RPM: 1350
- RPM per node: 450
- Indicators/minute: 675
- Time for 10,903: **~16 minutes**

**When to use:**
- ⚠️  High OpenAI tier (>1500 RPM limit)
- ⚠️  Want faster than normal
- ⚠️  Willing to risk timeouts

**Risk:** Medium - may hit rate limits

---

### Ultra (1800 RPM total)
```bash
bun run all-in-one:ultra --force
```

**Configuration:**
- Total RPM: 1800
- RPM per node: 600
- Indicators/minute: 900
- Time for 10,903: **~12 minutes**

**When to use:**
- ⚠️  Very high OpenAI tier (>2000 RPM limit)
- ⚠️  Maximum speed needed
- ⚠️  Accept high risk of timeouts

**Risk:** High - likely to hit rate limits

---

## Comparison Table

| Speed | RPM Total | RPM/Node | Ind/Min | Time | Risk | Recommendation |
|-------|-----------|----------|---------|------|------|----------------|
| **Conservative** | 600 | 200 | 300 | 36m | None | ✅ Cautious |
| **Normal** ⭐ | 900 | 300 | 450 | 24m | Low | ✅ **BEST** |
| **Aggressive** | 1350 | 450 | 675 | 16m | Medium | ⚠️  Advanced |
| **Ultra** | 1800 | 600 | 900 | 12m | High | ⚠️  Risky |

## Single Node for Comparison

| Speed | Command | Time | Throughput |
|-------|---------|------|------------|
| Single Node | `bun run classify:fast --force` | ~73 min | 150 ind/min |

**3-node cluster at Normal speed is 3x faster than single node!**

## How RPM Maps to Indicators/Minute

```
RPM = Requests Per Minute (to LLM APIs)
Each indicator ≈ 6 LLM calls (sequential stages)

Conservative: 600 RPM ÷ 2 calls/indicator = 300 indicators/minute
Normal:       900 RPM ÷ 2 calls/indicator = 450 indicators/minute
Aggressive:   1350 RPM ÷ 2 calls/indicator = 675 indicators/minute
Ultra:        1800 RPM ÷ 2 calls/indicator = 900 indicators/minute

Note: The ratio is ~2:1 (not 6:1) due to parallel workflow execution
```

## Monitoring Progress

### Check Cluster Status
```bash
docker-compose -f docker-compose.cluster.yml exec restate-1 restatectl status
```

### Watch Logs
```bash
bun run cluster:logs
```

### View Admin UI
Open in browser:
- Node 1: http://localhost:9070
- Node 2: http://localhost:29070
- Node 3: http://localhost:39070

### Database Progress
```bash
psql postgres://classify:classify@localhost:5432/classify -c "
SELECT
  COUNT(*) as total,
  COUNT(c.indicator_id) as completed,
  ROUND(100.0 * COUNT(c.indicator_id) / COUNT(*), 2) as pct_complete
FROM source_indicators si
LEFT JOIN classifications c ON si.id = c.indicator_id;
"
```

## Custom Speed

If you want a custom RPM:

```bash
# All-in-one with custom 750 RPM
bun run all-in-one --rpm 750 --force

# Classify-only with custom 1000 RPM
bun run classify:cluster --rpm 1000 --force
```

## Flags

| Flag | Description |
|------|-------------|
| `--force` | Re-classify all indicators (including already classified) |
| `--rpm <number>` | Custom RPM (overrides preset) |
| `--openai` | Use OpenAI (default) |
| `--anthropic` | Use Anthropic Claude |

## Examples

### First-time full classification (safe)
```bash
bun run all-in-one:conservative --force
```

### Re-run with optimal speed
```bash
bun run all-in-one:normal --force
```

### Classify only new indicators (no --force)
```bash
bun run classify:cluster:normal
```

### Maximum speed (risky)
```bash
bun run all-in-one:ultra --force
```

## Troubleshooting

### If you see timeouts
```bash
# Stop current run (Ctrl+C)
# Drop to conservative speed
bun run all-in-one:conservative --force
```

### If rate limited
```bash
# You hit your OpenAI tier limit
# Wait a few minutes, then retry at conservative
sleep 300  # Wait 5 minutes
bun run all-in-one:conservative --force
```

### Check your OpenAI rate limits
Visit: https://platform.openai.com/account/rate-limits

## See Also

- [CLUSTER.md](CLUSTER.md) - Complete cluster documentation
- [README.md](../README.md) - Main documentation
- [QUICKSTART.md](QUICKSTART.md) - Single node setup
