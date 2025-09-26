/*
Machine: Wages Domain
Purpose: Specialized wages normalization and explain; explicit FX decision branch.
Inputs: { config, parsedData, fxRates?, fxSource?, fxSourceId?, explain? }
Output: { normalizedData (wages processed + others) }
Key states: partitioning → prepWagePoints → excludeIndexValues → deriveTimeBasis → fxWithFallback → (fxNormalize→convertFX | forceMagnitudeOnes) → processingOthers → combine → done
*/

import { assign, createActor, fromPromise, setup } from "npm:xstate@^5.20.2";
import type {
  FXTable,
  ParsedData,
  Scale,
  TimeScale,
} from "../../../../main.ts";
import type { PipelineConfig } from "../../../economic-data-workflow.ts";
import { filterExemptions } from "../../../../exemptions/exemptions.ts";
import { parseUnit } from "../../../../units/units.ts";
import { parseWithCustomUnits } from "../../../../custom/custom_units.ts";
import { processBatch } from "../../../../batch/batch.ts";
import {
  isIndexOrPointsUnit,
  type NormalizedWageData,
  normalizeWagesData,
  type WageDataPoint,
} from "../../../../wages/wages-normalization.ts";
import { defaultMonetaryMachine } from "../monetary/index.ts";

interface WagesInput {
  config: PipelineConfig;
  parsedData: ParsedData[];
  fxRates?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
  explain?: boolean;
}

interface WagesOutput {
  normalizedData: ParsedData[];
}

type IndexedItem = { item: ParsedData; idx: number };

type Buckets = {
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

export const wagesMachine = setup({
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
      buckets?: Buckets;
      processedWages?: ParsedData[];
      processedOthers?: ParsedData[];
      normalizedData?: ParsedData[];
      warnings: string[];
      wagesBucket?: IndexedItem[];
      wagePoints?: WageDataPoint[];
      permittedIndices?: number[];
      normalizedWageData?: NormalizedWageData[];
      preferredWageTimeScale?: TimeScale;
    },
    input: {} as WagesInput,
  },
  actors: {
    partition: fromPromise(({ input }: { input: WagesInput }) => {
      const { parsedData, config } = input;
      const { exempted, nonExempted } = filterExemptions(
        parsedData,
        config.exemptions,
      );

      const indexed: IndexedItem[] = nonExempted.map((item, idx) => ({
        item,
        idx,
      }));
      const buckets: Buckets = {
        wages: [],
        counts: [],
        percentages: [],
        emissions: [],
        energy: [],
        commodities: [],
        agriculture: [],
        metals: [],
        defaults: [],
      };

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
          buckets.wages.push(entry);
          continue;
        }

        const isEmissions =
          (custom && (custom as any).category === "emissions") ||
          /co2e?|carbon\s+credits?/i.test(unitLower + " " + name);
        if (isEmissions) {
          buckets.emissions.push(entry);
          continue;
        }

        const isEnergy = parsed.category === "energy" ||
          /(gwh|\bmegawatts?\b|\bmw\b|\bterajoules?\b|\btj\b|\bmmbtu\b|\bbtu\b)/i
            .test(unitLower);
        if (isEnergy) {
          buckets.energy.push(entry);
          continue;
        }

        const isCommodity =
          (custom && (custom as any).category === "commodity") ||
          /(troy\s*oz|barrels?|\bbbls?\b|crude|wti|brent|gold)/i.test(
            unitLower + " " + name,
          );
        if (isCommodity) {
          buckets.commodities.push(entry);
          continue;
        }

        const isAgriculture =
          (custom && (custom as any).category === "agriculture") ||
          /\bbushels?\b|short\s+tons?|metric\s+tonnes?/i.test(
            unitLower + " " + name,
          );
        if (isAgriculture) {
          buckets.agriculture.push(entry);
          continue;
        }

        const isMetals = (custom && (custom as any).category === "metals") ||
          /silver\s+oz|silver\s+troy\s+ounces?|copper\s+tonnes?|steel\s+tonnes?/i
            .test(unitLower + " " + name);
        if (isMetals) {
          buckets.metals.push(entry);
          continue;
        }

        if (parsed.category === "percentage") {
          buckets.percentages.push(entry);
          continue;
        }

        // counts
        const isCount = (() => {
          const lower = unitLower;
          return /(thousands?|hundreds?|units?)/i.test(lower);
        })();
        if (isCount) {
          buckets.counts.push(entry);
          continue;
        }

        buckets.defaults.push(entry);
      }

      return Promise.resolve({ exempted, nonExempted, buckets });
    }),

    makeWagePoints: fromPromise(
      async ({ input }: { input: WagesInput & { buckets: Buckets } }) => {
        const wages = input.buckets.wages;
        const wagePoints: WageDataPoint[] = wages.map((w) => ({
          country: String(w.item.id || "unknown"),
          value: w.item.value,
          unit: w.item.unit,
          currency: (w.item.metadata?.currency as string | undefined) ||
            undefined,
          date: (w.item.metadata?.date as string | undefined) || undefined,
          metadata: w.item.metadata,
          // Provide indicator name to buildExplainMetadata for domain detection
          // (cast to allow extra property beyond WageDataPoint interface)
          name: w.item.name,
        } as unknown as WageDataPoint));
        const permittedIndices = wagePoints.map((_, i) => i);
        if (wages.length > 0) {
          console.log(
            "🔧 Detected wages items - preparing specialized normalization inputs",
          );
        }
        return { wagePoints, permittedIndices };
      },
    ),

    excludeIndex: fromPromise(
      async (
        { input }: {
          input: WagesInput & {
            buckets: Buckets;
            wagePoints: WageDataPoint[];
            permittedIndices: number[];
          };
        },
      ) => {
        const { wagePoints, permittedIndices } = input;
        const excludeIndexes = input.config.excludeIndexValues ?? true;
        if (!excludeIndexes) return { permittedIndices };
        const keep: number[] = [];
        let excluded = 0;
        for (const i of permittedIndices) {
          const wp = wagePoints[i];
          const parsed = parseUnit(wp.unit);
          if (isIndexOrPointsUnit(wp.unit, parsed)) {
            excluded += 1;
          } else {
            keep.push(i);
          }
        }
        if (excluded > 0) {
          console.log(`🧹 Excluded ${excluded} index/points wage item(s)`);
        }
        return { permittedIndices: keep };
      },
    ),

    normalizeWithFX: fromPromise(
      async (
        { input }: {
          input: WagesInput & {
            wagePoints: WageDataPoint[];
            permittedIndices: number[];
          };
        },
      ) => {
        const { wagePoints, permittedIndices, fxRates, config } = input;
        const points = permittedIndices.map((i) => wagePoints[i]);
        const normalized = normalizeWagesData(points, {
          targetCurrency: config.targetCurrency || "USD",
          targetTimeScale: (config.targetTimeScale as any) || "month",
          fx: fxRates,
          excludeIndexValues: false, // already excluded (if configured)
          includeMetadata: config.includeWageMetadata ?? true,
          explain: config.explain ?? false,
        });
        return { normalized };
      },
    ),

    normalizeWithoutFX: fromPromise(
      async (
        { input }: {
          input: WagesInput & { buckets: Buckets; permittedIndices: number[] };
        },
      ) => {
        const { buckets, permittedIndices, config, fxRates } = input;
        const items = permittedIndices.map((i) => buckets.wages[i].item);
        if (items.length === 0) return { processed: [] as ParsedData[] };
        console.warn(
          "⚠️  No FX rates for wages; using standard processing with ones magnitude",
        );
        const result = await processBatch(items, {
          validate: false,
          handleErrors: "skip",
          parallel: true,
          toCurrency: config.targetCurrency,
          toMagnitude: "ones" as Scale,
          fx: fxRates,
          explain: config.explain,
          fxSource: input.fxSource,
          fxSourceId: input.fxSourceId,
        });
        return {
          processed: result.successful.map((p) =>
            ({ ...(p as any), domain: "wages" }) as unknown as ParsedData
          ),
        };
      },
    ),

    convertFromFX: fromPromise(
      async (
        { input }: {
          input: WagesInput & {
            buckets: Buckets;
            normalized: NormalizedWageData[];
            permittedIndices: number[];
          };
        },
      ) => {
        const { buckets, normalized, permittedIndices, config } = input;
        const out: ParsedData[] = [];
        for (let j = 0; j < normalized.length; j++) {
          const idx = permittedIndices[j];
          const originalItem = buckets.wages[idx].item;
          const wageResult = normalized[j];
          if (wageResult.normalizedValue !== undefined) {
            out.push(
              {
                ...originalItem,
                normalized: wageResult.normalizedValue,
                normalizedUnit: wageResult.normalizedUnit ||
                  `${
                    config.targetCurrency || "USD"
                  } per ${((config.targetTimeScale as any) || "month")}`,
                explain: wageResult.explain,
                metadata: {
                  ...originalItem.metadata,
                  wageNormalization: {
                    excluded: false,
                    dataType: wageResult.dataType,
                    originalValue: wageResult.originalValue,
                    originalUnit: wageResult.originalUnit,
                  },
                },
              } as unknown as ParsedData & { domain?: string },
            );
            (out[out.length - 1] as any).domain = "wages";
          }
        }
        console.log(`✅ Processed ${normalized.length} wage point(s)`);
        return { processed: out };
      },
    ),

    processOthers: fromPromise(
      async ({ input }: { input: WagesInput & { buckets: Buckets } }) => {
        const { config, fxRates } = input;
        const {
          counts,
          percentages,
          emissions,
          energy,
          commodities,
          agriculture,
          metals,
          defaults,
        } = input.buckets;

        const mergeByKey = (
          bucket: IndexedItem[],
          processed: ParsedData[],
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

        const processed: ParsedData[] = [];

        if (counts.length > 0) {
          const res = await processBatch(counts.map((c) => c.item), {
            ...batchOptions,
            toMagnitude: "ones",
          });
          processed.push(...mergeByKey(counts, res.successful));
        }

        if (percentages.length > 0) {
          const res = await processBatch(
            percentages.map((p) => p.item),
            batchOptions,
          );
          processed.push(...mergeByKey(percentages, res.successful));
        }

        if (emissions.length > 0) {
          const res = await processBatch(emissions.map((e) => e.item), {
            ...batchOptions,
            toCurrency: undefined,
            toMagnitude: undefined,
            toTimeScale: undefined,
          });
          processed.push(...mergeByKey(emissions, res.successful));
        }

        if (energy.length > 0) {
          const res = await processBatch(energy.map((e) => e.item), {
            ...batchOptions,
            toCurrency: undefined,
            toMagnitude: undefined,
            toTimeScale: undefined,
          });
          processed.push(...mergeByKey(energy, res.successful));
        }

        if (commodities.length > 0) {
          const res = await processBatch(commodities.map((c) => c.item), {
            ...batchOptions,
            toCurrency: undefined,
            toMagnitude: undefined,
            toTimeScale: undefined,
          });
          processed.push(...mergeByKey(commodities, res.successful));
        }

        if (agriculture.length > 0) {
          const res = await processBatch(agriculture.map((a) => a.item), {
            ...batchOptions,
            toCurrency: undefined,
            toMagnitude: undefined,
            toTimeScale: undefined,
          });
          processed.push(...mergeByKey(agriculture, res.successful));
        }

        if (metals.length > 0) {
          const res = await processBatch(metals.map((m) => m.item), {
            ...batchOptions,
            toCurrency: undefined,
            toMagnitude: undefined,
            toTimeScale: undefined,
          });
          processed.push(...mergeByKey(metals, res.successful));
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
              if ((state as any).matches?.("done")) {
                clearTimeout(timeout);
                const items = ((state as any).output?.items as ParsedData[]) ||
                  state.context.items;
                resolve(items);
              }
            });
            actor.start();
          });
          processed.push(...mergeByKey(defaults, dmItems));
        }

        return processed;
      },
    ),
  },
}).createMachine({
  id: "wages",
  context: ({ input }) => ({
    config: input.config,
    parsedData: input.parsedData,
    fxRates: input.fxRates,
    fxSource: input.fxSource,
    fxSourceId: input.fxSourceId,
    explain: input.explain,
    warnings: [],
  }),
  initial: "partitioning",
  states: {
    partitioning: {
      invoke: {
        src: "partition",
        input: ({ context }) => ({
          config: context.config,
          parsedData: context.parsedData!,
        }),
        onDone: {
          target: "prepWagePoints",
          actions: assign({
            exempted: ({ event }) => (event as any).output.exempted,
            nonExempted: ({ event }) => (event as any).output.nonExempted,
            buckets: ({ event }) => (event as any).output.buckets,
            wagesBucket: ({ event }) => (event as any).output.buckets.wages,
          }),
        },
      },
    },

    prepWagePoints: {
      invoke: {
        src: "makeWagePoints",
        input: ({ context }) => ({
          buckets: context.buckets!,
          config: context.config,
          fxRates: context.fxRates,
          fxSource: context.fxSource,
          fxSourceId: context.fxSourceId,
          parsedData: context.parsedData!,
        }),
        onDone: {
          target: "excludeIndexValues",
          actions: assign({
            wagePoints: ({ event }) => (event as any).output.wagePoints,
            permittedIndices: ({ event }) =>
              (event as any).output.permittedIndices,
          }),
        },
      },
    },

    excludeIndexValues: {
      invoke: {
        src: "excludeIndex",
        input: ({ context }) => ({
          buckets: context.buckets!,
          wagePoints: context.wagePoints!,
          permittedIndices: context.permittedIndices!,
          config: context.config,
          parsedData: context.parsedData!,
        }),
        onDone: {
          target: "deriveTimeBasis",
          actions: assign({
            permittedIndices: ({ event }) =>
              (event as any).output.permittedIndices,
          }),
        },
      },
    },

    deriveTimeBasis: {
      entry: assign(({ context }) => ({
        // prefer config, otherwise default monthly per wages policy
        preferredWageTimeScale: (context.config.targetTimeScale as any) ||
          "month",
      })),
      always: { target: "fxWithFallback" },
    },

    fxWithFallback: {
      always: [
        { guard: ({ context }) => !!context.fxRates, target: "fxNormalize" },
        { target: "forceMagnitudeOnes" },
      ],
    },

    fxNormalize: {
      invoke: {
        src: "normalizeWithFX",
        input: ({ context }) => ({
          wagePoints: context.wagePoints!,
          permittedIndices: context.permittedIndices!,
          fxRates: context.fxRates,
          config: context.config,
          parsedData: context.parsedData!,
        }),
        onDone: {
          target: "convertFX",
          actions: assign({
            normalizedWageData: ({ event }) => (event as any).output.normalized,
          }),
        },
      },
    },

    convertFX: {
      invoke: {
        src: "convertFromFX",
        input: ({ context }) => ({
          buckets: context.buckets!,
          normalized: context.normalizedWageData!,
          permittedIndices: context.permittedIndices!,
          config: context.config,
          fxSource: context.fxSource,
          fxSourceId: context.fxSourceId,
          parsedData: context.parsedData!,
        }),
        onDone: {
          target: "processingOthers",
          actions: assign({
            processedWages: ({ event }) => (event as any).output.processed,
          }),
        },
      },
    },

    forceMagnitudeOnes: {
      invoke: {
        src: "normalizeWithoutFX",
        input: ({ context }) => ({
          buckets: context.buckets!,
          permittedIndices: context.permittedIndices!,
          config: context.config,
          fxRates: context.fxRates,
          fxSource: context.fxSource,
          fxSourceId: context.fxSourceId,
          parsedData: context.parsedData!,
        }),
        onDone: {
          target: "processingOthers",
          actions: assign({
            processedWages: ({ event }) => (event as any).output.processed,
          }),
        },
      },
    },
    processingOthers: {
      invoke: {
        src: "processOthers",
        input: ({ context }) => ({
          config: context.config,
          parsedData: context.parsedData!,
          fxRates: context.fxRates,
          fxSource: context.fxSource,
          fxSourceId: context.fxSourceId,
          buckets: context.buckets!,
        }),
        onDone: {
          target: "combine",
          actions: assign({
            processedOthers: ({ event }) => (event as any).output,
          }),
        },
      },
    },
    combine: {
      entry: assign(({ context }) => {
        const nonExempted = context.nonExempted ?? [];
        const exempted = context.exempted ?? [];
        const wages = context.processedWages ?? [];
        const others = context.processedOthers ?? [];
        const map = new Map<string, ParsedData>();
        const key = (d: ParsedData) =>
          `${d.id ?? ""}::${d.name ?? ""}::${d.unit}::${d.value}`;
        for (const p of [...wages, ...others]) map.set(key(p), p);
        const ordered: ParsedData[] = new Array(nonExempted.length);
        for (let idx = 0; idx < nonExempted.length; idx++) {
          const it = nonExempted[idx];
          const v = map.get(key(it));
          if (v) ordered[idx] = v;
        }
        const finalProcessed = ordered.filter((x): x is ParsedData => !!x);
        return { normalizedData: [...finalProcessed, ...exempted] };
      }),
      always: { target: "done" },
    },
    done: {
      type: "final",
      output: ({ context }): WagesOutput => ({
        normalizedData: context.normalizedData ?? [],
      }),
    },
  },
  output: ({ context }): WagesOutput => ({
    normalizedData: context.normalizedData ?? [],
  }),
});
