# Quick Start: 3x Faster Classification with Cluster

Get 3x throughput by running a 3-node Restate cluster instead of a single node.

## TL;DR - Super Fast Start (One Command!)

```bash
# Starts cluster + service + registers + classifies - all in one!
bun run all-in-one           # 450 RPM = ~24 minutes for 10,903 indicators
bun run all-in-one:fast      # 900 RPM = ~12 minutes
bun run all-in-one:ultra     # 5000 RPM = ~2-3 minutes

# Add --force to re-classify all indicators
bun run all-in-one:fast --force
```

That's it! One command does everything. Press Ctrl+C when done.

## Alternative: Manual Step-by-Step

If you prefer more control:

```bash
# Terminal 1: Start cluster
bun run cluster:start

# Terminal 2: Start your service
bun run dev

# Terminal 3: Register & classify
curl -X POST http://localhost:9070/deployments \
  -H 'content-type: application/json' \
  -d '{"uri": "http://host.docker.internal:9080"}'

bun run classify:cluster  # 450 RPM = ~24 minutes for 10,903 indicators
```

## Step-by-Step

### 1. Start the Cluster (Terminal 1)

```bash
bun run cluster:start
```

Wait for:
```
✅ Cluster started!

🔗 Access Points:
   Node 1 (Primary):
     - Ingress:  http://localhost:8080
     - Admin UI: http://localhost:9070
   ...
```

### 2. Start Your Service (Terminal 2)

```bash
bun run dev
```

Wait for:
```
✅ Restate endpoint listening on http://0.0.0.0:9080
```

### 3. Register Services (Terminal 3)

```bash
curl -X POST http://localhost:9070/deployments \
  -H 'content-type: application/json' \
  -d '{"uri": "http://host.docker.internal:9080"}'
```

Response should show:
```json
{
  "id": "...",
  "deployment": {...}
}
```

### 4. Run Classification

```bash
# Conservative: 450 RPM (150 per node) = ~24 minutes
bun run classify:cluster

# Fast: 900 RPM (300 per node) = ~12 minutes
bun run classify:cluster:fast

# Ultra: 5000 RPM (~1666 per node) = ~2-3 minutes
bun run classify:cluster:ultra
```

## What You'll See

```
🚀 Cluster Classification Script
=================================

Mode: Classify unclassified only
LLM Provider: openai
Target RPM: 450 (distributed across 3 nodes)
Per-Node RPM: 150

🔍 Fetching indicators from database...
✅ Found 10903 indicators to classify

🏥 Checking cluster health...
   Healthy nodes: 3/3
   ✅ Node 1
   ✅ Node 2
   ✅ Node 3
   ✅ All nodes healthy!

📤 Starting cluster classification...

   ✅ Batch 1/2181 → Node 1: 5 indicators (trace: 95669a46...)
   ✅ Batch 2/2181 → Node 2: 5 indicators (trace: 6b17a585...)
   ✅ Batch 3/2181 → Node 3: 5 indicators (trace: 646fc923...)
   ✅ Batch 4/2181 → Node 1: 5 indicators (trace: aa0f4870...)
   ...
```

## Monitor Progress

```bash
# Check queue (in another terminal)
bun run queue

# View cluster logs
bun run cluster:logs

# Check container status
bun run cluster:ps

# Open Admin UI
open http://localhost:9070
```

## When Things Go Wrong

### "No healthy nodes found"

Cluster isn't running:
```bash
bun run cluster:start
```

### "Failed to register deployment"

Service isn't running:
```bash
bun run dev
```

### "Connection refused"

Wrong URL in registration. Use `host.docker.internal` from Docker, not `localhost`:
```bash
curl -X POST http://localhost:9070/deployments \
  -H 'content-type: application/json' \
  -d '{"uri": "http://host.docker.internal:9080"}'
```

### Timeouts During Classification

Lower the RPM:
```bash
bun run classify:cluster  # Start with safe 450 RPM
```

### Want a Clean Start

```bash
# Kill everything and clean state
bun run cluster:clean
bun run clean

# Start fresh
bun run cluster:start
bun run dev
# ... then register and classify
```

## Performance Comparison

| Command | RPM | Nodes | Time (10,903 indicators) |
|---------|-----|-------|--------------------------|
| `classify:safe` | 150 | 1 | ~73 minutes |
| `classify:cluster` | 450 | 3 | **~24 minutes** |
| `classify:cluster:fast` | 900 | 3 | **~12 minutes** |
| `classify:cluster:ultra` | 5000 | 3 | **~2-3 minutes** |

## Next Steps

- Read [CLUSTER.md](./CLUSTER.md) for architecture details
- Check [README.md](./README.md) for general usage
- View Admin UI at http://localhost:9070
- Monitor logs: `bun run cluster:logs -f`

## Cleanup

```bash
# Stop cluster (preserve data)
bun run cluster:stop

# Stop cluster + delete all data
bun run cluster:clean
```
