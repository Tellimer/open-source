/**
 * PostgreSQL Database Client using Bun's native SQL
 * https://bun.sh/docs/api/sql
 * @module
 */

import { SQL } from 'bun';
import { CLASSIFY_WORKFLOW_POSTGRES_SCHEMA } from './schema.ts';

/**
 * Database configuration
 */
export interface DatabaseConfig {
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

/**
 * Get database connection URL
 * Priority: config.url > DATABASE_URL > individual env vars > defaults
 */
function getDatabaseUrl(config?: DatabaseConfig): string {
  if (config?.url) {
    return config.url;
  }

  // Check for DATABASE_URL (standard convention)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Fall back to individual environment variables
  const host = config?.host || process.env.POSTGRES_HOST || 'localhost';
  const port = config?.port || Number(process.env.POSTGRES_PORT) || 5432;
  const database = config?.database || process.env.POSTGRES_DB || 'classify';
  const username = config?.username || process.env.POSTGRES_USER || 'classify';
  const password = config?.password || process.env.POSTGRES_PASSWORD || 'classify';

  return `postgres://${username}:${password}@${host}:${port}/${database}`;
}

/**
 * Singleton database connection instance
 */
let dbInstance: InstanceType<typeof SQL> | null = null;

/**
 * Get or create database connection (singleton pattern)
 * @param config Optional database configuration (only used on first call)
 * @returns SQL database instance
 */
export function getDb(config?: DatabaseConfig): InstanceType<typeof SQL> {
  if (!dbInstance) {
    dbInstance = new SQL(getDatabaseUrl(config));
  }
  return dbInstance;
}

/**
 * Close the database connection (useful for cleanup in scripts)
 */
export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Execute raw SQL (use sparingly - prefer template literals via getDb())
 * @deprecated Use template literals with getDb() instead: getDb()`SELECT * FROM table`
 */
export async function unsafe<T = any>(
  queryText: string,
  params: any[] = []
): Promise<T[]> {
  const db = getDb();
  const result = params.length > 0
    ? await db.unsafe(queryText, params)
    : await db.unsafe(queryText);
  return result as T[];
}

/**
 * Transaction helper using Bun SQL API
 */
export async function transaction<T>(
  callback: (sql: ReturnType<typeof getDb>) => Promise<T>
): Promise<T> {
  const db = getDb();

  await db`BEGIN`;
  try {
    const result = await callback(db);
    await db`COMMIT`;
    return result;
  } catch (error) {
    await db`ROLLBACK`;
    throw error;
  }
}

/**
 * Initialize the database schema
 */
export async function initializeSchema(): Promise<void> {
  const db = getDb();
  await db.unsafe(CLASSIFY_WORKFLOW_POSTGRES_SCHEMA);
  console.log('✓ Database schema initialized');
}

/**
 * Check if database is connected
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const db = getDb();
    const result = await db`SELECT 1 as connected`;
    return result.length > 0 && result[0].connected === 1;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

/**
 * Get database connection (for repository)
 * @deprecated Use getDb() directly with template literals
 */
export function getDatabase(config?: DatabaseConfig) {
  return {
    url: getDatabaseUrl(config),
    sql: getDb(config),
    unsafe,
    transaction,
  };
}
