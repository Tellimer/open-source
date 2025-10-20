# Operational Scripts Guide

Complete reference for all npm/bun scripts in the classify-restate project.

## 📋 Table of Contents

- [Development](#development)
- [Classification Workflow](#classification-workflow)
- [Data Quality Workflow](#data-quality-workflow)
- [Consensus Analysis Workflow](#consensus-analysis-workflow)
- [Final Indicators Export](#final-indicators-export)
- [Full Pipeline](#full-pipeline)
- [Cluster Management](#cluster-management)
- [Monitoring & Stats](#monitoring--stats)
- [Database Operations](#database-operations)

---

## 🔧 Development

### Local Development
```bash
# Run service in development mode
bun run dev

# Run service with auto-reload on file changes
bun run dev:watch

# Start full local development environment (service + Restate server)
bun run dev:local

# Ultra mode with increased file descriptors
bun run dev:local:ultra
```

### Service Registration
```bash
# Re-register service with Restate (after code changes)
bun run reregister
```

---

## 📊 Classification Workflow

### Basic Classification
```bash
# Classify all indicators (default throttling)
bun run classify

# Safe mode (150 RPM - respects rate limits)
bun run classify:safe

# Fast mode (300 RPM)
bun run classify:fast

# Max mode (480 RPM)
bun run classify:max

# Ultra mode (5000 RPM - requires high tier API)
bun run classify:ultra

# Turbo mode (10000 RPM - use with caution)
bun run classify:turbo
```

### Cluster Classification (Load Balanced)
```bash
# Cluster mode (400 RPM across all instances)
bun run classify:cluster

# Cluster fast (400 RPM)
bun run classify:cluster:fast

# Cluster max (600 RPM)
bun run classify:cluster:max

# Cluster ultra (800 RPM)
bun run classify:cluster:ultra
```

### Re-classification (Force Mode)
```bash
# Re-classify all indicators (overwrites existing)
bun run reclassify:safe    # 150 RPM
bun run reclassify:fast    # 300 RPM
bun run reclassify:ultra   # 5000 RPM
```

---

## 🔍 Data Quality Workflow

### Check Data Quality
```bash
# Check data quality for ALL indicators
bun run quality:check

# Check specific indicators (edit JSON payload)
bun run quality:check:batch
```

### Query Quality Reports
```bash
# Get quality report for specific indicator
bun run quality:report <indicator_id>

# Example:
bun run quality:report 2738A38
```

### Find Issues
```bash
# Get all major quality issues
bun run quality:issues

# Get critical issues only (severity 5)
bun run quality:issues:critical

# Custom query:
curl 'http://localhost:8080/data-quality-api/issues?status=unusable&severity=5'
```

---

## 🤝 Consensus Analysis Workflow

### Analyze Consensus
```bash
# Analyze consensus for ALL indicator name groups
bun run consensus:analyze

# Analyze specific indicator names (edit JSON payload)
bun run consensus:analyze:batch
```

### Query Consensus Reports
```bash
# Get consensus report for indicator name group
bun run consensus:report <indicator_name>

# Example:
bun run consensus:report "GDP"
```

### Find Inconsistencies
```bash
# Get all inconsistent indicator groups
bun run consensus:issues

# Get outliers for specific indicator name
bun run consensus:outliers <indicator_name>

# Example:
bun run consensus:outliers "Temperature"
```

---

## 📤 Final Indicators Export

### Migrate to Final Indicators
```bash
# Migrate all indicators (skip existing)
bun run final:migrate

# Force migration (overwrite all existing)
bun run final:migrate:force
```

### Query Final Indicators
```bash
# List final indicators (first 10)
bun run final:list

# Get production-ready indicators (high quality only)
bun run final:production

# Get indicators requiring attention
bun run final:attention

# Get statistics summary
bun run final:stats
```

### Advanced Queries
```bash
# Filter by quality score
curl 'http://localhost:8080/final-indicators-api/list?min_quality_score=90&limit=100'

# Filter by type and source
curl 'http://localhost:8080/final-indicators-api/list?indicator_type=rate&source_name=IMF'

# Get consensus outliers
curl 'http://localhost:8080/final-indicators-api/list?is_consensus_outlier=true'
```

---

## 🚀 Full Pipeline

### Sequential Pipeline (Recommended)
```bash
# Run complete pipeline: classify → quality → consensus → export
bun run pipeline:full

# Force mode (re-process everything)
bun run pipeline:full:force
```

**What it does:**
1. **Classify** all indicators (normalize metadata)
2. **Check quality** (detect anomalies, issues)
3. **Analyze consensus** (find reporting inconsistencies)
4. **Migrate** to final_indicators table

**Duration:** 30-60 minutes for 10,000 indicators (depending on RPM)

---

## 🏗️ Cluster Management

### Start/Stop Cluster
```bash
# Start cluster (5 Restate nodes + 10 service instances)
bun run cluster:start

# Stop cluster
bun run cluster:stop

# Clean cluster (remove volumes)
bun run cluster:clean

# View cluster logs
bun run cluster:logs

# Check cluster status
bun run cluster:ps
```

### Generate Custom Clusters
```bash
# Generate and start 10-service cluster
bun run cluster:start:10

# Generate and start 20-service cluster
bun run cluster:start:20

# Generate mega cluster (10 Restate nodes + 20 services)
bun run cluster:start:mega
```

### All-In-One Cluster Scripts
```bash
# All-in-one: start cluster + classify + quality + consensus
bun run all-in-one              # 1000 RPM
bun run all-in-one:conservative # 750 RPM
bun run all-in-one:normal       # 1000 RPM
bun run all-in-one:fast         # 1250 RPM
bun run all-in-one:ultra        # 1500 RPM

# With custom cluster sizes
bun run all-in-one:10           # 10 services
bun run all-in-one:20           # 20 services
bun run all-in-one:mega         # 10 nodes + 20 services
```

---

## 📈 Monitoring & Stats

### View Statistics
```bash
# View classification statistics (last hour)
bun run stats

# Stats for last 30 minutes
bun run stats:30m

# Stats for today
bun run stats:today
```

### Check Queue
```bash
# Check Restate workflow queue status
bun run queue
```

### Kill Workflows
```bash
# Kill all running workflows
bun run kill

# Kill all + clean state
bun run clean
```

---

## 🗄️ Database Operations

### Initialize Database
```bash
# Run database migrations (create tables)
bun run db:migrate

# Initialize database (create schema)
bun run db:init

# Seed database with test data
bun run db:seed
```

---

## 💡 Common Workflows

### First-Time Setup
```bash
# 1. Initialize database
bun run db:init

# 2. Start development environment
bun run dev:local

# 3. Run classification
bun run classify:safe

# 4. Check quality
bun run quality:check

# 5. Analyze consensus
bun run consensus:analyze

# 6. Export to final table
bun run final:migrate
```

### Daily Operations
```bash
# Option 1: Run full pipeline sequentially
bun run pipeline:full

# Option 2: Run each stage separately
bun run classify:fast
bun run quality:check
bun run consensus:analyze
bun run final:migrate
```

### Cluster Operations
```bash
# 1. Start cluster
bun run cluster:start:10

# 2. Run all-in-one script
bun run all-in-one:10 -- --rpm=3000 --force

# 3. Monitor progress
bun run cluster:logs

# 4. Check stats
bun run stats
```

### Quality Assurance
```bash
# 1. Find all quality issues
bun run quality:issues

# 2. Find consensus outliers
bun run consensus:issues

# 3. Get indicators requiring attention
bun run final:attention

# 4. Review statistics
bun run final:stats
```

### Debugging
```bash
# Check specific indicator's journey
curl http://localhost:8080/classify-api/getStatus/<indicator_id>
bun run quality:report <indicator_id>
bun run consensus:report "<indicator_name>"
curl http://localhost:8080/final-indicators-api/get/<indicator_id>
```

---

## 🎯 Performance Tuning

### Rate Limiting (RPM)
- **150 RPM**: Safe for free tier APIs
- **300 RPM**: Standard for Tier 1
- **600 RPM**: Tier 2 with load balancing
- **1000+ RPM**: Tier 3+ with cluster
- **3000+ RPM**: High-performance cluster (10+ services)

### Cluster Sizing
- **10 services**: Up to 3000 RPM (30k indicators/hour)
- **20 services**: Up to 6000 RPM (60k indicators/hour)
- **Mega cluster**: 10k+ RPM (production scale)

### Memory & Connections
```bash
# Increase file descriptors for ultra mode
ulimit -n 10240

# Set PostgreSQL max connections
# docker-compose.yml: max_connections=2000
```

---

## 🔗 API Endpoint Reference

All endpoints documented in console output when running:
```bash
bun run dev
```

Or view live at:
- Restate Dashboard: http://localhost:9070
- Traefik Dashboard: http://localhost:8081 (cluster mode)

---

## 📝 Notes

- **Sequential Processing**: Run workflows sequentially (classify → quality → consensus) to avoid missing dependencies
- **Batch Sizes**: All-in-one scripts process in batches to prevent memory exhaustion
- **Cost Optimization**: Use appropriate RPM for your API tier to avoid rate limiting
- **Cluster Mode**: Recommended for >5000 indicators or production workloads
- **Quality Checks**: Run quality checks after classification completes
- **Consensus Analysis**: Run after quality checks to get complete metadata
- **Final Export**: Always run last to consolidate all pipeline data

---

## 🆘 Troubleshooting

**Service won't start:**
```bash
bun run kill && bun run dev
```

**Cluster issues:**
```bash
bun run cluster:stop
bun run cluster:clean
bun run cluster:start
```

**Rate limit errors:**
```bash
# Reduce RPM or upgrade API tier
bun run classify:safe  # Use safer rate
```

**Database issues:**
```bash
# Re-run migrations
bun run db:migrate

# Check PostgreSQL connection
docker ps | grep timescale
```

**Queue stuck:**
```bash
# View queue
bun run queue

# Kill all workflows
bun run kill

# Restart service
bun run dev
```

---

For more information, see:
- [README.md](./README.md) - Project overview
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture
- [API.md](./docs/API.md) - API documentation
