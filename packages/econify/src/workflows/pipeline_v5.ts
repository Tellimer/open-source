/**
 * XState v5 pipeline for data processing
 */

import { assign, createActor, fromPromise, setup } from "npm:xstate@^5.20.2";
import {
  adjustForInflation,
  assessDataQuality,
  deseasonalize,
  fetchLiveFXRates,
  type FXTable,
  inferUnit,
  parseUnit,
  type QualityScore,
  type Scale,
  type TimeScale,
} from "../main.ts";
import { enhancedNormalizeDataService } from "../wages/pipeline-integration.ts";

// Derived types
type ParsedUnit = ReturnType<typeof parseUnit>;

// Pipeline context type
export interface PipelineContext {
  rawData: ParsedData[];
  config: PipelineConfig;
  parsedData?: ParsedData[];
  qualityScore?: QualityScore;
  fxRates?: FXTable;
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
        let unit = item.unit;
        if (config.inferUnits && (!unit || unit === "unknown" || unit === "")) {
          const inferred = inferUnit(item.value, {
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

      // Ensure we have fallback rates for wages processing
      const defaultFallback: FXTable = {
        base: "USD",
        rates: {
          EUR: 0.92, GBP: 0.79, JPY: 149.50, CAD: 1.36, AUD: 1.52,
          CHF: 0.88, CNY: 7.25, SEK: 10.85, NOK: 10.75, DKK: 6.85,
          PLN: 4.05, CZK: 22.80, HUF: 360.0, RON: 4.55, BGN: 1.80,
          HRK: 6.95, TRY: 27.50, RUB: 92.0, KZT: 450.0, UZS: 12250,
          GEL: 2.65, AMD: 387.5, AZN: 1.70, KGS: 89.0, TJS: 10.95,
          TMT: 3.50, MNT: 3450, KRW: 1320, TWD: 31.5, HKD: 7.80,
          SGD: 1.35, MYR: 4.65, THB: 35.5, PHP: 56.0, IDR: 15750,
          VND: 24500, INR: 83.0, PKR: 278.0, BDT: 110.0, LKR: 325.0,
          NPR: 133.0, BTN: 83.0, MVR: 15.4, AFN: 70.0, IRR: 42000,
          IQD: 1310, JOD: 0.71, KWD: 0.31, BHD: 0.377, QAR: 3.64,
          AED: 3.67, OMR: 0.385, SAR: 3.75, YER: 250.0, SYP: 2512,
          LBP: 15000, ILS: 3.70, EGP: 30.9, LYD: 4.85, TND: 3.10,
          DZD: 134.0, MAD: 9.85, XOF: 605.0, XAF: 605.0, GHS: 12.0,
          NGN: 775.0, ZAR: 18.5, BWP: 13.5, SZL: 18.5, LSL: 18.5,
          NAD: 18.5, AOA: 830.0, MZN: 63.5, ZMW: 25.5, MWK: 1730,
          TZS: 2500, UGX: 3750, KES: 155.0, RWF: 1290, BIF: 2850,
          ETB: 55.5, ERN: 15.0, DJF: 178.0, SOS: 570.0, SCR: 13.5,
          MUR: 45.5, MGA: 4550, KMF: 455.0, CDF: 2750, XDR: 0.75,
          BRL: 5.15, ARS: 350.0, CLP: 950.0, COP: 4050, PEN: 3.75,
          UYU: 39.5, PYG: 7300, BOB: 6.90, VES: 36.0, GYD: 209.0,
          SRD: 37.5, FKP: 0.79, TTD: 6.75, BBD: 2.00, JMD: 155.0,
          BSD: 1.00, KYD: 0.83, BZD: 2.00, GTQ: 7.80, HNL: 24.7,
          NIO: 36.7, CRC: 520.0, PAB: 1.00, CUP: 24.0, DOP: 56.5,
          HTG: 132.0, XCD: 2.70, AWG: 1.80, ANG: 1.80, SVC: 8.75,
          MXN: 17.1, ALL: 90.9, BAM: 1.80, MKD: 56.5, MDL: 17.8,
          ISK: 138.0, FJD: 2.25, TOP: 2.35, WST: 2.70, SBD: 8.50,
          VUV: 119.0, PGK: 3.75, NCF: 110.0, XPF: 110.0,
        }
      };

      const fallbackRates = config.fxFallback || defaultFallback;

      return config.useLiveFX
        ? fetchLiveFXRates(config.targetCurrency || "USD", {
          fallback: fallbackRates,
          cache: true,
        })
        : Promise.resolve(fallbackRates);
    }),

    normalizeDataService: fromPromise(
      async ({ input }: { input: PipelineContext }) => {
        return await enhancedNormalizeDataService(input);
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

        const formatNormalizedUnit = (u?: string): string | undefined => {
          if (!u) return u;
          // Normalize labels like "USD Billion" -> "USD billions"
          const m = u.match(
            /^(?<cur>[A-Z]{3})\s+(?<scale>Million|Billion|Thousand|Trillion)s?$/i,
          );
          if (m && m.groups) {
            const cur = m.groups.cur.toUpperCase();
            const scale = m.groups.scale.toLowerCase();
            return `${cur} ${scale}s`;
          }
          return u;
        };

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
