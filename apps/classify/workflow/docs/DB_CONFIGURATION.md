# Database Configuration Guide

The classify-workflow supports both PostgreSQL and SQLite for storing classification results.

## Quick Reference

```bash
# Local development (SQLite)
deno task run:dev

# Production with PostgreSQL
POSTGRES_URL="postgresql://..." deno task run:dev

# Initialize PostgreSQL schema
POSTGRES_URL="postgresql://..." deno task init:postgres

# Sync SQLite data to PostgreSQL
POSTGRES_URL="postgresql://..." deno task sync:postgres

# Preview sync without making changes
POSTGRES_URL="postgresql://..." deno task sync:postgres:dry-run
```

## Quick Start

### SQLite (Default - Local Development)
No configuration needed. The workflow automatically uses SQLite if no PostgreSQL URL is provided:
```bash
deno task run:dev
```

### PostgreSQL (Remote/Production)
Set the `POSTGRES_URL` environment variable:
```bash
export POSTGRES_URL="postgresql://user:password@host:5432/classify_workflow"
deno task run:dev
```

Or add to `.env`:
```env
POSTGRES_URL=postgresql://user:password@host:5432/classify_workflow
```

### Syncing Local Data to PostgreSQL
```bash
# 1. Initialize schema
POSTGRES_URL="postgresql://..." deno task init:postgres

# 2. Sync data
POSTGRES_URL="postgresql://..." deno task sync:postgres
```

## When to Use Each Database

### Use SQLite When:
- Local development (fast, zero-config)
- Single-user workflows
- Prototyping
- Embedded deployments
- Data portability

### Use PostgreSQL When:
- Remote storage
- Concurrent access / multiple instances
- Production deployments
- Advanced querying / analytics
- Team collaboration (shared DB)

## Architecture Details

### Hybrid Approach (Recommended for Production)
```
Motia State (SQLite) → fast local coordination
            ↓
Classification Results (PostgreSQL) → shared, durable, queryable
```

Why:
- Motia internal state doesn't need remote access
- Results benefit from PostgreSQL features
- Separation of concerns: workflow state vs business data

## Implementation Notes

Automatic database selection:
```typescript
if (POSTGRES_URL || DATABASE_URL) {
  // Use PostgreSQL
} else {
  // Use SQLite (default)
}
```

Unified API:
```typescript
import { getDatabase } from "./src/db/client.ts";

const db = getDatabase();
db.query("SELECT * FROM classifications");
```

## Syncing Data Between Databases

### SQLite → PostgreSQL
```bash
# Initialize PostgreSQL schema
POSTGRES_URL="postgresql://user:pass@host/db" deno task init:postgres

# Sync all data from SQLite to PostgreSQL
POSTGRES_URL="postgresql://user:pass@host/db" deno task sync:postgres

# Dry run preview
POSTGRES_URL="postgresql://user:pass@host/db" deno task sync:postgres:dry-run
```

Options:
```bash
# Sync specific tables
deno task sync:postgres -- --tables=classifications,time_inference_results

# Custom batch size (default: 100)
deno task sync:postgres -- --batch-size=500

# Dry run
deno task sync:postgres -- --dry-run
```

## Environment Variables

```bash
# Primary PostgreSQL URL (takes precedence)
POSTGRES_URL=postgresql://user:password@host:5432/dbname

# Alternative PostgreSQL URL
DATABASE_URL=postgresql://user:password@host:5432/dbname

# SQLite path (fallback)
CLASSIFY_DB_LOCAL_DEV=./data/classify-workflow-local-dev.db
```

See also: `docs/DATABASE_PERSISTENCE.md` for schema details.

