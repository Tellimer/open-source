#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * Initialize PostgreSQL schema
 *
 * Usage:
 *   POSTGRES_URL=postgresql://... deno task init:postgres
 */

import postgres from 'postgres';
import { CLASSIFY_WORKFLOW_POSTGRES_SCHEMA, SCHEMA_VERSION } from '../db/postgres-schema.ts';

async function main() {
  console.log('🗄️  PostgreSQL Schema Initializer\n');

  const postgresUrl = Deno.env.get('POSTGRES_URL') || Deno.env.get('DATABASE_URL');
  if (!postgresUrl) {
    console.error('❌ Error: POSTGRES_URL required');
    Deno.exit(1);
  }

  console.log(`🗄️  PostgreSQL: ${postgresUrl.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`📋 Schema version: ${SCHEMA_VERSION}\n`);

  // Connect using postgres library directly
  console.log('🔌 Connecting...');
  const sql = postgres(postgresUrl, { max: 1 });

  try {
    console.log('📝 Initializing schema...\n');

    const statements = CLASSIFY_WORKFLOW_POSTGRES_SCHEMA
      .split(';')
      .filter((stmt) => stmt.trim().length > 0);

    let tablesCreated = 0;
    let indexesCreated = 0;
    let existingObjects = 0;

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed) continue;

      try {
        await sql.unsafe(trimmed);

        if (trimmed.toUpperCase().includes('CREATE TABLE')) {
          const match = trimmed.match(/CREATE TABLE[^(]*?(\w+)/i);
          if (match) {
            console.log(`  ✅ Created table: ${match[1]}`);
            tablesCreated++;
          }
        } else if (trimmed.toUpperCase().includes('CREATE INDEX')) {
          const match = trimmed.match(/CREATE INDEX[^(]*?(\w+)/i);
          if (match) {
            console.log(`  ✅ Created index: ${match[1]}`);
            indexesCreated++;
          }
        }
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          existingObjects++;
          if (trimmed.toUpperCase().includes('CREATE TABLE')) {
            const match = trimmed.match(/CREATE TABLE[^(]*?(\w+)/i);
            if (match) console.log(`  ℹ️  Table exists: ${match[1]}`);
          } else if (trimmed.toUpperCase().includes('CREATE INDEX')) {
            const match = trimmed.match(/CREATE INDEX[^(]*?(\w+)/i);
            if (match) console.log(`  ℹ️  Index exists: ${match[1]}`);
          }
        } else {
          console.error(`\n❌ Error:\n${trimmed}\n`, error);
          throw error;
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary');
    console.log('='.repeat(50));
    console.log(`✅ Tables created: ${tablesCreated}`);
    console.log(`✅ Indexes created: ${indexesCreated}`);
    console.log(`ℹ️  Already existed: ${existingObjects}`);
    console.log(`\n✨ Schema ready!\n`);
    console.log('Next: deno task sync:postgres');

  } catch (error) {
    console.error('\n❌ Failed:', error);
    Deno.exit(1);
  } finally {
    await sql.end();
  }
}

if (import.meta.main) {
  main();
}
