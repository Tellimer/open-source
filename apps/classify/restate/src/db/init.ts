/**
 * Database Initialization Script
 * Creates all required tables and indexes
 */

import { SQL } from "bun";
import { CLASSIFY_WORKFLOW_POSTGRES_SCHEMA } from "./schema.ts";

/**
 * Get database connection URL
 * Priority: DATABASE_URL > individual env vars > defaults
 */
function getDatabaseUrl(): string {
  // Check for DATABASE_URL (standard convention)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Fall back to individual environment variables
  const host = process.env.POSTGRES_HOST || "localhost";
  const port = Number(process.env.POSTGRES_PORT) || 5432;
  const database = process.env.POSTGRES_DB || "classify";
  const username = process.env.POSTGRES_USER || "classify";
  const password = process.env.POSTGRES_PASSWORD || "classify";

  return `postgres://${username}:${password}@${host}:${port}/${database}`;
}

async function initializeDatabase() {
  console.log("🔧 Initializing database...");
  const dbUrl = getDatabaseUrl();
  console.log(`📍 Connection: ${dbUrl.replace(/:[^:]*@/, ':****@')}`);

  // Create SQL instance with connection URL
  const db = new SQL(dbUrl);

  try {
    // Execute schema creation
    console.log("📋 Creating schema...");

    // Execute entire schema at once - Bun SQL supports multiple statements in unsafe()
    try {
      await db.unsafe(CLASSIFY_WORKFLOW_POSTGRES_SCHEMA);
      console.log("✅ Schema created successfully");
    } catch (error) {
      // Ignore "already exists" errors
      if (error instanceof Error && !error.message.includes('already exists')) {
        console.error(`❌ Schema creation error:`, error);
        throw error;
      }
      console.log("✅ Schema already exists or partially created");
    }

    // Verify tables using template literal
    console.log("\n📊 Verifying tables...");
    const result = await db`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    ` as Array<{ table_name: string }>;

    console.log(`✅ Found ${result.length} tables:`);
    result.forEach((row) => {
      console.log(`   - ${row.table_name}`);
    });

    console.log("\n✅ Database initialization complete!");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.main) {
  initializeDatabase()
    .then(() => {
      console.log("\n✅ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Failed:", error);
      process.exit(1);
    });
}

export { initializeDatabase };
