#!/usr/bin/env -S deno run --allow-all
/**
 * Production Database Setup Script
 *
 * Sets up the V2 pipeline schema on Railway-hosted libSQL database
 *
 * Usage:
 *   deno task prod:setup
 *
 * Environment variables:
 *   RAILWAY_DATABASE_URL=libsql://libsql-production-classify.up.railway.app:443
 *   RAILWAY_DATABASE_TOKEN=your_auth_token
 *
 * @module
 */

import { createClient } from '@libsql/client';
import { V2_SCHEMA } from '../../src/v2/db/schema.ts';

async function setupProductionDatabase() {
  console.log('\n📦 Setting up Production Database (Railway libSQL)');
  console.log('='.repeat(60));

  // Get connection details from environment
  const dbUrl = Deno.env.get('RAILWAY_DATABASE_URL');
  const authToken = Deno.env.get('RAILWAY_DATABASE_TOKEN');

  if (!dbUrl) {
    console.error('❌ ERROR: RAILWAY_DATABASE_URL environment variable not set');
    console.error('\nExpected format: libsql://libsql-production-classify.up.railway.app:443');
    Deno.exit(1);
  }

  console.log(`📍 Database URL: ${dbUrl}`);
  console.log(`🔐 Auth: ${authToken ? '✓ Token provided' : '✗ No token (using public access)'}\n`);

  try {
    // Create libSQL client
    console.log('🔌 Connecting to Railway libSQL...');
    const client = createClient({
      url: dbUrl,
      authToken: authToken,
    });

    // Test connection
    const testResult = await client.execute('SELECT 1');
    console.log('✅ Connection successful\n');

    // Execute schema
    console.log('📋 Creating V2 pipeline schema...');

    // Try executeMultiple first (most efficient for libSQL)
    let schemaExecuted = false;
    try {
      await client.executeMultiple(V2_SCHEMA);
      console.log('✅ Schema created successfully (batch mode)\n');
      schemaExecuted = true;
    } catch (batchError) {
      console.log('   Batch execution not supported, using statement-by-statement...');
    }

    // Fallback to individual statements if batch failed
    if (!schemaExecuted) {
      const statements = V2_SCHEMA
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let successCount = 0;
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        try {
          await client.execute(statement + ';');
          successCount++;
          if ((i + 1) % 5 === 0) {
            console.log(`   Executed ${successCount}/${statements.length} statements...`);
          }
        } catch (error) {
          // Ignore "already exists" and "duplicate" errors
          const errMsg = String(error.message || error);
          if (!errMsg.includes('already exists') && !errMsg.includes('duplicate') && !errMsg.includes('UNIQUE constraint')) {
            console.error(`   ⚠️  Statement ${i + 1} failed: ${errMsg}`);
          }
        }
      }
      console.log(`✅ Schema execution completed (${successCount}/${statements.length} statements)\n`);
    }

    // Verify tables
    const tablesResult = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    console.log(`📊 Tables created (${tablesResult.rows.length}):`);
    for (const row of tablesResult.rows) {
      console.log(`   • ${row.name}`);
    }

    // Get stats
    const statsQueries = [
      { name: 'indicators', query: 'SELECT COUNT(*) as count FROM source_indicators' },
      { name: 'country_indicators', query: 'SELECT COUNT(*) as count FROM source_country_indicators' },
      { name: 'classifications', query: 'SELECT COUNT(*) as count FROM classifications' },
      { name: 'router_results', query: 'SELECT COUNT(*) as count FROM router_results' },
      { name: 'specialist_results', query: 'SELECT COUNT(*) as count FROM specialist_results' },
      { name: 'validation_results', query: 'SELECT COUNT(*) as count FROM validation_results' },
    ];

    console.log('\n📈 Database Statistics:');
    for (const { name, query } of statsQueries) {
      try {
        const result = await client.execute(query);
        const count = result.rows[0]?.count || 0;
        console.log(`   • ${name}: ${count}`);
      } catch {
        console.log(`   • ${name}: 0 (table not ready)`);
      }
    }

    console.log('\n✅ Production database setup complete!\n');
    console.log('Next steps:');
    console.log('  1. Run: deno task prod:seed     # Seed with indicators');
    console.log('  2. Run: deno task prod:run      # Run classification pipeline\n');

  } catch (error) {
    console.error('\n❌ Setup failed:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}\n`);
    console.error('Stack trace:', error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await setupProductionDatabase();
}
