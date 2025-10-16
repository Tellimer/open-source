# Restate Cluster Setup for High-Throughput Classification

This guide shows how to use a 3-node Restate cluster for **3x throughput** when classifying indicators.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer                           │
│              (Round-robin across nodes)                     │
└─────────────────────────────────────────────────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
   ┌─────────┐        ┌─────────┐        ┌─────────┐
   │ Node 1  │        │ Node 2  │        │ Node 3  │
   │ :8080   │        │ :28080  │        │ :38080  │
   │ :9070   │        │ :29070  │        │ :39070  │
   └─────────┘        └─────────┘        └─────────┘
         │                  │                  │
         └──────────────────┴──────────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │    MinIO     │
                   │ (Shared S3)  │
                   │    :9000     │
                   └──────────────┘
```

## Quick Start

### 1. Start the Cluster

```bash
# Start 3 Restate nodes + MinIO
bun run cluster:start
```

This launches:
- **Node 1** (primary): ports 8080, 9070, 5122
- **Node 2**: ports 28080, 29070, 25122
- **Node 3**: ports 38080, 39070, 35122
- **MinIO**: port 9000 (shared storage)

### 2. Start Your Classification Service

In a separate terminal:

```bash
# Start your Bun service (will listen on port 9080)
bun run dev
```

### 3. Register with Cluster

```bash
# Register your service with Node 1 (will propagate to all nodes)
curl -X POST http://localhost:9070/deployments \
  -H 'content-type: application/json' \
  -d '{"uri": "http://host.docker.internal:9080"}'
```

### 4. Run Classification at 3x Throughput

```bash
# Conservative: 450 RPM across cluster (150 RPM per node)
bun run classify:cluster

# Fast: 900 RPM across cluster (300 RPM per node)
bun run classify:cluster:fast

# Ultra: 5000 RPM across cluster (~1666 RPM per node)
bun run classify:cluster:ultra
```

## How It Works

### Load Distribution

The classification script uses **round-robin distribution**:

1. **Batch 1** → Node 1
2. **Batch 2** → Node 2
3. **Batch 3** → Node 3
4. **Batch 4** → Node 1 (cycle repeats)

Each node processes workflows in parallel, giving you **3x the throughput**.

### Shared State

All nodes share state via:
- **MinIO** (S3-compatible storage) for Bifrost replicated loglets
- **Cluster membership** for coordination
- **Partition distribution** across nodes

This means:
- Workflows can be submitted to any node
- All nodes see the same workflow state
- Load is automatically balanced

## Throughput Comparison

| Mode | Single Node | 3-Node Cluster |
|------|------------|----------------|
| Safe | 150 RPM | 450 RPM |
| Fast | 300 RPM | 900 RPM |
| Ultra | ~500 RPM* | ~5000 RPM |

*Single node struggles with ultra mode due to sequential workflow processing

## Monitoring

### Check Cluster Status

```bash
# View all containers
bun run cluster:ps

# Follow logs from all nodes
bun run cluster:logs

# Check queue status
bun run queue
```

### Admin UIs

- **Node 1**: http://localhost:9070
- **Node 2**: http://localhost:29070
- **Node 3**: http://localhost:39070

All UIs show the same cluster state.

## Troubleshooting

### Nodes Not Starting

```bash
# Check Docker logs
bun run cluster:logs

# Restart cluster
bun run cluster:stop
bun run cluster:start
```

### Service Registration Failing

Make sure your service is reachable from Docker:

```bash
# Test from your host
curl http://localhost:9080

# If working, register with host.docker.internal
curl -X POST http://localhost:9070/deployments \
  -H 'content-type: application/json' \
  -d '{"uri": "http://host.docker.internal:9080"}'
```

### Uneven Load Distribution

The load balancer uses round-robin. If one node is slower:

1. Check node health: `bun run cluster:ps`
2. View node-specific stats after classification completes
3. Adjust per-node RPM if needed

### Stuck Workflows

```bash
# Check queue on any node
bun run queue

# View in UI
open http://localhost:9070
```

## Cleanup

### Stop Cluster (Preserve Data)

```bash
bun run cluster:stop
```

Data is preserved in Docker volumes. Restart with `bun run cluster:start`.

### Clean Everything

```bash
# This removes all workflow state!
bun run cluster:clean
```

## Production Considerations

For production deployments:

1. **Use real S3** instead of MinIO:
   ```yaml
   # docker-compose.cluster.yml
   RESTATE_BIFROST_REPLICATED_LOGLET_PROVIDER: s3
   AWS_ACCESS_KEY_ID: <your-key>
   AWS_SECRET_ACCESS_KEY: <your-secret>
   AWS_REGION: us-east-1
   AWS_S3_BUCKET: restate-production
   ```

2. **Scale beyond 3 nodes**: Add more nodes in docker-compose.cluster.yml

3. **Add load balancer**: Use nginx/HAProxy in front of all ingress ports

4. **Monitor metrics**: Enable Prometheus metrics in restate.toml:
   ```toml
   [worker.telemetry]
   metrics_enabled = true
   metrics_port = 9600
   ```

5. **Persistent volumes**: Use named volumes or host mounts:
   ```yaml
   volumes:
     - ./restate-data:/restate-data
   ```

## Cost Optimization

With a 3-node cluster at 450 RPM (3x 150 RPM):

- **Indicators**: 10,903
- **Time**: ~24 minutes (vs ~73 minutes single node)
- **Cost**: Same LLM costs, but 3x faster!

At 900 RPM (3x 300 RPM):
- **Time**: ~12 minutes
- **Trade-off**: Higher memory/CPU usage per node

## Next Steps

- [Restate Clustering Docs](https://docs.restate.dev/operate/cluster)
- [Restate Admin API](https://docs.restate.dev/references/admin-api)
- [Performance Tuning](https://docs.restate.dev/operate/configuration/server)
