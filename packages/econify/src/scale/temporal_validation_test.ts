/**
 * Tests for temporal aggregation validation in rescaleTime
 */

import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { rescaleTime } from "./scale.ts";

Deno.test("rescaleTime - warns but converts for period-cumulative", () => {
  // rescaleTime now warns but doesn't throw - period-cumulative should be filtered earlier in the pipeline
  // If it reaches here, we perform the conversion to avoid breaking the pipeline
  const monthly = 1000;
  const annual = rescaleTime(monthly, "month", "year", "period-cumulative");
  assertEquals(annual, 12000); // Conversion happens with warning

  const quarterly = 5000;
  const annualQ = rescaleTime(quarterly, "quarter", "year", "period-cumulative");
  assertEquals(annualQ, 20000); // Conversion happens with warning
});

Deno.test("rescaleTime - allows period-total conversion", () => {
  // Monthly total transactions → Annual total
  const monthly = 100;
  const annual = rescaleTime(monthly, "month", "year", "period-total");
  assertEquals(annual, 1200); // 100 * 12
});

Deno.test("rescaleTime - allows period-rate conversion", () => {
  // Quarterly GDP rate → Annual rate
  const quarterly = 5000;
  const annual = rescaleTime(quarterly, "quarter", "year", "period-rate");
  assertEquals(annual, 20000); // 5000 * 4
});

Deno.test("rescaleTime - allows period-average conversion", () => {
  // Monthly average → Annual (mathematically valid)
  const monthly = 50;
  const annual = rescaleTime(monthly, "month", "year", "period-average");
  assertEquals(annual, 600); // 50 * 12
});

Deno.test("rescaleTime - warns if point-in-time reaches it (should be filtered earlier)", () => {
  // point-in-time should be filtered out before reaching rescaleTime
  // If it does reach here, we warn but convert to avoid breaking the pipeline
  const monthly = 1000;
  const annual = rescaleTime(monthly, "month", "year", "point-in-time");
  assertEquals(annual, 12000); // Conversion happens with defensive warning
});

Deno.test("rescaleTime - no-op when from === to", () => {
  // No conversion needed
  const value = 1000;
  const result = rescaleTime(value, "month", "month", "period-cumulative");
  assertEquals(result, 1000); // No conversion, no error
});

Deno.test("rescaleTime - works without temporal_aggregation parameter", () => {
  // Backward compatible - works without the parameter
  const monthly = 100;
  const annual = rescaleTime(monthly, "month", "year");
  assertEquals(annual, 1200); // 100 * 12
});

Deno.test("rescaleTime - allows not-applicable conversion", () => {
  // Dimensionless ratios - conversion is allowed but may not be meaningful
  const monthly = 45.5;
  const annual = rescaleTime(monthly, "month", "year", "not-applicable");
  assertEquals(annual, 546); // 45.5 * 12
});
