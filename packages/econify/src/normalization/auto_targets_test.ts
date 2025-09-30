import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { ParsedData, Scale, TimeScale } from "../main.ts";
import { computeAutoTargets } from "./auto_targets.ts";

Deno.test("computeAutoTargets: majority selection per dimension", () => {
  const data: ParsedData[] = [
    { name: "GDP", value: 1, unit: "USD Million per quarter" },
    { name: "GDP", value: 2, unit: "USD Million per quarter" },
    { name: "GDP", value: 3, unit: "EUR Million per month" },
  ];

  const targets = computeAutoTargets(data, {
    indicatorKey: "name",
    minMajorityShare: 0.5,
  });

  assertEquals(targets instanceof Map, true);
  const gdp = targets.get("gdp"); // Key is normalized to lowercase
  assertExists(gdp);
  assertEquals(gdp?.currency, "USD");
  assertEquals(gdp?.magnitude as Scale, "millions");
  assertEquals(gdp?.time as TimeScale, "quarter");
  assertExists(gdp?.shares.currency["USD"]);
  assertExists(gdp?.shares.magnitude["millions"]);
  assertExists(gdp?.shares.time["quarter"]);
});

Deno.test("computeAutoTargets: tie-breakers when no majority (flow indicator)", () => {
  // Use a FLOW indicator (Exports) instead of STOCK (Debt)
  // Flow indicators should get time auto-targeting
  const data: ParsedData[] = [
    { name: "Exports", value: 1, unit: "USD Billion per quarter" },
    { name: "Exports", value: 2, unit: "EUR Million per month" },
  ];

  const targets = computeAutoTargets(data, {
    indicatorKey: "name",
    minMajorityShare: 0.6, // force no majority with 1 vs 1
    targetCurrency: "EUR",
    tieBreakers: {
      currency: "prefer-targetCurrency",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
  });

  const exports = targets.get("exports"); // Key is normalized to lowercase
  assertExists(exports);
  // prefer targetCurrency (EUR), prefer millions, prefer month
  assertEquals(exports?.currency, "EUR");
  assertEquals(exports?.magnitude as Scale, "millions");
  assertEquals(exports?.time as TimeScale, "month");
});

Deno.test("computeAutoTargets: stock indicators skip time dimension", () => {
  // Debt is a STOCK indicator - should NOT get time auto-targeting
  const data: ParsedData[] = [
    { name: "Debt", value: 1, unit: "USD Billion" },
    { name: "Debt", value: 2, unit: "EUR Million" },
  ];

  const targets = computeAutoTargets(data, {
    indicatorKey: "name",
    minMajorityShare: 0.6,
    targetCurrency: "EUR",
    tieBreakers: {
      currency: "prefer-targetCurrency",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
  });

  const debt = targets.get("debt");
  assertExists(debt);
  // Currency and magnitude should be set
  assertEquals(debt?.currency, "EUR");
  assertEquals(debt?.magnitude as Scale, "millions");
  // Time should be skipped for stock indicators
  assertEquals(debt?.time, undefined);
  // Reason should explain why time was skipped
  assert(debt?.reason?.includes("time=skipped"));
  assert(debt?.reason?.includes("stock indicator"));
});

Deno.test("computeAutoTargets: explicit metadata beats unit parsing", () => {
  const data: ParsedData[] = [
    {
      name: "Exports",
      value: 10,
      unit: "USD Million", // unit says million, but explicit says billions + monthly
      scale: "Billions",
      periodicity: "Monthly",
      currency_code: "USD",
    },
    {
      name: "Exports",
      value: 11,
      unit: "USD Million",
      scale: "Billions",
      periodicity: "Monthly",
      currency_code: "USD",
    },
  ];

  const targets = computeAutoTargets(data, { indicatorKey: "name" });
  const exp = targets.get("exports"); // Key is normalized to lowercase
  assertExists(exp);
  assertEquals(exp?.currency, "USD");
  assertEquals(exp?.magnitude as Scale, "billions");
  assertEquals(exp?.time as TimeScale, "month");
});

Deno.test("computeAutoTargets: grouping by custom key function", () => {
  const data: ParsedData[] = [
    {
      name: "GDP",
      value: 1,
      unit: "USD Million",
      metadata: { indicatorId: "A" },
    },
    {
      name: "GDP",
      value: 2,
      unit: "EUR Million",
      metadata: { indicatorId: "B" },
    },
  ];

  const targets = computeAutoTargets(data, {
    indicatorKey: (d) => String(d.metadata?.["indicatorId"] ?? d.name),
  });

  assertExists(targets.get("A")); // Custom keys are not normalized
  assertExists(targets.get("B"));
});

Deno.test("computeAutoTargets: allowList / denyList", () => {
  const data: ParsedData[] = [
    { name: "Credit Rating", value: 85, unit: "points" },
    { name: "GDP", value: 1, unit: "USD Million" },
  ];

  const targets = computeAutoTargets(data, {
    indicatorKey: "name",
    allowList: ["GDP"],
    denyList: ["Credit Rating"],
  });

  assertExists(targets.get("gdp")); // Keys are normalized to lowercase
  assertEquals(targets.get("credit rating"), undefined);
});

Deno.test("computeAutoTargets: include non-monetary flow indicators for magnitude/time targeting", () => {
  const data: ParsedData[] = [
    // CPI is a RATE indicator - should skip time dimension
    { name: "CPI", value: 3.5, unit: "percent" },
    // Car Registrations is a FLOW indicator - should get time dimension
    {
      name: "Car Registrations",
      value: 1000,
      unit: "Units",
      periodicity: "Monthly",
    },
    // Oil Production is a FLOW indicator - should get time dimension
    { name: "Oil Production", value: 10, unit: "BBL/D/1K" },
  ];

  const targets = computeAutoTargets(data, {
    indicatorKey: "name",
    autoTargetDimensions: ["magnitude", "time"],
  });

  // Non-monetary indicators should now be included for magnitude/time targeting
  assertEquals(targets.size, 3, "Should include all non-monetary indicators");

  // CPI is a rate indicator - should skip time dimension
  const cpi = targets.get("cpi");
  assertExists(cpi);
  assertEquals(
    cpi.currency,
    undefined,
    "Non-monetary should not have currency",
  );
  assertEquals(cpi.magnitude, "ones", "Should have magnitude target");
  assertEquals(
    cpi.time,
    undefined,
    "Rate indicators should skip time dimension",
  );
  assert(cpi.reason?.includes("time=skipped"));

  // Car Registrations is a flow - should have time dimension
  const carReg = targets.get("car registrations");
  assertExists(carReg);
  assertEquals(
    carReg.currency,
    undefined,
    "Non-monetary should not have currency",
  );
  assertEquals(carReg.magnitude, "ones", "Should have magnitude target");
  assertEquals(carReg.time, "month", "Flow indicators should have time target");
});

Deno.test("computeAutoTargets: count indicators (non-monetary) participate in magnitude and time targeting", () => {
  const data: ParsedData[] = [
    {
      name: "Car Registrations",
      value: 51766,
      unit: "Thousands",
      periodicity: "Monthly",
    },
    {
      name: "Car Registrations",
      value: 16245,
      unit: "Units",
      periodicity: "Monthly",
    },
    {
      name: "Car Registrations",
      value: 20010,
      unit: "Units",
      periodicity: "Monthly",
    },
    {
      name: "Car Registrations",
      value: 1501957,
      unit: "Units",
      periodicity: "Yearly",
    },
  ];

  const targets = computeAutoTargets(data, {
    indicatorKey: "name",
    autoTargetDimensions: ["magnitude", "time"],
    minMajorityShare: 0.5,
    tieBreakers: {
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
  });

  const carReg = targets.get("car registrations");
  assertExists(carReg, "Car Registrations should have auto-targets");

  // Should NOT have currency (non-monetary)
  assertEquals(
    carReg.currency,
    undefined,
    "Count indicators should not have currency target",
  );

  // Should have magnitude target (majority is "ones" - 3 out of 4)
  assertEquals(carReg.magnitude, "ones", "Should detect majority magnitude");
  assertExists(
    carReg.shares.magnitude["ones"],
    "Should have 'ones' in magnitude shares",
  );

  // Should have time target (majority is "month" - 3 out of 4)
  assertEquals(carReg.time, "month", "Should detect majority time scale");
  assertExists(
    carReg.shares.time["month"],
    "Should have 'month' in time shares",
  );

  // Verify shares - all 4 items have periodicity, so shares should reflect 3 monthly + 1 yearly
  const monthShare = carReg.shares.time["month"];
  assertEquals(
    monthShare > 0.5,
    true,
    "Month should be majority (3 out of 4 = 75%)",
  );
});
