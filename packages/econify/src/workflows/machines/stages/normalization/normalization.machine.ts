import { assign, createActor, fromPromise, setup } from "npm:xstate@^5.20.2";
import { type FXTable, type ParsedData } from "../../../../main.ts";
import type { PipelineConfig } from "../../../economic-data-workflow.ts";
import { filterExemptions } from "../../../../exemptions/exemptions.ts";
import { processBatch } from "../../../../batch/batch.ts";
import { processWagesData } from "../../../../services/wages-service.ts";
import { defaultMonetaryMachine } from "../../domains/monetary/index.ts";
import { wagesMachine } from "../../domains/wages/index.ts";
import { domainsMachine } from "../../domains/index.ts";
import {
  isCountIndicator,
  isCountUnit,
} from "../../../../count/count-normalization.ts";
import { parseUnit } from "../../../../main.ts";
import { parseWithCustomUnits } from "../../../../custom/custom_units.ts";
import type { Scale } from "../../../../main.ts";

function _normalizeShareKeys(shares: {
  currency: Record<string, number>;
  magnitude: Record<string, number>;
  time: Record<string, number>;
}): {
  currency: Record<string, number>;
  magnitude: Record<string, number>;
  time: Record<string, number>;
} {
  const norm = (m: Record<string, number>, map: Record<string, string>) => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(m)) {
      const key = map[k.toLowerCase()] ?? k.toLowerCase();
      out[key] = (out[key] ?? 0) + v;
    }
    return out;
  };
  const currencyMap: Record<string, string> = {
    usd: "USD",
    eur: "EUR",
    aud: "AUD",
    gbp: "GBP",
  };
  const magnitudeMap: Record<string, string> = {
    ones: "ones",
    thousands: "thousand",
    millions: "million",
    billions: "billion",
  };
  const timeMap: Record<string, string> = {
    monthly: "month",
    quarterly: "quarter",
    yearly: "year",
  };
  return {
    currency: norm(shares.currency, currencyMap),
    magnitude: norm(shares.magnitude, magnitudeMap),
    time: norm(shares.time, timeMap),
  };
}

// Internal helper types and utilities for explicit state processing
type IndexedItem = { item: ParsedData; idx: number };

function _mergeByKey(
  bucket: IndexedItem[],
  processed: ParsedData[],
): ParsedData[] {
  const key = (d: ParsedData) =>
    `${d.id ?? ""}::${d.name ?? ""}::${d.unit}::${d.value}`;
  const map = new Map<string, ParsedData>();
  for (const p of processed) map.set(key(p), p);
  const out: ParsedData[] = [];
  for (const b of bucket) {
    const v = map.get(key(b.item));
    if (v) out.push(v);
  }
  return out;
}

interface NormalizationInput {
  config: PipelineConfig;
  parsedData: ParsedData[];
  fxRates?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
  explain?: boolean;
}

interface NormalizationOutput {
  normalizedData: ParsedData[];
  warnings?: string[];
}

/* BEGIN_TOPLEVEL_ACCIDENTAL_ACTORS

    classify: fromPromise(async ({ input }: { input: NormalizationInput }) => {
      const { parsedData, config } = input;
      if (!parsedData) throw new Error("No parsed data available");

      const { exempted, nonExempted } = filterExemptions(parsedData, config.exemptions);
      type BucketSet = {
        wages: IndexedItem[];
        counts: IndexedItem[];
        percentages: IndexedItem[];
        emissions: IndexedItem[];
        energy: IndexedItem[];
        commodities: IndexedItem[];
        agriculture: IndexedItem[];
        metals: IndexedItem[];
        defaults: IndexedItem[];
      };
      const buckets: BucketSet = {
        wages: [], counts: [], percentages: [], emissions: [], energy: [], commodities: [], agriculture: [], metals: [], defaults: [],
      };
      const indexed: IndexedItem[] = nonExempted.map((item, idx) => ({ item, idx }));
      for (const entry of indexed) {
        const { item } = entry;
        const parsed = parseUnit(item.unit);
        const name = (item.name || "").toLowerCase();
        const unitLower = (item.unit || "").toLowerCase();
        const custom = parseWithCustomUnits(`${name} ${item.unit || ""}`) || parseWithCustomUnits(item.unit || "");
        const wageLike = /\bwage\b|\bwages\b|\bminimum\s*wage\b|\bsalary\b|\bearnings\b|\bcompensation\b|\bpay\b/i.test(name);
        if (wageLike) { buckets.wages.push(entry); continue; }
        const isEmissions = (custom && (custom as unknown as { category?: string }).category === "emissions") || /co2e?|carbon\s+credits?/i.test(unitLower + " " + name);
        if (isEmissions) { buckets.emissions.push(entry); continue; }
        const isEnergy = parsed.category === "energy" || /(gwh|\bmegawatts?\b|\bmw\b|\bterajoules?\b|\btj\b|\bmmbtu\b|\bbtu\b)/i.test(unitLower);
        if (isEnergy) { buckets.energy.push(entry); continue; }
        const isCommodity = (custom && (custom as unknown as { category?: string }).category === "commodity") || /(troy\s*oz|barrels?|\bbbls?\b|crude|wti|brent|gold)/i.test(unitLower + " " + name);
        if (isCommodity) { buckets.commodities.push(entry); continue; }
        const isAgriculture = (custom && (custom as unknown as { category?: string }).category === "agriculture") || /\bbushels?\b|short\s+tons?|metric\s+tonnes?/i.test(unitLower + " " + name);
        if (isAgriculture) { buckets.agriculture.push(entry); continue; }
        const isMetals = (custom && (custom as unknown as { category?: string }).category === "metals") || /silver\s+oz|silver\s+troy\s+ounces?|copper\s+tonnes?|steel\s+tonnes?/i.test(unitLower + " " + name);
        if (isMetals) { buckets.metals.push(entry); continue; }
        if (isCountIndicator(item.name, item.unit) || isCountUnit(item.unit || "")) { buckets.counts.push(entry); continue; }
        if (parsed.category === "percentage") { buckets.percentages.push(entry); continue; }
        buckets.defaults.push(entry);
      }
      return { exempted, nonExemptedCount: nonExempted.length, buckets };
    }),

    processWages: fromPromise(async ({ input }: { input: NormalizationInput & { buckets: { wages: IndexedItem[] } } }) => {
      const { config, fxRates } = input;
      const wages = input.buckets.wages;
      if (wages.length === 0) return [] as ParsedData[];
      console.log("🔧 Detected wages items - applying specialized normalization");
      const processedWages = await processWagesData(wages.map((w) => w.item), fxRates, {
        targetCurrency: config.targetCurrency,
        targetMagnitude: config.targetMagnitude,
        targetTimeScale: config.targetTimeScale,
        excludeIndexValues: config.excludeIndexValues,
        includeWageMetadata: config.includeWageMetadata,
        explain: config.explain,
        fxSource: input.fxSource,
        fxSourceId: input.fxSourceId,
      });
      return processedWages;
    }),

    processCounts: fromPromise(async ({ input }: { input: NormalizationInput & { buckets: { counts: IndexedItem[] } } }) => {
      const { config, fxRates } = input;
      const counts = input.buckets.counts;
      if (counts.length === 0) return [] as ParsedData[];
      const res = await processBatch(counts.map((c) => c.item), {
        validate: false, handleErrors: "skip", parallel: true,
        toCurrency: config.targetCurrency,
        toMagnitude: "ones" as Scale,
        toTimeScale: config.targetTimeScale,
        fx: fxRates,
        explain: config.explain,
      });
      return res.successful;
    }),

    processPercentages: fromPromise(async ({ input }: { input: NormalizationInput & { buckets: { percentages: IndexedItem[] } } }) => {
      const { config, fxRates } = input;
      const percentages = input.buckets.percentages;
      if (percentages.length === 0) return [] as ParsedData[];
      const res = await processBatch(percentages.map((p) => p.item), {
        validate: false, handleErrors: "skip", parallel: true,
        toCurrency: config.targetCurrency,
        toMagnitude: config.targetMagnitude as Scale,
        toTimeScale: config.targetTimeScale,
        fx: fxRates,
        explain: config.explain,
      });
      return res.successful;
    }),

    processEmissions: fromPromise(async ({ input }: { input: NormalizationInput & { buckets: { emissions: IndexedItem[] } } }) => {
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

    processEnergy: fromPromise(async ({ input }: { input: NormalizationInput & { buckets: { energy: IndexedItem[] } } }) => {
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

    processCommodities: fromPromise(async ({ input }: { input: NormalizationInput & { buckets: { commodities: IndexedItem[] } } }) => {
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

    processAgriculture: fromPromise(async ({ input }: { input: NormalizationInput & { buckets: { agriculture: IndexedItem[] } } }) => {
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

    processMetals: fromPromise(async ({ input }: { input: NormalizationInput & { buckets: { metals: IndexedItem[] } } }) => {
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
*/
/* END_TOPLEVEL_ACCIDENTAL_ACTORS */

export const normalizationMachine = setup({
  types: {
    context: {} as {
      config: PipelineConfig;
      parsedData?: ParsedData[];
      fxRates?: FXTable;
      fxSource?: "live" | "fallback";
      fxSourceId?: string;
      explain?: boolean;
      normalizedData?: ParsedData[];
      warnings: string[];
      hasWages?: boolean;
    },
    input: {} as NormalizationInput,
  },
  actors: {
    classifyBuckets: fromPromise(({ input }: { input: NormalizationInput }) => {
      const { parsedData, config } = input;
      if (!parsedData) throw new Error("No parsed data available");
      const { nonExempted } = filterExemptions(parsedData, config.exemptions);
      const hasWages = nonExempted.some((d) =>
        /\bwages?|salary|earnings|compensation|pay\b/i.test(
          String(d.name ?? ""),
        )
      );
      return Promise.resolve({ hasWages } as { hasWages: boolean });
    }),
    doNormalize: fromPromise(
      async ({ input }: { input: NormalizationInput }) => {
        const { parsedData, fxRates, config } = input;
        if (!parsedData) throw new Error("No parsed data available");

        const { exempted, nonExempted } = filterExemptions(
          parsedData,
          config.exemptions,
        );

        if (exempted.length > 0) {
          console.log(
            `📋 Exempted ${exempted.length}/${parsedData.length} indicators from normalization`,
          );
          exempted.forEach((item) => {
            console.log(`   - ${item.id}: ${item.name}`);
          });
        }

        type IndexedItem = { item: ParsedData; idx: number };
        const indexed: IndexedItem[] = nonExempted.map((item, idx) => ({
          item,
          idx,
        }));

        const wages: IndexedItem[] = [];
        const counts: IndexedItem[] = [];
        const percentages: IndexedItem[] = [];
        const emissions: IndexedItem[] = [];
        const energy: IndexedItem[] = [];
        const commodities: IndexedItem[] = [];
        const agriculture: IndexedItem[] = [];
        const metals: IndexedItem[] = [];
        const defaults: IndexedItem[] = [];

        for (const entry of indexed) {
          const { item } = entry;
          const parsed = parseUnit(item.unit);
          const name = (item.name || "").toLowerCase();
          const unitLower = (item.unit || "").toLowerCase();
          const custom = parseWithCustomUnits(`${name} ${item.unit || ""}`) ||
            parseWithCustomUnits(item.unit || "");

          const wageLike =
            /\bwage\b|\bwages\b|\bminimum\s*wage\b|\bsalary\b|\bearnings\b|\bcompensation\b|\bpay\b/i
              .test(name);
          if (wageLike) {
            wages.push(entry);
            continue;
          }

          const isEmissions =
            (custom && (custom as any).category === "emissions") ||
            /co2e?|carbon\s+credits?/i.test(unitLower + " " + name);
          if (isEmissions) {
            emissions.push(entry);
            continue;
          }

          const isEnergy = parsed.category === "energy" ||
            /(gwh|\bmegawatts?\b|\bmw\b|\bterajoules?\b|\btj\b|\bmmbtu\b|\bbtu\b)/i
              .test(unitLower);
          if (isEnergy) {
            energy.push(entry);
            continue;
          }

          const isCommodity =
            (custom && (custom as any).category === "commodity") ||
            /(troy\s*oz|barrels?|\bbbls?\b|crude|wti|brent|gold)/i.test(
              unitLower + " " + name,
            );
          if (isCommodity) {
            commodities.push(entry);
            continue;
          }

          const isAgriculture =
            (custom && (custom as any).category === "agriculture") ||
            /\bbushels?\b|short\s+tons?|metric\s+tonnes?/i.test(
              unitLower + " " + name,
            );
          if (isAgriculture) {
            agriculture.push(entry);
            continue;
          }

          const isMetals = (custom && (custom as any).category === "metals") ||
            /silver\s+oz|silver\s+troy\s+ounces?|copper\s+tonnes?|steel\s+tonnes?/i
              .test(unitLower + " " + name);
          if (isMetals) {
            metals.push(entry);
            continue;
          }

          if (
            isCountIndicator(item.name, item.unit) ||
            isCountUnit(item.unit || "")
          ) {
            counts.push(entry);
            continue;
          }

          if (parsed.category === "percentage") {
            percentages.push(entry);
            continue;
          }

          defaults.push(entry);
        }

        const mergeByKey = <T extends ParsedData>(
          bucket: IndexedItem[],
          processed: T[],
        ): ParsedData[] => {
          const key = (d: ParsedData) =>
            `${d.id ?? ""}::${d.name ?? ""}::${d.unit}::${d.value}`;
          const map = new Map<string, ParsedData>();
          for (const p of processed) map.set(key(p), p);
          const out: ParsedData[] = [];
          for (const b of bucket) {
            const v = map.get(key(b.item));
            if (v) out.push(v);
          }
          return out;
        };

        const batchOptions = {
          validate: false as const,
          handleErrors: "skip" as const,
          parallel: true,
          toCurrency: config.targetCurrency,
          toMagnitude: config.targetMagnitude as Scale,
          toTimeScale: config.targetTimeScale,
          fx: fxRates,
          explain: config.explain,
          fxSource: input.fxSource,
          fxSourceId: input.fxSourceId,
        };

        const processed: Array<{ item: ParsedData; idx: number }> = [];

        if (wages.length > 0) {
          console.log(
            "🔧 Detected wages items - applying specialized normalization",
          );
          const processedWages = await processWagesData(
            wages.map((w) => w.item),
            fxRates,
            {
              targetCurrency: config.targetCurrency,
              targetMagnitude: config.targetMagnitude,
              targetTimeScale: config.targetTimeScale,
              excludeIndexValues: config.excludeIndexValues,
              includeWageMetadata: config.includeWageMetadata,
              explain: config.explain,
              fxSource: input.fxSource,
              fxSourceId: input.fxSourceId,
            },
          );
          const mergedWages = mergeByKey(wages, processedWages);
          mergedWages.forEach((it, i) =>
            processed.push({ item: it, idx: wages[i].idx })
          );
        }

        if (counts.length > 0) {
          const res = await processBatch(counts.map((c) => c.item), {
            ...batchOptions,
            toMagnitude: "ones",
          });
          const merged = mergeByKey(counts, res.successful);
          merged.forEach((it, i) =>
            processed.push({ item: it, idx: counts[i].idx })
          );
        }

        if (percentages.length > 0) {
          const res = await processBatch(
            percentages.map((p) => p.item),
            batchOptions,
          );
          const merged = mergeByKey(percentages, res.successful);
          merged.forEach((it, i) =>
            processed.push({ item: it, idx: percentages[i].idx })
          );
        }

        if (emissions.length > 0) {
          const res = await processBatch(emissions.map((e) => e.item), {
            ...batchOptions,
            toCurrency: undefined,
            toMagnitude: undefined,
            toTimeScale: undefined,
          });
          const merged = mergeByKey(emissions, res.successful);
          merged.forEach((it, i) =>
            processed.push({ item: it, idx: emissions[i].idx })
          );
        }

        if (energy.length > 0) {
          const res = await processBatch(energy.map((e) => e.item), {
            ...batchOptions,
            toCurrency: undefined,
            toMagnitude: undefined,
            toTimeScale: undefined,
          });
          const merged = mergeByKey(energy, res.successful);
          merged.forEach((it, i) =>
            processed.push({ item: it, idx: energy[i].idx })
          );
        }

        if (commodities.length > 0) {
          const res = await processBatch(commodities.map((c) => c.item), {
            ...batchOptions,
            toCurrency: undefined,
            toMagnitude: undefined,
            toTimeScale: undefined,
          });
          const merged = mergeByKey(commodities, res.successful);
          merged.forEach((it, i) =>
            processed.push({ item: it, idx: commodities[i].idx })
          );
        }

        if (agriculture.length > 0) {
          const res = await processBatch(agriculture.map((a) => a.item), {
            ...batchOptions,
            toCurrency: undefined,
            toMagnitude: undefined,
            toTimeScale: undefined,
          });
          const merged = mergeByKey(agriculture, res.successful);
          merged.forEach((it, i) =>
            processed.push({ item: it, idx: agriculture[i].idx })
          );
        }

        if (metals.length > 0) {
          const res = await processBatch(metals.map((m) => m.item), {
            ...batchOptions,
            toCurrency: undefined,
            toMagnitude: undefined,
            toTimeScale: undefined,
          });
          const merged = mergeByKey(metals, res.successful);
          merged.forEach((it, i) =>
            processed.push({ item: it, idx: metals[i].idx })
          );
        }

        if (defaults.length > 0) {
          const defaultsItems = defaults.map((d) => d.item);
          const actor = createActor(defaultMonetaryMachine, {
            input: {
              config,
              items: defaultsItems,
              fx: fxRates,
              fxSource: input.fxSource,
              fxSourceId: input.fxSourceId,
            },
          });
          const dmItems: ParsedData[] = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              try {
                actor.stop();
              } catch (_) { /* ignore */ }
              reject(new Error("DefaultMonetaryMachine timed out"));
            }, 30000);
            actor.subscribe((state) => {
              // Resolve when the child reaches its final state
              if ((state as any).matches?.("done")) {
                clearTimeout(timeout);
                const items = ((state as any).output?.items as ParsedData[]) ??
                  state.context.items;
                resolve(items);
              }
            });
            actor.start();
          });
          const merged = mergeByKey(defaults, dmItems);
          merged.forEach((it, i) =>
            processed.push({ item: it, idx: defaults[i].idx })
          );
        }

        const ordered: ParsedData[] = new Array(nonExempted.length);
        for (const p of processed) ordered[p.idx] = p.item;
        const finalProcessed = ordered.filter((x): x is ParsedData => !!x);

        return [...finalProcessed, ...exempted];
      },
    ),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QDsD2AnAtgQwDYEsAvbAF31WQDoBjXbWWfAMwE99koBiCCsS9gG6oA1nzRY8RUuSq16jVuygJBqatIoBtAAwBdHbsSgADqkZkKRkAA9EAJgBsADkoBOAMwB2AKzan-pwcARidXABYAGhAWRCCHb0p3Dzs7Px8gsLi7AF9sqPEcAmILWToGZjYOTjB0dAxKYzoSJgxMSgLJYpkaMoVK5VV1EoMDK1NzGStbBEcXDx8-AODQyOjYoM9KUPc7He0fBcdc-NbOjSo6gFcSME5RpBBx-BKpxG8HB0pU9yDvXfdtLtPO4ojEEEEgq5KGFPPEHMCwnYnNoQmFjiAOkVzpQrjc7kFDA8ni8HtN3p9vr9-oCvCC1ggAZ93E47J4nIjfEFtK5XOjMVISpQAO7YGCwbi8fjIISidqnLGCkVilTStTnEZ6MZmZ6TUmIDwuLm-fzubxssIeUGIJxBaE8nlhP5eVyA3l5DHygXdJVwaq1eqNUgtLByiQK72iuAqoRDGQawkmbUk0DTA2UI3eE1m9mW+kbMJubw-Lk-P6uTxBHLu-ldCgNeQkAAWVygjYlyD4qllNexxgbzdQl1b0bVwz090TE0seoQaYzWfNubB7mCW28HkyoScPz8fM9taofYYTZbbZqdXQDSawbaPcFR9gJ8Hw8G6vHmqJSd1Kf1zPTKMzbdswtOkwVmaFtAcFJgkg5EkgcXJq1QCA4CsO9v0eL9px-BAAFoHCtPDPm0EjSLIsjPD3MMvTrORykUDgtSnZBXgQRFCK5TYHDCHYIQcVx+M8MIWSowoaIuQcbiYnVsJsRAYXcLYeM8WEBJhRwVI4uwCwyXi7FcbwLScbxDNEs5FUjeBP2Y1jPH0yhtCSRZAn4kIgkI8IvkcItYUyfYjiQ6iD3rY8ByHRtpOTOSEDsqFHJdJZXJtQikVtIIdk8VxjJ8C0hLM8M6x4DtIow6YIVNdMdnZTxHKg-iCPpVJtC+TL4SRbZTSyxDsiAA */
  id: "normalization",
  context: ({ input }) => ({
    config: input.config,
    parsedData: input.parsedData,
    fxRates: input.fxRates,
    fxSource: input.fxSource,
    fxSourceId: input.fxSourceId,
    explain: input.explain,
    normalizedData: undefined,
    warnings: [],
    hasWages: undefined,
  }),
  initial: "classifying",
  states: {
    classifying: {
      invoke: {
        src: "classifyBuckets",
        input: ({ context }) => ({
          config: context.config,
          parsedData: context.parsedData!,
        }),
        onDone: {
          target: "route",
          actions: assign({
            hasWages: ({ event }) => (event as any).output.hasWages,
          }),
        },
        onError: { target: "route" },
      },
    },
    route: {
      always: [
        { guard: ({ context }) => !!context.hasWages, target: "wages" },
        { target: "passthrough" },
      ],
    },
    wages: {
      invoke: {
        src: wagesMachine,
        input: ({ context }) => ({
          config: context.config,
          parsedData: context.parsedData!,
          fxRates: context.fxRates,
          fxSource: context.fxSource,
          fxSourceId: context.fxSourceId,
          explain: context.explain,
        }),
        onDone: {
          target: "done",
          actions: assign({
            normalizedData: ({ event }) => (event as any).output.normalizedData,
          }),
        },
        onError: {
          target: "done",
          actions: assign({
            warnings: ({ context, event }) => [
              ...context.warnings,
              (event as any)?.error?.message || "Normalization failed",
            ],
          }),
        },
      },
    },
    passthrough: {
      invoke: {
        src: domainsMachine,
        input: ({ context }) => ({
          config: context.config,
          parsedData: context.parsedData!,
          fxRates: context.fxRates,
          fxSource: context.fxSource,
          fxSourceId: context.fxSourceId,
          explain: context.explain,
        }),
        onDone: {
          target: "done",
          actions: assign({ normalizedData: ({ event }) => (event as any).output.normalizedData }),
        },
        onError: {
          target: "done",
          actions: assign({
            warnings: ({ context, event }) => [
              ...context.warnings,
              (event as any)?.error?.message || "Normalization failed",
            ],
          }),
        },
      },
    },
    done: {
      type: "final",
      output: ({ context }): NormalizationOutput => ({
        normalizedData: context.normalizedData ?? [],
        warnings: context.warnings,
      }),
    },
  },
  output: ({ context }): NormalizationOutput => ({
    normalizedData: context.normalizedData ?? [],
    warnings: context.warnings,
  }),
});
