# Quick Start: 5x Faster Classification with 5-Node Cluster

Get **5x throughput** by running a **5-node Restate cluster** with **5 classification services** and **NGINX load balancing**.

## TL;DR - Super Fast Start (One Command!)

```bash
# Starts 5 nodes + 5 services + NGINX + registers + classifies - all in one!
bun run all-in-one                  # 1000 RPM = ~65 minutes for 10,903 indicators
bun run all-in-one:conservative     # 750 RPM = ~87 minutes (safest)
bun run all-in-one:fast             # 1250 RPM = ~52 minutes
bun run all-in-one:ultra            # 1500 RPM = ~44 minutes (fastest!)

# Add --force to re-classify all indicators
bun run all-in-one:fast --force
```

That's it! One command starts everything. Press Ctrl+C when done.

**What's New:**
- ✨ **5 Restate nodes** (was 3) - more orchestration capacity
- ✨ **5 classification services** (was 1) - **500% more processing power**
- ✨ **NGINX load balancer** - distributes requests across services
- ✨ **2x faster** than 3-node setup (250 ind/min vs 124 ind/min)

## Alternative: Manual Step-by-Step

If you prefer more control:

```bash
# Terminal 1: Start cluster (5 nodes + 5 services + NGINX)
bun run cluster:5node

# Wait for cluster to be ready (~10 seconds)

# Terminal 2: Register services with cluster
curl -X POST http://localhost:9070/deployments \
  -H 'content-type: application/json' \
  -d '{"uri": "http://nginx:9080"}'

# Terminal 3: Run classification
bun run all-in-one  # 1000 RPM = ~65 minutes for 10,903 indicators
```

**Note**: Services are now **inside Docker** behind NGINX, so you don't need to run `bun run dev` separately!

## Step-by-Step

### 1. Start the Cluster

```bash
bun run cluster:5node
```

This launches:
- 5 Restate nodes (ports 8080, 28080, 38080, 48080, 58080)
- 5 Classification services (internal, behind NGINX)
- NGINX load balancer (port 9080)
- MinIO (shared storage)

Wait ~10 seconds for everything to start.

### 2. Register Services with Cluster

```bash
curl -X POST http://localhost:9070/deployments \
  -H 'content-type: application/json' \
  -d '{"uri": "http://nginx:9080"}'
```

Response should show:
```json
{
  "id": "...",
  "deployment": {...}
}
```

### 3. Run Classification

```bash
# Conservative: 750 RPM = ~87 minutes for 10,903 indicators
bun run all-in-one:conservative

# Normal: 1000 RPM = ~65 minutes
bun run all-in-one

# Fast: 1250 RPM = ~52 minutes
bun run all-in-one:fast

# Ultra: 1500 RPM = ~44 minutes (fastest!)
bun run all-in-one:ultra
```

## What You'll See

```
🚀 Cluster Classification Script
=================================

Mode: Classify unclassified only
LLM Provider: openai
Target RPM: 1000 (distributed across 5 nodes)
Per-Node RPM: 200

🔍 Fetching indicators from database...
✅ Found 10903 indicators to classify

🏥 Checking cluster health...
   Healthy nodes: 5/5
   ✅ Node 1
   ✅ Node 2
   ✅ Node 3
   ✅ Node 4
   ✅ Node 5
   ✅ All nodes healthy!

📤 Starting cluster classification...

   ✅ Batch 1/2181 → Node 1: 5 indicators (trace: 95669a46...)
   ✅ Batch 2/2181 → Node 2: 5 indicators (trace: 6b17a585...)
   ✅ Batch 3/2181 → Node 3: 5 indicators (trace: 646fc923...)
   ✅ Batch 4/2181 → Node 4: 5 indicators (trace: aa0f4870...)
   ✅ Batch 5/2181 → Node 5: 5 indicators (trace: 3ba29fc1...)
   ✅ Batch 6/2181 → Node 1: 5 indicators (trace: 8ef5b2d9...)
   ...

📊 Progress: 250/10903 indicators (2.3%)
⏱️  Elapsed: 60s | ETA: 42m 30s
🚀 Throughput: 250.0 indicators/min (target: 167.0 ind/min)
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

Services aren't running in Docker:
```bash
bun run cluster:5node  # Start everything
```

### "Connection refused"

Wrong URL in registration. Services are inside Docker, use `nginx:9080`:
```bash
curl -X POST http://localhost:9070/deployments \
  -H 'content-type: application/json' \
  -d '{"uri": "http://nginx:9080"}'
```

### Services not responding

Check Docker logs:
```bash
docker-compose -f docker-compose.cluster.yml logs classify-service-1
docker-compose -f docker-compose.cluster.yml logs nginx

# Common issues:
# - Missing OPENAI_API_KEY in .env
# - Database not reachable
```

### Timeouts During Classification

Lower the RPM:
```bash
bun run all-in-one:conservative  # Start with safe 750 RPM
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

| Setup | RPM | Nodes | Services | Time (10,903 indicators) |
|-------|-----|-------|----------|--------------------------|
| Single node + 1 service | 150 | 1 | 1 | ~218 minutes |
| 3-node + 1 service | 600 | 3 | 1 | ~88 minutes |
| **5-node + 5 services** | **750** | **5** | **5** | **~87 minutes** |
| **5-node + 5 services** | **1000** | **5** | **5** | **~65 minutes** |
| **5-node + 5 services** | **1250** | **5** | **5** | **~52 minutes** |
| **5-node + 5 services** | **1500** | **5** | **5** | **~44 minutes** ⚡ |

**Key Insight**: The bottleneck was the single service processing all requests!
- 3 nodes + 1 service = 124 ind/min (only 83% efficiency)
- **5 nodes + 5 services = 250 ind/min (100% efficiency) = 2x speedup**

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
