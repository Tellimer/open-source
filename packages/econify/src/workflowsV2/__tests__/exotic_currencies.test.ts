import { assertEquals } from "jsr:@std/assert@1";
import { createPipeline } from "../../workflows/economic-data-workflow.ts";
import type { PipelineConfig } from "../../workflows/economic-data-workflow.ts";

Deno.test("V2 exotic currencies: African currencies detection and conversion", async () => {
  const africanData = [
    // Zimbabwe Dollar
    { id: "zim-gdp", value: 1000, unit: "ZWL millions", name: "Zimbabwe GDP" },
    // South Sudan Pound
    {
      id: "ssd-reserves",
      value: 500,
      unit: "SSP billions",
      name: "South Sudan Reserves",
    },
    // Eritrean Nakfa
    { id: "eri-debt", value: 200, unit: "ERN millions", name: "Eritrea Debt" },
    // CFA Franc (West Africa)
    {
      id: "sen-exports",
      value: 1500,
      unit: "XOF billions",
      name: "Senegal Exports",
    },
    // CFA Franc (Central Africa)
    {
      id: "cam-imports",
      value: 800,
      unit: "XAF millions",
      name: "Cameroon Imports",
    },
  ];

  const fxFallback = {
    base: "USD",
    rates: {
      ZWL: 322.0, // Zimbabwe Dollar
      SSP: 130.5, // South Sudan Pound
      ERN: 15.0, // Eritrean Nakfa
      XOF: 600.0, // CFA Franc BCEAO
      XAF: 600.0, // CFA Franc BEAC
      EUR: 0.92,
    },
    asOf: "2024-01-01",
    sourceId: "TEST",
  };

  const config: PipelineConfig = {
    engine: "v2",
    targetCurrency: "USD",
    targetMagnitude: "millions",
    useLiveFX: false,
    fxFallback: fxFallback as any,
    explain: true,
  } as PipelineConfig;

  const pipeline = createPipeline(config);
  const result = await pipeline.run(africanData as any);

  assertEquals(result.length, africanData.length);

  // All should be converted to USD
  for (const item of result) {
    const unit = String(item.normalizedUnit || "");
    if (!unit.includes("USD")) {
      throw new Error(
        `Expected USD conversion for ${item.id}, got ${item.normalizedUnit}`,
      );
    }
  }

  // Check FX explain metadata
  const zwl = result.find((r: any) => r.id === "zim-gdp");
  if (zwl?.explain?.fx) {
    assertEquals(zwl.explain.fx.currency, "ZWL");
    assertEquals(zwl.explain.fx.base, "USD");
  }
});

Deno.test("V2 exotic currencies: Asian exotic currencies", async () => {
  const asianData = [
    // Cambodia Riel
    {
      id: "khm-gdp",
      value: 100000,
      unit: "KHR millions",
      name: "Cambodia GDP",
    },
    // Lao Kip
    { id: "lao-debt", value: 50000, unit: "LAK billions", name: "Laos Debt" },
    // Myanmar Kyat
    {
      id: "mmr-reserves",
      value: 25000,
      unit: "MMK millions",
      name: "Myanmar Reserves",
    },
    // Bhutanese Ngultrum
    {
      id: "btn-exports",
      value: 500,
      unit: "BTN millions",
      name: "Bhutan Exports",
    },
    // Mongolian Tugrik
    {
      id: "mng-imports",
      value: 8000,
      unit: "MNT billions",
      name: "Mongolia Imports",
    },
  ];

  const fxFallback = {
    base: "USD",
    rates: {
      KHR: 4100.0, // Cambodian Riel
      LAK: 20500.0, // Lao Kip
      MMK: 2100.0, // Myanmar Kyat
      BTN: 83.0, // Bhutanese Ngultrum
      MNT: 3450.0, // Mongolian Tugrik
      EUR: 0.92,
    },
    asOf: "2024-01-01",
    sourceId: "TEST",
  };

  const config: PipelineConfig = {
    engine: "v2",
    targetCurrency: "USD",
    targetMagnitude: "millions",
    useLiveFX: false,
    fxFallback: fxFallback as any,
    explain: true,
  } as PipelineConfig;

  const pipeline = createPipeline(config);
  const result = await pipeline.run(asianData as any);

  assertEquals(result.length, asianData.length);

  // Verify all converted to USD
  for (const item of result) {
    const unit = String(item.normalizedUnit || "");
    if (!unit.includes("USD")) {
      throw new Error(
        `Expected USD conversion for ${item.id}, got ${item.normalizedUnit}`,
      );
    }
  }
});

Deno.test("V2 exotic currencies: Latin American and Caribbean", async () => {
  const latamData = [
    // Venezuelan Bolívar
    {
      id: "ven-gdp",
      value: 1000000,
      unit: "VES millions",
      name: "Venezuela GDP",
    },
    // Paraguayan Guarani
    {
      id: "pry-debt",
      value: 50000,
      unit: "PYG billions",
      name: "Paraguay Debt",
    },
    // Haitian Gourde
    {
      id: "hti-reserves",
      value: 2000,
      unit: "HTG millions",
      name: "Haiti Reserves",
    },
    // Surinamese Dollar
    {
      id: "sur-exports",
      value: 800,
      unit: "SRD millions",
      name: "Suriname Exports",
    },
    // Guyanese Dollar
    {
      id: "guy-imports",
      value: 1500,
      unit: "GYD millions",
      name: "Guyana Imports",
    },
  ];

  const fxFallback = {
    base: "USD",
    rates: {
      VES: 36.0, // Venezuelan Bolívar (simplified rate)
      PYG: 7300.0, // Paraguayan Guarani
      HTG: 132.0, // Haitian Gourde
      SRD: 38.0, // Surinamese Dollar
      GYD: 209.0, // Guyanese Dollar
      EUR: 0.92,
    },
    asOf: "2024-01-01",
    sourceId: "TEST",
  };

  const config: PipelineConfig = {
    engine: "v2",
    targetCurrency: "USD",
    targetMagnitude: "millions",
    useLiveFX: false,
    fxFallback: fxFallback as any,
    explain: true,
  } as PipelineConfig;

  const pipeline = createPipeline(config);
  const result = await pipeline.run(latamData as any);

  assertEquals(result.length, latamData.length);

  // Check conversions
  for (const item of result) {
    const unit = String(item.normalizedUnit || "");
    if (!unit.includes("USD")) {
      throw new Error(
        `Expected USD conversion for ${item.id}, got ${item.normalizedUnit}`,
      );
    }
  }

  // Verify VES specifically (often problematic due to hyperinflation)
  const ves = result.find((r: any) => r.id === "ven-gdp");
  if (ves) {
    assertEquals(ves.explain?.fx?.currency, "VES");
    assertEquals(ves.explain?.fx?.base, "USD");
  }
});

Deno.test("V2 exotic currencies: Eastern European currencies", async () => {
  const easternEuropeData = [
    // Moldovan Leu
    { id: "mda-gdp", value: 250, unit: "MDL billions", name: "Moldova GDP" },
    // Albanian Lek
    { id: "alb-debt", value: 500, unit: "ALL billions", name: "Albania Debt" },
    // North Macedonian Denar
    {
      id: "mkd-reserves",
      value: 100,
      unit: "MKD billions",
      name: "Macedonia Reserves",
    },
    // Belarusian Ruble
    {
      id: "blr-exports",
      value: 80,
      unit: "BYN billions",
      name: "Belarus Exports",
    },
    // Georgian Lari
    {
      id: "geo-imports",
      value: 50,
      unit: "GEL millions",
      name: "Georgia Imports",
    },
  ];

  const fxFallback = {
    base: "USD",
    rates: {
      MDL: 17.8, // Moldovan Leu
      ALL: 95.0, // Albanian Lek
      MKD: 56.5, // Macedonian Denar
      BYN: 3.3, // Belarusian Ruble
      GEL: 2.7, // Georgian Lari
      EUR: 0.92,
    },
    asOf: "2024-01-01",
    sourceId: "TEST",
  };

  const config: PipelineConfig = {
    engine: "v2",
    targetCurrency: "USD",
    targetMagnitude: "millions",
    useLiveFX: false,
    fxFallback: fxFallback as any,
    explain: true,
  } as PipelineConfig;

  const pipeline = createPipeline(config);
  const result = await pipeline.run(easternEuropeData as any);

  assertEquals(result.length, easternEuropeData.length);

  // All should convert to USD
  for (const item of result) {
    const unit = String(item.normalizedUnit || "");
    if (!unit.includes("USD")) {
      throw new Error(
        `Expected USD conversion for ${item.id}, got ${item.normalizedUnit}`,
      );
    }
  }

  // Check MDL (the currency you specifically mentioned)
  const mdl = result.find((r: any) => r.id === "mda-gdp");
  if (mdl) {
    assertEquals(mdl.explain?.fx?.currency, "MDL");
    assertEquals(mdl.explain?.fx?.base, "USD");
  }
});

Deno.test("V2 exotic currencies: Pacific Island currencies", async () => {
  const pacificData = [
    // Vanuatu Vatu
    { id: "vut-gdp", value: 100, unit: "VUV billions", name: "Vanuatu GDP" },
    // Samoan Tala
    { id: "wsm-debt", value: 500, unit: "WST millions", name: "Samoa Debt" },
    // Solomon Islands Dollar
    {
      id: "slb-reserves",
      value: 800,
      unit: "SBD millions",
      name: "Solomon Islands Reserves",
    },
    // Tongan Paʻanga
    {
      id: "ton-exports",
      value: 200,
      unit: "TOP millions",
      name: "Tonga Exports",
    },
    // Fijian Dollar
    {
      id: "fji-imports",
      value: 1500,
      unit: "FJD millions",
      name: "Fiji Imports",
    },
  ];

  const fxFallback = {
    base: "USD",
    rates: {
      VUV: 118.0, // Vanuatu Vatu
      WST: 2.7, // Samoan Tala
      SBD: 8.4, // Solomon Islands Dollar
      TOP: 2.3, // Tongan Paʻanga
      FJD: 2.2, // Fijian Dollar
      EUR: 0.92,
    },
    asOf: "2024-01-01",
    sourceId: "TEST",
  };

  const config: PipelineConfig = {
    engine: "v2",
    targetCurrency: "USD",
    targetMagnitude: "millions",
    useLiveFX: false,
    fxFallback: fxFallback as any,
    explain: true,
  } as PipelineConfig;

  const pipeline = createPipeline(config);
  const result = await pipeline.run(pacificData as any);

  assertEquals(result.length, pacificData.length);

  // Verify conversions
  console.log("Pacific Island currencies test results:");
  for (const item of result) {
    console.log(
      `  ${item.id}: ${
        (item as any).normalizedValue || item.normalized
      } ${item.normalizedUnit} (from ${item.value} ${item.unit})`,
    );
    const unit = String(item.normalizedUnit || "");
    if (!unit.includes("USD")) {
      console.log(
        `    ERROR: Expected USD conversion, got ${item.normalizedUnit}`,
      );
      console.log(
        `    FX applied: ${(item as any).explain?.fx ? "YES" : "NO"}`,
      );
      if ((item as any).explain?.fx) {
        console.log(`    FX rate: ${(item as any).explain.fx.rate}`);
      }
      throw new Error(
        `Expected USD conversion for ${item.id}, got ${item.normalizedUnit}`,
      );
    }
  }
});

Deno.test("V2 exotic currencies: same currency should skip conversion", async () => {
  const sameCurrencyData = [
    // Already in target currency (MDL to MDL)
    {
      id: "mdl-same",
      value: 100,
      unit: "MDL millions",
      name: "Moldova Indicator",
    },
    // Another exotic currency same as target
    {
      id: "zwl-same",
      value: 500,
      unit: "ZWL billions",
      name: "Zimbabwe Indicator",
    },
  ];

  const fxFallback = {
    base: "USD",
    rates: {
      MDL: 17.8,
      ZWL: 322.0,
      USD: 1.0,
      EUR: 0.92,
    },
    asOf: "2024-01-01",
    sourceId: "TEST",
  };

  // Test MDL to MDL (same currency)
  const configMDL: PipelineConfig = {
    engine: "v2",
    targetCurrency: "MDL",
    targetMagnitude: "millions",
    useLiveFX: false,
    fxFallback: fxFallback as any,
    explain: true,
  } as PipelineConfig;

  const pipelineMDL = createPipeline(configMDL);
  const resultMDL = await pipelineMDL.run([sameCurrencyData[0]] as any);

  // Should preserve MDL without conversion
  const mdlItem = resultMDL[0];
  assertEquals(mdlItem.normalizedUnit?.includes("MDL"), true);

  // Test ZWL to ZWL
  const configZWL: PipelineConfig = {
    engine: "v2",
    targetCurrency: "ZWL",
    targetMagnitude: "billions",
    useLiveFX: false,
    fxFallback: fxFallback as any,
    explain: true,
  } as PipelineConfig;

  const pipelineZWL = createPipeline(configZWL);
  const resultZWL = await pipelineZWL.run([sameCurrencyData[1]] as any);

  // Should preserve ZWL without conversion
  const zwlItem = resultZWL[0];
  assertEquals(zwlItem.normalizedUnit?.includes("ZWL"), true);
});

Deno.test("V2 exotic currencies: multi-currency dataset with exotic mix", async () => {
  // Mix of exotic and common currencies
  const mixedData = [
    { id: "mdl1", value: 100, unit: "MDL millions", name: "Moldova GDP" },
    { id: "usd1", value: 200, unit: "USD millions", name: "US Aid" },
    { id: "eur1", value: 150, unit: "EUR millions", name: "EU Grant" },
    { id: "zwl1", value: 5000, unit: "ZWL billions", name: "Zimbabwe Budget" },
    { id: "xof1", value: 800, unit: "XOF millions", name: "Senegal Trade" },
    { id: "btn1", value: 50, unit: "BTN millions", name: "Bhutan Revenue" },
  ];

  const fxFallback = {
    base: "USD",
    rates: {
      MDL: 17.8,
      EUR: 0.92,
      ZWL: 322.0,
      XOF: 600.0,
      BTN: 83.0,
    },
    asOf: "2024-01-01",
    sourceId: "TEST",
  };

  const config: PipelineConfig = {
    engine: "v2",
    targetCurrency: "EUR", // Convert everything to EUR
    targetMagnitude: "millions",
    useLiveFX: false,
    fxFallback: fxFallback as any,
    explain: true,
  } as PipelineConfig;

  const pipeline = createPipeline(config);
  const result = await pipeline.run(mixedData as any);

  assertEquals(result.length, mixedData.length);

  // All should be in EUR
  for (const item of result) {
    const unit = String(item.normalizedUnit || "");
    if (!unit.includes("EUR")) {
      throw new Error(
        `Expected EUR conversion for ${item.id}, got ${item.normalizedUnit}`,
      );
    }
  }

  // EUR item should not need conversion
  const eurItem = result.find((r: any) => r.id === "eur1");
  if (eurItem?.explain?.fx) {
    // If FX metadata exists, it should show EUR to EUR (no actual conversion)
    if (eurItem.explain.fx.currency && eurItem.explain.fx.base) {
      assertEquals(eurItem.explain.fx.currency, "EUR");
      assertEquals(eurItem.explain.fx.base, "EUR");
    }
  }
});
