# Classify Workflow Documentation

Complete documentation for the classify-workflow application.

## Quick Links

- [Main README](../README.md) - Project overview and quick start
- [Usage Guide](./USAGE_GUIDE.md) - Detailed usage instructions and examples
- [Cumulative Detection](./CUMULATIVE_DETECTION.md) - Data-driven YTD detection and integration
 - [Prompt Improvements](./PROMPT_IMPROVEMENTS.md) - Verified patterns applied to prompts
 - [Analysis Patterns](./ANALYSIS_PATTERNS.md) - Summary of 109 verified classifications
- [LM Studio Setup](./LM_STUDIO_SETUP.md) - How to set up and configure LM Studio
- [Database Persistence](./DATABASE_PERSISTENCE.md) - Database schema and persistence layer
- [Cost Estimates](./COST_ESTIMATE.md) - OpenAI costs and batch API projections
- [SQLite WAL Setup](./SQLITE_WAL_SETUP.md) - Write-Ahead Logging configuration
- [Node.js SQLite Fix](./NODE_SQLITE_FIX.md) - How we fixed SQLite for Node.js/Motia
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions

## Documentation Structure

### Getting Started

1. **[LM Studio Setup](./LM_STUDIO_SETUP.md)** - Set up your local LLM (recommended)
   - Download and install LM Studio
   - Load the Mistral 7B model
   - Configure the OpenAI-compatible API
   - Test the connection

### Running the Application

2. **[Usage Guide](./USAGE_GUIDE.md)** - Complete usage documentation
   - Environment setup
   - Database seeding
   - Running classifications
   - Querying results
   - Advanced configurations
   - Provider selection (`--provider local|openai|anthropic`)

### Database

3. **[SQLite WAL Setup](./SQLITE_WAL_SETUP.md)** - Database configuration
   - WAL mode benefits
   - Performance optimization
   - Backup strategies

4. **[Database Persistence](./DATABASE_PERSISTENCE.md)** - Schema and persistence (v5 schema, cumulative detection)
   - Complete schema documentation
   - Table descriptions
   - Persistence layer API
   - Query examples

### Support

5. **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues
   - Database errors
   - LLM connection issues
   - Memory problems
   - Performance tuning

## Quick Reference

### Commands

```bash
# Setup
deno task install              # Install dependencies
deno task seed-db              # Seed database from PostgreSQL

# Run
deno task dev                  # Start Motia server
deno task run:dev --100        # Classify 100 indicators

# Query
deno task query                # View all results
deno task query -- --family physical-fundamental
deno task query -- --type balance-of-payments --limit 10

# Development
deno task generate-types       # Generate TypeScript types
deno task clean                # Clean build artifacts
```

### Architecture

```
PostgreSQL (source)
    ↓ seed-db
SQLite Database (local)
    ↓ run:dev
Motia Pipeline (9 stages)
    ↓ LLM inference
SQLite Database (results)
    ↓ query
Console output
```

### Pipeline Stages

1. **Normalization** - Parse units/scale/currency (regex)
2. **Time Inference** - Infer reporting frequency & time basis (LLM)
3. **Scale Inference** - Confirm measurement scale (LLM)
4. **Currency Check** - Validate currency denomination (LLM)
5. **Family Assignment** - Assign to 7 indicator families (LLM)
6. **Type Classification** - Classify specific indicator type (LLM)
7. **Boolean Review** - Review for correctness (LLM)
8. **Final Review** - Apply corrections if needed (LLM)
9. **Complete** - Save to database with audit trail

## Contributing

When adding new documentation:

- Keep it concise and actionable
- Include code examples
- Test all commands before documenting
- Update this index when adding new docs
- Remove outdated docs promptly
