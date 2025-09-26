import { assign, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../shared/types.ts";
import type { DomainBucket, ExplainV2Metadata } from "../shared/types.ts";

interface ExplainInput {
  items: ParsedData[];
  enable?: boolean;
  config?: {
    targetCurrency?: string;
    targetMagnitude?: string;
    targetTimeScale?: string;
    autoTargetByIndicator?: boolean;
  };
  routerStats?: {
    processedBuckets: string[];
    skippedBuckets: string[];
  };
}
interface ExplainOutput {
  items: ParsedData[];
}

/**
 * Normalize explain metadata to V2 flat structure with consistent keys
 */
function normalizeExplainMetadata(
  explain: any,
  config?: ExplainInput["config"],
  routerStats?: ExplainInput["routerStats"],
): ExplainV2Metadata {
  const normalized: ExplainV2Metadata = {
    explainVersion: "v2",
    explain_version: "v2", // Add backwards compatibility field
  };

  // Preserve existing FX structure if present (don't normalize it yet)
  if (explain.fx) {
    normalized.fx = { ...explain.fx };
  }

  // Normalize currency information (separate from FX)
  if (explain.currency) {
    const currencyData = explain.currency;
    normalized.currency = {
      original: currencyData.original || "unknown",
      normalized: currencyData.normalized || config?.targetCurrency || "USD",
      conversionRate: currencyData.conversionRate,
    };
  }

  // Preserve existing scale structure if present (don't normalize it yet)
  if (explain.scale) {
    normalized.scale = { ...explain.scale };
  } else if (explain.magnitude) {
    // Only normalize if no existing scale structure
    const scaleData = explain.magnitude || {};
    normalized.scale = {
      original: scaleData.original || scaleData.from || "ones",
      normalized: scaleData.normalized || scaleData.to ||
        config?.targetMagnitude || "millions",
      conversionFactor: scaleData.conversionFactor || scaleData.factor,
    };
  }

  // Preserve existing periodicity structure if present (don't normalize it yet)
  if (explain.periodicity) {
    normalized.periodicity = { ...explain.periodicity };
  } else if (explain.time || explain.timeScale) {
    // Only normalize if no existing periodicity structure
    const timeData = explain.time || explain.timeScale || {};
    normalized.periodicity = {
      original: timeData.original || timeData.from || "unknown",
      normalized: timeData.normalized || timeData.to ||
        config?.targetTimeScale || "month",
      conversionDirection: timeData.conversionDirection ||
        (timeData.direction === "up"
          ? "up"
          : timeData.direction === "down"
          ? "down"
          : "none"),
    };
  }

  // Normalize auto-target information
  if (explain.targetSelection || explain.autoTarget) {
    const targetData = explain.targetSelection || explain.autoTarget || {};

    // Helper function to extract dominance for selected value
    const getDominance = (
      shares: Record<string, number> | undefined,
      selected: string | undefined,
    ): number => {
      if (!shares || !selected) return 0;
      return shares[selected] || 0;
    };

    normalized.autoTarget = {
      enabled: config?.autoTargetByIndicator ?? false,
      currency: targetData.selected?.currency
        ? {
          selected: targetData.selected.currency,
          dominance: getDominance(
            targetData.shares?.currency,
            targetData.selected.currency,
          ),
          threshold: 0.8,
        }
        : undefined,
      scale: targetData.selected?.magnitude
        ? {
          selected: targetData.selected.magnitude,
          dominance: getDominance(
            targetData.shares?.magnitude,
            targetData.selected.magnitude,
          ),
          threshold: 0.8,
        }
        : undefined,
      time: targetData.selected?.time
        ? {
          selected: targetData.selected.time,
          dominance: getDominance(
            targetData.shares?.time,
            targetData.selected.time,
          ),
          threshold: 0.8,
        }
        : undefined,
    };
  }

  // Add router provenance
  normalized.router = {
    totalBuckets: 11, // Standard V2 bucket count
    processedBuckets: routerStats?.processedBuckets ||
      explain.router?.processedBuckets || [],
    skippedBuckets: routerStats?.skippedBuckets ||
      explain.router?.skippedBuckets || [],
  };

  // Add domain information - always include for V2
  normalized.domain = {
    bucket: (explain.domain?.bucket || explain.domain ||
      "monetaryStock") as DomainBucket,
    processingType: explain.processingType || "batch",
    conversionSummary: explain.conversionSummary,
  };

  // Preserve any additional V2-specific fields
  Object.keys(explain).forEach((key) => {
    if (
      ![
        "fx",
        "currency",
        "scale",
        "magnitude",
        "periodicity",
        "time",
        "timeScale",
        "targetSelection",
        "autoTarget",
        "router",
        "domain",
        "explainVersion",
      ].includes(key)
    ) {
      (normalized as any)[key] = explain[key];
    }
  });

  return normalized;
}

export const explainMergeMachine = setup({
  types: { context: {} as ExplainInput, input: {} as ExplainInput },
}).createMachine({
  id: "explainMergeV2",
  context: ({ input }) => ({
    items: input.items,
    enable: input.enable,
    config: input.config,
    routerStats: input.routerStats,
  }),
  initial: "maybe",
  states: {
    maybe: {
      always: [
        { guard: ({ context }) => !!context.enable, target: "normalize" },
        { target: "passthrough" },
      ],
    },
    passthrough: {
      entry: assign(({ context }) => {
        const processed = (context.items || []).map((it) => {
          // Even when explain is disabled, we need to map normalizedValue to normalized
          const mappedItem = { ...(it as ParsedData) };
          if (
            "normalizedValue" in mappedItem &&
            mappedItem.normalizedValue !== undefined
          ) {
            (mappedItem as any).normalized = mappedItem.normalizedValue;
          }
          return mappedItem;
        });
        return { items: processed };
      }),
      always: { target: "done" },
    },
    normalize: {
      entry: assign(({ context }) => {
        const processed = (context.items || []).map((it) => {
          const base = it as unknown as { explain?: Record<string, unknown> };
          const existingExplain = base.explain || {};

          // Normalize to V2 flat structure
          const normalizedExplain = normalizeExplainMetadata(
            existingExplain,
            context.config,
            context.routerStats,
          );

          // Map V2 field names to V1 field names for compatibility with tests
          const mappedItem = {
            ...(it as ParsedData),
            explain: normalizedExplain,
          } as ParsedData;

          // Ensure unit provenance is present in explain
          (mappedItem as any).explain.originalUnit = (mappedItem as any).unit ??
            (mappedItem as any).explain.originalUnit;
          (mappedItem as any).explain.normalizedUnit =
            (mappedItem as any).normalizedUnit ??
              (mappedItem as any).explain.normalizedUnit;

          // Convert normalizedValue to normalized for test compatibility
          if (
            "normalizedValue" in mappedItem &&
            mappedItem.normalizedValue !== undefined
          ) {
            (mappedItem as any).normalized = mappedItem.normalizedValue;
          }

          return mappedItem;
        });
        return { items: processed };
      }),
      always: { target: "done" },
    },
    done: {
      type: "final",
      output: ({ context }) => ({ items: context.items }) as ExplainOutput,
    },
  },
  output: ({ context }) => ({ items: context.items }) as ExplainOutput,
});
