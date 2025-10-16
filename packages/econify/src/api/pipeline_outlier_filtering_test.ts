/**
 * Tests for outlier filtering functionality
 */

import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { processEconomicData } from "./pipeline_api.ts";

Deno.test("processEconomicData - Filter outliers removes them from data", async () => {
  const data = [
    {
      id: "ARM",
      name: "Tourist Arrivals",
      value: 520394,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "BRA",
      name: "Tourist Arrivals",
      value: 6774,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "VNM",
      name: "Tourist Arrivals",
      value: 1467,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "GRC",
      name: "Tourist Arrivals",
      value: 875,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "MEX",
      name: "Tourist Arrivals",
      value: 3200,
      unit: "Thousands",
      scale: "Thousands",
    },
  ];

  const result = await processEconomicData(data, {
    autoTargetByIndicator: true,
    detectScaleOutliers: true,
    scaleOutlierOptions: {
      filterOutliers: true, // ✅ Enable filtering
      includeDetails: true,
    },
    explain: true,
  });

  // Armenia should be in outliers array, NOT in data
  assertEquals(result.data.length, 4, "Should have 4 items in clean data");
  assertExists(result.outliers, "Should have outliers array");
  assertEquals(result.outliers?.length, 1, "Should have 1 outlier");

  // Verify Armenia is in outliers
  const armenia = result.outliers?.find((item) => item.id === "ARM");
  assertExists(armenia, "Armenia should be in outliers");
  assertEquals(
    armenia.explain?.qualityWarnings?.length,
    1,
    "Armenia should have warning",
  );

  // Verify Armenia is NOT in data
  const armeniaInData = result.data.find((item) => item.id === "ARM");
  assertEquals(armeniaInData, undefined, "Armenia should NOT be in data");

  // Verify other countries are in data
  const brazil = result.data.find((item) => item.id === "BRA");
  assertExists(brazil, "Brazil should be in data");

  const vietnam = result.data.find((item) => item.id === "VNM");
  assertExists(vietnam, "Vietnam should be in data");

  console.log("\n✅ Filtering Results:");
  console.log(`Clean data: ${result.data.length} items`);
  console.log(`Outliers: ${result.outliers?.length} items`);
  console.log(
    `Filtered: ${armenia.id} (${armenia.normalized?.toLocaleString()})`,
  );
});

Deno.test("processEconomicData - Without filterOutliers, keeps outliers in data", async () => {
  const data = [
    {
      id: "ARM",
      name: "Tourist Arrivals",
      value: 520394,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "BRA",
      name: "Tourist Arrivals",
      value: 6774,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "VNM",
      name: "Tourist Arrivals",
      value: 1467,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "GRC",
      name: "Tourist Arrivals",
      value: 875,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "MEX",
      name: "Tourist Arrivals",
      value: 3200,
      unit: "Thousands",
      scale: "Thousands",
    },
  ];

  const result = await processEconomicData(data, {
    autoTargetByIndicator: true,
    detectScaleOutliers: true,
    scaleOutlierOptions: {
      filterOutliers: false, // ❌ Don't filter
      includeDetails: true,
    },
    explain: true,
  });

  // All 5 items should be in data
  assertEquals(result.data.length, 5, "Should have 5 items in data");
  assertEquals(result.outliers, undefined, "Should NOT have outliers array");

  // Armenia should be in data with warning
  const armenia = result.data.find((item) => item.id === "ARM");
  assertExists(armenia, "Armenia should be in data");
  assertEquals(
    armenia.explain?.qualityWarnings?.length,
    1,
    "Armenia should have warning",
  );

  console.log("\n✅ Non-filtering Results:");
  console.log(
    `Data: ${result.data.length} items (outliers marked with warnings)`,
  );
  console.log(`Outliers array: ${result.outliers ? "present" : "not present"}`);
});

Deno.test("processEconomicData - Multiple indicator groups filters independently", async () => {
  const data = [
    // Tourist Arrivals - Armenia is outlier
    {
      id: "ARM-TA",
      name: "Tourist Arrivals",
      value: 520394,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "BRA-TA",
      name: "Tourist Arrivals",
      value: 6774,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "VNM-TA",
      name: "Tourist Arrivals",
      value: 1467,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "MEX-TA",
      name: "Tourist Arrivals",
      value: 3200,
      unit: "Thousands",
      scale: "Thousands",
    },
    // GDP - no outliers
    {
      id: "ARM-GDP",
      name: "GDP",
      value: 15000,
      unit: "USD Millions",
      scale: "Millions",
      currency_code: "USD",
    },
    {
      id: "BRA-GDP",
      name: "GDP",
      value: 2000000,
      unit: "USD Millions",
      scale: "Millions",
      currency_code: "USD",
    },
    {
      id: "VNM-GDP",
      name: "GDP",
      value: 350000,
      unit: "USD Millions",
      scale: "Millions",
      currency_code: "USD",
    },
    {
      id: "MEX-GDP",
      name: "GDP",
      value: 1200000,
      unit: "USD Millions",
      scale: "Millions",
      currency_code: "USD",
    },
  ];

  const result = await processEconomicData(data, {
    autoTargetByIndicator: true,
    detectScaleOutliers: true,
    scaleOutlierOptions: {
      filterOutliers: true,
    },
    explain: true,
  });

  // 7 items in data (8 - 1 outlier)
  assertEquals(result.data.length, 7, "Should have 7 items in clean data");
  assertEquals(result.outliers?.length, 1, "Should have 1 outlier");

  // Tourist Arrivals - Armenia filtered out
  const armTA = result.data.find((item) => item.id === "ARM-TA");
  assertEquals(armTA, undefined, "Armenia TA should be filtered out");

  const armTAOutlier = result.outliers?.find((item) => item.id === "ARM-TA");
  assertExists(armTAOutlier, "Armenia TA should be in outliers");

  // Tourist Arrivals - others kept
  const braTA = result.data.find((item) => item.id === "BRA-TA");
  assertExists(braTA, "Brazil TA should be in data");

  // GDP - all kept (no outliers)
  const armGDP = result.data.find((item) => item.id === "ARM-GDP");
  assertExists(armGDP, "Armenia GDP should be in data");

  const braGDP = result.data.find((item) => item.id === "BRA-GDP");
  assertExists(braGDP, "Brazil GDP should be in data");

  console.log("\n✅ Multiple Indicators:");
  console.log(`Clean data: ${result.data.length} items`);
  console.log(`Outliers: ${result.outliers?.length} items`);
});

Deno.test("processEconomicData - Outliers have full explain metadata", async () => {
  const data = [
    {
      id: "ARM",
      name: "Tourist Arrivals",
      value: 520394,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "BRA",
      name: "Tourist Arrivals",
      value: 6774,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "VNM",
      name: "Tourist Arrivals",
      value: 1467,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "MEX",
      name: "Tourist Arrivals",
      value: 3200,
      unit: "Thousands",
      scale: "Thousands",
    },
  ];

  const result = await processEconomicData(data, {
    autoTargetByIndicator: true,
    detectScaleOutliers: true,
    scaleOutlierOptions: {
      filterOutliers: true,
      includeDetails: true,
    },
    explain: true,
  });

  const armenia = result.outliers?.[0];
  assertExists(armenia, "Should have outlier");
  assertExists(armenia.explain, "Outlier should have explain");
  assertExists(armenia.explain.qualityWarnings, "Should have warnings");
  assertExists(armenia.normalized, "Should have normalized value");

  const warning = armenia.explain.qualityWarnings[0];
  assertEquals(warning.type, "scale-outlier");
  assertEquals(warning.severity, "warning");
  assertExists(warning.details, "Should have details");
  assertEquals(warning.details.magnitude, 5);
  assertEquals(warning.details.dominantMagnitude, 3);

  console.log("\n✅ Outlier Metadata:");
  console.log(`ID: ${armenia.id}`);
  console.log(`Value: ${armenia.normalized?.toLocaleString()}`);
  console.log(`Warning: ${warning.message}`);
  console.log(
    `Magnitude: ${warning.details.magnitude} (vs ${warning.details.dominantMagnitude} dominant)`,
  );
});

Deno.test("processEconomicData - No outliers array when none detected", async () => {
  const data = [
    {
      id: "BRA",
      name: "Tourist Arrivals",
      value: 6774,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "VNM",
      name: "Tourist Arrivals",
      value: 1467,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "MEX",
      name: "Tourist Arrivals",
      value: 3200,
      unit: "Thousands",
      scale: "Thousands",
    },
  ];

  const result = await processEconomicData(data, {
    autoTargetByIndicator: true,
    detectScaleOutliers: true,
    scaleOutlierOptions: {
      filterOutliers: true,
    },
    explain: true,
  });

  // All items should be in data (no outliers)
  assertEquals(result.data.length, 3, "Should have 3 items");
  assertEquals(
    result.outliers,
    undefined,
    "Should NOT have outliers array when none detected",
  );

  console.log("\n✅ No outliers detected - outliers array is undefined");
});
