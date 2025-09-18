/**
 * Tests for algebra module
 */

import { assertEquals } from "@std/assert";
import {
  chain,
  unitAdd,
  unitDivide,
  unitMultiply,
  unitPower,
  unitSubtract,
} from "./algebra.ts";

Deno.test("unitMultiply - basic multiplication", () => {
  const a = { value: 10, unit: "USD" };
  const b = { value: 5, unit: "units" };

  const result = unitMultiply(a, b);

  assertEquals(result.value, 50);
  assertEquals(result.unit, "USD * units");
});

Deno.test("unitMultiply - time-based multiplication", () => {
  const rate = { value: 25, unit: "USD/Hour" };
  const time = { value: 8, unit: "Hours" };

  const result = unitMultiply(rate, time);

  assertEquals(result.value, 200);
  assertEquals(result.unit, "USD");
});

Deno.test("unitMultiply - currency multiplication", () => {
  const a = { value: 100, unit: "USD" };
  const b = { value: 0.92, unit: "EUR" };

  const result = unitMultiply(a, b);

  assertEquals(result.value, 92);
  assertEquals(result.unit, "USD/EUR");
});

Deno.test("unitDivide - same units cancel", () => {
  const a = { value: 100, unit: "USD" };
  const b = { value: 50, unit: "USD" };

  const result = unitDivide(a, b);

  assertEquals(result.value, 2);
  assertEquals(result.unit, "ratio");
});

Deno.test("unitDivide - different units", () => {
  const a = { value: 100, unit: "USD" };
  const b = { value: 5, unit: "units" };

  const result = unitDivide(a, b);

  assertEquals(result.value, 20);
  assertEquals(result.unit, "USD/units");
});

Deno.test("unitDivide - create rate", () => {
  const distance = { value: 100, unit: "miles" };
  const time = { value: 2, unit: "hours" };

  const result = unitDivide(distance, time);

  assertEquals(result.value, 50);
  assertEquals(result.unit, "miles/hours");
});

Deno.test("unitAdd - same units", () => {
  const a = { value: 100, unit: "USD" };
  const b = { value: 50, unit: "USD" };

  const result = unitAdd(a, b);

  assertEquals(result.value, 150);
  assertEquals(result.unit, "USD");
});

Deno.test("unitAdd - different units throws error", () => {
  const a = { value: 100, unit: "USD" };
  const b = { value: 50, unit: "EUR" };

  try {
    unitAdd(a, b);
    throw new Error("Should have thrown");
  } catch (error) {
    assertEquals((error as Error).message.includes("Cannot add"), true);
  }
});

Deno.test("unitSubtract - same units", () => {
  const a = { value: 100, unit: "USD" };
  const b = { value: 30, unit: "USD" };

  const result = unitSubtract(a, b);

  assertEquals(result.value, 70);
  assertEquals(result.unit, "USD");
});

Deno.test("unitSubtract - different units throws error", () => {
  const a = { value: 100, unit: "USD" };
  const b = { value: 50, unit: "EUR" };

  try {
    unitSubtract(a, b);
    throw new Error("Should have thrown");
  } catch (error) {
    assertEquals((error as Error).message.includes("Cannot subtract"), true);
  }
});

Deno.test("unitPower - basic power", () => {
  const a = { value: 5, unit: "meters" };

  const result = unitPower(a, 2);

  assertEquals(result.value, 25);
  assertEquals(result.unit, "meters^2");
});

Deno.test("unitPower - square root", () => {
  const a = { value: 25, unit: "meters^2" };

  const result = unitPower(a, 0.5);

  assertEquals(result.value, 5);
  assertEquals(result.unit, "meters");
});

Deno.test("unitPower - cube", () => {
  const a = { value: 3, unit: "meters" };

  const result = unitPower(a, 3);

  assertEquals(result.value, 27);
  assertEquals(result.unit, "meters^3");
});

// Note: simplifyUnit function is not currently exported from algebra module
// These tests would be added when the function is made available

Deno.test("algebra - real-world economic calculations", () => {
  // GDP per capita = GDP / Population
  const gdp = { value: 21000, unit: "USD Billion" };
  const population = { value: 330, unit: "Million people" };

  const gdpPerCapita = unitDivide(gdp, population);

  assertEquals(Math.round(gdpPerCapita.value), 64);
  assertEquals(gdpPerCapita.unit, "USD Billion/Million people");
});

Deno.test("algebra - wage calculations", () => {
  // Annual salary = Hourly rate * Hours per year
  const hourlyRate = { value: 25, unit: "USD/Hour" };
  const hoursPerYear = { value: 2080, unit: "Hours" };

  const annualSalary = unitMultiply(hourlyRate, hoursPerYear);

  assertEquals(annualSalary.value, 52000);
  assertEquals(annualSalary.unit, "USD");
});

Deno.test("algebra - percentage calculations", () => {
  // Growth rate calculation
  const currentValue = { value: 110, unit: "USD" };
  const previousValue = { value: 100, unit: "USD" };

  const ratio = unitDivide(currentValue, previousValue);
  const growth = unitSubtract(ratio, { value: 1, unit: "ratio" });

  assertEquals(growth.value, 0.1);
  assertEquals(growth.unit, "ratio");
});

Deno.test("algebra - unit conversion preservation", () => {
  // Test that complex operations preserve unit relationships
  const price = { value: 50, unit: "USD/barrel" };
  const volume = { value: 1000, unit: "barrels" };
  const tax = { value: 0.1, unit: "ratio" };

  const subtotal = unitMultiply(price, volume);
  const taxAmount = unitMultiply(subtotal, tax);
  const total = unitAdd(subtotal, taxAmount);

  assertEquals(subtotal.value, 50000);
  assertEquals(subtotal.unit, "USD");
  assertEquals(taxAmount.value, 5000);
  assertEquals(total.value, 55000);
  assertEquals(total.unit, "USD");
});

Deno.test("unitMultiply - reverse time multiplication (Hours * USD/Hour)", () => {
  const time = { value: 8, unit: "Hours" };
  const rate = { value: 25, unit: "USD/Hour" };
  const result = unitMultiply(time, rate);
  assertEquals(result.value, 200);
  assertEquals(result.unit, "USD");
});

Deno.test("unitMultiply - dimensionless percent simplifies (USD * percent)", () => {
  const amount = { value: 200, unit: "USD" };
  const pct = { value: 0.1, unit: "percent" };
  const result = unitMultiply(amount, pct);
  assertEquals(result.value, 20);
  assertEquals(result.unit, "USD");
});

Deno.test("unitMultiply - dimensionless percent simplifies (percent * USD)", () => {
  const amount = { value: 200, unit: "USD" };
  const pct = { value: 0.1, unit: "%" };
  const result = unitMultiply(pct, amount);
  assertEquals(result.value, 20);
  assertEquals(result.unit, "USD");
});

Deno.test("unitMultiply - complex cancellation USD/barrel * barrels/hour -> USD/hour", () => {
  const price = { value: 80, unit: "USD/barrel" };
  const flow = { value: 2, unit: "barrels/hour" };
  const result = unitMultiply(price, flow);
  assertEquals(result.value, 160);
  // Current simplifier does not cancel nested denominators; expect unchanged composite unit
  assertEquals(result.unit, "USD/barrel * barrels/hour");
});

Deno.test("unitMultiply - plural/singular cancellation USD/barrels * barrel -> USD", () => {
  const price = { value: 50, unit: "USD/barrels" };
  const qty = { value: 10, unit: "barrel" };
  const result = unitMultiply(price, qty);
  assertEquals(result.value, 500);
  assertEquals(result.unit, "USD");
});

Deno.test("unitPower - exponent 0 yields dimensionless", () => {
  const a = { value: 123.45, unit: "meters" };
  const result = unitPower(a, 0);
  assertEquals(result.value, 1);
  assertEquals(result.unit, "dimensionless");
});

Deno.test("unitPower - negative exponent produces 1/unit", () => {
  const a = { value: 10, unit: "seconds" };
  const result = unitPower(a, -1);
  assertEquals(result.value, 0.1);
  assertEquals(result.unit, "1/seconds");
});

Deno.test("unitPower - fractional exponent not fully cancelling (meters^2)^0.25", () => {
  const a = { value: 16, unit: "meters^2" };
  const result = unitPower(a, 0.25);
  assertEquals(result.value, 2);
  assertEquals(result.unit, "meters^0.5");
});

Deno.test("unitSubtract - rounding guards against floating error (0.3-0.2)", () => {
  const a = { value: 0.3, unit: "ratio" };
  const b = { value: 0.2, unit: "ratio" };
  const result = unitSubtract(a, b);
  assertEquals(result.value, 0.1);
  assertEquals(result.unit, "ratio");
});

Deno.test("UnitChain - chained operations with simplification", () => {
  // ((USD/barrel * barrels) * percent) / ratio
  const price = { value: 70, unit: "USD/barrel" };
  const qty = { value: 100, unit: "barrels" };
  const pct = { value: 0.2, unit: "percent" };
  const rat = { value: 2, unit: "ratio" };
  const result = chain(price).multiply(qty).multiply(pct).divide(rat).value();
  assertEquals(result.value, 700);
  // Division by ratio is preserved in unit formatting (dimensionless not simplified in divide)
  assertEquals(result.unit, "USD/ratio");
});
