#!/usr/bin/env -S deno run --allow-all
/**
 * Production Database Seeding Script
 *
 * Seeds Railway libSQL database with all 668 indicators and time series data
 *
 * Usage:
 *   deno task prod:seed
 *
 * Environment variables:
 *   RAILWAY_DATABASE_URL=libsql://libsql-production-classify.up.railway.app:443
 *   RAILWAY_DATABASE_TOKEN=your_auth_token
 *
 * @module
 */

import { createClient } from "@libsql/client";
import { INDICATORS_DATA } from "../../data/indicators.ts";
import { COUNTRY_INDICATORS } from "../../data/country_indicators.ts";

async function seedProductionDatabase() {
  console.log("\n🌱 Seeding Production Database (Railway libSQL)");
  console.log("=".repeat(60));

  // Get connection details from environment
  const dbUrl = Deno.env.get("RAILWAY_DATABASE_URL");
  const authToken = Deno.env.get("RAILWAY_DATABASE_TOKEN");

  if (!dbUrl) {
    console.error(
      "❌ ERROR: RAILWAY_DATABASE_URL environment variable not set",
    );
    Deno.exit(1);
  }

  console.log(`📍 Database URL: ${dbUrl}`);
  console.log(`🔐 Auth: ${authToken ? "✓ Token provided" : "✗ No token"}`);
  console.log(`📊 Indicators: ${INDICATORS_DATA.length}`);
  console.log(`📊 Country Indicators: ${COUNTRY_INDICATORS.length}\n`);

  try {
    // Create libSQL client
    console.log("🔌 Connecting to Railway libSQL...");
    const client = createClient({
      url: dbUrl,
      authToken: authToken,
    });

    // Test connection
    await client.execute("SELECT 1");
    console.log("✅ Connected successfully\n");

    // Insert indicators
    console.log("💾 Inserting indicators...");
    let indicatorCount = 0;
    const validIndicatorIds = new Set<string>();

    for (const ind of INDICATORS_DATA) {
      try {
        await client.execute({
          sql: `INSERT OR REPLACE INTO source_indicators (
            id, name, source_name, source_url, long_name, category_group,
            dataset, aggregation_method, definition, units, scale, periodicity,
            topic, created_at, updated_at, deleted_at, currency_code
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            ind.id,
            ind.name,
            ind.source_name,
            ind.source_url,
            ind.long_name,
            ind.category_group,
            ind.dataset,
            ind.aggregation_method,
            ind.definition,
            ind.units,
            ind.scale,
            ind.periodicity,
            ind.topic,
            ind.created_at,
            ind.updated_at,
            ind.deleted_at,
            ind.currency_code,
          ],
        });
        validIndicatorIds.add(ind.id);
        indicatorCount++;

        if (indicatorCount % 100 === 0) {
          console.log(
            `   Inserted ${indicatorCount}/${INDICATORS_DATA.length} indicators...`,
          );
        }
      } catch (_error) {
        console.error(
          `   ⚠️  Failed to insert indicator ${ind.id}: ${error.message}`,
        );
      }
    }

    console.log(
      `✅ Inserted ${indicatorCount}/${INDICATORS_DATA.length} indicators\n`,
    );

    // Insert country indicators (time series)
    console.log("💾 Inserting country indicators (time series data)...");
    let valueCount = 0;
    let skippedCount = 0;
    const batchSize = 1000;

    for (let i = 0; i < COUNTRY_INDICATORS.length; i += batchSize) {
      const batch = COUNTRY_INDICATORS.slice(i, i + batchSize);

      for (const val of batch) {
        // Skip if indicator_id doesn't exist
        if (!validIndicatorIds.has(val.indicator_id)) {
          skippedCount++;
          continue;
        }

        try {
          await client.execute({
            sql: `INSERT OR REPLACE INTO source_country_indicators (
              id, country_iso, indicator_id, date, is_forecasted, value,
              source_updated_at, created_at, updated_at, deleted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              val.id,
              val.country_iso,
              val.indicator_id,
              val.date,
              val.is_forecasted ? 1 : 0,
              val.value,
              val.source_updated_at,
              val.created_at,
              val.updated_at,
              val.deleted_at,
            ],
          });
          valueCount++;
        } catch (_error) {
          skippedCount++;
        }
      }

      if ((i + batchSize) % 10000 === 0) {
        console.log(
          `   Inserted ${valueCount}/${COUNTRY_INDICATORS.length} values...`,
        );
      }
    }

    console.log(
      `✅ Inserted ${valueCount}/${COUNTRY_INDICATORS.length} country indicators`,
    );
    if (skippedCount > 0) {
      console.log(`   ⚠️  Skipped ${skippedCount} invalid entries\n`);
    } else {
      console.log("");
    }

    // Get final statistics
    const statsQueries = [
      {
        name: "Total Indicators",
        query: "SELECT COUNT(*) as count FROM source_indicators",
      },
      {
        name: "Total Country Indicators",
        query: "SELECT COUNT(*) as count FROM source_country_indicators",
      },
      {
        name: "Avg Values per Indicator",
        query:
          "SELECT ROUND(CAST(COUNT(*) AS REAL) / (SELECT COUNT(*) FROM source_indicators), 1) as avg FROM source_country_indicators",
      },
    ];

    console.log("📊 Final Statistics:");
    console.log("=".repeat(60));
    for (const { name, query } of statsQueries) {
      try {
        const result = await client.execute(query);
        const value = result.rows[0]?.count || result.rows[0]?.avg || 0;
        console.log(`   ${name.padEnd(35)}: ${value}`);
      } catch (_error) {
        console.log(`   ${name.padEnd(35)}: Error`);
      }
    }
    console.log("=".repeat(60));

    console.log("\n✅ Production database seeded successfully!\n");
    console.log("Next step:");
    console.log(
      "  Run: deno task prod:run      # Run classification pipeline\n",
    );
  } catch (_error) {
    console.error("\n❌ Seeding failed:");
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}\n`,
    );
    console.error("Stack trace:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await seedProductionDatabase();
}
