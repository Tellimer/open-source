/**
 * Indices domain machine for V2 workflows
 *
 * Passes through index values with metadata annotation
 */

import { assign, setup } from "xstate";
import { processIndicesBatch } from "../../normalize/batch.ts";

// ============================================================================
// Types
// ============================================================================

interface IndicesContext {
  items: any[];
  results: any[];
  errors: any[];
}

type IndicesEvents =
  | { type: "PROCESS"; items: any[] }
  | { type: "ERROR"; error: any };

// ============================================================================
// Guards
// ============================================================================

const hasItems = ({ context }: { context: IndicesContext }) =>
  context.items && context.items.length > 0;

const hasErrors = ({ context }: { context: IndicesContext }) =>
  context.errors && context.errors.length > 0;

// ============================================================================
// Actions
// ============================================================================

const assignItems = assign({
  items: ({ event }: { event: any }) => event.items || [],
});

const processItems = assign({
  results: ({ context }: { context: IndicesContext }) => {
    try {
      return processIndicesBatch(context.items);
    } catch (error) {
      console.error("[Indices] Processing error:", error);
      return [];
    }
  },
});

const assignError = assign({
  errors: ({ context, event }: { context: IndicesContext; event: any }) => {
    const existingErrors = context.errors || [];
    return [...existingErrors, event.error];
  },
});

const logProgress = ({ context }: { context: IndicesContext }) => {
  console.log("[V2 indices] processed", context.results?.length || 0, "items");
};

// ============================================================================
// Machine Definition
// ============================================================================

export const indicesMachine = setup({
  types: {
    context: {} as IndicesContext,
    events: {} as IndicesEvents,
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
  id: "indices",
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
