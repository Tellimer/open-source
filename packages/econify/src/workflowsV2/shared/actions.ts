/**
 * Shared action functions for Workflows V2 architecture
 *
 * Actions are functions that update the machine context.
 * They follow the naming convention: {verb}{Object}
 */

import { assign } from "xstate";
import type {
  ActionFunction,
  PipelineV2Context,
  ProcessingError,
  V2Buckets,
} from "./types.ts";
import process from "node:process";

// ============================================================================
// Data Assignment Actions
// ============================================================================

/**
 * Assign items to context
 */
export const assignItems = assign({
  items: ({ event }: { event: any }) => event.items || [],
});

/**
 * Assign classification buckets to context
 */
export const assignBuckets = assign({
  buckets: ({ event }: { event: any }) => event.buckets || {},
});

/**
 * Assign exempted items to context
 */
export const assignExempted = assign({
  exempted: ({ event }: { event: any }) => event.exempted || [],
});

/**
 * Assign processing results to context
 */
export const assignResults = assign({
  results: ({ event }: { event: any }) => event.results || [],
});

/**
 * Assign explain metadata to context
 */
export const assignExplain = assign({
  explain: ({ event }: { event: any }) => event.explain,
});

/**
 * Assign FX rates to context
 */
export const assignFXRates = assign({
  fxRates: ({ event }: { event: any }) => event.fxRates,
  fxSource: ({ event }: { event: any }) => event.fxSource,
  fxSourceId: ({ event }: { event: any }) => event.fxSourceId,
});

/**
 * Assign normalization targets to context
 */
export const assignTargets = assign({
  targets: ({ event }: { event: any }) => event.targets,
});

/**
 * Assign time basis inference result to context
 */
export const assignTimeBasis = assign({
  timeBasis: ({ event }: { event: any }) => event.timeBasis,
});

// ============================================================================
// Error Handling Actions
// ============================================================================

/**
 * Assign error information to context
 */
export const assignErrors = assign({
  errors: ({ context, event }: { context: any; event: any }) => {
    const existingErrors = context.errors || [];
    const newError = event.error || event.data?.error;
    return newError ? [...existingErrors, newError] : existingErrors;
  },
});

/**
 * Clear error state
 */
export const clearErrors = assign({
  errors: () => [],
});

/**
 * Add a processing error to context
 */
export const addError = (error: ProcessingError) =>
  assign({
    errors: ({ context }: { context: any }) => {
      const existingErrors = context.errors || [];
      return [...existingErrors, error];
    },
  });

// ============================================================================
// State Management Actions
// ============================================================================

/**
 * Reset context to initial state
 */
export const resetContext = assign({
  items: () => [],
  exempted: () => [],
  buckets: () => ({}),
  results: () => [],
  errors: () => [],
  fxRates: () => undefined,
  fxSource: () => undefined,
  fxSourceId: () => undefined,
  explain: () => undefined,
});

/**
 * Initialize context from input and config
 */
export const initializeContext = assign({
  input: ({ event }: { event: any }) => event.input,
  config: ({ event }: { event: any }) => event.config,
  items: () => [],
  exempted: () => [],
  buckets: () => ({}),
  results: () => [],
  errors: () => [],
});

// ============================================================================
// Processing Actions
// ============================================================================

/**
 * Merge results from multiple processing branches
 */
export const mergeResults = assign({
  results: ({ context, event }: { context: any; event: any }) => {
    const existingResults = context.results || [];
    const newResults = event.results || [];
    return [...existingResults, ...newResults];
  },
});

/**
 * Append results from a single domain
 */
export const appendDomainResults = assign({
  results: ({ context, event }: { context: any; event: any }) => {
    const existingResults = context.results || [];
    const domainResults = event.results || [];
    return [...existingResults, ...domainResults];
  },
});

/**
 * Update bucket with processed items
 */
export const updateBucket = (bucketName: keyof V2Buckets) =>
  assign({
    buckets: ({ context, event }: { context: any; event: any }) => {
      const currentBuckets = context.buckets || {};
      const updatedItems = event.items || [];
      return {
        ...currentBuckets,
        [bucketName]: updatedItems,
      };
    },
  });

// ============================================================================
// Metadata Actions
// ============================================================================

/**
 * Enhance explain metadata with additional fields
 */
export const enhanceExplain = assign({
  explain: ({ context, event }: { context: any; event: any }) => {
    const currentExplain = context.explain || {};
    const enhancements = event.enhancements || {};
    return {
      ...currentExplain,
      ...enhancements,
    };
  },
});

/**
 * Set explain version to V2
 */
export const setExplainV2 = assign({
  explain: ({ context }: { context: any }) => ({
    ...context.explain,
    explainVersion: "v2" as const,
  }),
});

/**
 * Add router provenance to explain
 */
export const addRouterProvenance = assign({
  explain: ({ context, event }: { context: any; event: any }) => {
    const currentExplain = context.explain || {};
    const routerInfo = event.routerInfo || {};
    return {
      ...currentExplain,
      router: routerInfo,
    };
  },
});

// ============================================================================
// Logging and Debug Actions
// ============================================================================

/**
 * Log processing progress (for debugging)
 */
export const logProgress =
  (stage: string) => ({ context, event }: { context: any; event: any }) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[V2 ${stage}]`, {
        itemCount: context.items?.length || 0,
        buckets: context.buckets ? Object.keys(context.buckets) : [],
        errors: context.errors?.length || 0,
      });
    }
  };

/**
 * Log state transition
 */
export const logTransition =
  (from: string, to: string) => ({ context }: { context: any }) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[V2 transition] ${from} -> ${to}`, {
        itemCount: context.items?.length || 0,
      });
    }
  };

// ============================================================================
// Validation Actions
// ============================================================================

/**
 * Validate input data structure
 */
export const validateInput = assign({
  errors: ({ context, event }: { context: any; event: any }) => {
    const errors = context.errors || [];
    const input = event.input;

    if (!input) {
      return [...errors, {
        code: "INVALID_INPUT",
        message: "Input data is required",
        stage: "validation",
      }];
    }

    if (!Array.isArray(input.data)) {
      return [...errors, {
        code: "INVALID_DATA_FORMAT",
        message: "Input data must be an array",
        stage: "validation",
      }];
    }

    return errors;
  },
});

/**
 * Validate configuration
 */
export const validateConfig = assign({
  errors: ({ context, event }: { context: any; event: any }) => {
    const errors = context.errors || [];
    const config = event.config;

    if (!config) {
      return [...errors, {
        code: "INVALID_CONFIG",
        message: "Configuration is required",
        stage: "validation",
      }];
    }

    if (config.engine && !["v1", "v2"].includes(config.engine)) {
      return [...errors, {
        code: "INVALID_ENGINE",
        message: 'Engine must be "v1" or "v2"',
        stage: "validation",
      }];
    }

    return errors;
  },
});

// ============================================================================
// Utility Actions
// ============================================================================

/**
 * Set a flag in context
 */
export const setFlag = (flagName: string, value: boolean) =>
  assign({
    [flagName]: () => value,
  });

/**
 * Increment a counter in context
 */
export const incrementCounter = (counterName: string) =>
  assign({
    [counterName]: ({ context }: { context: any }) =>
      (context[counterName] || 0) + 1,
  });

/**
 * Set processing stage
 */
export const setStage = (stage: string) =>
  assign({
    currentStage: () => stage,
  });
