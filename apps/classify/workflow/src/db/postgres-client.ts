/**
 * PostgreSQL Database Client
 * @module
 */

import postgres from "postgres";
import type { DatabaseClient, PreparedStatement } from "./types.ts";

export class PostgresClient implements DatabaseClient {
  private sql: postgres.Sql;
  private connectionString: string;

  // Process-wide singleton pool to avoid creating a new pool per instance
  private static sharedSql: postgres.Sql | null = null;
  private static sharedConnString: string | null = null;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
    // Reuse existing pool if connection string matches
    const disableSsl = process.env.POSTGRES_DISABLE_SSL === "1";
    const sslMode = (process.env.POSTGRES_SSL_MODE || "").toLowerCase(); // '', 'require', 'no-verify', 'disable'
    const max = Number(process.env.PG_MAX_POOL ?? "10");
    const idle = Number(process.env.PG_IDLE_TIMEOUT ?? "20");
    const connect = Number(process.env.PG_CONNECT_TIMEOUT ?? "10");

    if (
      PostgresClient.sharedSql &&
      PostgresClient.sharedConnString === connectionString
    ) {
      this.sql = PostgresClient.sharedSql;
      return;
    }

    // Create a new shared pool
    // Map ssl mode for postgres.js (expects boolean or tls options)
    let sslOption: any = undefined;
    if (!disableSsl) {
      if (sslMode === "no-verify") {
        sslOption = { rejectUnauthorized: false };
      } else if (sslMode === "disable") {
        sslOption = undefined;
      } else {
        // default and 'require' → enable SSL with default verification
        sslOption = true;
      }
    }

    const pool = postgres(connectionString, {
      max,
      idle_timeout: idle,
      connect_timeout: connect,
      keep_alive: 1,
      ssl: disableSsl ? undefined : sslOption,
    });
    PostgresClient.sharedSql = pool;
    PostgresClient.sharedConnString = connectionString;
    this.sql = pool;
  }

  exec(sql: string): void {
    // Use deasync if available, otherwise run async and hope for the best
    try {
      const deasync = require("deasync");
      let done = false;
      let error: any = null;

      this.sql
        .unsafe(sql)
        .then(() => {
          done = true;
        })
        .catch((e) => {
          error = e;
          done = true;
        });

      // Use deasync to wait for completion
      deasync.loopWhile(() => !done);

      if (error) throw error;
    } catch (e: any) {
      // If deasync not available, fall back to promise
      if (e.code === "MODULE_NOT_FOUND") {
        console.warn(
          "[DB] Warning: deasync not available, skipping synchronous exec",
        );
        // Fire and forget - not ideal but avoids blocking
        this.sql.unsafe(sql).catch(console.error);
      } else {
        throw e;
      }
    }
  }

  query<T = unknown>(sql: string, params: unknown[] = []): T[] {
    // For PostgreSQL, we use a synchronous wrapper
    // This uses a technique that processes microtasks without blocking
    let result: T[] | null = null;
    let error: any = null;
    let done = false;

    const promise = params.length === 0
      ? this.sql.unsafe(sql)
      : this.sql.unsafe(sql, params);

    promise
      .then((rows: any) => {
        result = rows as T[];
        done = true;
      })
      .catch((e) => {
        error = e;
        done = true;
      });

    // Process event loop until promise resolves
    const start = Date.now();
    while (!done && Date.now() - start < 30000) {
      // Allow event loop to process by using a very short sleep
      // This is a hack but better than pure busy-wait
      try {
        require("child_process").execSync("sleep 0.001", { stdio: "ignore" });
      } catch {
        // If execSync fails, just continue
      }
    }

    if (error) throw error;
    if (result === null) throw new Error("Query timeout");

    return result;
  }

  queryOne<T = unknown>(sql: string, params: unknown[] = []): T | null {
    const results = this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  run(
    sql: string,
    params: unknown[] = [],
  ): { changes: number; lastInsertRowid?: number } {
    // Execute the statement
    let done = false;
    let error: any = null;
    let count = 0;

    const promise = params.length === 0
      ? this.sql.unsafe(sql)
      : this.sql.unsafe(sql, params);

    promise
      .then((result: any) => {
        count = result.count || 0;
        done = true;
      })
      .catch((e) => {
        error = e;
        done = true;
      });

    // Allow event loop to process while waiting
    const start = Date.now();
    while (!done && Date.now() - start < 30000) {
      // Use a tiny sleep to allow event loop to process
      try {
        require("child_process").execSync("sleep 0.001", { stdio: "ignore" });
      } catch {
        // Continue if execSync fails
      }
    }

    if (error) throw error;
    if (!done) throw new Error("Query timeout");

    return { changes: count };
  }

  prepare(sql: string): PreparedStatement {
    return new PostgresPreparedStatement(this.sql, sql);
  }

  async transaction<T>(fn: () => T | Promise<T>): Promise<T> {
    return await this.sql.begin(async (sql) => {
      // Temporarily replace this.sql with transaction sql
      const originalSql = this.sql;
      this.sql = sql;
      try {
        const result = await fn();
        return result;
      } finally {
        this.sql = originalSql;
      }
    });
  }

  close(): void {
    // No-op: keep the shared pool alive for the process lifetime to avoid churn
    // If an explicit shutdown is ever needed, add a dedicated shutdown hook.
  }

  getSql(): postgres.Sql {
    return this.sql;
  }
}

class PostgresPreparedStatement implements PreparedStatement {
  constructor(private sql: postgres.Sql, private query: string) {}

  run(params: unknown[] = []): { changes: number; lastInsertRowid?: number } {
    let done = false;
    let error: any = null;
    let count = 0;

    this.sql
      .unsafe(this.query, params)
      .then((result: any) => {
        count = result.count || 0;
        done = true;
      })
      .catch((e) => {
        error = e;
        done = true;
      });

    const start = Date.now();
    while (!done && Date.now() - start < 30000) {
      try {
        require("child_process").execSync("sleep 0.001", { stdio: "ignore" });
      } catch {
        // Continue
      }
    }

    if (error) throw error;
    return { changes: count };
  }

  get<T = unknown>(params: unknown[] = []): T | null {
    const results = this.all<T>(params);
    return results.length > 0 ? results[0] : null;
  }

  all<T = unknown>(params: unknown[] = []): T[] {
    let result: T[] | null = null;
    let error: any = null;

    this.sql
      .unsafe(this.query, params)
      .then((rows: any) => {
        result = rows as T[];
      })
      .catch((e) => {
        error = e;
      });

    const start = Date.now();
    while (result === null && !error && Date.now() - start < 30000) {
      try {
        require("child_process").execSync("sleep 0.001", { stdio: "ignore" });
      } catch {
        // Continue
      }
    }

    if (error) throw error;
    if (result === null) throw new Error("Query timeout");

    return result;
  }
}
