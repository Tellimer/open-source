/**
 * XState v5 pipeline for data processing
 */

import { assign, createActor, fromPromise, setup } from "npm:xstate@^5.20.2";
import {
  adjustForInflation,
  assessDataQuality,
  deseasonalize,
  type Explain,
  fetchLiveFXRates,
  type FXTable,
  inferUnit,
  type NormalizationExemptions,
  parseUnit,
  type QualityScore,
  type Scale,
  type TimeScale,
} from "../main.ts";
import { processWagesData } from "../services/wages-service.ts";
import { processBatch } from "../batch/batch.ts";
import { filterExemptions } from "../exemptions/exemptions.ts";

import { isCountIndicator, isCountUnit } from "../count/count-normalization.ts";

import {
  loadDomainUnits,
  parseWithCustomUnits,
} from "../custom/custom_units.ts";

// Initialize domain-specific units once for stronger detection
loadDomainUnits("emissions");
loadDomainUnits("commodities");
loadDomainUnits("agriculture");
loadDomainUnits("metals");

// Derived types
type ParsedUnit = ReturnType<typeof parseUnit>;

// Pipeline context type
export interface PipelineContext {
  rawData: ParsedData[];
  config: PipelineConfig;
  parsedData?: ParsedData[];
  qualityScore?: QualityScore;
  fxRates?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
  normalizedData?: ParsedData[];
  adjustedData?: ParsedData[];
  finalData?: ParsedData[];
  errors: PipelineError[];
  warnings: string[];
  metrics: {
    startTime?: number;
    endTime?: number;
    recordsProcessed: number;
    recordsFailed: number;
    processingTime?: number;
  };
}

/**
 * Configuration for the pipeline engine.
 *
 * Controls quality thresholds, normalization targets, data inference,
 * FX behavior, schema validation, and output formatting.
 */
export interface PipelineConfig {
  minQualityScore?: number;
  targetCurrency?: string;
  targetMagnitude?: Scale;
  targetTimeScale?: TimeScale;
  inferUnits?: boolean;
  adjustInflation?: boolean;
  removeSeasonality?: boolean;
  useLiveFX?: boolean;
  fxFallback?: FXTable;
  validateSchema?: boolean;
  requiredFields?: string[];
  outputFormat?: "json" | "csv" | "parquet";

  // Wages-specific configuration
  excludeIndexValues?: boolean;
  includeWageMetadata?: boolean;

  // Normalization exemptions
  exemptions?: NormalizationExemptions;

  // Metadata explanation
  /** Include detailed normalization metadata for transparency (default: false) */
  explain?: boolean;
}

/**
 * Data point flowing through the pipeline.
 *
 * Contains original inputs and progressively added metadata
 * (parsedUnit, inference, normalization results, pipeline info).
 */
export interface ParsedData {
  id?: string | number;
  value: number;
  unit: string;

  /** Explicit metadata fields - use if provided, otherwise parse from unit string */
  periodicity?: string; // "Quarterly", "Monthly", "Yearly" - takes precedence over unit string parsing
  scale?: string; // "Millions", "Billions", "Thousands" - takes precedence over unit string parsing
  currency_code?: string; // "USD", "SAR", "XOF" - takes precedence over unit string parsing

  parsedUnit?: ParsedUnit;
  inferredUnit?: string;
  normalized?: number;
  normalizedUnit?: string;
  realValue?: number;
  year?: number;
  date?: string | Date;
  description?: string;
  name?: string;
  context?: string;
  metadata?: Record<string, unknown>;
  pipeline?: {
    qualityScore?: number;
    processingTime?: number;
    inferredUnit?: string;
  };
  /** Detailed normalization explanation (when explain option is enabled) */
  explain?: Explain;
}

/**
 * Error emitted by the pipeline with contextual information.
 */
export interface PipelineError {
  step: string;
  message: string;
  data?: unknown;
  timestamp: Date;
}

// Create the pipeline machine with XState v5
export const pipelineMachine = setup({
  types: {
    context: {} as PipelineContext,
    events: {} as
      | { type: "START" }
      | { type: "CONTINUE" }
      | { type: "ABORT" }
      | { type: "FIX" },
    input: {} as { rawData: ParsedData[]; config: PipelineConfig },
  },
  actors: {
    validateInputData: fromPromise(({ input }: { input: PipelineContext }) => {
      const { rawData, config } = input;
      if (!rawData || rawData.length === 0) {
        throw new Error("No data provided");
      }
      if (config.validateSchema && config.requiredFields) {
        const invalid = rawData.filter(
          (item) => !config.requiredFields!.every((field) => field in item),
        );
        if (invalid.length > 0) {
          throw new Error(`${invalid.length} records missing required fields`);
        }
      }
      return Promise.resolve(rawData);
    }),

    parseUnitsService: fromPromise(({ input }: { input: PipelineContext }) => {
      const { rawData, config } = input;
      const parsed: ParsedData[] = [];

      for (const item of rawData) {
        // Coerce numeric strings to numbers to avoid skipping normalization
        const coercedValue = (typeof item.value === "string")
          ? Number(item.value)
          : item.value;

        let unit = item.unit;
        if (config.inferUnits && (!unit || unit === "unknown" || unit === "")) {
          const inferred = inferUnit(coercedValue, {
            text: item.description,
            indicatorName: item.name,
            context: item.context,
          });
          if (inferred.confidence > 0.7) {
            unit = inferred.unit;
          }
        }
        const parsedUnit = parseUnit(unit || "");
        parsed.push({
          ...item,
          value: coercedValue,
          unit,
          parsedUnit,
          inferredUnit: unit !== item.unit ? unit : undefined,
        });
      }
      return Promise.resolve(parsed);
    }),

    assessQualityService: fromPromise(
      ({ input }: { input: PipelineContext }) => {
        const { parsedData } = input;
        if (!parsedData) {
          throw new Error("No parsed data available");
        }
        return Promise.resolve(
          assessDataQuality(parsedData, {
            checkOutliers: true,
            checkConsistency: true,
            checkCompleteness: true,
          }),
        );
      },
    ),

    fetchRatesService: fromPromise(({ input }: { input: PipelineContext }) => {
      const { config } = input;

      if (config.useLiveFX) {
        return fetchLiveFXRates(config.targetCurrency || "USD", {
          fallback: config.fxFallback,
          cache: true,
        }).then((rates) => {
          // Set FX source information in context
          input.fxSource = "live";
          input.fxSourceId = "ECB"; // Default for live rates
          return rates;
        });
      } else {
        // When not using live FX, we must have fallback rates
        if (!config.fxFallback) {
          throw new Error(
            "fxFallback rates are required when useLiveFX is false",
          );
        }
        // Set FX source information in context
        input.fxSource = "fallback";
        input.fxSourceId = "SNP"; // Default for fallback
        return Promise.resolve(config.fxFallback);
      }
    }),

    normalizeDataService: fromPromise(
      async ({ input }: { input: PipelineContext }) => {
        const { parsedData, fxRates, config } = input;

        if (!parsedData) {
          throw new Error("No parsed data available");
        }

        // Filter out exempted items
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

        // Strategy router: partition non-exempted items by type and route to appropriate normalizer
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

          // Wages-like: only when indicator name explicitly mentions wage/salary/earnings/compensation/pay
          const wageLike =
            /\bwage\b|\bwages\b|\bminimum\s*wage\b|\bsalary\b|\bearnings\b|\bcompensation\b|\bpay\b/i
              .test(name);
          if (wageLike) {
            wages.push(entry);
            continue;
          }

          // Emissions (CO2, carbon credits)
          const isEmissions = (custom &&
            (custom as unknown as { category?: string }).category ===
              "emissions") ||
            /co2e?|carbon\s+credits?/i.test(unitLower + " " + name);
          if (isEmissions) {
            emissions.push(entry);
            continue;
          }

          // Energy (GWh, TJ, MW, MMBtu, BTU, etc.)
          const isEnergy = parsed.category === "energy" ||
            /(gwh|\bmegawatts?\b|\bmw\b|\bterajoules?\b|\btj\b|\bmmbtu\b|\bbtu\b)/i
              .test(unitLower);
          if (isEnergy) {
            energy.push(entry);
            continue;
          }

          // Commodities (barrel, bbl, troy oz, crude, WTI, Brent, gold, bushels)
          const isCommodity = (custom &&
            (custom as unknown as { category?: string }).category ===
              "commodity") ||
            /(troy\s*oz|barrels?|\bbbls?\b|crude|wti|brent|gold)/i.test(
              unitLower + " " + name,
            );
          if (isCommodity) {
            commodities.push(entry);
            continue;
          }

          // Agriculture (bushels, short ton, tonnes)
          const isAgriculture = (custom &&
            (custom as unknown as { category?: string }).category ===
              "agriculture") ||
            /\bbushels?\b|short\s+tons?|metric\s+tonnes?/i.test(
              unitLower + " " + name,
            );
          if (isAgriculture) {
            agriculture.push(entry);
            continue;
          }

          // Metals (silver oz, copper tonne, steel tonne)
          const isMetals = (custom &&
            (custom as unknown as { category?: string }).category ===
              "metals") ||
            /silver\s+oz|silver\s+troy\s+ounces?|copper\s+tonnes?|steel\s+tonnes?/i
              .test(unitLower + " " + name);
          if (isMetals) {
            metals.push(entry);
            continue;
          }

          // Counts
          if (
            isCountIndicator(item.name, item.unit) ||
            isCountUnit(item.unit || "")
          ) {
            counts.push(entry);
            continue;
          }

          // Percentages
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
            const k = key(b.item);
            const v = map.get(k);
            if (v) out.push(v);
          }
          return out;
        };

        // Process each bucket
        const batchOptions = {
          validate: false,
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
          const res = await processBatch(
            defaults.map((d) => d.item),
            batchOptions,
          );
          const merged = mergeByKey(defaults, res.successful);
          merged.forEach((it, i) =>
            processed.push({ item: it, idx: defaults[i].idx })
          );
        }

        // Reassemble in original order
        const ordered: ParsedData[] = new Array(nonExempted.length);
        for (const p of processed) ordered[p.idx] = p.item;
        const finalProcessed = ordered.filter((x): x is ParsedData => !!x);

        // Return processed + exempted unchanged
        return [...finalProcessed, ...exempted];
      },
    ),

    adjustInflationService: fromPromise(
      ({ input }: { input: PipelineContext }) => {
        const { normalizedData } = input;
        if (!normalizedData) {
          return Promise.resolve(normalizedData);
        }
        return Promise.resolve(
          normalizedData.map((item) => ({
            ...item,
            realValue: adjustForInflation(item.normalized || item.value, {
              fromYear: item.year || 2020,
              toYear: 2024,
              country: "US",
              unit: item.normalizedUnit || item.unit,
            }),
          })),
        );
      },
    ),

    removeSeasonalityService: fromPromise(
      ({ input }: { input: PipelineContext }) => {
        const data = input.adjustedData || input.normalizedData;
        if (!data || data.length < 24) {
          return Promise.resolve(data);
        }
        const timeSeries = data.map((item) => ({
          date: new Date(item.date || Date.now()),
          value: item.realValue || item.normalized || item.value,
        }));
        const deseasonalized = deseasonalize(timeSeries, {
          method: "decomposition",
          period: 12,
        });
        // Map deseasonalized results back into ParsedData[]
        return Promise.resolve(
          data.map((item, idx) => {
            const point = deseasonalized[idx] as
              | {
                date: Date;
                value: number;
                seasonal: number;
                adjusted: number;
              }
              | undefined;
            if (!point) return item;
            return {
              ...item,
              realValue: point.adjusted,
              metadata: {
                ...item.metadata,
                seasonal: point.seasonal,
              },
            } as ParsedData;
          }),
        );
      },
    ),

    finalizeDataService: fromPromise(
      ({ input }: { input: PipelineContext }) => {
        const finalData = input.adjustedData || input.normalizedData;

        const formatNormalizedUnit = (u?: string): string | undefined => u;

        // Ensure processingTime is populated even before metrics are finalized
        const computedProcessingTime = input.metrics.processingTime ??
          (typeof input.metrics.startTime === "number"
            ? Date.now() - input.metrics.startTime
            : undefined);

        return Promise.resolve(
          finalData?.map((item) => ({
            ...item,
            normalizedUnit: formatNormalizedUnit(item.normalizedUnit),
            pipeline: {
              qualityScore: input.qualityScore?.overall,
              processingTime: computedProcessingTime,
              inferredUnit: item.inferredUnit,
            },
          })),
        );
      },
    ),
  },
  guards: {
    qualityPassed: ({ context }) => {
      const threshold = context.config.minQualityScore || 70;
      const score = context.qualityScore?.overall || 0;
      return score >= threshold;
    },
    shouldAdjustInflation: ({ context }) => {
      return context.config.adjustInflation === true;
    },
    shouldRemoveSeasonality: ({ context }) => {
      return context.config.removeSeasonality === true;
    },
  },
  actions: {
    logStep: ({ event: _event }) => {
      // Optionally log pipeline steps for debugging
      // console.log(`Pipeline step: ${event.type}`);
    },
    logError: assign({
      errors: ({ context, event }) => {
        const err = (event as { error?: unknown }).error;
        const message = (err && typeof err === "object" && "message" in err
          ? (err as { message?: string }).message
          : undefined) || "Unknown error";
        return [
          ...context.errors,
          {
            step: event.type,
            message,
            data: err,
            timestamp: new Date(),
          },
        ];
      },
    }),
    logWarning: assign({
      warnings: ({ context, event }) => {
        const err = (event as { error?: unknown }).error;
        const message = (err && typeof err === "object" && "message" in err
          ? (err as { message?: string }).message
          : undefined) || "Warning occurred";
        return [...context.warnings, message];
      },
    }),
    logSuccess: () => {
      // Optionally log success
    },
    logFinalError: () => {
      // Optionally log errors
    },
    emitResults: () => {
      // Optionally emit results to external system
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgMYHsB2BLAZgTwAUsAHMAGywzADosIywBiAZQBUBBAJVYG0AGALqJQxNLCwAXLJmEgAHogCMAJgBs1Pps2rlfAMyKArH0MBOADQg8iUwA5qh23r2rVfACyLtjgL4-LqJi4hCTklDQAbgCGFBBRUhhQjBCYNJQRaADWkTF08WAAkhjEAK4S-EJIIKLiUjJVCgiGAOx81MqKts2meh7uzar9ltYIynr2ysb6es3u7objqrZ+AejY+ESkFFTU0bHxlElgAE7HaMfUxGTxOOcAtru5cRKFxWUVsjWS0hiyjS1tDpdHp9AZDKyIWyKBxaZrNXpjZTKUyGFbgNbBTZhHbEKLHcSJZKpWgYDLZS542BgACq2AksA+VS+dV+DSUfC61HcQNsfGU7lMrUUqmGiDGhmozSmzlm80WejRgXWIS24Qp+MOjBOZwuVxu93VVNpkgZgk+Ym+9VAjWaylFCFUtsl+kU7i6ij0hmMCv86KCG1C2xoAEcSrkJHgAMIAC1QmSJO3SWRoUVgVLTAEUwxQI4yRBaWX9ENzmtQofzbLzDK44XxmvanPY68ougt+cLTO5FRiA6qdqHw1HYyh4ylE6Tk9RU+nYFnBzxFJV87UfkWECWyyo3VWa616xCEKYlly+KojP1uXpPMpu-6VdiQ9nJEO41rTudLtcJLdjg9p3BZyfXMzSZAtVzZBBbDtA8jEUUxqBmDluTdM8BlvZUsSDagBxzPBODACIsDAAB3RhIwAeQAOVYApKOpABRPNqjAq15BsLwNAMSZDBURCZntOx7G6Ts9CPPlbDmLtfSVTFAzVHDn3wwiSMYdgACFyO4JjmXA61EEMaCRkRdwuV5Aw9EmWxHRvaSe3vLCFIjJSiNIgAxAoAA1tJY1k9KaQz2TPBCzDUQVFA9AzmnQ2S+xoHAwAkFBo0OTh8lgBM0gncl4sS6NUpeU0l2YldWMaD0pS5GYzCg5pOhMCwD07CUOUcNQWqPD1ot7B9qBypKUrSt8dU-fVf16hKkvyuBvJK3y2IQcqJXcKq7GUWqqwakYoIlR1BVPOCdy6+y1Qwe5cgAL01MdMrJGhTt-C6wBmy05saTwJU9Hp4WMcLbVme1OihBD+gRESPVcI7MJOs6KEuwltQ-PVvwNe67ke57Cwg97gq+z0+F+tb3AB1xoSvKVnEFGZJlUSG5J2KIIAAKxKWAEigagkrjQ4ihwL8fkYDHdPm7oTK8ESXF6AxHABlFSy9EwrPCsZlsUWnYqnJmWbZjnh0ybmMF5g5MAFxdzVmtcReoMXloll1pYPDpmgmZERcUJ3Owh2y7yh+nNdZw4NeZ-3Eh5vnjeuklbsDrXQ6NjBBdKpRFjLFt+TsJZRLse1dBUSU4TFzPVDsNWeoZoPtbLrX9cNlkhsRr8fz-P2JFjlkE9epOrJTqCBSspxTCzmDTDglOqcGflqqk1ZvbplNm4DzmR0OZgwFTTBBwFkDlxetc3crBDTDrWwWi8asFmzvl4KcIv+jcasliir2MNn6Pg-Zxe9cSFe14wDeFyKnSidRi3ytnwI8EkWxwXhETB24V1C2gHqJRWBhlhPxiqXeeiRqDHDAHcNAhEv6r1gOvXCGVI6ThwXgiIYBv7EN-rhdua5+QDFAeA7kUJKYwKMnyPQedWimBbHYUS7gaZoO6lhSub9sG4PwcvIhJDnx111A3A0lD8E0PkfQ58jCILMPUGLJY7CoFXgBmZBC-IkSGBESoKUqIxHHR2DgSgF0rrEiTNlZxsMnpb2KjvCCvROjtH0DxZwV5PTChlqeTcthBRSn0G6SYJcsJOK0XDI475lGjQeCk9GPjAEdwQAEiYwSPTOGWjxEUMEoS8Ksl6JqLZxhqD8L6U6EA4CyBkuI8IZs-F+QALSVJGH0iUA8B4HXCr0QYXoklqjoAwHpmM-LcgBh0MsYDKaOjrEhH009n7qz2HkNmCyhaNDGKWKCUIBSqAslsiJB5j4IXWWFRwhjTAzJxJSQ4xygFSngsrFWh9woqACqMMYXIBjXP6H3Fsj9dnoIckBF8I5vkFMdA2MFyJOwDBcFMwU7zHyDmciRFFFsXDtHLFYkRgxAYCV5BoAUy0WwckdFY-F41coDQKiSiCp9lBW1bMEzQ4UOQNm5JKYUKhj4eism6NlqMXGJG5X5OExNVASiMLMOwAo4RFzZZIo5oFzYQXvgfU8RdxgzGHoMpQTsPrihaAZDkeL7E+znuXBeutq5hzmvktcZ4TKiTNT0Jw3Q7kjDgjodobswG8k7CoFQerMHs31V6uOSr5peFWSiAww8DJzFcIYGWFlHmXylmqiSOy-R7Iwe6rBH85E-0HOmsqjheFunmNeHo7geEXyvDCK8ZhHCyjVYm2t7M1EEKgLQhREZm1ig8OqsBarPTzBbDoGWKINB9zdoguUbKcmwy+Ya3p801q5zAZ4AUPQUSOmtQtKEpYWXwjhGMWCdi4VdJ2LAEoKAUAATnYUndkpLlunhFBZEthTGH0lCiaqRhTwIjZQjY4AGDDdGA66UDjSIMA2Ee0RBnROieCcM0nwQA */
  id: "econifyPipeline",
  initial: "idle",
  context: ({ input }) => ({
    rawData: input?.rawData ?? [],
    config: input?.config ?? {},
    errors: [],
    warnings: [],
    metrics: {
      recordsProcessed: 0,
      recordsFailed: 0,
    },
  }),
  states: {
    idle: {
      on: {
        START: {
          target: "validating",
          actions: assign({
            metrics: ({ context }) => ({
              ...context.metrics,
              startTime: Date.now(),
            }),
          }),
        },
      },
    },

    validating: {
      entry: "logStep",
      invoke: {
        id: "validateInput",
        src: "validateInputData",
        input: ({ context }) => context,
        onDone: {
          target: "parsing",
          actions: assign({
            rawData: ({ event }) => event.output,
          }),
        },
        onError: {
          target: "error",
          actions: "logError",
        },
      },
    },

    parsing: {
      entry: "logStep",
      invoke: {
        id: "parseUnits",
        src: "parseUnitsService",
        input: ({ context }) => context,
        onDone: {
          target: "qualityCheck",
          actions: assign({
            parsedData: ({ event }) => event.output,
          }),
        },
        onError: {
          target: "error",
          actions: "logError",
        },
      },
    },

    qualityCheck: {
      entry: "logStep",
      invoke: {
        id: "assessQuality",
        src: "assessQualityService",
        input: ({ context }) => context,
        onDone: {
          target: "qualityDecision",
          actions: assign({
            qualityScore: ({ event }) => event.output,
          }),
        },
        onError: {
          target: "error",
          actions: "logError",
        },
      },
    },

    qualityDecision: {
      always: [
        {
          target: "fetchingRates",
          guard: "qualityPassed",
        },
        {
          target: "qualityReview",
          actions: assign({
            warnings: ({ context }) => [
              ...context.warnings,
              `Quality score ${
                context.qualityScore?.overall || 0
              } below threshold ${context.config.minQualityScore || 70}`,
            ],
          }),
        },
      ],
    },

    qualityReview: {
      entry: "logStep",
      on: {
        CONTINUE: "fetchingRates",
        ABORT: "error",
        FIX: "parsing",
      },
    },

    fetchingRates: {
      entry: "logStep",
      invoke: {
        id: "fetchRates",
        src: "fetchRatesService",
        input: ({ context }) => context,
        onDone: {
          target: "normalizing",
          actions: assign({
            fxRates: ({ event }) => event.output,
          }),
        },
        onError: {
          target: "normalizing",
          actions: [
            "logWarning",
            assign({
              fxRates: ({ context }) => context.config.fxFallback,
            }),
          ],
        },
      },
    },

    normalizing: {
      entry: "logStep",
      invoke: {
        id: "normalize",
        src: "normalizeDataService",
        input: ({ context }) => context,
        onDone: {
          target: "adjusting",
          actions: assign({
            normalizedData: ({ event }) => event.output,
          }),
        },
        onError: {
          target: "error",
          actions: "logError",
        },
      },
    },

    adjusting: {
      entry: "logStep",
      initial: "checkingInflation",
      states: {
        checkingInflation: {
          always: [
            {
              target: "adjustingInflation",
              guard: "shouldAdjustInflation",
            },
            {
              target: "checkingSeasonality",
            },
          ],
        },

        adjustingInflation: {
          invoke: {
            id: "adjustInflation",
            src: "adjustInflationService",
            input: ({ context }) => context,
            onDone: {
              target: "checkingSeasonality",
              actions: assign({
                adjustedData: ({ event }) => event.output,
              }),
            },
            onError: {
              target: "checkingSeasonality",
              actions: "logWarning",
            },
          },
        },

        checkingSeasonality: {
          always: [
            {
              target: "removingSeasonality",
              guard: "shouldRemoveSeasonality",
            },
            {
              target: "#econifyPipeline.finalizing",
            },
          ],
        },

        removingSeasonality: {
          invoke: {
            id: "removeSeasonality",
            src: "removeSeasonalityService",
            input: ({ context }) => context,
            onDone: {
              target: "#econifyPipeline.finalizing",
              actions: assign({
                adjustedData: ({ event }) => event.output,
              }),
            },
            onError: {
              target: "#econifyPipeline.finalizing",
              actions: "logWarning",
            },
          },
        },
      },
    },

    finalizing: {
      entry: "logStep",
      invoke: {
        id: "finalize",
        src: "finalizeDataService",
        input: ({ context }) => context,
        onDone: {
          target: "success",
          actions: assign({
            finalData: ({ event }) => event.output,
            metrics: ({ context }) => ({
              ...context.metrics,
              endTime: Date.now(),
              processingTime: Date.now() - (context.metrics.startTime || 0),
            }),
          }),
        },
        onError: {
          target: "error",
          actions: "logError",
        },
      },
    },

    success: {
      type: "final",
      entry: ["logSuccess", "emitResults"],
    },

    error: {
      type: "final",
      entry: "logFinalError",
    },
  },
});

/**
 * Create and run a pipeline with XState v5
 */
export function createPipeline(config: PipelineConfig) {
  return {
    run(data: ParsedData[]): Promise<ParsedData[]> {
      return new Promise((resolve, reject) => {
        const actor = createActor(pipelineMachine, {
          input: {
            rawData: data,
            config,
          },
        });

        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          actor.stop();
          reject(new Error("Pipeline timeout after 3 seconds"));
        }, 3000);

        actor.subscribe((state) => {
          if (state.matches("success")) {
            clearTimeout(timeout);
            actor.stop();
            resolve(state.context.finalData || []);
          } else if (state.matches("error")) {
            clearTimeout(timeout);
            actor.stop();
            reject(
              new Error("Pipeline failed: " + state.context.errors[0]?.message),
            );
          }
        });

        actor.start();
        actor.send({ type: "START" });
      });
    },

    createInteractive() {
      let actor: ReturnType<typeof createActor>;

      return {
        start(data: ParsedData[]) {
          actor = createActor(pipelineMachine, {
            input: {
              rawData: data,
              config,
            },
          });
          actor.start();
          actor.send({ type: "START" });
        },

        continueAfterQualityReview() {
          actor?.send({ type: "CONTINUE" });
        },

        abortAfterQualityReview() {
          actor?.send({ type: "ABORT" });
        },

        fixAndRetry() {
          actor?.send({ type: "FIX" });
        },

        getState() {
          return actor?.getSnapshot();
        },

        getContext() {
          return actor?.getSnapshot().context;
        },

        stop() {
          actor?.stop();
        },
      };
    },
  };
}
