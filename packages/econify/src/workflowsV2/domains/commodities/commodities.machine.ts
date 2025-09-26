/**
 * Commodities domain machine for V2 workflows
 *
 * Passes through commodity units without normalization
 */

import { assign, setup } from "xstate";
import { processCommoditiesBatch } from "../../normalize/batch.ts";

// ============================================================================
// Types
// ============================================================================

interface CommoditiesContext {
  items: any[];
  results: any[];
  errors: any[];
}

type CommoditiesEvents =
  | { type: "PROCESS"; items: any[] }
  | { type: "ERROR"; error: any };

// ============================================================================
// Guards
// ============================================================================

const hasItems = ({ context }: { context: CommoditiesContext }) =>
  context.items && context.items.length > 0;

const hasErrors = ({ context }: { context: CommoditiesContext }) =>
  context.errors && context.errors.length > 0;

// ============================================================================
// Actions
// ============================================================================

const assignItems = assign({
  items: ({ event }: { event: any }) => event.items || [],
});

const processItems = assign({
  results: ({ context }: { context: CommoditiesContext }) => {
    try {
      return processCommoditiesBatch(context.items);
    } catch (error) {
      console.error("[Commodities] Processing error:", error);
      return [];
    }
  },
});

const assignError = assign({
  errors: ({ context, event }: { context: CommoditiesContext; event: any }) => {
    const existingErrors = context.errors || [];
    return [...existingErrors, event.error];
  },
});

const logProgress = ({ context }: { context: CommoditiesContext }) => {
  console.log(
    "[V2 commodities] processed",
    context.results?.length || 0,
    "items",
  );
};

// ============================================================================
// Machine Definition
// ============================================================================

export const commoditiesMachine = setup({
  types: {
    context: {} as CommoditiesContext,
    events: {} as CommoditiesEvents,
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
  id: "commodities",
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
