/**
 * Metals domain machine for V2 workflows
 *
 * Passes through metal units without normalization
 */

import { assign, setup } from "xstate";
import { processMetalsBatch } from "../../normalize/batch.ts";

// ============================================================================
// Types
// ============================================================================

interface MetalsContext {
  items: any[];
  results: any[];
  errors: any[];
}

type MetalsEvents =
  | { type: "PROCESS"; items: any[] }
  | { type: "ERROR"; error: any };

// ============================================================================
// Guards
// ============================================================================

const hasItems = ({ context }: { context: MetalsContext }) =>
  context.items && context.items.length > 0;

const hasErrors = ({ context }: { context: MetalsContext }) =>
  context.errors && context.errors.length > 0;

// ============================================================================
// Actions
// ============================================================================

const assignItems = assign({
  items: ({ event }: { event: any }) => event.items || [],
});

const processItems = assign({
  results: ({ context }: { context: MetalsContext }) => {
    try {
      return processMetalsBatch(context.items);
    } catch (error) {
      console.error("[Metals] Processing error:", error);
      return [];
    }
  },
});

const assignError = assign({
  errors: ({ context, event }: { context: MetalsContext; event: any }) => {
    const existingErrors = context.errors || [];
    return [...existingErrors, event.error];
  },
});

const logProgress = ({ context }: { context: MetalsContext }) => {
  console.log("[V2 metals] processed", context.results?.length || 0, "items");
};

// ============================================================================
// Machine Definition
// ============================================================================

export const metalsMachine = setup({
  types: {
    context: {} as MetalsContext,
    events: {} as MetalsEvents,
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
  id: "metals",
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
