/**
 * Database Client Factory
 * Automatically selects PostgreSQL or SQLite based on POSTGRES_URL env variable
 * @module
 */

import Database from "better-sqlite3";
import process from "node:process";
import { CLASSIFY_WORKFLOW_SCHEMA } from "./schema.ts";
import { CLASSIFY_WORKFLOW_POSTGRES_SCHEMA } from "./postgres-schema.ts";
import { SQLiteClient } from "./sqlite-client.ts";
import { PostgresClient } from "./postgres-client.ts";
import { ensurePostgresCompatMigrations } from "./postgres-migrations.ts";
import type { DatabaseClient, DatabaseType } from "./types.ts";

let dbInstance: DatabaseClient | null = null;
let dbType: DatabaseType | null = null;
let connectionString: string | null = null;
let isInitialized = false;

/**
 * Detect which database to use based on environment variables
 */
function detectDatabaseType(): { type: DatabaseType; connection: string } {
  // Support both Deno and Node.js environments
  const getEnv = (key: string): string | undefined => {
    if (typeof Deno !== "undefined" && Deno.env) {
      return Deno.env.get(key);
    }
    return process.env[key];
  };

  // Explicit override: allow forcing DB selection regardless of URLs present
  const dbOverride = (getEnv("CLASSIFY_DB") || "").toLowerCase(); // 'sqlite' | 'postgres'
  const forceSqlite = getEnv("CLASSIFY_FORCE_SQLITE") === "1";

  if (dbOverride === "sqlite" || forceSqlite) {
    const sqlitePath = getEnv("CLASSIFY_DB_LOCAL_DEV") ||
      "./data/classify-workflow-local-dev.db";
    console.log("[DB] CLASSIFY_DB override -> sqlite");
    return { type: "sqlite", connection: sqlitePath };
  }

  if (dbOverride === "postgres") {
    const forcedPgUrl = getEnv("POSTGRES_URL") || getEnv("DATABASE_URL");
    if (forcedPgUrl) {
      console.log("[DB] CLASSIFY_DB override -> postgres");
      return { type: "postgres", connection: forcedPgUrl };
    } else {
      console.warn(
        "[DB] CLASSIFY_DB=postgres set but no POSTGRES_URL/DATABASE_URL found; falling back to sqlite",
      );
    }
  }

  const postgresUrl = getEnv("POSTGRES_URL") || getEnv("DATABASE_URL");

  if (postgresUrl) {
    console.log("[DB] PostgreSQL URL detected, using PostgreSQL");
    return { type: "postgres", connection: postgresUrl };
  }

  const sqlitePath = getEnv("CLASSIFY_DB_LOCAL_DEV") ||
    "./data/classify-workflow-local-dev.db";

  console.log("[DB] No PostgreSQL URL found, using SQLite");
  return { type: "sqlite", connection: sqlitePath };
}

/**
 * Get or create database connection
 * Automatically selects PostgreSQL or SQLite based on POSTGRES_URL env variable
 */
export function getDatabase(path?: string): DatabaseClient {
  const { type, connection: detectedConnection } = detectDatabaseType();
  const requestedConnection = path || detectedConnection;

  // Return existing instance if same type and connection
  if (
    dbInstance &&
    dbType === type &&
    connectionString === requestedConnection
  ) {
    return dbInstance;
  }

  // Close existing connection if changed
  if (
    dbInstance &&
    (dbType !== type || connectionString !== requestedConnection)
  ) {
    console.log(
      `[DB] Switching from ${dbType}:${connectionString} to ${type}:${requestedConnection}`,
    );
    dbInstance.close();
    dbInstance = null;
    isInitialized = false;
  }

  // Create new connection
  if (!isInitialized) {
    console.log(`[DB] Opening ${type} database: ${requestedConnection}`);
  }

  dbType = type;
  connectionString = requestedConnection;

  if (type === "postgres") {
    dbInstance = new PostgresClient(requestedConnection);
    // Run lightweight compatibility migrations once per process after a short delay
    try {
      const delay = Number(process.env.MIGRATIONS_DELAY_MS || "2000");
      setTimeout(
        () => {
          ensurePostgresCompatMigrations(dbInstance);
        },
        isNaN(delay) ? 2000 : delay,
      );
    } catch (_) {
      // best-effort
    }
  } else {
    // SQLite
    const sqliteDb = new Database(requestedConnection);

    // Enable WAL mode optimizations for SQLite
    sqliteDb.pragma("journal_mode = WAL");
    sqliteDb.pragma("synchronous = NORMAL");
    sqliteDb.pragma("busy_timeout = 15000");
    sqliteDb.pragma("wal_autocheckpoint = 500");
    sqliteDb.pragma("journal_size_limit = 67108864");

    if (!isInitialized) {
      console.log("[DB] WAL mode enabled with optimized settings");
    }

    dbInstance = new SQLiteClient(sqliteDb);
  }

  if (!isInitialized) {
    console.log(`[DB] ${type} connection established`);
    isInitialized = true;
  }

  return dbInstance;
}

/**
 * Get current database type
 */
export function getDatabaseType(): DatabaseType | null {
  return dbType;
}

/**
 * Initialize database schema
 */
export function initializeSchema(db: DatabaseClient): void {
  const currentType = getDatabaseType();

  // For PostgreSQL, skip schema initialization in workflow
  // Schema should be initialized separately using init:postgres script
  if (currentType === "postgres") {
    console.log(
      "[DB] PostgreSQL detected - assuming schema already initialized",
    );
    console.log('[DB] Run "deno task init:postgres" if tables are missing');
    return;
  }

  console.log(`[DB] Initializing ${currentType} schema...`);

  // Only SQLite initialization runs here (Postgres returned above)
  const schema = CLASSIFY_WORKFLOW_SCHEMA;

  // Split schema by semicolons and execute each statement
  const statements = schema.split(";").filter((stmt) => stmt.trim().length > 0);

  for (const statement of statements) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) {
      try {
        db.exec(trimmed);
      } catch (error) {
        // Ignore errors for duplicate table/index creation
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (
          !errorMsg.includes("already exists") &&
          !errorMsg.includes("duplicate key")
        ) {
          console.error(`[DB] Error executing statement: ${trimmed}`, error);
          throw error;
        }
      }
    }
  }

  console.log("[DB] Schema initialized successfully");
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    dbType = null;
    connectionString = null;
    isInitialized = false;
    console.log("[DB] Database closed");
  }
}

/**
 * Transaction helper (now uses DatabaseClient.transaction)
 */
export async function withTransaction<T>(
  db: DatabaseClient,
  fn: () => T | Promise<T>,
): Promise<T> {
  return await db.transaction(fn);
}
