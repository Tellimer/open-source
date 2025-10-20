# Classify - Economic Indicator Data Pipeline

**AI-powered economic indicator classification, quality validation, and standardization system**

Built with [Restate](https://restate.dev) for durable workflow orchestration and LLMs for intelligent data processing.

---

## 📋 Table of Contents

- [What This Does](#what-this-does)
- [Quick Start](#quick-start)
- [System Architecture](#system-architecture)
- [The 3-Stage Pipeline](#the-3-stage-pipeline)
- [Key Features](#key-features)
- [Documentation](#documentation)
- [Performance](#performance)
- [API Reference](#api-reference)

---

## What This Does

Transform raw economic indicator metadata into **production-ready, validated, standardized data** through a 3-stage AI pipeline:

```
Raw Indicators → Classification → Quality Checks → Consensus Analysis → Final Export
```

### Input
Raw indicator metadata from your database:
- Name: "GDP"
- Units: "Millions USD"
- Scale: unclear
- Frequency: "Q"
- Currency: "USD"

### Output
Validated, production-ready indicator data:
- **Classification**: Type (Flow/Stock), Time-basis (Point/Period), Cumulative flag
- **Quality Score**: 0-100 score, usability verdict, specific issues flagged
- **Consensus**: Cross-country consistency, outlier detection, standardization needs
- **Export-Ready**: Consolidated `final_indicators` table with all validated fields

### Use Cases
- **Data Quality Assurance** - Identify stale data, magnitude anomalies, false readings
- **Indicator Standardization** - Ensure consistent units, scales, frequencies across countries
- **API Data Export** - Production-ready endpoint with quality-filtered indicators
- **Data Science Pipelines** - Clean, validated data for analysis and modeling

---

## Quick Start

### 1. Start Infrastructure

```bash
# Start PostgreSQL (TimescaleDB)
docker-compose -f docker-compose.dev.yml up -d

# Initialize database (creates 30 tables)
bun install
bun run db:init
```

### 2. Seed with Data

```bash
# Requires SOURCE_DATABASE_URL pointing to production database
export SOURCE_DATABASE_URL="postgres://user:pass@host:5432/prod_db"

# Seed with indicators + time series data
bun run db:seed

# Or limit for testing
bun run db:seed -- --100
```

### 3. Run the Pipeline

```bash
# Option A: Single node (development)
bun run dev:local:ultra

# In another terminal:
bun run pipeline:full
```

```bash
# Option B: Cluster (production)
bun run all-in-one:fast --force
```

### 4. Get Results

```bash
# Get production-ready indicators
bun run final:production

# Check quality issues
bun run quality:issues

# Check consensus outliers
bun run consensus:issues
```

**See [docs/QUICKSTART.md](docs/QUICKSTART.md) for detailed setup.**

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLASSIFY PIPELINE                               │
└─────────────────────────────────────────────────────────────────────────┘

  📥 INPUT                                                     📤 OUTPUT
  ┌──────────────┐                                           ┌─────────────┐
  │source_       │                                           │final_       │
  │indicators    │                                           │indicators   │
  │              │                                           │             │
  │• Name        │                                           │• Validated  │
  │• Units       │                                           │• Quality    │
  │• Scale       │                                           │• Consensus  │
  │• Frequency   │                                           │• Production │
  │• Currency    │                                           │  Ready ✅   │
  └──────┬───────┘                                           └─────▲───────┘
         │                                                         │
         │                                                         │
         ▼                                                         │
  ┌──────────────────────────────────────────────────────────────┴───────┐
  │                     STAGE 1: CLASSIFICATION                          │
  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
  │  │Normalize   │→ │Time        │→ │Family      │→ │Type        │    │
  │  │            │  │Inference   │  │Assignment  │  │Classification│   │
  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │
  │                                                                       │
  │  Output: validated_units, validated_scale, validated_frequency,      │
  │          indicator_type, time_basis, is_cumulative                   │
  └──────────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌───────────────────────────────────────────────────────────────────────┐
  │                     STAGE 2: DATA QUALITY                             │
  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │
  │  │Staleness   │  │Magnitude   │  │False       │  │Unit        │     │
  │  │Detector    │  │Detector    │  │Reading     │  │Change      │     │
  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘     │
  │                                                                        │
  │  Output: quality_score, quality_status, usability_verdict,           │
  │          specific issue flags                                         │
  └────────────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌───────────────────────────────────────────────────────────────────────┐
  │                   STAGE 3: CONSENSUS ANALYSIS                         │
  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │
  │  │Unit        │  │Scale       │  │Frequency   │  │Currency    │     │
  │  │Consensus   │  │Consensus   │  │Consensus   │  │Consensus   │     │
  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘     │
  │                                                                        │
  │  Output: consensus_status, outlier_detection,                        │
  │          requires_standardization                                     │
  └───────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

- **Orchestration**: [Restate](https://restate.dev) - Durable workflow engine
- **LLMs**: OpenAI GPT-4o-mini (configurable)
- **Database**: PostgreSQL with TimescaleDB (time-series optimization)
- **Runtime**: Bun (fast TypeScript runtime)
- **Load Balancing**: Traefik (Docker cluster mode)
- **Deployment**: Railway, AWS Spot Instances (Pulumi IaC)

---

## The 3-Stage Pipeline

### Stage 1: Classification Workflow

**Purpose**: Validate and normalize indicator metadata

**Process**:
1. **Normalization** - Clean indicator names
2. **Time Inference** - Detect point-in-time vs period data
3. **Family Assignment** - Classify broad category (macro, finance, etc.)
4. **Type Classification** - Flow vs Stock, temporal aggregation
5. **Boolean Review** - Is cumulative? validation
6. **Final Review** - Confidence scoring

**Output Table**: `classifications`

**Key Fields**:
- `validated_units` - Standardized unit format
- `validated_scale` - Billions, Millions, Ones
- `validated_frequency` - Monthly, Quarterly, Annual
- `indicator_type` - Flow/Stock
- `time_basis` - Point/Period/Period-Total
- `is_cumulative` - Boolean flag

**Run**: `bun run classify`

### Stage 2: Data Quality Workflow

**Purpose**: Assess data reliability and identify issues

**Process**:
1. **Staleness Detector** - Find data update gaps
2. **Magnitude Detector** - Identify value anomalies (Z-score, IQR, YoY)
3. **False Reading Detector** - Detect implausible values (zeros, repeats)
4. **Unit Change Detector** - Find sudden magnitude shifts (scale changes)
5. **Consistency Checker** - Validate against classification metadata
6. **LLM Review** - Assess critical issues (when severity ≥ 4)

**Input**: `classifications` + `time_series_data`

**Output Table**: `data_quality_reports`

**Key Fields**:
- `quality_score` - 0-100 overall score
- `quality_status` - clean, minor_issues, major_issues, critical_issues
- `usability_verdict` - use_as_is, use_with_caution, requires_review, do_not_use
- `has_staleness` - Boolean flag
- `has_magnitude_anomalies` - Boolean flag
- `has_false_readings` - Boolean flag

**Run**: `bun run quality:check`

### Stage 3: Consensus Analysis Workflow

**Purpose**: Ensure cross-indicator consistency

**Process**:
1. **Dimension Detectors** - Run 5 parallel consensus checks:
   - Unit Consensus
   - Scale Consensus
   - Frequency Consensus
   - Currency Consensus
   - Time-Basis Consensus
2. **Consolidation** - Aggregate results across dimensions
3. **Outlier Detection** - Identify inconsistent indicators
4. **LLM Review** - Validate outliers (when found)

**Input**: `classifications` (grouped by indicator name)

**Output Table**: `consensus_analysis_reports`

**Key Fields**:
- `status` - highly_consistent, mostly_consistent, inconsistent, critical_inconsistency
- `total_outliers` - Count of dimension mismatches
- `dimensions_with_issues` - Which dimensions are inconsistent
- `requires_standardization` - Boolean flag

**Run**: `bun run consensus:analyze`

### Stage 4: Final Indicators (Export)

**Purpose**: Consolidate validated data for production use

**Process**:
1. Join data from all 3 workflows
2. Apply production-readiness filters
3. Add pipeline metadata

**Input**: `source_indicators` + `classifications` + `data_quality_reports` + `consensus_analysis_reports`

**Output Table**: `final_indicators` (51 columns)

**Includes**:
- All original source fields
- All validated classification fields
- Quality metrics and verdicts
- Consensus flags
- Pipeline status

**Run**: `bun run final:migrate`

---

## Key Features

### ⚡ High Performance
- **Parallel Execution**: 200+ workflows simultaneously
- **Cluster Mode**: 3-10x speedup with multi-node deployment
- **Prompt Caching**: 90% cost reduction on repeated prompts
- **Rate Limiting**: Smart throttling (300-5000 RPM)

### 🔄 Durable Workflows
- **Fault Tolerance**: Automatic retries, crash recovery
- **Exactly-Once Semantics**: No duplicate processing
- **Workflow State**: Full audit trail
- **Long-Running**: Handle hours-long processes

### 🎯 Production Ready
- **Quality Scoring**: 0-100 score per indicator
- **Usability Verdicts**: use_as_is | use_with_caution | requires_review | do_not_use
- **API Endpoints**: REST API for all stages
- **Export Ready**: Final indicators table for downstream systems

### 📊 Comprehensive Monitoring
- **Real-Time Stats**: Processing progress, success/failure rates
- **Batch Statistics**: Performance metrics per run
- **Issue Tracking**: Query by severity, status
- **Queue Monitoring**: Check pending workflows

---

## Documentation

### Getting Started
- **[QUICKSTART.md](docs/QUICKSTART.md)** - Detailed setup guide
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design deep dive
- **[WORKFLOWS.md](docs/WORKFLOWS.md)** - How each workflow works

### Workflows
- **[Classification Workflow](docs/workflows/CLASSIFICATION.md)** - Metadata validation
- **[Data Quality Workflow](docs/workflows/DATA-QUALITY.md)** - Quality assessment
- **[Consensus Analysis Workflow](docs/workflows/CONSENSUS-ANALYSIS.md)** - Consistency checking

### Operations
- **[TIME-SERIES-INGESTION.md](docs/TIME-SERIES-INGESTION.md)** - Load time series data
- **[SCRIPTS.md](SCRIPTS.md)** - All available commands
- **[API.md](docs/API.md)** - REST API reference

### Deployment
- **[RAILWAY.md](docs/deployment/RAILWAY.md)** - Deploy to Railway ($113/mo)
- **[AWS-SPOT-PULUMI.md](docs/deployment/AWS-SPOT-PULUMI.md)** - AWS EC2 Spot ($111/mo)
- **[DEPLOYMENT-COMPARISON.md](docs/deployment/DEPLOYMENT-COMPARISON.md)** - Choose your platform
- **[CLUSTER.md](docs/CLUSTER.md)** - Multi-node scaling

---

## Performance

### Single Node vs Cluster

| Setup | Nodes | Services | RPM | Time (10,903 indicators) | Cost/Hour |
|-------|-------|----------|-----|--------------------------|-----------|
| **Dev** | 1 | 1 | 300 | ~36 min | $0.50 |
| **Cluster (3-node)** | 3 | 3 | 900 | ~12 min | $1.50 |
| **Cluster (5-node)** | 5 | 10 | 4000 | ~3 min | $6.00 |

### Throughput by Stage

| Stage | Parallel | LLM Calls | Avg Time | Cost (10k indicators) |
|-------|----------|-----------|----------|----------------------|
| Classification | 200 workflows | 6 per indicator | ~12 min | ~$15 |
| Data Quality | 200 workflows | 1 per indicator (if issues) | ~8 min | ~$8 |
| Consensus | By indicator name | 1 per name (if outliers) | ~2 min | ~$2 |
| **Total** | - | ~70,000 calls | ~22 min | **~$25** |

*Using GPT-4o-mini with prompt caching (90% cache hit rate)*

---

## API Reference

### Classification API

```bash
# Classify all indicators
curl -X POST http://localhost:8080/classify-api/classify-all \
  -H "Content-Type: application/json"

# Classify specific indicator
curl -X POST http://localhost:8080/classify-api/classify \
  -H "Content-Type: application/json" \
  -d '{"indicator_id": "GDP_USA_123"}'

# Get classification result
curl http://localhost:8080/classify-api/result/GDP_USA_123
```

### Data Quality API

```bash
# Check all indicators
curl -X POST http://localhost:8080/data-quality-api/check-all \
  -H "Content-Type: application/json"

# Get quality report
curl http://localhost:8080/data-quality-api/report/GDP_USA_123

# Get indicators with issues
curl "http://localhost:8080/data-quality-api/issues?status=major_issues"
```

### Consensus Analysis API

```bash
# Analyze all indicators
curl -X POST http://localhost:8080/consensus-analysis-api/analyze-all \
  -H "Content-Type: application/json"

# Get consensus report
curl http://localhost:8080/consensus-analysis-api/report/GDP

# Get outliers
curl "http://localhost:8080/consensus-analysis-api/issues?status=inconsistent"
```

### Final Indicators API

```bash
# Get production-ready indicators
curl "http://localhost:8080/final-indicators-api/production-ready?limit=100"

# Get indicators requiring attention
curl http://localhost:8080/final-indicators-api/requires-attention

# Get statistics
curl http://localhost:8080/final-indicators-api/stats
```

**See [docs/API.md](docs/API.md) for complete API documentation.**

---

## Database Schema

### 4 Main Output Tables

| Table | Purpose | Key Use Case |
|-------|---------|--------------|
| `classifications` | Validated metadata | "What is this indicator?" |
| `data_quality_reports` | Quality assessment | "Can I trust this data?" |
| `consensus_analysis_reports` | Consistency check | "Is this consistent with others?" |
| `final_indicators` | 🎯 Export-ready | **"Give me production data"** |

### All 30 Tables

**Classification** (10): classifications, normalization_results, time_inference_results, cumulative_detection_results, family_assignment_results, type_classification_results, boolean_review_results, final_review_results, processing_log, pipeline_stats

**Data Quality** (8): time_series_data, data_quality_checks, data_quality_reports, staleness_detector_results, magnitude_detector_results, false_reading_detector_results, unit_change_detector_results, consistency_checker_results, quality_review_results

**Consensus** (8): consensus_analysis_reports, unit_consensus_results, scale_consensus_results, frequency_consensus_results, currency_consensus_results, time_basis_consensus_results, consensus_outliers, consensus_review_results

**Core** (3): source_indicators, final_indicators, schema_version

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgres://classify:classify@localhost:5432/classify
SOURCE_DATABASE_URL=postgres://user:pass@prod:5432/indicators  # For seeding

# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Restate
RESTATE_HOST=http://localhost:9070
```

---

## Common Commands

```bash
# Database
bun run db:init                    # Initialize database
bun run db:seed                    # Seed with production data
bun run db:seed -- --100          # Seed 100 indicators for testing

# Classification
bun run classify                   # Classify all indicators
bun run classify:fast              # 300 RPM
bun run classify:ultra             # 5000 RPM
bun run reclassify:ultra          # Force reclassify

# Data Quality
bun run quality:check              # Check all indicators
bun run quality:issues             # Get issues
bun run quality:issues:critical    # Severity 5 only

# Consensus Analysis
bun run consensus:analyze          # Analyze all
bun run consensus:issues           # Get inconsistencies
bun run consensus:outliers         # Get outliers

# Final Indicators
bun run final:migrate              # Migrate to final table
bun run final:production           # Get production-ready data
bun run final:stats                # Get statistics

# Full Pipeline
bun run pipeline:full              # Run all 3 stages + migration
bun run pipeline:full:force        # Force reprocess everything

# Cluster (Production)
bun run all-in-one:fast --force    # Cluster with 3 nodes @ 1000 RPM
bun run all-in-one:ultra --force   # Cluster with 3 nodes @ 1500 RPM
```

**See [SCRIPTS.md](SCRIPTS.md) for all 79 commands.**

---

## Development

```bash
# Install dependencies
bun install

# Start dev environment
bun run dev:local:ultra

# Run tests
bun test

# Format code
bun run format

# Type check
bun run typecheck
```

---

## Architecture Highlights

### Restate Benefits
- **Durable Execution**: Workflows survive crashes, restarts
- **Exactly-Once Semantics**: No duplicate LLM calls
- **Built-in State Management**: No Redis/external state store needed
- **Automatic Retries**: Configurable retry policies
- **Distributed Tracing**: Full observability

### Design Patterns
- **Service-Oriented**: Each stage is a standalone service
- **Workflow Orchestration**: Restate coordinates multi-stage pipelines
- **Parallel Execution**: Process 200+ indicators simultaneously
- **Prompt Caching**: OpenAI automatic caching (90% hit rate)
- **Idempotent Operations**: Safe to rerun without side effects

---

## License

MIT

---

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/tellimer/open-source/issues)
- **Restate Docs**: https://restate.dev

---

**Built with ❤️ using [Restate](https://restate.dev)**
