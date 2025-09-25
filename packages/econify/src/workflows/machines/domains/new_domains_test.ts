import { assertEquals, assertExists } from "@std/assert";
import { createActor } from "npm:xstate@^5.20.2";
import type { ParsedData, PipelineConfig } from "../../economic-data-workflow.ts";

import { cryptoMachine } from "./crypto/crypto.machine.ts";
import { indexDomainMachine } from "./index/index.machine.ts";
import { ratiosMachine } from "./ratios/ratios.machine.ts";
import { domainsMachine } from "./domains_router.machine.ts";

// Helper to run a machine actor to completion and capture output
async function runMachine<TInput, TOutput>(machine: any, input: TInput, timeoutMs = 3000): Promise<TOutput> {
  return await new Promise<TOutput>((resolve, reject) => {
    const actor = createActor(machine, { input });
    const to = setTimeout(() => { try { actor.stop(); } catch { /* ignore */ } reject(new Error("actor timeout")); }, timeoutMs);
    actor.subscribe((state) => {
      if ((state as any).done || (state as any).matches?.("done")) {
        clearTimeout(to);
        resolve(((state as any).output ?? (state.context as any)) as TOutput);
      }
    });
    actor.start();
  });
}

Deno.test("Crypto domain machine - BTC/ETH/wei pass-through with explain", async () => {
  const items: ParsedData[] = [
    { value: 1, unit: "BTC", name: "Bitcoin price" },
    { value: 2, unit: "ETH", name: "Ethereum price" },
    { value: 1e18, unit: "wei", name: "Wei sample" },
  ];
  const out = await runMachine<{ config: PipelineConfig; items: ParsedData[]; explain: boolean }, { processed: ParsedData[] }>(
    cryptoMachine,
    { config: { explain: true }, items, explain: true },
  );
  assertEquals(out.processed.length, 3);
  for (const it of out.processed) {
    assertExists(it.explain);
    assertEquals((it.explain as any).domain, "crypto");
    assertEquals((it.explain as any).note, "no-op normalization");
  }
});

Deno.test("Index domain machine - index/points pass-through with explain", async () => {
  const items: ParsedData[] = [
    { value: 100, unit: "index", name: "Composite Index" },
    { value: 2500, unit: "points", name: "Equity Points" },
  ];
  const out = await runMachine<{ config: PipelineConfig; items: ParsedData[]; explain: boolean }, { processed: ParsedData[] }>(
    indexDomainMachine,
    { config: { explain: true }, items, explain: true },
  );
  assertEquals(out.processed.length, 2);
  for (const it of out.processed) {
    assertExists(it.explain);
    assertEquals((it.explain as any).domain, "index");
    assertEquals((it.explain as any).note, "no-op normalization");
  }
});

Deno.test("Ratios domain machine - USD/Liter and CO2/kWh pass-through with explain", async () => {
  const items: ParsedData[] = [
    { value: 3.4, unit: "USD/Liter", name: "Fuel Price" },
    { value: 0.5, unit: "CO2/kWh", name: "Emissions Intensity" },
  ];
  const out = await runMachine<{ config: PipelineConfig; items: ParsedData[]; explain: boolean }, { processed: ParsedData[] }>(
    ratiosMachine,
    { config: { explain: true }, items, explain: true },
  );
  assertEquals(out.processed.length, 2);
  for (const it of out.processed) {
    assertExists(it.explain);
    assertEquals((it.explain as any).domain, "ratios");
    assertEquals((it.explain as any).note, "no-op normalization (guarded ratio)");
  }
});

Deno.test("Domains router - classification routes crypto/index/ratios correctly (strict ratios)", async () => {
  const data: ParsedData[] = [
    { id: 1, value: 1, unit: "BTC", name: "BTC" },
    { id: 2, value: 2500, unit: "points", name: "Index Points" },
    { id: 3, value: 3.4, unit: "USD/Liter", name: "Fuel Price" },
    { id: 4, value: 100, unit: "USD per month", name: "Monetary Flow" },
  ];
  const out = await runMachine<
    { config: PipelineConfig; parsedData: ParsedData[]; explain: boolean },
    { normalizedData: ParsedData[] }
  >(
    domainsMachine,
    { config: { targetCurrency: "USD", explain: true, useLiveFX: false }, parsedData: data, explain: true },
  );
  // preserve order
  assertEquals(out.normalizedData.map((d) => d.id), [1, 2, 3, 4]);
  // check domain annotations
  const byId: Record<number, ParsedData> = Object.fromEntries(out.normalizedData.map((d) => [d.id as number, d]));
  assertEquals((byId[1].explain as any).domain, "crypto");
  assertEquals((byId[2].explain as any).domain, "index");
  assertEquals((byId[3].explain as any).domain, "ratios");
  // monetary flow with time basis should not go to ratios
  const d4 = byId[4];
  assertExists(d4);
  assertEquals((d4.explain as any)?.domain === "ratios", false);
});

Deno.test("Domains router - edge cases: empty buckets and invalid units", async () => {
  const data: ParsedData[] = [
    { id: 1, value: 10, unit: "unknown", name: "Unknown" },
    { id: 2, value: 2, unit: "BTC/", name: "Malformed" },
  ];
  const out = await runMachine<
    { config: PipelineConfig; parsedData: ParsedData[]; explain: boolean },
    { normalizedData: ParsedData[] }
  >(
    domainsMachine,
    { config: { explain: true }, parsedData: data, explain: true },
  );
  assertEquals(out.normalizedData.length, 2);
  // Should not crash; annotations may vary; ensure present pipeline output
  assertExists(out.normalizedData[0]);
  assertExists(out.normalizedData[1]);
});

Deno.test("Pipeline E2E - mixed data preserves order and annotates domains", async () => {
  const data: ParsedData[] = [
    { id: 1, value: 1, unit: "BTC", name: "BTC" },
    { id: 2, value: 2500, unit: "points", name: "Index Points" },
    { id: 3, value: 3.4, unit: "USD/Liter", name: "Fuel Price" },
    { id: 4, value: 100, unit: "USD Million", name: "GDP" },
    { id: 5, value: 2.5, unit: "%", name: "Inflation" },
  ];
  const out = await runMachine<
    { config: PipelineConfig; parsedData: ParsedData[]; explain: boolean },
    { normalizedData: ParsedData[] }
  >(
    domainsMachine,
    { config: { targetCurrency: "USD", explain: true, useLiveFX: false }, parsedData: data, explain: true },
  );
  // order maintained
  assertEquals(out.normalizedData.map((d) => d.id), [1, 2, 3, 4, 5]);
  // all annotated
  for (const d of out.normalizedData) {
    assertExists(d.explain);
  }
});

Deno.test("Performance - handles large mixed dataset quickly", async () => {
  const base: ParsedData[] = [
    { value: 1, unit: "BTC", name: "BTC" },
    { value: 2500, unit: "points", name: "Index" },
    { value: 3.4, unit: "USD/Liter", name: "Fuel" },
    { value: 100, unit: "USD Million", name: "GDP" },
  ];
  const data: ParsedData[] = Array.from({ length: 200 }, (_, i) => ({ ...base[i % base.length], id: i + 1 }));
  const start = Date.now();
  const out = await runMachine<
    { config: PipelineConfig; parsedData: ParsedData[]; explain: boolean },
    { normalizedData: ParsedData[] }
  >(
    domainsMachine,
    { config: { targetCurrency: "USD", explain: false, useLiveFX: false }, parsedData: data, explain: false },
  );
  const dur = Date.now() - start;
  assertEquals(out.normalizedData.length, data.length);
  // Soft performance check: should finish well under 2s on typical dev hardware
  assertEquals(dur < 2000, true);
});



Deno.test("Crypto domain machine - explain disabled leaves explain undefined", async () => {
  const items: ParsedData[] = [
    { value: 1, unit: "BTC", name: "Bitcoin price" },
    { value: 2, unit: "ETH", name: "Ethereum price" },
  ];
  const out = await runMachine<
    { config: PipelineConfig; items: ParsedData[]; explain: boolean },
    { processed: ParsedData[] }
  >(
    cryptoMachine,
    { config: { explain: false }, items, explain: false },
  );
  for (const it of out.processed) {
    // When explain is disabled, domain-local machine should not add explain
    // (router may still annotate later in E2E, but machine local path stays clean)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasExplain = (it as any).explain != null;
    // allow passthrough values without explain
    assertEquals(hasExplain, false);
  }
});

Deno.test("Index domain machine - explain disabled leaves explain undefined", async () => {
  const items: ParsedData[] = [
    { value: 100, unit: "index", name: "Composite Index" },
    { value: 2500, unit: "points", name: "Equity Points" },
  ];
  const out = await runMachine<
    { config: PipelineConfig; items: ParsedData[]; explain: boolean },
    { processed: ParsedData[] }
  >(
    indexDomainMachine,
    { config: { explain: false }, items, explain: false },
  );
  for (const it of out.processed) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasExplain = (it as any).explain != null;
    assertEquals(hasExplain, false);
  }
});

Deno.test("Ratios domain machine - explain disabled and empty input", async () => {
  // Empty input returns empty processed
  const empty = await runMachine<
    { config: PipelineConfig; items: ParsedData[]; explain: boolean },
    { processed: ParsedData[] }
  >(
    ratiosMachine,
    { config: { explain: false }, items: [], explain: false },
  );
  assertEquals(empty.processed.length, 0);

  // Non-empty, but explain disabled => no explain added
  const items: ParsedData[] = [
    { value: 3.4, unit: "USD/Liter", name: "Fuel Price" },
  ];
  const out = await runMachine<
    { config: PipelineConfig; items: ParsedData[]; explain: boolean },
    { processed: ParsedData[] }
  >(
    ratiosMachine,
    { config: { explain: false }, items, explain: false },
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasExplain = (out.processed[0] as any).explain != null;
  assertEquals(hasExplain, false);
});
