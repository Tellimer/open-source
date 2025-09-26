import { assertEquals, assertExists } from "jsr:@std/assert";
import { createActor } from "npm:xstate@^5.20.2";
import { normalizeRouterMachine } from "../normalize/normalize_router.machine.ts";
import { databaseFXRates } from "../__fixtures__/database-real-data.ts";

Deno.test("Debug - Test Router Directly", async () => {
  // Mock classification output from previous test
  const buckets = {
    "monetaryStock": [{
      "id": "russia-oil-exports-2024",
      "value": 6984,
      "unit": "USD Million",
      "name": "Oil Exports",
      "country_iso": "RUS",
      "date": "2024-10-31",
      "category_group": "Trade",
      "source_name": "Tellimer Database",
      "currency_code": "USD",
      "periodicity": "Monthly",
      "scale": "Millions",
      "needsFX": true,
      "currencyCode": "USD",
      "pricePattern": "absolute",
    }],
    "monetaryFlow": [],
    "counts": [],
    "percentages": [],
    "indices": [],
    "ratios": [],
    "energy": [],
    "commodities": [{
      "id": "kazakhstan-oil-production-2024",
      "value": 1944,
      "unit": "BBL/D/1K",
      "name": "Crude Oil Production",
      "country_iso": "KAZ",
      "date": "2024-10-31",
      "category_group": "Business",
      "source_name": "Tellimer Database",
      "currency_code": null,
      "periodicity": "Monthly",
      "scale": "Thousands",
      "needsFX": false,
      "pricePattern": "none",
    }],
    "agriculture": [],
    "metals": [],
    "crypto": [],
  };

  const config = {
    targetCurrency: "USD",
    targetMagnitude: "millions" as const,
    targetTimeScale: "month" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: databaseFXRates,
    engine: "v2" as const,
    // FX from fxFallback
  };

  const actor = createActor(normalizeRouterMachine, {
    input: {
      config,
      buckets,
      exempted: [],
      nonExempted: [...buckets.monetaryStock, ...buckets.commodities],
    },
  });

  actor.start();

  const result = await new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout")), 10000);

    actor.subscribe((state) => {
      console.log("Router State:", state.value, "Status:", state.status);
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        console.error("Router error:", state.error);
        reject(new Error(`Router error: ${state.error}`));
      }
    });
  });

  console.log("Router result:", JSON.stringify(result, null, 2));

  assertExists(result.items);
  assertEquals(result.items.length, 2);

  actor.stop();
});
