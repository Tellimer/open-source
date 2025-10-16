/**
 * Query classification results from SQLite database
 *
 * Usage:
 *   deno run --allow-read --allow-env --env src/scripts/query-results.ts
 *   deno run --allow-read --allow-env --env src/scripts/query-results.ts --limit 10
 *   deno run --allow-read --allow-env --env src/scripts/query-results.ts --family physical-fundamental
 *   deno run --allow-read --allow-env --env src/scripts/query-results.ts --type balance-of-payments
 */

import { getDatabase } from "../db/client.ts";
import { getClassifications } from "../db/persist.ts";

// Parse command line arguments
const args = Deno.args;
let limit = 25;
let family: string | undefined;
let indicator_type: string | undefined;
let review_status: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--limit" && args[i + 1]) {
    limit = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--family" && args[i + 1]) {
    family = args[i + 1];
    i++;
  } else if (args[i] === "--type" && args[i + 1]) {
    indicator_type = args[i + 1];
    i++;
  } else if (args[i] === "--status" && args[i + 1]) {
    review_status = args[i + 1];
    i++;
  }
}

async function queryResults() {
  try {
    const db = getDatabase();

    console.log("📊 Querying classification results...\n");
    console.log(
      `   Filters: ${family ? `family=${family}` : ""} ${
        indicator_type ? `type=${indicator_type}` : ""
      } ${review_status ? `status=${review_status}` : ""}`,
    );
    console.log(`   Limit: ${limit}\n`);

    // Get overall statistics
    const totalRows = db.query("SELECT COUNT(*) as count FROM classifications");
    const total = totalRows[0][0] as number;

    const familyStats = db.query(`
      SELECT family, COUNT(*) as count 
      FROM classifications 
      WHERE family IS NOT NULL 
      GROUP BY family 
      ORDER BY count DESC
    `);

    const typeStats = db.query(`
      SELECT indicator_type, COUNT(*) as count 
      FROM classifications 
      WHERE indicator_type IS NOT NULL 
      GROUP BY indicator_type 
      ORDER BY count DESC
    `);

    const statusStats = db.query(`
      SELECT review_status, COUNT(*) as count 
      FROM classifications 
      WHERE review_status IS NOT NULL 
      GROUP BY review_status 
      ORDER BY count DESC
    `);

    console.log("📈 Overall Statistics:");
    console.log(`   Total classifications: ${total}`);
    console.log("");

    console.log("   By Family:");
    for (const row of familyStats) {
      console.log(`     ${row[0]}: ${row[1]}`);
    }
    console.log("");

    console.log("   By Type (top 10):");
    for (const row of typeStats.slice(0, 10)) {
      console.log(`     ${row[0]}: ${row[1]}`);
    }
    console.log("");

    console.log("   By Review Status:");
    for (const row of statusStats) {
      console.log(`     ${row[0]}: ${row[1]}`);
    }
    console.log("");

    // Get filtered results
    const results = getClassifications(db, {
      family,
      indicator_type,
      review_status,
      limit,
    });

    if (results.length === 0) {
      console.log("❌ No results found");
      return;
    }

    console.log(
      `📋 Classification Results (showing ${results.length} of ${total}):\n`,
    );

    for (const result of results) {
      console.log(
        `─────────────────────────────────────────────────────────────`,
      );
      console.log(`Indicator: ${result.name}`);
      console.log(`ID: ${result.indicator_id}`);
      console.log("");
      console.log(
        `Family: ${result.family || "N/A"} (confidence: ${
          (
            ((result.family_confidence as number) || 0) * 100
          ).toFixed(1)
        }%)`,
      );
      console.log(
        `Type: ${result.indicator_type || "N/A"} (confidence: ${
          (
            ((result.type_confidence as number) || 0) * 100
          ).toFixed(1)
        }%)`,
      );
      console.log(`Temporal: ${result.temporal_aggregation || "N/A"}`);
      console.log("");
      console.log(`Time Basis: ${result.time_basis || "N/A"}`);
      console.log(`Reporting Freq: ${result.reporting_frequency || "N/A"}`);
      console.log(`Scale: ${result.scale || "N/A"}`);
      console.log(
        `Currency: ${result.is_currency_denominated ? "Yes" : "No"}${
          result.detected_currency ? ` (${result.detected_currency})` : ""
        }`,
      );
      console.log("");
      console.log(`Review Status: ${result.review_status || "N/A"}`);
      console.log(
        `Overall Confidence: ${
          (
            ((result.overall_confidence as number) || 0) * 100
          ).toFixed(1)
        }%`,
      );
      console.log(`Provider: ${result.provider || "N/A"}`);
      console.log(`Created: ${result.created_at}`);
      console.log("");

      if (result.family_reasoning) {
        console.log(`Family Reasoning: ${result.family_reasoning}`);
      }
      if (result.type_reasoning) {
        console.log(`Type Reasoning: ${result.type_reasoning}`);
      }
    }

    console.log(
      `─────────────────────────────────────────────────────────────\n`,
    );
    console.log(`✅ Query complete (${results.length} results)`);
  } catch (error) {
    console.error("❌ Error querying results:", error);
    Deno.exit(1);
  }
}

// Run the query
await queryResults();
