/**
 * Tests for scale (magnitude and time) module
 */

import { assertEquals, assertThrows } from "@std/assert";
import {
  detectScale,
  fromMillions,
  getScale,
  parseTimeScale,
  rescaleFlow,
  rescaleMagnitude,
  rescaleTime,
  toMillions,
} from "./scale.ts";

Deno.test("detectScale - numeric detection", () => {
  assertEquals(detectScale("USD bn"), 1e9);
  assertEquals(detectScale("EUR millions"), 1e6);
  assertEquals(detectScale("thousands"), 1e3);
  assertEquals(detectScale("trillions"), 1e12);
  assertEquals(detectScale("ones"), 1);
  assertEquals(detectScale(""), 1);
  assertEquals(detectScale(), 1);
});

Deno.test("getScale - scale enum detection", () => {
  assertEquals(getScale("USD bn"), "billions");
  assertEquals(getScale("EUR millions"), "millions");
  assertEquals(getScale("thousands"), "thousands");
  assertEquals(getScale("tn"), "trillions");
  assertEquals(getScale("k"), "thousands");
  assertEquals(getScale(""), "ones");
  assertEquals(getScale(), "ones");
});

Deno.test("rescaleMagnitude - basic conversions", () => {
  assertEquals(rescaleMagnitude(1, "billions", "millions"), 1000);
  assertEquals(rescaleMagnitude(1000, "millions", "billions"), 1);
  assertEquals(rescaleMagnitude(1, "thousands", "ones"), 1000);
  assertEquals(rescaleMagnitude(1000, "ones", "thousands"), 1);
  assertEquals(rescaleMagnitude(1, "trillions", "billions"), 1000);
});

Deno.test("toMillions and fromMillions", () => {
  assertEquals(toMillions(1, "billions"), 1000);
  assertEquals(toMillions(1000, "thousands"), 1);
  assertEquals(toMillions(1000000, "ones"), 1);

  assertEquals(fromMillions(1000, "billions"), 1);
  assertEquals(fromMillions(1, "thousands"), 1000);
  assertEquals(fromMillions(1, "ones"), 1000000);
});

Deno.test("parseTimeScale - time basis detection", () => {
  assertEquals(parseTimeScale("per year"), "year");
  assertEquals(parseTimeScale("annually"), "year");
  assertEquals(parseTimeScale("per quarter"), "quarter");
  assertEquals(parseTimeScale("monthly"), "month");
  assertEquals(parseTimeScale("per week"), "week");
  assertEquals(parseTimeScale("daily"), "day");
  assertEquals(parseTimeScale("per hour"), "hour");
  assertEquals(parseTimeScale("/yr"), "year");
  assertEquals(parseTimeScale("/q"), "quarter");
  assertEquals(parseTimeScale("/mo"), "month");
  assertEquals(parseTimeScale(""), null);
  assertEquals(parseTimeScale(), null);
});

Deno.test("rescaleTime - time conversions", () => {
  // Same time scale
  assertEquals(rescaleTime(100, "year", "year"), 100);

  // Year to smaller scales (dividing annual amount)
  assertEquals(rescaleTime(12, "year", "month"), 1);
  assertEquals(rescaleTime(52, "year", "week"), 1);
  assertEquals(rescaleTime(365, "year", "day"), 1);

  // Smaller scales to year (annualizing)
  assertEquals(rescaleTime(1, "month", "year"), 12);
  assertEquals(rescaleTime(1, "week", "year"), 52);
  assertEquals(rescaleTime(1, "day", "year"), 365);
  assertEquals(rescaleTime(1, "quarter", "year"), 4);

  // Cross conversions
  assertEquals(rescaleTime(3, "quarter", "month"), 1);
  assertEquals(Math.round(rescaleTime(12, "month", "week") * 100) / 100, 2.77);
});

Deno.test("rescaleFlow - with explicit from scale", () => {
  const result = rescaleFlow(100, {
    from: "quarter",
    to: "year",
  });
  assertEquals(result, 400); // 100 * 4
});

Deno.test("rescaleFlow - with unit text parsing", () => {
  const result = rescaleFlow(100, {
    unitText: "USD mn per quarter",
    to: "year",
  });
  assertEquals(result, 400); // 100 * 4
});

Deno.test("rescaleFlow - error when cannot infer time basis", () => {
  assertThrows(
    () => rescaleFlow(100, { to: "year" }),
    Error,
    "Cannot infer 'from' time basis",
  );

  assertThrows(
    () => rescaleFlow(100, { unitText: "USD mn", to: "year" }),
    Error,
    "Cannot infer 'from' time basis",
  );
});

Deno.test("rescaleFlow - explicit from overrides unit text", () => {
  const result = rescaleFlow(100, {
    unitText: "USD mn per quarter", // This would suggest quarterly
    from: "month", // But we explicitly say monthly
    to: "year",
  });
  assertEquals(
    result,
    1200, // 100 * 12 (monthly to yearly)
  ); // 100 / 12, not 100 / 4
});
