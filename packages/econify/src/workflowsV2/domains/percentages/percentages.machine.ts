/**
 * Percentages domain machine for V2 workflows
 *
 * Validates and passes through percentage values unchanged
 */

import { assign, setup } from "xstate";
import { processPercentagesBatch } from "../../normalize/batch.ts";

// ============================================================================
// Types
// ============================================================================

interface PercentagesContext {
  items: any[];
  results: any[];
  errors: any[];
}

type PercentagesEvents =
  | { type: "PROCESS"; items: any[] }
  | { type: "ERROR"; error: any };

// ============================================================================
// Guards
// ============================================================================

const hasItems = ({ context }: { context: PercentagesContext }) =>
  context.items && context.items.length > 0;

const hasErrors = ({ context }: { context: PercentagesContext }) =>
  context.errors && context.errors.length > 0;

// ============================================================================
// Actions
// ============================================================================

const assignItems = assign({
  items: ({ event }: { event: any }) => event.items || [],
});

const processItems = assign({
  results: ({ context }: { context: PercentagesContext }) => {
    try {
      return processPercentagesBatch(context.items);
    } catch (error) {
      console.error("[Percentages] Processing error:", error);
      return [];
    }
  },
});

const assignError = assign({
  errors: ({ context, event }: { context: PercentagesContext; event: any }) => {
    const existingErrors = context.errors || [];
    return [...existingErrors, event.error];
  },
});

const logProgress = ({ context }: { context: PercentagesContext }) => {
  console.log(
    "[V2 percentages] processed",
    context.results?.length || 0,
    "items",
  );
};

// ============================================================================
// Machine Definition
// ============================================================================

export const percentagesMachine = setup({
  types: {
    context: {} as PercentagesContext,
    events: {} as PercentagesEvents,
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
  id: "percentages",
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
