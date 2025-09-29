import {
  assertAlmostEquals,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeAutoTargets } from "../api/index.ts";
import type { ParsedData } from "../main.ts";

Deno.test("computeAutoTargets: exact shares computed for crafted distribution", () => {
  const data: ParsedData[] = [
    // 10 items total
    // currency: USD 6, EUR 3, JPY 1 -> shares: 0.6, 0.3, 0.1
    // magnitude: millions 7, thousand 3 -> shares: 0.7, 0.3
    // time: month 5, quarter 3, year 2 -> shares: 0.5, 0.3, 0.2
    { id: "T1", name: "Trade", unit: "USD Million per month", value: 100 },
    { id: "T2", name: "Trade", unit: "USD Million per month", value: 101 },
    { id: "T3", name: "Trade", unit: "USD Million per month", value: 102 },
    { id: "T4", name: "Trade", unit: "USD Million per quarter", value: 103 },
    { id: "T5", name: "Trade", unit: "USD Million per year", value: 104 },
    { id: "T6", name: "Trade", unit: "USD Thousand per month", value: 105 },

    { id: "T7", name: "Trade", unit: "EUR Million per quarter", value: 106 },
    { id: "T8", name: "Trade", unit: "EUR Million per quarter", value: 107 },
    { id: "T9", name: "Trade", unit: "EUR Thousand per month", value: 108 },

    { id: "T10", name: "Trade", unit: "JPY Thousand per year", value: 109 },
  ] as ParsedData[];

  const out = computeAutoTargets(data, {
    indicatorKey: "name",
    minMajorityShare: 0.6,
    tieBreakers: {
      currency: "prefer-targetCurrency",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    targetCurrency: "USD",
  });

  const sel = out.get("trade");
  if (!sel) throw new Error("expected selection for trade");

  // Currency shares
  assertAlmostEquals(sel.shares.currency.USD ?? 0, 0.6, 1e-12);
  assertAlmostEquals(sel.shares.currency.EUR ?? 0, 0.3, 1e-12);
  assertAlmostEquals(sel.shares.currency.JPY ?? 0, 0.1, 1e-12);

  // Magnitude shares
  assertAlmostEquals(sel.shares.magnitude.millions ?? 0, 0.7, 1e-12);
  assertAlmostEquals(sel.shares.magnitude.thousands ?? 0, 0.3, 1e-12);

  // Time shares
  assertAlmostEquals(sel.shares.time.month ?? 0, 0.5, 1e-12);
  assertAlmostEquals(sel.shares.time.quarter ?? 0, 0.3, 1e-12);
  assertAlmostEquals(sel.shares.time.year ?? 0, 0.2, 1e-12);

  // Selections at minMajorityShare = 0.6 -> currency/magnitude hit majority; time does not
  assertEquals(sel.currency, "USD"); // reason should have currency=majority(USD,0.60)
  assertEquals(sel.magnitude, "millions"); // reason should have magnitude=majority(millions,0.70)
  assertEquals(sel.time, "month"); // tie-break preferred
});

Deno.test("computeAutoTargets: shares handle missing time tokens (reason share vs. per-dim shares)", () => {
  const data: ParsedData[] = [
    // 8 items total; 4 have time tokens (month), 4 do not (no time)
    { id: "A1", name: "GDP", unit: "USD Million per month", value: 1 },
    { id: "A2", name: "GDP", unit: "USD Million per month", value: 2 },
    { id: "A3", name: "GDP", unit: "EUR Million", value: 3 }, // no time
    { id: "A4", name: "GDP", unit: "EUR Million", value: 4 }, // no time
    { id: "A5", name: "GDP", unit: "USD Million", value: 5 }, // no time
    { id: "A6", name: "GDP", unit: "USD Million", value: 6 }, // no time
    { id: "A7", name: "GDP", unit: "USD Million per month", value: 7 },
    { id: "A8", name: "GDP", unit: "EUR Million per month", value: 8 },
  ] as ParsedData[];

  const out = computeAutoTargets(data, {
    indicatorKey: "name",
    minMajorityShare: 0.5,
    tieBreakers: {
      currency: "prefer-targetCurrency",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    targetCurrency: "USD",
  });

  const sel = out.get("gdp");
  if (!sel) throw new Error("expected selection for gdp");

  // Currency shares (USD 5, EUR 3)
  assertAlmostEquals(sel.shares.currency.USD ?? 0, 5 / 8, 1e-12);
  assertAlmostEquals(sel.shares.currency.EUR ?? 0, 3 / 8, 1e-12);

  // Magnitude shares (all Million): millions 8/8
  assertAlmostEquals(sel.shares.magnitude.millions ?? 0, 1.0, 1e-12);

  // Time shares are computed over present time tokens only -> 4 with month over 4 total with time
  assertAlmostEquals(sel.shares.time.month ?? 0, 1.0, 1e-12);

  // Selection: currency majority USD; magnitude millions; time prefers month (also appears in units)
  assertEquals(sel.currency, "USD");
  assertEquals(sel.magnitude, "millions");
  assertEquals(sel.time, "month");
});
