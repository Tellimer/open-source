/**
 * Counts domain machine for V2 workflows
 *
 * Normalizes count-based indicators to "ones" unit
 */

import { assign, setup } from "xstate";
import { processCountsBatch } from "../../normalize/batch.ts";

// ============================================================================
// Types
// ============================================================================

interface CountsContext {
  items: any[];
  results: any[];
  errors: any[];
}

type CountsEvents =
  | { type: "PROCESS"; items: any[] }
  | { type: "ERROR"; error: any };

// ============================================================================
// Guards
// ============================================================================

const hasItems = ({ context }: { context: CountsContext }) =>
  context.items && context.items.length > 0;

const hasErrors = ({ context }: { context: CountsContext }) =>
  context.errors && context.errors.length > 0;

// ============================================================================
// Actions
// ============================================================================

const assignItems = assign({
  items: ({ event }: { event: any }) => event.items || [],
});

const processItems = assign({
  results: ({ context }: { context: CountsContext }) => {
    try {
      return processCountsBatch(context.items);
    } catch (error) {
      console.error("[Counts] Processing error:", error);
      return [];
    }
  },
});

const assignError = assign({
  errors: ({ context, event }: { context: CountsContext; event: any }) => {
    const existingErrors = context.errors || [];
    return [...existingErrors, event.error];
  },
});

const logProgress = ({ context }: { context: CountsContext }) => {
  console.log("[V2 counts] processed", context.results?.length || 0, "items");
};

// ============================================================================
// Machine Definition
// ============================================================================

export const countsMachine = setup({
  types: {
    context: {} as CountsContext,
    events: {} as CountsEvents,
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
  id: "counts",
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
      output: ({ context }) => ({ items: context.results }),
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
  output: ({ context }) => ({ items: context.results }),
});
