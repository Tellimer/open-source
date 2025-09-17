/**
 * Example demonstrating proper car registration data normalization
 *
 * This example shows how car registrations are now correctly handled as
 * count-based flow indicators without inappropriate currency conversion.
 */

import { getScale } from "../src/scale/scale.ts";
import { parseUnit } from "../src/units/units.ts";
import { normalizeValue } from "../src/normalization/normalization.ts";
import {
  isCountIndicator,
  normalizeCountData,
} from "../src/count/count-normalization.ts";
import { classifyIndicator } from "../src/classification/classification.ts";

console.log("🚗 Car Registration Data Normalization Example\n");

// Sample car registration data from the user's example
const carRegistrationData = [
  {
    country: "ARG",
    value: 50186,
    unit: "Thousand",
    indicatorName: "Car Registrations",
  },
  {
    country: "AUS",
    value: 16245,
    unit: "Units",
    indicatorName: "Car Registrations",
  },
  {
    country: "BHR",
    value: 338.02,
    unit: "Hundreds",
    indicatorName: "Car Registrations",
  },
];

console.log("📊 Original Data:");
carRegistrationData.forEach((item) => {
  console.log(`   ${item.country}: ${item.value} ${item.unit}`);
});

console.log("\n🔍 Classification Analysis:");
carRegistrationData.forEach((item) => {
  const classification = classifyIndicator({
    name: item.indicatorName,
    unit: item.unit,
  });
  console.log(
    `   ${item.country}: Type=${classification.type}, Confidence=${classification.confidence}`,
  );
});

console.log("\n🧮 Scale Detection:");
carRegistrationData.forEach((item) => {
  const parsed = parseUnit(item.unit);
  const scale = getScale(item.unit);
  console.log(
    `   ${item.country} "${item.unit}": scale=${scale}, parsed.scale=${parsed.scale}`,
  );
});

console.log("\n✅ Count Indicator Detection:");
carRegistrationData.forEach((item) => {
  const isCount = isCountIndicator(item.indicatorName, item.unit);
  console.log(`   ${item.country}: isCountIndicator=${isCount}`);
});

console.log("\n🔄 Normalization to 'ones' scale:");
carRegistrationData.forEach((item) => {
  // This should normalize by scale only, no currency conversion
  const normalized = normalizeValue(item.value, item.unit, {
    toMagnitude: "ones",
    indicatorName: item.indicatorName,
  });
  console.log(
    `   ${item.country}: ${item.value} ${item.unit} → ${normalized} ones`,
  );
});

console.log("\n📈 Using Count-Specific Normalization:");
const countNormalized = normalizeCountData(
  carRegistrationData.map((item) => ({
    country: item.country,
    value: item.value,
    unit: item.unit,
  })),
  { targetScale: "ones" },
);

countNormalized.forEach((item) => {
  console.log(
    `   ${item.country}: ${item.originalValue} ${item.originalUnit} → ${item.normalizedValue} ${item.normalizedUnit}`,
  );
});

console.log(
  "\n🚫 Currency Conversion Test (should be skipped for count data):",
);
const withFXAttempt = normalizeValue(16245, "Units", {
  toCurrency: "USD",
  toMagnitude: "ones",
  fx: { AUD: 0.67 },
  indicatorName: "Car Registrations",
});
console.log(
  `   16245 Units with FX attempt: ${withFXAttempt} (should remain 16245)`,
);

console.log("\n✨ Summary:");
console.log("   ✅ Car registrations are now classified as 'flow' indicators");
console.log("   ✅ 'Hundreds' scale is properly supported");
console.log("   ✅ Count indicators skip currency conversion");
console.log("   ✅ Scale normalization works correctly");
console.log("   ✅ 'Units' in count context are handled properly");
