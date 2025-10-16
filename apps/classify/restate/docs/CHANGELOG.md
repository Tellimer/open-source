# Changelog

## 2025-10-16 - Fixed Workflow Timeout (IMPORTANT)

### Changed: Increased abort_timeout to 10 minutes

**Issue:** Workflows were timing out after 1 minute (Restate default). Classification takes 1-3 minutes per indicator (6 LLM calls), causing timeouts and failures.

**Error seen:**
```
[500 Internal] the invocation stream was closed after the 'abort timeout' (1m) fired.
```

**Fix:** Added `defaultServiceOptions({ abortTimeout: "10m" })` to endpoint configuration in [src/index.ts](../src/index.ts:28-32).

**Code change:**
```typescript
restate
  .endpoint()
  .defaultServiceOptions({
    abortTimeout: "10m",  // Allow 10 minutes for LLM calls
  })
  .bind(...)
```

**After updating:**
```bash
# Restart service
bun run dev

# Re-register with Restate
curl -X POST http://localhost:9070/deployments \
  -H 'content-type: application/json' \
  -d '{"uri": "http://localhost:9080"}'
```

## 2025-10-16 - Fixed Service Startup with .listen()

### Changed: Migrated from `http2Handler()` to `listen()`

**Issue:** The service was calling `endpoint.http2Handler({ port, hostname })` which returns a request handler function but doesn't actually start the HTTP server. This caused the service to appear to start but not bind to the port.

**Fix:** Changed to use `endpoint.listen(port)` which properly starts the HTTP server.

**Changes:**

1. **[src/index.ts](src/index.ts:61)**
   - Changed from `endpoint.http2Handler({ port, hostname })` to `await endpoint.listen(PORT)`
   - Removed server.close() references in shutdown handlers

**Before:**
```typescript
const server = endpoint.http2Handler({
  port: PORT,
  hostname: HOST,
});
```

**After:**
```typescript
await endpoint.listen(PORT);
```

**Verification:**
- Service now properly binds to port 9080
- Successfully registers with Restate runtime
- Health endpoint responds correctly

## 2025-01-16 - Workflow Pattern Fix

### Changed: Migrated from `restate.object()` to `restate.workflow()`

**Issue:** The classification orchestrator was implemented using `restate.object()` which is a generic Virtual Object pattern. This works but doesn't provide workflow-specific semantics and context.

**Fix:** Migrated to `restate.workflow()` which is the proper pattern for durable workflows.

**Changes:**

1. **[src/workflows/classification.workflow.ts](src/workflows/classification.workflow.ts)**
   - Changed from `restate.object()` to `restate.workflow()`
   - Changed handler from `start` to `run` (workflow convention)
   - Updated context type from `ObjectContext` to `WorkflowContext`
   - Updated shared handler context to `WorkflowSharedContext`
   - Workflow ID (key) now accessed via `ctx.key` instead of being passed as parameter

2. **[src/api/classify.api.ts](src/api/classify.api.ts)**
   - Changed `ctx.objectSendClient()` to `ctx.workflowSendClient()` for fire-and-forget invocations
   - Changed `ctx.objectClient()` to `ctx.workflowClient()` for status queries
   - Updated handler invocation from `.start()` to `.run()`

3. **[src/index.ts](src/index.ts)**
   - Updated documentation to reflect "Workflow" instead of "Virtual Object"

**Benefits:**

✅ **Proper Workflow Semantics** - Uses workflow-specific context and patterns
✅ **Better Restate Integration** - Workflows appear correctly in Restate Admin UI
✅ **Clearer Intent** - Code explicitly shows this is a durable workflow
✅ **Future-Proof** - Aligns with Restate best practices and documentation

**Example Before:**
```typescript
const workflow = restate.object({
  name: "classification-workflow",
  handlers: {
    start: async (ctx: restate.ObjectContext, input) => { ... }
  }
});

// Invocation
ctx.objectSendClient({ name: "classification-workflow" }, key).start(input);
```

**Example After:**
```typescript
const workflow = restate.workflow({
  name: "classification-workflow",
  handlers: {
    run: async (ctx: WorkflowContext, input) => {
      const workflowId = ctx.key; // Automatically set from invocation
      ...
    }
  }
});

// Invocation
ctx.workflowSendClient({ name: "classification-workflow" }, key).run(input);
```

**References:**
- [Restate Workflows Documentation](https://docs.restate.dev/use-cases/workflows)
- [WorkflowContext API](https://docs.restate.dev/develop/ts/workflows)

## Previous Changes

See [MIGRATION_STATUS.md](MIGRATION_STATUS.md) for full migration history from Motia to Restate.
