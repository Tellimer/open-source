/**
 * Migrate database schema to add classification result tables
 *
 * Run this to add all the new result tables to an existing database.
 */

import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";
import { CLASSIFY_WORKFLOW_SCHEMA } from "../db/schema.ts";

async function migrateSchema() {
  const dbPath = Deno.env.get("CLASSIFY_DB_LOCAL_DEV") ||
    "./data/classify-workflow-local-dev.db";

  console.log("📦 Migrating database schema...");
  console.log(`   Database: ${dbPath}\n`);

  const db = new DB(dbPath);

  try {
    // Split schema by semicolons and execute each statement
    const statements = CLASSIFY_WORKFLOW_SCHEMA.split(";").filter(
      (stmt) => stmt.trim().length > 0,
    );

    let created = 0;
    let skipped = 0;

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed.length > 0) {
        try {
          db.execute(trimmed);
          if (trimmed.toLowerCase().includes("create table")) {
            const match = trimmed.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
            if (match) {
              console.log(`✅ Created table: ${match[1]}`);
              created++;
            }
          }
        } catch (error) {
          // Table might already exist
          if (error.message.includes("already exists")) {
            skipped++;
          } else {
            console.error(`❌ Error executing statement:`, error);
            throw error;
          }
        }
      }
    }

    // Verify tables were created
    const tables = db.query<[string]>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );

    console.log("\n📊 Current tables:");
    for (const [name] of tables) {
      console.log(`   - ${name}`);
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Created: ${created} tables`);
    console.log(`   Skipped: ${skipped} (already existed)`);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    Deno.exit(1);
  } finally {
    db.close();
  }
}

// Run the migration
await migrateSchema();
