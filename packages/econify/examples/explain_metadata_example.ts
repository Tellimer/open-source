/**
 * Example showing how to use the enhanced explain metadata feature (v0.2.4+)
 * This demonstrates comprehensive conversion transparency and how consumers should use it
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

      // 🆕 Enhanced conversion summary (v0.2.4+)
      if (item.explain.conversion) {
        console.log(
          `      🔄 Conversion Summary: ${item.explain.conversion.summary}`,
        );
        console.log(
          `         Total Factor: ${item.explain.conversion.totalFactor}`,
        );
        console.log("         Steps:");
        item.explain.conversion.steps.forEach((step, i) => {
          console.log(`           ${i + 1}. ${step}`);
        });
      }

      // 🆕 Enhanced magnitude scaling with direction
      if (item.explain.magnitude) {
        console.log(
          `      📏 Magnitude: ${item.explain.magnitude.description}`,
        );
        console.log(`         Direction: ${item.explain.magnitude.direction}`);
        console.log(`         Factor: ${item.explain.magnitude.factor}x`);
      }

      // 🆕 Enhanced time adjustments with direction
      if (item.explain.periodicity) {
        console.log(
          `      ⏰ Periodicity: ${
            item.explain.periodicity.description || "No conversion"
          }`,
        );
        console.log(
          `         Direction: ${item.explain.periodicity.direction}`,
        );
        console.log(`         Factor: ${item.explain.periodicity.factor}`);
        console.log(
          `         Adjusted: ${
            item.explain.periodicity.adjusted ? "Yes" : "No"
          }`,
        );
      }
      if (item.explain.reportingFrequency) {
        console.log(
          `         Reporting Frequency: ${item.explain.reportingFrequency}`,
        );
      }

      // 🆕 Enhanced unit strings with full units
      if (item.explain.units) {
        console.log(
          `      🏷️  Original Unit: "${item.explain.units.originalUnit}"`,
        );
        console.log(
          `         Normalized Unit: "${item.explain.units.normalizedUnit}"`,
        );
        if (item.explain.units.originalFullUnit) {
          console.log(
            `         Original Full: "${item.explain.units.originalFullUnit}"`,
          );
        }
        if (item.explain.units.normalizedFullUnit) {
          console.log(
            `         Normalized Full: "${item.explain.units.normalizedFullUnit}"`,
          );
        }
      }
    }
  });

  // Example of how to build tooltip metadata using explain data
  console.log("\n🔧 Example tooltip metadata generation:");

  const benin = result.data.find((item) => item.id === "BEN");
  if (benin?.explain) {
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

async function demonstrateExplicitMetadataWithExplain() {
  console.log(
    "\n🆕 Demonstrating explicit metadata fields with explain (v0.2.2+)...\n",
  );

  // Data with explicit metadata fields
  const explicitData = [
    {
      value: -482.58,
      unit: "XOF Billion", // Clean unit
      periodicity: "Quarterly", // 🆕 Explicit periodicity
      scale: "Billions", // 🆕 Explicit scale
      currency_code: "XOF", // 🆕 Explicit currency
      name: "Benin Balance of Trade",
      id: "BEN_EXPLICIT",
    },
  ];

  const result = await processEconomicData(explicitData, {
    targetCurrency: "USD",
    targetMagnitude: "millions",
    targetTimeScale: "month",
    explain: true,
    useLiveFX: false,
    fxFallback: snpFallbackRates,
  });

  const item = result.data[0];
  const ex = item.explain;

  console.log(`📊 ${item.name}:`);
  console.log(`   Original: ${item.value} ${item.unit}`);
  console.log(
    `   Normalized: ${item.normalized?.toFixed(2)} ${item.normalizedUnit}`,
  );
  console.log(`   🔍 Metadata sources:`);
  console.log(`      💱 Currency: ${ex?.fx?.currency} (from explicit field)`);
  console.log(
    `      📏 Scale: ${ex?.magnitude?.originalScale} (from explicit field)`,
  );
  console.log(
    `      ⏰ Periodicity: ${ex?.periodicity?.original} (from explicit field)`,
  );
  console.log(
    `   ✅ All metadata used explicit fields instead of parsing unit string`,
  );
}

async function demonstrateEnhancedExplainFeatures() {
  console.log("\n🆕 Demonstrating Enhanced Explain Features (v0.2.4+)...\n");

  // Complex conversion example
  const complexData = [{
    value: -1447.74,
    unit: "XOF Million",
    periodicity: "Quarterly",
    scale: "Billions",
    currency_code: "XOF",
    name: "Complex Conversion Example",
    id: "COMPLEX",
  }];

  const result = await processEconomicData(complexData, {
    targetCurrency: "USD",
    targetMagnitude: "millions",
    targetTimeScale: "month",
    explain: true,
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { XOF: 558.16 } },
  });

  const item = result.data[0];
  console.log("🔍 Enhanced Explain Metadata Features:");
  console.log(JSON.stringify(item.explain, null, 2));

  console.log("\n✨ Key Enhanced Features:");
  console.log("1. 🔄 Conversion Summary with step-by-step breakdown");
  console.log("2. 📏 Magnitude direction indicators (upscale/downscale)");
  console.log("3. ⏰ Periodicity direction indicators (upsample/downsample)");
  console.log("4. 🏷️ Complete unit information (simple + full units)");
  console.log("5. 🧮 Total conversion factor for verification");
  console.log("6. 📝 Human-readable descriptions for all conversions");
}

if (import.meta.main) {
  await demonstrateExplainMetadata();
  await demonstrateExplicitMetadataWithExplain();
  await demonstrateEnhancedExplainFeatures();
  exampleWrapperUpdate();
}
