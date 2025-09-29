import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeAutoTargets } from "./index.ts";
import type { ParsedData } from "../main.ts";

Deno.test("API: computeAutoTargets basic majority selection", () => {
  const data: ParsedData[] = [
    // Balance of Trade — two monthly, one quarterly
    {
      id: "AUS",
      name: "Balance of Trade",
      unit: "USD Million per month",
      value: 10,
    },
    {
      id: "AUT",
      name: "Balance of Trade",
      unit: "EUR Million per month",
      value: 20,
    },
    {
      id: "AZE",
      name: "Balance of Trade",
      unit: "USD Million per quarter",
      value: 30,
    },
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

  const sel = out.get("balance of trade");
  if (!sel) throw new Error("expected selection for balance of trade");
  assertEquals(sel.currency, "USD"); // USD appears 2/3
  assertEquals(sel.magnitude, "millions");
  assertEquals(sel.time, "month"); // month appears in 2/3
});

Deno.test("API: computeAutoTargets tie-breakers when no majority", () => {
  const data: ParsedData[] = [
    // GDP — no time in units; use tie-breakers
    { id: "USA", name: "GDP", unit: "USD Million", value: 100 },
    { id: "CAN", name: "GDP", unit: "CAD Million", value: 120 },
  ] as ParsedData[];

  const out = computeAutoTargets(data, {
    indicatorKey: "name",
    minMajorityShare: 0.66, // make majority harder
    tieBreakers: {
      currency: "prefer-targetCurrency",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    targetCurrency: "USD",
  });

  const sel = out.get("gdp");
  if (!sel) throw new Error("expected selection for gdp");
  // No 2/3 majority on currency (USD 1/2, CAD 1/2) -> prefer targetCurrency (USD)
  assertEquals(sel.currency, "USD");
  // No time tokens -> prefer month
  assertEquals(sel.time, "month");
  // Scale inferred from units -> millions is already dominant but we also prefer millions in tie-breakers
  assertEquals(sel.magnitude, "millions");
});

Deno.test("API: computeAutoTargets allowList / denyList", () => {
  const data: ParsedData[] = [
    { id: "USA", name: "Exports", unit: "USD Million per month", value: 1 },
    { id: "MEX", name: "Exports", unit: "USD Million per month", value: 2 },
    { id: "USA", name: "Imports", unit: "USD Million per month", value: 3 },
    { id: "MEX", name: "Imports", unit: "USD Million per month", value: 4 },
  ] as ParsedData[];

  const out1 = computeAutoTargets(data, {
    allowList: ["Exports"],
    indicatorKey: "name",
  });
  assertEquals([...out1.keys()], ["exports"]);

  const out2 = computeAutoTargets(data, {
    denyList: ["Imports"],
    indicatorKey: "name",
  });
  assertEquals([...out2.keys()].includes("imports"), false);
  assertEquals([...out2.keys()].includes("exports"), true);
});
