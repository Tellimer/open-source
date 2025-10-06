# @tellimer/classify Documentation

Complete documentation for the LLM-powered economic indicator classification package.

## Getting Started

- [Quick Start Guide](./QUICK_START.md) - Get up and running in 5 minutes
- [Package Summary](./PACKAGE_SUMMARY.md) - Overview and key features

## Pipeline Versions

### V1 Pipeline (Current Default)
Single-pass classification with robust retry logic and ID-based pairing.

- [V1 Documentation](./v1/README.md)

### V2 Pipeline (Advanced)
Multi-stage classification with persistent state, family-based routing, and quality control.

- [V2 Documentation](./v2/README.md)
- [V1 to V2 Migration Guide](./MIGRATION.md)

## Core Concepts

### Classification System
- [Type Validation](./TYPE_VALIDATION.md) - Understanding indicator types and categories
- [Prompt Engineering](./PROMPT_ENGINEERING.md) - How the LLM prompts work
- [Pairing and Retry Logic](./PAIRING_AND_RETRY.md) - ID-based pairing and failure handling

### Testing & Quality
- [Testing Guide](./TESTING_GUIDE.md) - Running tests and adding test cases
- [E2E Testing Summary](./E2E_TESTING_SUMMARY.md) - End-to-end test results
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Implementation details

### Performance & Optimization
- [Benchmarking](./BENCHMARKING.md) - Performance benchmarks
- [Performance Summary](./PERFORMANCE_SUMMARY.md) - Performance analysis
- [Cost Tracking](./COST_TRACKING.md) - LLM cost estimation and tracking
- [Dry Run Mode](./DRY_RUN.md) - Cost estimation without API calls

## Directory Structure

```
docs/
├── README.md                    # This file - main documentation index
├── QUICK_START.md              # Quick start guide
├── PACKAGE_SUMMARY.md          # Package overview
├── MIGRATION.md                # V1 to V2 migration guide
│
├── v1/                         # V1 Pipeline Documentation
│   └── README.md               # V1 overview and usage
│
├── v2/                         # V2 Pipeline Documentation
│   ├── README.md               # V2 overview and getting started
│   ├── ARCHITECTURE.md         # 6-stage pipeline architecture
│   ├── DATABASE.md             # Database setup and seeding
│   └── AI_SDK.md               # AI SDK integration and benefits
│
├── TYPE_VALIDATION.md          # Indicator types and validation
├── PROMPT_ENGINEERING.md       # Prompt design and optimization
├── PAIRING_AND_RETRY.md        # ID pairing and retry logic
├── TESTING_GUIDE.md            # Testing documentation
├── E2E_TESTING_SUMMARY.md      # E2E test results
├── IMPLEMENTATION_SUMMARY.md   # Implementation details
├── BENCHMARKING.md             # Performance benchmarks
├── PERFORMANCE_SUMMARY.md      # Performance analysis
├── COST_TRACKING.md            # Cost estimation
└── DRY_RUN.md                  # Dry run mode
```

## Quick Links

### For New Users
1. [Quick Start](./QUICK_START.md) - Start here
2. [Package Summary](./PACKAGE_SUMMARY.md) - Understand the package
3. [V1 Documentation](./v1/README.md) - Use the default pipeline

### For V2 Users
1. [V2 Overview](./v2/README.md) - Multi-stage pipeline
2. [V2 Architecture](./v2/ARCHITECTURE.md) - How V2 works
3. [Database Setup](./v2/DATABASE.md) - Set up persistent storage
4. [Migration Guide](./MIGRATION.md) - Upgrade from V1

### For Contributors
1. [Testing Guide](./TESTING_GUIDE.md) - Run and add tests
2. [Prompt Engineering](./PROMPT_ENGINEERING.md) - Understand prompts
3. [Type Validation](./TYPE_VALIDATION.md) - Type system details

## Need Help?

- Check the relevant documentation section above
- Review the [main README](../README.md) for API reference
- See [CONTRIBUTING](../CONTRIBUTING.md) for contribution guidelines
