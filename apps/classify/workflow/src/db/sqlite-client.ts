/**
 * SQLite Database Client Adapter
 * Wraps better-sqlite3 with DatabaseClient interface
 * @module
 */

import Database from "better-sqlite3";
import type { DatabaseClient, PreparedStatement } from "./types.ts";

export class SQLiteClient implements DatabaseClient {
  constructor(private db: Database.Database) {}

  exec(sql: string): void {
    this.db.exec(sql);
  }

  query<T = unknown>(sql: string, params: unknown[] = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  queryOne<T = unknown>(sql: string, params: unknown[] = []): T | null {
    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params);
    return result ? (result as T) : null;
  }

  run(
    sql: string,
    params: unknown[] = [],
  ): { changes: number; lastInsertRowid?: number } {
    const stmt = this.db.prepare(sql);
    const info = stmt.run(...params);
    return {
      changes: info.changes,
      lastInsertRowid: Number(info.lastInsertRowid),
    };
  }

  prepare(sql: string): PreparedStatement {
    return new SQLitePreparedStatement(this.db.prepare(sql));
  }

  async transaction<T>(fn: () => T | Promise<T>): Promise<T> {
    this.db.exec("BEGIN TRANSACTION");
    try {
      const result = await fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }
}

class SQLitePreparedStatement implements PreparedStatement {
  constructor(private stmt: Database.Statement) {}

  run(params: unknown[] = []): { changes: number; lastInsertRowid?: number } {
    const info = this.stmt.run(...params);
    return {
      changes: info.changes,
      lastInsertRowid: Number(info.lastInsertRowid),
    };
  }

  get<T = unknown>(params: unknown[] = []): T | null {
    const result = this.stmt.get(...params);
    return result ? (result as T) : null;
  }

  all<T = unknown>(params: unknown[] = []): T[] {
    return this.stmt.all(...params) as T[];
  }
}
