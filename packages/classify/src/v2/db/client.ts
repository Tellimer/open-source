/**
 * V2 Pipeline Database Client
 * Supports both local SQLite files and remote Railway-hosted databases
 * @module
 */

import { Database } from "@db/sqlite";
import type { DatabaseConfig } from "../types.ts";
import { SCHEMA_VERSION, V2_SCHEMA } from "./schema.ts";

/**
 * Database Client for V2 Pipeline
 * Handles connection to local or remote SQLite databases
 */
export class V2DatabaseClient {
  private db: Database | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Initialize database connection and schema
   */
  async initialize(): Promise<void> {
    if (this.db) {
      throw new Error("Database already initialized");
    }

    try {
      // Connect based on type
      if (this.config.type === "local") {
        await this.connectLocal();
      } else {
        await this.connectRemote();
      }

      // Auto-migrate if enabled
      if (this.config.autoMigrate !== false) {
        await this.migrate();
      }

      // Enable WAL mode for local databases (better concurrency)
      if (this.config.type === "local" && this.config.walMode !== false) {
        this.db!.exec("PRAGMA journal_mode = WAL;");
      }
    } catch (error) {
      throw new Error(
        `Failed to initialize database: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Connect to local SQLite file
   */
  private async connectLocal(): Promise<void> {
    this.db = await new Database(this.config.path);
  }

  /**
   * Connect to remote SQLite database (e.g., Railway)
   * Note: Railway SQLite support requires HTTP/REST adapter
   */
  private connectRemote(): void {
    // For Railway, we need to use libSQL or HTTP-based SQLite
    // This is a placeholder - actual implementation depends on Railway's SQLite offering

    // Option 1: If Railway provides libSQL (Turso-compatible)
    if (
      this.config.path.startsWith("libsql://") ||
      this.config.path.startsWith("https://")
    ) {
      // Use libSQL client (would need to add as dependency)
      throw new Error(
        "Remote SQLite via libSQL not yet implemented. " +
          "Please use local database or implement libSQL client.",
      );
    } // Option 2: If Railway provides SQLite via HTTP REST API
    else if (
      this.config.path.startsWith("http://") ||
      this.config.path.startsWith("https://")
    ) {
      // Use HTTP client wrapper
      throw new Error(
        "Remote SQLite via HTTP not yet implemented. " +
          "Please use local database or implement HTTP adapter.",
      );
    } else {
      throw new Error(
        `Invalid remote database URL: ${this.config.path}. ` +
          "Expected libsql:// or https:// URL for Railway SQLite.",
      );
    }
  }

  /**
   * Run database migrations
   */
  private async migrate(): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      // Check current schema version
      let currentVersion = 0;
      try {
        const result = this.db
          .prepare(
            "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1",
          )
          .value<[number]>();

        if (result) {
          currentVersion = result[0];
        }
      } catch {
        // schema_version table doesn't exist yet
      }

      // Apply migrations if needed
      if (currentVersion < SCHEMA_VERSION) {
        await this.db!.exec(V2_SCHEMA);
      }
    } catch (error) {
      throw new Error(
        `Migration failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Execute a SQL query
   */
  exec(sql: string): void {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    this.db.exec(sql);
  }

  /**
   * Prepare a SQL statement
   */
  prepare(sql: string) {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return this.db.prepare(sql);
  }

  /**
   * Run a transaction
   */
  transaction<T>(fn: () => T): T {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    this.exec("BEGIN TRANSACTION;");
    try {
      const result = fn();
      this.exec("COMMIT;");
      return result;
    } catch (error) {
      this.exec("ROLLBACK;");
      throw error;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.db !== null;
  }

  /**
   * Get underlying Database instance (use with caution)
   */
  getDb(): Database {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return this.db;
  }
}

/**
 * Create a database client with default local configuration
 */
export function createLocalDatabase(
  path: string = "./data/classify_v2.db",
): V2DatabaseClient {
  return new V2DatabaseClient({
    type: "local",
    path,
    walMode: true,
    autoMigrate: true,
  });
}

/**
 * Create a database client for Railway-hosted SQLite
 */
export function createRemoteDatabase(
  url: string,
  auth?: { token?: string; username?: string; password?: string },
): V2DatabaseClient {
  return new V2DatabaseClient({
    type: "remote",
    path: url,
    auth,
    autoMigrate: true,
  });
}
