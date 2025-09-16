/**
 * @fileoverview Explicit Metadata Fields Example
 * 
 * Demonstrates the new explicit metadata fields feature in v0.2.2+
 * that allows passing periodicity, scale, and currency_code as separate
 * fields instead of concatenating them into unit strings.
 * 
 * This approach provides:
 * - Higher accuracy (explicit fields are more reliable than string parsing)
 * - Better performance (less string parsing overhead)
 * - Cleaner code (matches database schema directly)
 * - Smart fallback (falls back to unit string parsing when explicit fields not provided)
 */

import { processEconomicData } from "../src/main.ts";
import type { PipelineOptions } from "../src/api/index.ts";

console.log("🏷️ Explicit Metadata Fields Example");
console.log("=====================================\n");

// Example 1: Clean database-style data with explicit metadata
console.log("📊 Example 1: Database-style explicit metadata");
console.log("-----------------------------------------------");

const databaseStyleData = [
  {
    value: -482.58,
    unit: "XOF Billion",           // Clean unit without time info
    periodicity: "Quarterly",      // 🆕 Explicit periodicity
    scale: "Billions",            // 🆕 Explicit scale  
    currency_code: "XOF",         // 🆕 Explicit currency
    name: "Benin Balance of Trade",
    id: "BEN_TRADE",
  },
  {
    value: -181.83,
    unit: "BDT Billion",           // Clean unit
    periodicity: "Monthly",        // 🆕 Different periodicity
    scale: "Billions",            // 🆕 Explicit scale
    currency_code: "BDT",         // 🆕 Different currency
    name: "Bangladesh Balance of Trade", 
    id: "BGD_TRADE",
  },
  {
    value: -119.22,
    unit: "BHD Million",           // Clean unit
    periodicity: "Yearly",         // 🆕 Annual data
    scale: "Millions",            // 🆕 Different scale
    currency_code: "BHD",         // 🆕 Different currency
    name: "Bahrain Balance of Trade",
    id: "BHR_TRADE",
  },
];

const options: PipelineOptions = {
  targetCurrency: "USD",
  targetMagnitude: "millions",
  targetTimeScale: "month",        // 🎯 Convert all to monthly
  explain: true,                   // 🔍 Show conversion details
  useLiveFX: false,
  fxFallback: {
    base: "USD",
    rates: {
      XOF: 558.16,  // West African CFA Franc
      BDT: 121.61,  // Bangladeshi Taka
      BHD: 0.37702, // Bahraini Dinar
    },
  },
};

const result1 = await processEconomicData(databaseStyleData, options);

console.log(`✅ Processed ${result1.data.length} indicators with explicit metadata\n`);

result1.data.forEach((item) => {
  console.log(`📈 ${item.name} (${item.id})`);
  console.log(`   Original: ${item.value} ${item.unit}`);
  console.log(`   Normalized: ${item.normalized?.toFixed(2)} ${item.normalizedUnit}`);
  
  if (item.explain) {
    // Show time scaling details
    if (item.explain.periodicity) {
      const p = item.explain.periodicity;
      console.log(`   ⏰ Time: ${p.original || 'none'} → ${p.target} (adjusted: ${p.adjusted ? 'Yes' : 'No'})`);
    }
    
    // Show FX conversion details
    if (item.explain.fx) {
      console.log(`   💱 FX: ${item.explain.fx.rate} ${item.explain.fx.currency}/USD`);
    }
    
    // Show magnitude scaling details
    if (item.explain.magnitude) {
      const m = item.explain.magnitude;
      console.log(`   📏 Scale: ${m.originalScale} → ${m.targetScale} (factor: ${m.factor}x)`);
    }
  }
  console.log();
});

// Example 2: Mixed explicit and parsed metadata
console.log("📊 Example 2: Mixed explicit and parsed metadata");
console.log("------------------------------------------------");

const mixedData = [
  {
    value: 50,
    unit: "GBP Billions per Year",  // Unit contains scale and periodicity
    currency_code: "GBP",           // 🆕 Only currency is explicit
    name: "UK Trade Balance",
    id: "GBR_TRADE",
  },
  {
    value: 75,
    unit: "EUR Millions per Quarter", // Unit contains currency and periodicity
    scale: "Millions",              // 🆕 Only scale is explicit
    name: "EU Investment Flow",
    id: "EUR_INVEST",
  },
  {
    value: 100,
    unit: "JPY Thousands per Month", // Unit contains currency and scale
    periodicity: "Monthly",         // 🆕 Only periodicity is explicit
    name: "Japan Consumer Spending",
    id: "JPN_CONSUMER",
  },
];

const result2 = await processEconomicData(mixedData, {
  targetCurrency: "USD",
  targetMagnitude: "millions",
  targetTimeScale: "month",
  explain: true,
  useLiveFX: false,
  fxFallback: {
    base: "USD",
    rates: { GBP: 0.79, EUR: 0.85, JPY: 149.50 },
  },
});

console.log(`✅ Processed ${result2.data.length} indicators with mixed metadata\n`);

result2.data.forEach((item) => {
  console.log(`📈 ${item.name} (${item.id})`);
  console.log(`   Original: ${item.value} ${item.unit}`);
  console.log(`   Normalized: ${item.normalized?.toFixed(2)} ${item.normalizedUnit}`);
  
  if (item.explain) {
    console.log(`   🔍 Metadata sources:`);
    
    if (item.explain.fx) {
      console.log(`      💱 Currency: ${item.explain.fx.currency} (from ${item.currency_code ? 'explicit field' : 'unit string'})`);
    }
    
    if (item.explain.magnitude) {
      console.log(`      📏 Scale: ${item.explain.magnitude.originalScale} (from ${item.scale ? 'explicit field' : 'unit string'})`);
    }
    
    if (item.explain.periodicity) {
      console.log(`      ⏰ Periodicity: ${item.explain.periodicity.original} (from ${item.periodicity ? 'explicit field' : 'unit string'})`);
    }
  }
  console.log();
});

// Example 3: Fallback behavior with null/empty explicit fields
console.log("📊 Example 3: Fallback behavior with null/empty fields");
console.log("------------------------------------------------------");

const fallbackData = [
  {
    value: 200,
    unit: "USD Millions per Quarter",
    currency_code: null as any,     // 🔍 Null explicit field
    scale: "",                      // 🔍 Empty explicit field  
    periodicity: undefined,         // 🔍 Undefined explicit field
    name: "US Investment (fallback test)",
    id: "USA_FALLBACK",
  },
];

const result3 = await processEconomicData(fallbackData, {
  targetCurrency: "USD",
  targetMagnitude: "millions",
  targetTimeScale: "month",
  explain: true,
  useLiveFX: false,
  fxFallback: { base: "USD", rates: { USD: 1.0 } },
});

console.log(`✅ Processed ${result3.data.length} indicator with fallback parsing\n`);

result3.data.forEach((item) => {
  console.log(`📈 ${item.name} (${item.id})`);
  console.log(`   Original: ${item.value} ${item.unit}`);
  console.log(`   Normalized: ${item.normalized?.toFixed(2)} ${item.normalizedUnit}`);
  console.log(`   🔍 All metadata parsed from unit string (explicit fields were null/empty)`);
  
  if (item.explain?.periodicity) {
    console.log(`   ⏰ Time conversion: ${item.explain.periodicity.original} → ${item.explain.periodicity.target}`);
  }
  console.log();
});

console.log("🎯 Key Benefits of Explicit Metadata Fields:");
console.log("   ✅ Higher accuracy than string parsing");
console.log("   ✅ Better performance (less parsing overhead)");
console.log("   ✅ Cleaner code that matches database schemas");
console.log("   ✅ Smart fallback to unit string parsing when needed");
console.log("   ✅ Automatic case normalization ('Quarterly' → 'quarter')");
console.log("   ✅ Full backward compatibility");
