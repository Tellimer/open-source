/**
 * Agriculture domain machine for V2 workflows
 *
 * Passes through agriculture units without normalization
 */

import { assign, setup } from "xstate";
import { processAgricultureBatch } from "../../normalize/batch.ts";

// ============================================================================
// Types
// ============================================================================

interface AgricultureContext {
  items: any[];
  results: any[];
  errors: any[];
}

type AgricultureEvents =
  | { type: "PROCESS"; items: any[] }
  | { type: "ERROR"; error: any };

// ============================================================================
// Guards
// ============================================================================

const hasItems = ({ context }: { context: AgricultureContext }) =>
  context.items && context.items.length > 0;

const hasErrors = ({ context }: { context: AgricultureContext }) =>
  context.errors && context.errors.length > 0;

// ============================================================================
// Actions
// ============================================================================

const assignItems = assign({
  items: ({ event }: { event: any }) => event.items || [],
});

const processItems = assign({
  results: ({ context }: { context: AgricultureContext }) => {
    try {
      return processAgricultureBatch(context.items);
    } catch (error) {
      console.error("[Agriculture] Processing error:", error);
      return [];
    }
  },
});

const assignError = assign({
  errors: ({ context, event }: { context: AgricultureContext; event: any }) => {
    const existingErrors = context.errors || [];
    return [...existingErrors, event.error];
  },
});

const logProgress = ({ context }: { context: AgricultureContext }) => {
  console.log(
    "[V2 agriculture] processed",
    context.results?.length || 0,
    "items",
  );
};

// ============================================================================
// Machine Definition
// ============================================================================

export const agricultureMachine = setup({
  types: {
    context: {} as AgricultureContext,
    events: {} as AgricultureEvents,
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
  id: "agriculture",
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
