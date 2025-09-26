/**
 * Ratios domain machine for V2 workflows
 *
 * Validates and passes through ratio values unchanged
 */

import { assign, setup } from "xstate";
import { processRatiosBatch } from "../../normalize/batch.ts";

// ============================================================================
// Types
// ============================================================================

interface RatiosContext {
  items: any[];
  results: any[];
  errors: any[];
}

type RatiosEvents =
  | { type: "PROCESS"; items: any[] }
  | { type: "ERROR"; error: any };

// ============================================================================
// Guards
// ============================================================================

const hasItems = ({ context }: { context: RatiosContext }) =>
  context.items && context.items.length > 0;

const hasErrors = ({ context }: { context: RatiosContext }) =>
  context.errors && context.errors.length > 0;

// ============================================================================
// Actions
// ============================================================================

const assignItems = assign({
  items: ({ event }: { event: any }) => event.items || [],
});

const processItems = assign({
  results: ({ context }: { context: RatiosContext }) => {
    try {
      return processRatiosBatch(context.items);
    } catch (error) {
      console.error("[Ratios] Processing error:", error);
      return [];
    }
  },
});

const assignError = assign({
  errors: ({ context, event }: { context: RatiosContext; event: any }) => {
    const existingErrors = context.errors || [];
    return [...existingErrors, event.error];
  },
});

const logProgress = ({ context }: { context: RatiosContext }) => {
  console.log("[V2 ratios] processed", context.results?.length || 0, "items");
};

// ============================================================================
// Machine Definition
// ============================================================================

export const ratiosMachine = setup({
  types: {
    context: {} as RatiosContext,
    events: {} as RatiosEvents,
  },
  guards: {
    hasItems,
    hasErrors,
  },
  actions: {
    assignItems,
    processItems,
    assignError,
    logProgress,
  },
}).createMachine({
  id: "ratios",
  initial: "idle",
  context: {
    items: [],
    results: [],
    errors: [],
  },
  states: {
    idle: {
      on: {
        PROCESS: {
          target: "prepare",
          actions: "assignItems",
        },
      },
    },
    prepare: {
      always: [
        {
          guard: "hasItems",
          target: "processing",
        },
        {
          target: "done",
        },
      ],
    },
    processing: {
      entry: "processItems",
      always: {
        target: "complete",
        actions: "logProgress",
      },
    },
    complete: {
      type: "final",
    },
    done: {
      type: "final",
    },
    error: {
      on: {
        PROCESS: {
          target: "prepare",
          actions: "assignItems",
        },
      },
    },
  },
  on: {
    ERROR: {
      target: ".error",
      actions: "assignError",
    },
  },
});
