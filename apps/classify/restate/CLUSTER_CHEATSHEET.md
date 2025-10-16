# 🚀 Cluster Quick Reference

## One-Command Classification

```bash
# RECOMMENDED: Start cluster + classify all (24 minutes)
bun run all-in-one:normal --force

# Safe/Conservative (36 minutes)
bun run all-in-one:conservative --force

# Aggressive/Fast (16 minutes, may timeout)
bun run all-in-one:aggressive --force
```

## Speed Comparison

| Command | Time | Throughput | Risk |
|---------|------|------------|------|
| `all-in-one:conservative` | 36m | 300 ind/min | ✅ None |
| `all-in-one:normal` ⭐ | 24m | 450 ind/min | ✅ Low |
| `all-in-one:aggressive` | 16m | 675 ind/min | ⚠️  Medium |
| `all-in-one:ultra` | 12m | 900 ind/min | ⚠️  High |

## Step-by-Step

```bash
# 1. Start cluster
bun run cluster:start

# 2. Start service (separate terminal)
bun run dev

# 3. Classify (pick your speed)
bun run classify:cluster:normal --force      # 24 minutes
bun run classify:cluster:conservative --force # 36 minutes
bun run classify:cluster:aggressive --force   # 16 minutes
```

## Cluster Management

```bash
bun run cluster:start   # Start 3-node cluster
bun run cluster:stop    # Stop (keep data)
bun run cluster:clean   # Stop + delete all data
bun run cluster:logs    # View logs
bun run cluster:ps      # Check status
```

## Access Points

- **Admin UI**: http://localhost:9070 (or :29070, :39070)
- **Database**: `postgres://classify:classify@localhost:5432/classify`
- **Service**: http://localhost:9080

## Monitor Progress

```bash
# Watch logs
bun run cluster:logs

# Database progress
psql postgres://classify:classify@localhost:5432/classify \
  -c "SELECT COUNT(*) as total, COUNT(c.indicator_id) as done 
      FROM source_indicators si 
      LEFT JOIN classifications c ON si.id = c.indicator_id;"
```

## When Things Go Wrong

```bash
# Timeouts? Drop to conservative
bun run all-in-one:conservative --force

# Rate limited? Wait then retry
sleep 300 && bun run all-in-one:conservative --force

# Complete reset
bun run cluster:clean
bun run all-in-one:normal --force
```

---

**TL;DR**: Run `bun run all-in-one:normal --force` and wait 24 minutes! 🎉
