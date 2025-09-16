/**
 * Example showing how to use the new explain metadata feature
 * This demonstrates how consumers should update their code to use explain metadata
 */

import { processEconomicData } from "../src/main.ts";
import type { PipelineOptions } from "../src/api/index.ts";

// Example data similar to what cross-country-export-core might process
const economicData = [
  {
    value: -482.58,
    unit: "XOF Billions",
    name: "Benin Balance of Trade",
    id: "BEN",
  },
  {
    value: 1000,
    unit: "EUR Millions",
    name: "Germany Investment",
    id: "DEU",
  },
  {
    value: 150000,
    unit: "JPY Millions",
    name: "Japan Revenue",
    id: "JPN",
  },
];

// SNP fallback rates (like what cross-country-export-core uses)
const snpFallbackRates = {
  base: "USD",
  rates: {
    XOF: 558.16, // Correct XOF rate
    EUR: 0.92,
    JPY: 150,
  },
};

async function demonstrateExplainMetadata() {
  console.log("🧪 Demonstrating explain metadata feature...\n");

  // Configuration with explain enabled
  const options: PipelineOptions = {
    targetCurrency: "USD",
    targetMagnitude: "millions",
    targetTimeScale: "month",
    useLiveFX: false,
    fxFallback: snpFallbackRates,
    explain: true, // 🆕 Enable explain metadata
  };

  const result = await processEconomicData(economicData, options);

  console.log("📊 Results with explain metadata:");

  result.data.forEach((item, index) => {
    console.log(`\n${index + 1}. ${item.name} (${item.id})`);
    console.log(`   Original: ${item.value} ${item.unit}`);
    console.log(`   Normalized: ${item.normalized} ${item.normalizedUnit}`);

    if (item.explain) {
      console.log("   📋 Explain metadata:");

      // FX information
      if (item.explain.fx) {
        console.log(
          `      💱 FX Rate: ${item.explain.fx.rate} ${item.explain.fx.currency} per ${item.explain.fx.base}`,
        );
        console.log(
          `         Source: ${item.explain.fx.source} (${item.explain.fx.sourceId})`,
        );
        if (item.explain.fx.asOf) {
          console.log(`         As of: ${item.explain.fx.asOf}`);
        }
      }

      // Magnitude scaling
      if (item.explain.magnitude) {
        console.log(
          `      📏 Magnitude: ${item.explain.magnitude.originalScale} → ${item.explain.magnitude.targetScale}`,
        );
        console.log(`         Factor: ${item.explain.magnitude.factor}x`);
      }

      // Time adjustments
      if (item.explain.periodicity) {
        console.log(
          `      ⏰ Periodicity: ${
            item.explain.periodicity.original || "none"
          } → ${item.explain.periodicity.target}`,
        );
        console.log(
          `         Adjusted: ${
            item.explain.periodicity.adjusted ? "Yes" : "No"
          }`,
        );
      }

      // Unit strings
      if (item.explain.units) {
        console.log(
          `      🏷️  Units: "${item.explain.units.originalUnit}" → "${item.explain.units.normalizedUnit}"`,
        );
      }
    }
  });

  // Example of how to build tooltip metadata using explain data
  console.log("\n🔧 Example tooltip metadata generation:");

  const benin = result.data.find((item) => item.id === "BEN");
  if (benin && benin.explain) {
    const tooltipMetadata = {
      original_value: -482.58,
      normalized_value: benin.normalized!,
      normalized_units: benin.explain.units?.normalizedUnit || "USD Millions",
      normalization_metadata: {
        indicator_type: "economic_indicator",
        original_currency: benin.explain.fx?.currency || "XOF",
        original_scale: benin.explain.magnitude?.originalScale || "billions",
        original_periodicity: benin.explain.periodicity?.original || "unknown",
        fx_rate: benin.explain.fx?.rate || 1, // 🎯 True spot rate!
        scale_factor: benin.explain.magnitude?.factor || 1, // 🎯 Magnitude conversion!
        periodicity_adjusted: benin.explain.periodicity?.adjusted || false,
        conversion_method: benin.explain.fx?.source === "live"
          ? "econify_live"
          : "econify",
        data_points_used: 1,
        confidence: "high",
        validation_status: "passed",
        notes: [],
      },
    };

    console.log("   Tooltip metadata:");
    console.log(JSON.stringify(tooltipMetadata, null, 4));

    console.log("\n✅ Key improvements:");
    console.log(
      `   - fx_rate: ${tooltipMetadata.normalization_metadata.fx_rate} (true spot rate, not ratio)`,
    );
    console.log(
      `   - scale_factor: ${tooltipMetadata.normalization_metadata.scale_factor} (magnitude conversion)`,
    );
    console.log(
      `   - normalized_units: "${tooltipMetadata.normalized_units}" (clear unit string)`,
    );
  }
}

// Example of how cross-country-export-core should update their wrapper
function exampleWrapperUpdate() {
  console.log("\n📝 Example wrapper update for cross-country-export-core:");
  console.log(`
// Before (calculating metadata manually):
const metadata = {
  fx_rate: original_value / normalized_value, // ❌ Wrong! Mixed units
  scale_factor: scaleToMillions(scale),
  // ...
};

// After (using explain metadata):
const options: PipelineOptions = {
  targetCurrency: 'USD',
  targetMagnitude: 'millions',
  explain: true, // 🆕 Enable explain
  // ...
};

const result = await processEconomicData(data, options);
const item = result.data[0];
const ex = item.explain;

const metadata = {
  fx_rate: ex?.fx?.rate ?? fallbackRate, // ✅ True spot rate
  scale_factor: ex?.magnitude?.factor ?? 1, // ✅ Magnitude factor
  normalized_units: ex?.units?.normalizedUnit || 'USD Millions',
  conversion_method: ex?.fx?.source === 'live' ? 'econify_live' : 'econify',
  // ...
};
  `);
}

if (import.meta.main) {
  await demonstrateExplainMetadata();
  exampleWrapperUpdate();
}
