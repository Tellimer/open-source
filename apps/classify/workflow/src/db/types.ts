/**
 * Database abstraction types
 * Supports both PostgreSQL and SQLite
 * @module
 */

export interface DatabaseClient {
  /**
   * Execute a SQL statement without returning results
   */
  exec(sql: string): void;

  /**
   * Execute a SQL statement and return all results
   */
  query<T = unknown>(sql: string, params?: unknown[]): T[];

  /**
   * Execute a SQL statement and return first result
   */
  queryOne<T = unknown>(sql: string, params?: unknown[]): T | null;

  /**
   * Execute a SQL statement (for INSERT, UPDATE, DELETE)
   */
  run(
    sql: string,
    params?: unknown[]
  ): { changes: number; lastInsertRowid?: number };

  /**
   * Prepare a statement for multiple executions
   */
  prepare(sql: string): PreparedStatement;

  /**
   * Begin a transaction
   */
  transaction<T>(fn: () => T | Promise<T>): Promise<T>;

  /**
   * Close the connection
   */
  close(): void;

  /**
   * OPTIONAL: Return underlying postgres Sql instance when using postgres driver
   */
  getSql?(): unknown;
}

export interface PreparedStatement {
  run(params?: unknown[]): { changes: number; lastInsertRowid?: number };
  get<T = unknown>(params?: unknown[]): T | null;
  all<T = unknown>(params?: unknown[]): T[];
}

export type DatabaseType = 'sqlite' | 'postgres';
