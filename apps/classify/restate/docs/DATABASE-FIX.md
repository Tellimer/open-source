# Database Connection Fix - Root Cause Analysis

## Problem Summary

The cluster was running successfully (all 5 nodes + 10 services), workflows were executing (trace IDs confirmed), but **ZERO data was being saved to the database**.

## Root Cause

**Services were trying to connect to `localhost:5432` instead of `timescaledb:5432`**

### Why This Happened

Inside Docker containers, `localhost` refers to the container itself, not the host machine or other containers. The services needed to connect to the TimescaleDB container using its Docker service name: `timescaledb`.

### Configuration Error

The `.env` file had:
```bash
POSTGRES_HOST=localhost              # ❌ WRONG for Docker
DATABASE_URL=postgres://classify:classify@localhost:5432/classify  # ❌ WRONG
```

This overrode the docker-compose defaults which were correct:
```yaml
environment:
  POSTGRES_HOST: ${POSTGRES_HOST:-timescaledb}  # Defaults to timescaledb
```

## Evidence

1. **Empty Database:**
   ```sql
   SELECT COUNT(*) FROM classifications;  -- Result: 0
   SELECT COUNT(*) FROM normalization_results;  -- Result: 0
   SELECT COUNT(*) FROM processing_log;  -- Result: 0
   ```

2. **Connection Errors in Logs:**
   ```
   PostgresError: Connection closed
   code: "ERR_POSTGRES_CONNECTION_CLOSED"

   RestateError: (500) Connection closed
   Related command: run [log-workflow-start]
   ```

3. **Wrong Environment Variables:**
   ```bash
   $ docker exec restate-classify-service-1-1 env | grep POSTGRES_HOST
   POSTGRES_HOST=localhost  # ❌ Services couldn't connect
   ```

4. **Restate was Retrying:**
   - Logs showed Restate automatically retrying failed database operations
   - Workflows kept running but database saves silently failed
   - No obvious errors surfaced to the classification script

## The Fix

### Changed `.env` file:
```bash
# Before:
POSTGRES_HOST=localhost
DATABASE_URL=postgres://classify:classify@localhost:5432/classify

# After:
POSTGRES_HOST=timescaledb
DATABASE_URL=postgres://classify:classify@timescaledb:5432/classify
```

### Verification After Fix:
```bash
$ docker exec restate-classify-service-1-1 env | grep POSTGRES_HOST
POSTGRES_HOST=timescaledb  # ✅ Correct!
```

## Why Errors Weren't Surfaced

1. **Restate's Automatic Retry Mechanism:**
   - Restate treats database connection errors as transient
   - Automatically retries with exponential backoff (7s, 10s, 12s...)
   - Error code: RT0007
   - This masked the underlying connection problem

2. **Workflow Continued:**
   - LLM stages (normalize, family, type, etc.) completed successfully
   - Only the final database write stage failed
   - Script saw successful trace IDs and assumed everything worked

3. **Silent Failures:**
   - No obvious error messages in the classification script output
   - Had to dig into container logs to find the `Connection closed` errors
   - Database operations failed but didn't crash the services

## Prevention

### For Docker Development:

**Create `.env.docker`:**
```bash
POSTGRES_HOST=timescaledb
DATABASE_URL=postgres://classify:classify@timescaledb:5432/classify
```

**Create `.env.local`:**
```bash
POSTGRES_HOST=localhost
DATABASE_URL=postgres://classify:classify@localhost:5432/classify
```

**Update docker-compose:**
```yaml
services:
  classify-service-1:
    env_file:
      - .env.docker  # Use Docker-specific env file
```

### Add Health Checks

Add database connectivity checks to service startup:

```typescript
// src/index.ts (pseudo-code)
async function verifyDatabaseConnection() {
  try {
    await db`SELECT 1`;
    console.log('✅ Database connection verified');
  } catch (error) {
    console.error('❌ FATAL: Cannot connect to database!');
    process.exit(1);  // Fail fast instead of silent failures
  }
}
```

### Monitoring

Add explicit database write verification:

```typescript
// After classification workflow
const saved = await db`SELECT COUNT(*) FROM classifications WHERE indicator_id = ${id}`;
if (saved[0].count === 0) {
  throw new Error(`Classification for ${id} was not saved!`);
}
```

## Lessons Learned

1. **Environment-specific configuration is critical** - What works locally doesn't work in Docker
2. **Retry logic can mask errors** - Automatic retries are good but need monitoring
3. **Always verify end-to-end** - Check database after workflows, not just trace IDs
4. **Check container logs early** - The errors were there, just not surfaced
5. **Fail fast is better than silent failure** - Service should crash if DB is unreachable

## Testing After Fix

Run a small test batch to verify database writes:

```bash
cd /Users/seanknowles/Projects/tellimer/open-source/apps/classify/restate

# Start just the cluster (no classification yet)
bun run cluster:start

# Wait for services to be ready (30-60s)

# Run a test with 5 indicators
bun run src/scripts/classify-cluster.ts --rpm=100 --limit=5 --openai

# Verify database writes
docker exec restate-timescaledb-1 psql -U classify -d classify -c "SELECT COUNT(*) FROM classifications;"
# Should show: count = 5
```

## Status

✅ `.env` file fixed
✅ Cluster restarted with correct configuration
✅ Services now connecting to `timescaledb:5432`
✅ Database ready and accepting connections
⏳ Ready for testing

## Next Steps

1. Run small test batch (5-10 indicators)
2. Verify classifications table has new rows
3. Check for any remaining "Connection closed" errors in logs
4. If successful, run full 10,903 indicator batch
