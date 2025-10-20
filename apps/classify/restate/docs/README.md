# Classify Documentation

Complete documentation for the Classify economic indicator data pipeline.

---

## 📚 Documentation Index

### 🚀 Getting Started

1. **[../README.md](../README.md)** - Main project overview
2. **[QUICKSTART.md](QUICKSTART.md)** - Detailed setup guide (single node)
3. **[QUICKSTART-CLUSTER.md](QUICKSTART-CLUSTER.md)** - Cluster setup guide (production)

### 🏗️ Architecture

4. **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design and components
5. **[WORKFLOWS.md](WORKFLOWS.md)** - How workflows work

### 🔄 Workflows (3 Stages)

6. **[workflows/CLASSIFICATION.md](workflows/CLASSIFICATION.md)** - Stage 1: Metadata validation
7. **[workflows/DATA-QUALITY.md](workflows/DATA-QUALITY.md)** - Stage 2: Quality assessment
8. **[workflows/CONSENSUS-ANALYSIS.md](workflows/CONSENSUS-ANALYSIS.md)** - Stage 3: Consistency checking

### 📊 Data Operations

9. **[TIME-SERIES-INGESTION.md](TIME-SERIES-INGESTION.md)** - Load time series data
10. **[DATABASE.md](DATABASE.md)** - Database schema and tables
11. **[API.md](API.md)** - REST API reference

### ⚙️ Operations

12. **[../SCRIPTS.md](../SCRIPTS.md)** - All 79 available commands
13. **[MONITORING.md](MONITORING.md)** - Monitoring and debugging
14. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions

### 🚀 Deployment

15. **[deployment/RAILWAY.md](deployment/RAILWAY.md)** - Railway deployment ($113/mo)
16. **[deployment/AWS-SPOT-PULUMI.md](deployment/AWS-SPOT-PULUMI.md)** - AWS Spot instances ($111/mo)
17. **[deployment/DEPLOYMENT-COMPARISON.md](deployment/DEPLOYMENT-COMPARISON.md)** - Compare platforms

### 📈 Scaling & Performance

18. **[CLUSTER_OVERVIEW.md](CLUSTER_OVERVIEW.md)** - Multi-node cluster architecture
19. **[CLUSTER-SCALING.md](CLUSTER-SCALING.md)** - Horizontal scaling guide
20. **[CLUSTER_SPEEDS.md](CLUSTER_SPEEDS.md)** - Performance benchmarks
21. **[PARALLEL_EXECUTION.md](PARALLEL_EXECUTION.md)** - Parallel processing patterns

### 📝 Reference

22. **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes

---

## Quick Navigation by Use Case

### "I want to get started quickly"
→ [QUICKSTART.md](QUICKSTART.md)

### "I need to deploy to production"
→ [deployment/RAILWAY.md](deployment/RAILWAY.md) or [deployment/AWS-SPOT-PULUMI.md](deployment/AWS-SPOT-PULUMI.md)

### "I want to understand how it works"
→ [ARCHITECTURE.md](ARCHITECTURE.md) → [WORKFLOWS.md](WORKFLOWS.md)

### "I need to scale for 10,000+ indicators"
→ [CLUSTER_OVERVIEW.md](CLUSTER_OVERVIEW.md) → [QUICKSTART-CLUSTER.md](QUICKSTART-CLUSTER.md)

### "I want to load my time series data"
→ [TIME-SERIES-INGESTION.md](TIME-SERIES-INGESTION.md)

### "Something isn't working"
→ [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### "I want API documentation"
→ [API.md](API.md)

### "I need all available commands"
→ [../SCRIPTS.md](../SCRIPTS.md)

---

## Documentation Structure

```
docs/
├── README.md                          (This file - documentation index)
├── QUICKSTART.md                      (Single node setup)
├── QUICKSTART-CLUSTER.md              (Cluster setup)
├── ARCHITECTURE.md                    (System design)
├── WORKFLOWS.md                       (Workflow overview)
├── TIME-SERIES-INGESTION.md           (Data loading)
├── DATABASE.md                        (Schema reference)
├── API.md                             (REST API docs)
├── MONITORING.md                      (Ops guide)
├── TROUBLESHOOTING.md                 (Common issues)
│
├── workflows/                         (Detailed workflow docs)
│   ├── CLASSIFICATION.md
│   ├── DATA-QUALITY.md
│   └── CONSENSUS-ANALYSIS.md
│
├── deployment/                        (Deployment guides)
│   ├── RAILWAY.md
│   ├── RAILWAY-QUICKSTART.md
│   ├── RAILWAY-CHECKLIST.md
│   ├── AWS-SPOT-PULUMI.md
│   └── DEPLOYMENT-COMPARISON.md
│
├── CLUSTER_OVERVIEW.md               (Cluster architecture)
├── CLUSTER-SCALING.md                (Scaling strategies)
├── CLUSTER_SPEEDS.md                 (Benchmarks)
├── CLUSTER_CHEATSHEET.md             (Quick commands)
├── PARALLEL_EXECUTION.md             (Parallel patterns)
└── CHANGELOG.md                      (Version history)
```

---

## External Resources

- **Restate Documentation**: https://restate.dev/docs
- **OpenAI API**: https://platform.openai.com/docs
- **PostgreSQL/TimescaleDB**: https://docs.timescale.com
- **Bun Runtime**: https://bun.sh/docs

---

## Contributing

When adding new documentation:

1. **Add to this index** - Update the list above
2. **Link from README** - Update main README.md if major feature
3. **Cross-link** - Link to related docs
4. **Use clear headings** - H2 for sections, H3 for subsections
5. **Add examples** - Code examples for every feature
6. **Keep concise** - One page per topic when possible

---

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/tellimer/open-source/issues)
- **Restate Community**: https://restate.dev/community
