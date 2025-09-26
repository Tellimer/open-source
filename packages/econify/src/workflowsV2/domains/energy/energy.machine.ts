/**
 * Energy domain machine for V2 workflows
 *
 * Passes through energy units without normalization
 */

import { assign, setup } from "xstate";
import { processEnergyBatch } from "../../normalize/batch.ts";

// ============================================================================
// Types
// ============================================================================

interface EnergyContext {
  items: any[];
  results: any[];
  errors: any[];
}

type EnergyEvents =
  | { type: "PROCESS"; items: any[] }
  | { type: "ERROR"; error: any };

// ============================================================================
// Guards
// ============================================================================

const hasItems = ({ context }: { context: EnergyContext }) =>
  context.items && context.items.length > 0;

const hasErrors = ({ context }: { context: EnergyContext }) =>
  context.errors && context.errors.length > 0;

// ============================================================================
// Actions
// ============================================================================

const assignItems = assign({
  items: ({ event }: { event: any }) => event.items || [],
});

const processItems = assign({
  results: ({ context }: { context: EnergyContext }) => {
    try {
      return processEnergyBatch(context.items);
    } catch (error) {
      console.error("[Energy] Processing error:", error);
      return [];
    }
  },
});

const assignError = assign({
  errors: ({ context, event }: { context: EnergyContext; event: any }) => {
    const existingErrors = context.errors || [];
    return [...existingErrors, event.error];
  },
});

const logProgress = ({ context }: { context: EnergyContext }) => {
  console.log("[V2 energy] processed", context.results?.length || 0, "items");
};

// ============================================================================
// Machine Definition
// ============================================================================

export const energyMachine = setup({
  types: {
    context: {} as EnergyContext,
    events: {} as EnergyEvents,
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
  id: "energy",
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
