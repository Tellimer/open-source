/**
 * Tests for temporal aggregation utilities
 */

import { assertEquals, assertThrows } from "jsr:@std/assert@^1.0.0";
import {
  aggregateByTemporalType,
  allowsResampling,
  describeAggregation,
} from "./temporal-aggregation.ts";

Deno.test("aggregateByTemporalType - period-total sums values", () => {
  // Monthly total transactions → Quarterly total (sum 3 months)
  const monthly = [100, 150, 200]; // Jan, Feb, Mar
  const quarterly = aggregateByTemporalType(
    monthly,
    "period-total",
    "month",
    "quarter",
  );
  assertEquals(quarterly, 450); // 100 + 150 + 200
});

Deno.test("aggregateByTemporalType - period-average calculates mean", () => {
  // Monthly average temperature → Quarterly average
  const monthly = [10, 15, 20]; // degrees Celsius
  const quarterly = aggregateByTemporalType(
    monthly,
    "period-average",
    "month",
    "quarter",
  );
  assertEquals(quarterly, 15); // (10 + 15 + 20) / 3
});

Deno.test("aggregateByTemporalType - period-cumulative takes last value", () => {
  // YTD sales for each month → YTD sales at end of quarter
  const monthly = [100, 250, 450]; // Jan YTD, Feb YTD, Mar YTD
  const quarterly = aggregateByTemporalType(
    monthly,
    "period-cumulative",
    "month",
    "quarter",
  );
  assertEquals(quarterly, 450); // Last value (already cumulative)
});

Deno.test("aggregateByTemporalType - point-in-time takes last observation", () => {
  // Monthly stock levels → Stock level at end of quarter
  const monthly = [1000, 1050, 1100]; // Inventory levels
  const quarterly = aggregateByTemporalType(
    monthly,
    "point-in-time",
    "month",
    "quarter",
  );
  assertEquals(quarterly, 1100); // Last observation
});

Deno.test("aggregateByTemporalType - period-rate sums and annualizes", () => {
  // Monthly GDP (annualized) → Quarterly GDP (annualized)
  const monthly = [1000, 1100, 1200]; // Monthly GDP in billions
  const quarterly = aggregateByTemporalType(
    monthly,
    "period-rate",
    "month",
    "quarter",
  );

  // Sum monthly values: 3300
  // Convert month to quarter: 3300 * (12/4) = 9900
  assertEquals(quarterly, 9900);
});

Deno.test("aggregateByTemporalType - not-applicable takes last value", () => {
  // Debt-to-GDP ratio (dimensionless)
  const monthly = [45.2, 45.5, 46.0];
  const quarterly = aggregateByTemporalType(
    monthly,
    "not-applicable",
    "month",
    "quarter",
  );
  assertEquals(quarterly, 46.0); // Last value
});

Deno.test("aggregateByTemporalType - throws on empty array", () => {
  assertThrows(
    () =>
      aggregateByTemporalType(
        [],
        "period-total",
        "month",
        "quarter",
      ),
    Error,
    "Cannot aggregate empty value array",
  );
});

Deno.test("aggregateByTemporalType - throws on unknown temporal type", () => {
  assertThrows(
    () =>
      aggregateByTemporalType(
        [100, 200],
        "unknown-type",
        "month",
        "quarter",
      ),
    Error,
    "Unknown temporal aggregation type",
  );
});

Deno.test("allowsResampling - returns correct values", () => {
  assertEquals(allowsResampling("period-total"), true);
  assertEquals(allowsResampling("period-average"), true);
  assertEquals(allowsResampling("period-rate"), true);
  assertEquals(allowsResampling("period-cumulative"), true);
  assertEquals(allowsResampling("point-in-time"), true);
  assertEquals(allowsResampling("not-applicable"), false);
  assertEquals(allowsResampling("unknown"), false);
});

Deno.test("describeAggregation - returns descriptions", () => {
  assertEquals(
    describeAggregation("period-total"),
    "Sum values across period",
  );
  assertEquals(
    describeAggregation("period-average"),
    "Average values across period",
  );
  assertEquals(
    describeAggregation("period-rate"),
    "Sum and annualize flow rate",
  );
  assertEquals(
    describeAggregation("period-cumulative"),
    "Take last value (already cumulative)",
  );
  assertEquals(
    describeAggregation("point-in-time"),
    "Take last observation (snapshot)",
  );
  assertEquals(
    describeAggregation("not-applicable"),
    "Take last value (dimensionless)",
  );
  assertEquals(
    describeAggregation("unknown"),
    "Unknown aggregation method",
  );
});

Deno.test("aggregateByTemporalType - real-world scenario: quarterly GDP", () => {
  // Monthly GDP figures (annualized) → Quarterly GDP (annualized)
  // Each month represents annualized GDP for that month
  const monthlyGDP = [20000, 20500, 21000]; // Billions USD

  const quarterlyGDP = aggregateByTemporalType(
    monthlyGDP,
    "period-rate",
    "month",
    "quarter",
  );

  // Sum: 61500, convert month→quarter: 61500 * (12/4) = 184500
  assertEquals(quarterlyGDP, 184500);
});

Deno.test("aggregateByTemporalType - real-world scenario: YTD sales", () => {
  // Each value is cumulative from start of year
  const monthlyYTD = [100, 250, 450, 700, 1000, 1350]; // Jan-Jun cumulative

  // Q2 YTD (take last value of Q2)
  const q2YTD = aggregateByTemporalType(
    monthlyYTD.slice(3, 6), // Apr, May, Jun
    "period-cumulative",
    "month",
    "quarter",
  );

  assertEquals(q2YTD, 1350); // Last value (Jun YTD)
});

Deno.test("aggregateByTemporalType - real-world scenario: average temperature", () => {
  // Monthly average temperatures → Quarterly average
  const monthlyTemp = [5, 7, 10]; // Q1: Winter → Spring

  const quarterlyTemp = aggregateByTemporalType(
    monthlyTemp,
    "period-average",
    "month",
    "quarter",
  );

  assertEquals(quarterlyTemp, 7.333333333333333); // (5 + 7 + 10) / 3
});
