/**
 * Test script for explain metadata functionality
 */

import { createPipeline } from "./src/workflows/economic-data-workflow.ts";
import type { PipelineConfig, ParsedData } from "./src/workflows/economic-data-workflow.ts";

// Test data with XOF currency (like the Benin example)
const testData: ParsedData[] = [
  {
    value: -482.58,
    unit: "XOF Billions",
    name: "Benin Balance of Trade",
    id: "BEN",
  },
  {
    value: 1000,
    unit: "USD Million",
    name: "US Investment",
    id: "US",
  },
];

// Pipeline configuration with explain enabled
const config: PipelineConfig = {
  targetCurrency: "USD",
  targetMagnitude: "millions",
  targetTimeScale: "month",
  useLiveFX: false,
  fxFallback: {
    base: "USD",
    rates: {
      XOF: 558.16, // Correct XOF rate
    },
  },
  explain: true, // Enable explain metadata
};

async function testExplain() {
  console.log("🧪 Testing explain metadata functionality...\n");

  const pipeline = createPipeline(config);
  const result = await pipeline.run(testData);

  console.log("📊 Results:");
  result.forEach((item, index) => {
    console.log(`\n${index + 1}. ${item.name} (${item.id})`);
    console.log(`   Original: ${item.value} ${item.unit}`);
    console.log(`   Normalized: ${item.normalized} ${item.normalizedUnit}`);
    
    if (item.explain) {
      console.log("   📋 Explain metadata:");
      
      if (item.explain.fx) {
        console.log(`      💱 FX: ${item.explain.fx.rate} ${item.explain.fx.currency} per ${item.explain.fx.base}`);
        console.log(`         Source: ${item.explain.fx.source} (${item.explain.fx.sourceId})`);
      }
      
      if (item.explain.magnitude) {
        console.log(`      📏 Magnitude: ${item.explain.magnitude.originalScale} → ${item.explain.magnitude.targetScale}`);
        console.log(`         Factor: ${item.explain.magnitude.factor}`);
      }
      
      if (item.explain.units) {
        console.log(`      🏷️  Units: "${item.explain.units.originalUnit}" → "${item.explain.units.normalizedUnit}"`);
      }
    } else {
      console.log("   ⚠️  No explain metadata");
    }
  });

  // Verify the XOF conversion is correct
  const benin = result.find(item => item.id === "BEN");
  if (benin && benin.normalized) {
    const expectedValue = -482.58 * 1000 / 558.16; // Convert billions to millions, then XOF to USD
    console.log(`\n✅ Benin conversion check:`);
    console.log(`   Expected: ${expectedValue.toFixed(2)} USD Millions`);
    console.log(`   Actual: ${benin.normalized.toFixed(2)} USD Millions`);
    console.log(`   Match: ${Math.abs(expectedValue - benin.normalized) < 0.01 ? "✅" : "❌"}`);
  }
}

if (import.meta.main) {
  testExplain().catch(console.error);
}
