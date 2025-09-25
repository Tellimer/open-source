/*
Machine: Domains Router
Purpose: Fan-out/fan-in concurrent domain pipelines; preserves original order; merges explain.
Inputs: { config, parsedData, fxRates?, fxSource?, fxSourceId?, explain? }
Output: { normalizedData }
Key states: classifyAndBucket → spawnDomainFlows (parallel) → restoreOrder → mergeExplain → done
*/

import { setup, fromPromise, assign, createActor } from "npm:xstate@^5.20.2";
import type { ParsedData, FXTable } from "../../../main.ts";
import type { PipelineConfig } from "../../economic-data-workflow.ts";
import { filterExemptions } from "../../../exemptions/exemptions.ts";
import { processBatch } from "../../../batch/batch.ts";
import { defaultMonetaryMachine } from "./monetary/index.ts";
import { countsMachine } from "./counts/counts.machine.ts";
import { percentagesMachine } from "./percentages/percentages.machine.ts";
import { cryptoMachine } from "./crypto/crypto.machine.ts";
import { indexDomainMachine } from "./index/index.machine.ts";
import { ratiosMachine } from "./ratios/ratios.machine.ts";
import { parseUnit } from "../../../units/units.ts";
import { parseWithCustomUnits, loadDomainUnits } from "../../../custom/custom_units.ts";
import { isCountIndicator, isCountUnit } from "../../../count/count-normalization.ts";

interface DomainsInput {
  config: PipelineConfig;
  parsedData: ParsedData[];
  fxRates?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
  explain?: boolean;
}

interface DomainsOutput {
  normalizedData: ParsedData[];
}

type IndexedItem = { item: ParsedData; idx: number };

type Buckets = {
  counts: IndexedItem[];
  percentages: IndexedItem[];
  emissions: IndexedItem[];
  energy: IndexedItem[];
  commodities: IndexedItem[];
  agriculture: IndexedItem[];
  metals: IndexedItem[];
  crypto: IndexedItem[];
  index: IndexedItem[];
  ratios: IndexedItem[];
  defaults: IndexedItem[];
};

export const domainsMachine = setup({
  types: {
    context: {} as {
      config: PipelineConfig;
      parsedData: ParsedData[];
      fxRates?: FXTable;
      fxSource?: "live" | "fallback";
      fxSourceId?: string;
      explain?: boolean;
      exempted?: ParsedData[];
      nonExempted?: ParsedData[];
      buckets?: Buckets; // all indicator types
      processedCounts?: ParsedData[];
      processedPercentages?: ParsedData[];
      processedEmissions?: ParsedData[];
      processedEnergy?: ParsedData[];
      processedCommodities?: ParsedData[];
      processedAgriculture?: ParsedData[];
      processedMetals?: ParsedData[];
      processedCrypto?: ParsedData[];
      processedIndex?: ParsedData[];
      processedRatios?: ParsedData[];
      processedDefaults?: ParsedData[];
      normalizedData?: ParsedData[];
    },
    input: {} as DomainsInput,
  },
  actors: {
    partition: fromPromise(({ input }: { input: DomainsInput }) => {
      const { parsedData, config } = input;
      if (!parsedData) throw new Error("No parsed data available");
      // Ensure crypto custom units are registered for classification
      try { loadDomainUnits("crypto"); } catch (_) { /* no-op */ }
      const { exempted, nonExempted } = filterExemptions(parsedData, config.exemptions);
      const indexed: IndexedItem[] = nonExempted.map((item, idx) => ({ item, idx }));
      const buckets: Buckets = { counts: [], percentages: [], emissions: [], energy: [], commodities: [], agriculture: [], metals: [], crypto: [], index: [], ratios: [], defaults: [] };
      for (const entry of indexed) {
        const { item } = entry;
        const parsed = parseUnit(item.unit);
        const name = (item.name || "").toLowerCase();
        const unitLower = (item.unit || "").toLowerCase();
        const custom = parseWithCustomUnits(`${name} ${item.unit || ""}`) || parseWithCustomUnits(item.unit || "");
        const isEmissions = (custom && (custom as { category?: string }).category === "emissions") || /co2e?|carbon\s+credits?/i.test(unitLower + " " + name);
        if (isEmissions) { buckets.emissions.push(entry); continue; }
        const isEnergy = parsed.category === "energy" || /(gwh|\bmegawatts?\b|\bmw\b|\bterajoules?\b|\btj\b|\bmmbtu\b|\bbtu\b)/i.test(unitLower);
        if (isEnergy) { buckets.energy.push(entry); continue; }
        const isCommodity = (custom && (custom as { category?: string }).category === "commodity") || /(troy\s*oz|barrels?|\bbbls?\b|crude|wti|brent|gold)/i.test(unitLower + " " + name);
        if (isCommodity) { buckets.commodities.push(entry); continue; }
        const isAgriculture = (custom && (custom as { category?: string }).category === "agriculture") || /\bbushels?\b|short\s+tons?|metric\s+tonnes?/i.test(unitLower + " " + name);
        if (isAgriculture) { buckets.agriculture.push(entry); continue; }
        const isMetals = (custom && (custom as { category?: string }).category === "metals") || /silver\s+oz|silver\s+troy\s+ounces?|copper\s+tonnes?|steel\s+tonnes?/i.test(unitLower + " " + name);
        if (isMetals) { buckets.metals.push(entry); continue; }
        const isCrypto = (custom && (custom as { category?: string }).category === "cryptocurrency") || /(\bbtc\b|bitcoin|\beth\b|ethereum|\bwei\b)/i.test(unitLower + " " + name);
        if (isCrypto) { buckets.crypto.push(entry); continue; }
        const isIndex = parsed.category === "index";
        if (isIndex) { buckets.index.push(entry); continue; }
        const hasSlash = (item.unit || "").includes("/");
        const isStrictRatio = hasSlash && parsed.category === "composite" && !parsed.timeScale;
        if (isStrictRatio) { buckets.ratios.push(entry); continue; }
        if (isCountIndicator(item.name, item.unit) || isCountUnit(item.unit || "")) { buckets.counts.push(entry); continue; }
        if (parsed.category === "percentage") { buckets.percentages.push(entry); continue; }
        buckets.defaults.push(entry);
      }
      return Promise.resolve({ exempted, nonExempted, buckets });
    }),

    processEmissions: fromPromise(async ({ input }: { input: DomainsInput & { buckets: Buckets } }) => {
      const { config, fxRates } = input;
      const emissions = input.buckets.emissions;
      if (emissions.length === 0) return [] as ParsedData[];
      const res = await processBatch(emissions.map((e) => e.item), {
        validate: false, handleErrors: "skip", parallel: true,
        toCurrency: undefined, toMagnitude: undefined, toTimeScale: undefined,
        fx: fxRates,
        explain: config.explain,
      });
      return res.successful;
    }),

    processEnergy: fromPromise(async ({ input }: { input: DomainsInput & { buckets: Buckets } }) => {
      const { config, fxRates } = input;
      const energy = input.buckets.energy;
      if (energy.length === 0) return [] as ParsedData[];
      const res = await processBatch(energy.map((e) => e.item), {
        validate: false, handleErrors: "skip", parallel: true,
        toCurrency: undefined, toMagnitude: undefined, toTimeScale: undefined,
        fx: fxRates,
        explain: config.explain,
      });
      return res.successful;
    }),

    processCommodities: fromPromise(async ({ input }: { input: DomainsInput & { buckets: Buckets } }) => {
      const { config, fxRates } = input;
      const commodities = input.buckets.commodities;
      if (commodities.length === 0) return [] as ParsedData[];
      const res = await processBatch(commodities.map((c) => c.item), {
        validate: false, handleErrors: "skip", parallel: true,
        toCurrency: undefined, toMagnitude: undefined, toTimeScale: undefined,
        fx: fxRates,
        explain: config.explain,
      });
      return res.successful;
    }),

    processAgriculture: fromPromise(async ({ input }: { input: DomainsInput & { buckets: Buckets } }) => {
      const { config, fxRates } = input;
      const agriculture = input.buckets.agriculture;
      if (agriculture.length === 0) return [] as ParsedData[];
      const res = await processBatch(agriculture.map((a) => a.item), {
        validate: false, handleErrors: "skip", parallel: true,
        toCurrency: undefined, toMagnitude: undefined, toTimeScale: undefined,
        fx: fxRates,
        explain: config.explain,
      });
      return res.successful;
    }),

    processMetals: fromPromise(async ({ input }: { input: DomainsInput & { buckets: Buckets } }) => {
      const { config, fxRates } = input;
      const metals = input.buckets.metals;
      if (metals.length === 0) return [] as ParsedData[];
      const res = await processBatch(metals.map((m) => m.item), {
        validate: false, handleErrors: "skip", parallel: true,
        toCurrency: undefined, toMagnitude: undefined, toTimeScale: undefined,
        fx: fxRates,
        explain: config.explain,
      });
      return res.successful;
    }),

    processDefaults: fromPromise(async ({ input }: { input: DomainsInput & { buckets: Buckets } }) => {
      const { config, fxRates, fxSource, fxSourceId } = input;
      const defaults = input.buckets.defaults;
      if (defaults.length === 0) return [] as ParsedData[];
      const defaultsItems = defaults.map((d) => d.item);
      const actor = createActor(defaultMonetaryMachine, { input: { config, items: defaultsItems, fx: fxRates, fxSource, fxSourceId } });
      const dmItems: ParsedData[] = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { try { actor.stop(); } catch (_) { /* ignore */ } reject(new Error("DefaultMonetaryMachine timed out")); }, 30000);
        actor.subscribe((state) => {
          if ((state as any).matches?.("done")) {
            clearTimeout(timeout);
            const items = ((state as any).output?.items as ParsedData[]) ?? state.context.items;
            resolve(items);
          }
        });
        actor.start();
      });
      // Reorder to match original bucket order, in case child changed ordering
      const key = (d: ParsedData) => `${d.id ?? ""}::${d.name ?? ""}::${d.unit}::${d.value}`;
      const map = new Map<string, ParsedData>();
      for (const it of dmItems) map.set(key(it), it);
      const ordered = defaults.map((d) => map.get(key(d.item)) || d.item).filter((x): x is ParsedData => !!x);
      return ordered;
    }),
  },
}).createMachine({
  id: "domains",
  context: ({ input }) => ({
    config: input.config,
    parsedData: input.parsedData,
    fxRates: input.fxRates,
    fxSource: input.fxSource,
    fxSourceId: input.fxSourceId,
    explain: input.explain,
  }),
  initial: "classifyAndBucket",
  states: {
    classifyAndBucket: {
      invoke: {
        src: "partition",
        input: ({ context }) => ({ config: context.config, parsedData: context.parsedData! }),
        onDone: {
          target: "spawnDomainFlows",
          actions: assign({
            exempted: ({ event }) => (event as any).output.exempted,
            nonExempted: ({ event }) => (event as any).output.nonExempted,
            buckets: ({ event }) => (event as any).output.buckets,
          }),
        },
      },
    },

    spawnDomainFlows: {
      type: "parallel",
      states: {
        counts: {
          initial: "working",
          states: {
            working: {
              invoke: {
                src: countsMachine,
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets!.counts.map((c) => c.item),
                  fxRates: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
                  explain: context.explain,
                }),
                onDone: {
                  target: "done",
                  actions: assign({ processedCounts: ({ event }) => ((event as any)?.output?.processed ?? []) }),
                },
              },
            },
            done: { type: "final" },
          },
        },
        percentages: {
          initial: "working",
          states: {
            working: {
              invoke: {
                src: percentagesMachine,
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets!.percentages.map((p) => p.item),
                  fxRates: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
                  explain: context.explain,
                }),
                onDone: {
                  target: "done",
                  actions: assign({ processedPercentages: ({ event }) => ((event as any)?.output?.processed ?? []) }),
                },
              },
            },
            done: { type: "final" },
          },
        },
        emissions: {
          initial: "working",
          states: {
            working: {
              invoke: {
                src: "processEmissions",
                input: ({ context }) => ({
                  config: context.config,
                  parsedData: context.parsedData!,
                  fxRates: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
                  buckets: context.buckets!,
                }),
                onDone: {
                  target: "done",
                  actions: assign({ processedEmissions: ({ event }) => (event as any).output }),
                },
              },
            },
            done: { type: "final" },
          },
        },
        energy: {
          initial: "working",
          states: {
            working: {
              invoke: {
                src: "processEnergy",
                input: ({ context }) => ({
                  config: context.config,
                  parsedData: context.parsedData!,
                  fxRates: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
                  buckets: context.buckets!,
                }),
                onDone: {
                  target: "done",
                  actions: assign({ processedEnergy: ({ event }) => (event as any).output }),
                },
              },
            },
            done: { type: "final" },
          },
        },
        commodities: {
          initial: "working",
          states: {
            working: {
              invoke: {
                src: "processCommodities",
                input: ({ context }) => ({
                  config: context.config,
                  parsedData: context.parsedData!,
                  fxRates: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
                  buckets: context.buckets!,
                }),
                onDone: {
                  target: "done",
                  actions: assign({ processedCommodities: ({ event }) => (event as any).output }),
                },
              },
            },
            done: { type: "final" },
          },
        },
        agriculture: {
          initial: "working",
          states: {
            working: {
              invoke: {
                src: "processAgriculture",
                input: ({ context }) => ({
                  config: context.config,
                  parsedData: context.parsedData!,
                  fxRates: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
                  buckets: context.buckets!,
                }),
                onDone: {
                  target: "done",
                  actions: assign({ processedAgriculture: ({ event }) => (event as any).output }),
                },
              },
            },
            done: { type: "final" },
          },
        },
        metals: {
          initial: "working",
          states: {
            working: {
              invoke: {
                src: "processMetals",
                input: ({ context }) => ({
                  config: context.config,
                  parsedData: context.parsedData!,
                  fxRates: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
                  buckets: context.buckets!,
                }),
                onDone: {
                  target: "done",
                  actions: assign({ processedMetals: ({ event }) => (event as any).output }),
                },
              },
            },
            done: { type: "final" },
          },
        },
        crypto: {
          initial: "working",
          states: {
            working: {
              invoke: {
                src: cryptoMachine,
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets!.crypto.map((c) => c.item),
                  fxRates: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
                  explain: context.explain,
                }),
                onDone: {
                  target: "done",
                  actions: assign({ processedCrypto: ({ event }) => ((event as any)?.output?.processed ?? []) }),
                },
              },
            },
            done: { type: "final" },
          },
        },
        index: {
          initial: "working",
          states: {
            working: {
              invoke: {
                src: indexDomainMachine,
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets!.index.map((i) => i.item),
                  fxRates: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
                  explain: context.explain,
                }),
                onDone: {
                  target: "done",
                  actions: assign({ processedIndex: ({ event }) => ((event as any)?.output?.processed ?? []) }),
                },
              },
            },
            done: { type: "final" },
          },
        },
        ratios: {
          initial: "working",
          states: {
            working: {
              invoke: {
                src: ratiosMachine,
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets!.ratios.map((r) => r.item),
                  fxRates: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
                  explain: context.explain,
                }),
                onDone: {
                  target: "done",
                  actions: assign({ processedRatios: ({ event }) => ((event as any)?.output?.processed ?? []) }),
                },
              },
            },
            done: { type: "final" },
          },
        },
        defaults: {
          initial: "working",
          states: {
            working: {
              invoke: {
                src: "processDefaults",
                input: ({ context }) => ({
                  config: context.config,
                  parsedData: context.parsedData!,
                  fxRates: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
                  buckets: context.buckets!,
                }),
                onDone: {
                  target: "done",
                  actions: assign({ processedDefaults: ({ event }) => (event as any).output }),
                },
              },
            },
            done: { type: "final" },
          },
        },
      },
      onDone: { target: "restoreOrder" },
    },

    restoreOrder: {
      entry: assign(({ context }) => {
        const nonExempted = context.nonExempted ?? [];
        const exempted = context.exempted ?? [];
        const b = context.buckets!;
        const ordered: (ParsedData | undefined)[] = new Array(nonExempted.length);
        const place = (bucket: IndexedItem[], processed?: ParsedData[]) => {
          if (!processed) return;
          const n = Math.min(bucket.length, processed.length);
          for (let i = 0; i < n; i++) {
            const idx = bucket[i].idx;
            ordered[idx] = processed[i];
          }
        };
        place(b.counts, context.processedCounts);
        place(b.percentages, context.processedPercentages);
        place(b.emissions, context.processedEmissions);
        place(b.energy, context.processedEnergy);
        place(b.commodities, context.processedCommodities);
        place(b.agriculture, context.processedAgriculture);
        place(b.metals, context.processedMetals);
        place(b.crypto, context.processedCrypto);
        place(b.index, context.processedIndex);
        place(b.ratios, context.processedRatios);
        place(b.defaults, context.processedDefaults);
        // Fill any gaps with original nonExempted items (pass-through)
        for (let i = 0; i < nonExempted.length; i++) {
          if (!ordered[i]) ordered[i] = nonExempted[i];
        }
        const finalProcessed = ordered.filter((x): x is ParsedData => !!x);
        return { normalizedData: [...finalProcessed, ...exempted] };
      }),
      always: { target: "mergeExplain" },
    },

    mergeExplain: {
      entry: assign(({ context }) => {
        if (!context.explain || !context.normalizedData) return {};
        const counts = new Set(context.processedCounts ?? []);
        const percentages = new Set(context.processedPercentages ?? []);
        const emissions = new Set(context.processedEmissions ?? []);
        const energy = new Set(context.processedEnergy ?? []);
        const commodities = new Set(context.processedCommodities ?? []);
        const agriculture = new Set(context.processedAgriculture ?? []);
        const metals = new Set(context.processedMetals ?? []);
        const crypto = new Set(context.processedCrypto ?? []);
        const index = new Set(context.processedIndex ?? []);
        const ratios = new Set(context.processedRatios ?? []);
        const defaults = new Set(context.processedDefaults ?? []);
        const exemptedSet = new Set(context.exempted ?? []);

        const annotated = context.normalizedData.map((item) => {
          let domain: string | undefined;
          if (counts.has(item)) domain = "counts";
          else if (percentages.has(item)) domain = "percentages";
          else if (emissions.has(item)) domain = "emissions";
          else if (energy.has(item)) domain = "energy";
          else if (commodities.has(item)) domain = "commodities";
          else if (agriculture.has(item)) domain = "agriculture";
          else if (metals.has(item)) domain = "metals";
          else if (crypto.has(item)) domain = "crypto";
          else if (index.has(item)) domain = "index";
          else if (ratios.has(item)) domain = "ratios";
          else if (defaults.has(item)) domain = "defaults";

          // Fallback classification for explain, in case a domain machine returned pass-through refs
          if (!domain) {
            const name = (item.name || "").toLowerCase();
            const unitLower = (item.unit || "").toLowerCase();
            const parsed = parseUnit(item.unit);
            const custom = parseWithCustomUnits(`${name} ${item.unit || ""}`) || parseWithCustomUnits(item.unit || "");
            if ((custom && (custom as { category?: string }).category === "cryptocurrency") || /(\bbtc\b|bitcoin|\beth\b|ethereum|\bwei\b)/i.test(unitLower + " " + name)) domain = "crypto";
            else if (parsed.category === "index") domain = "index";
            else if ((item.unit || "").includes("/") && parsed.category === "composite" && !parsed.timeScale) domain = "ratios";
          }

          // Don’t override domain if already set (e.g., wages pipeline)
          const base = item as unknown as { explain?: Record<string, unknown> };
          const existing = base.explain ? { ...base.explain } : undefined;
          const mergedExplain: Record<string, unknown> = existing ? { ...existing } : {};
          if (domain && mergedExplain["domain"] == null) {
            mergedExplain["domain"] = domain;
            mergedExplain["router"] = "domains-router";
          }
          if (exemptedSet.has(item)) {
            mergedExplain["exempted"] = true;
          }
          return Object.keys(mergedExplain).length > 0
            ? { ...(item as ParsedData), explain: mergedExplain }
            : item;
        });

        return { normalizedData: annotated };
      }),
      always: { target: "done" },
    },

    done: {
      type: "final",
      output: ({ context }): DomainsOutput => ({ normalizedData: context.normalizedData ?? [] }),
    },
  },
  output: ({ context }): DomainsOutput => ({ normalizedData: context.normalizedData ?? [] }),
});

