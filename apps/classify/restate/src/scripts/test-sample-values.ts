/**
 * Test script to verify sample_values parsing from database
 * Run with: bun run src/scripts/test-sample-values.ts
 */

import { sql } from "bun";
import { getDb } from "../db/client.ts";

interface SourceIndicator {
  id: string;
  name: string;
  sample_values: string | null;
}

async function testSampleValues() {
  console.log("🧪 Testing sample_values parsing...\n");

  const db = getDb();

  // Fetch a few indicators
  const indicators = await db`
    SELECT id, name, sample_values
    FROM source_indicators
    LIMIT 5
  ` as unknown as SourceIndicator[];

  console.log(`✅ Fetched ${indicators.length} indicators\n`);

  for (const indicator of indicators) {
    console.log(`\n📊 Indicator: ${indicator.name} (${indicator.id})`);
    console.log(`   Has sample_values: ${!!indicator.sample_values}`);

    if (indicator.sample_values) {
      try {
        const parsed = JSON.parse(indicator.sample_values);
        console.log(`   Parsed successfully: ${Array.isArray(parsed) ? 'Array' : typeof parsed}`);
        console.log(`   Length: ${Array.isArray(parsed) ? parsed.length : 'N/A'}`);

        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`   First point: ${JSON.stringify(parsed[0])}`);
          console.log(`   Last point: ${JSON.stringify(parsed[parsed.length - 1])}`);

          // Test limiting to 50 points
          const limited = parsed.length > 50 ? parsed.slice(-50) : parsed;
          console.log(`   After limiting to 50: ${limited.length} points`);
        }
      } catch (error) {
        console.error(`   ❌ Parse error:`, error);
      }
    } else {
      console.log(`   ⚠️  No sample_values in database`);
    }
  }

  console.log("\n✅ Test complete");
}

// Run if called directly
if (import.meta.main) {
  testSampleValues().catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
}