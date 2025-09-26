import { assign, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../shared/types.ts";
import {
  parsingMachine,
  qualityMachine,
  validationMachine,
} from "../machines/index.ts";
import { classifyMachine } from "../classify/classify.machine.ts";
import { normalizeRouterMachine } from "../normalize/normalize_router.machine.ts";

interface PipelineInput {
  config: unknown;
  rawData: ParsedData[];
}

interface PipelineOutput {
  normalizedData: ParsedData[];
  warnings: string[];
}

type PipelineContext = PipelineInput & {
  validatedData?: ParsedData[];
  parsedData?: ParsedData[];
  qualityScore?: number;
  qualityReport?: unknown;
  warnings: string[];
  classifyOutput?: any;
  normalizedOutput?: any;
};

export const pipelineV2Machine = setup({
  types: {
    context: {} as PipelineContext,
    input: {} as PipelineInput,
  },
  actors: {
    validate: validationMachine,
    parse: parsingMachine,
    quality: qualityMachine,
    classify: classifyMachine,
    normalizeRouter: normalizeRouterMachine,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcCWywBtUDswDUAmAOgDcBDbCcgFzAGIIB7PY3UpgazGLQ2zxEylVNToJ2TAMa1ULANoAGALpLliFE1ioacnBpAAPRIUIBGYgHYAnADYAHPYDMha9bOXL9gDQgAnoiWZtbEACyWtgCs0baE9opO9rYAvsm+fFi4BCQUVLQMYABOhUyFvJi0AGalALa86JmCOSJiYBI4HDK6CipqBshaOnoGxgimFjYOzq7unj7+iPYWkYqrCW7mhEH2qekNAtm85IWwDMysktz1-FlCyMen7Z2yPaoq-YPd+khGiJGhkWIDkskTMZkIii8q3mAQQlicTishCioVsims0Ws9msuxAGQOdweBWKpXKVVq10ah3uJzaki6ejUfR+A20XxGfwBQPsILBEKhihhJlWVhWq0ITnRTlCyJ2aTx+1uJAAjgBXEQ0PyMFg8S48fFK4hqjV+J7SF44JnvFmfYY-UZJEhOayKWxODzw2zWSy+WGRN3EQihNz2ULBZGxXEGppG9XYTX0IolMrICo0aqFOrRw7G+Om+kWq3qG1su2gB2xYjO13uzxOL0+hZwyyKKwJMyu0LhV0RKOKmOVQzai4dLj6-uHQdmhmvZmaUssDkIMH+quhJyecKESLu-2+v6eMJuLGWGVeszhPs3AdDpOk1PkzOUgkkKcFr5Fj4L77lxAr2xrhup6WNuu62PuCAuK2axrLEUSREsV5UkIUgVLA2iVFq5y6qOVzZihaEYfmo4zpavTWvOQyLvaf4AoCsQrC4jgIpEdgQaxEximYtjBHRwRIS+xCoeQ6GoJhiYkimaYZlmE4ESJRHToW5HFpR7I0cudFAtuCRxM4TiseBTbriEQbHti651v6AmGjgtQiAAXmcOpsLh47XocdmZo5dIkcpbyqXitrUb+y6hoiEK1gZthetYoQQWigLHm4iQYjKNkxl5NQ+RJyZkumFL4SQWU+UpH4qV+VE-r8YXroG7bwv6sXxU20T2Eex4gWiWI4ridkQHA-RyYQlXqaFAC0RmwpNxAwXNMEXhlhy5KI+SjWWNUyhBLaIgCkpYuC-ysZYS2ErS60hTVG4hP6ZkXksF52FNgQeG27rOlE3rYk4p0qnGOiwmpG2jA4IReIdCEeEGrHbe6xAYvtZj2FsKMpPKRXEIOF3VaMHbgvDwItu4krBE47E8WEESRDMQYsXKewefJomYdjS7goewL-FDiihM47EgkitgAvB4UAr9xAldgTmsxp3FgsQO7gjypjuJChDsdi8MRG69jU26kzi3ehQy6F-IkOFXjhDytgghB66IkEXZK2CdjuuL2EmzVZvEBboZeBEttNnBlNROinpC2jqRAA */
  id: "pipelineV2",
  context: ({ input }) => ({
    ...input,
    warnings: [],
    classifyOutput: null as any,
  }),
  initial: "validate",
  states: {
    validate: {
      invoke: {
        src: "validate",
        input: ({ context }) => ({
          config: context.config as any,
          rawData: context.rawData,
        }),
        onDone: {
          target: "parse",
          actions: assign({
            validatedData: ({ event }) => (event as any).output.validatedData,
            warnings: ({ context, event }) => [
              ...context.warnings,
              ...(event as any).output.warnings,
            ],
          }),
        },
        onError: {
          target: "error",
          actions: ({ event }: { event: any }) => {
            console.error("[Pipeline] Stage error:", (event as any).error);
          },
        },
      },
    },
    parse: {
      invoke: {
        src: "parse",
        input: ({ context }) => ({
          config: context.config as any,
          validatedData: context.validatedData || [],
        }),
        onDone: {
          target: "quality",
          actions: assign({
            parsedData: ({ event }) => (event as any).output.parsedData,
            warnings: ({ context, event }) => [
              ...context.warnings,
              ...(event as any).output.warnings,
            ],
          }),
        },
        onError: {
          target: "error",
          actions: ({ event }: { event: any }) => {
            console.error("[Pipeline] Stage error:", (event as any).error);
          },
        },
      },
    },
    quality: {
      invoke: {
        src: "quality",
        input: ({ context }) => ({
          config: context.config as any,
          parsedData: context.parsedData || [],
        }),
        onDone: {
          target: "classify",
          actions: assign({
            qualityScore: ({ event }) => (event as any).output.qualityScore,
            qualityReport: ({ event }) => (event as any).output.qualityReport,
            warnings: ({ context, event }) => [
              ...context.warnings,
              ...(event as any).output.warnings,
            ],
          }),
        },
        onError: {
          target: "error",
          actions: ({ event }: { event: any }) => {
            console.error("[Pipeline] Stage error:", (event as any).error);
          },
        },
      },
    },

    classify: {
      invoke: {
        src: "classify",
        input: ({ context }) => ({
          config: context.config as any,
          parsedData: context.parsedData || [],
        }),
        onDone: {
          target: "normalize",
          actions: assign({
            classifyOutput: ({ event }) => (event as any).output,
          }),
        },
        onError: {
          target: "error",
          actions: ({ event }: { event: any }) => {
            console.error("[Pipeline] Stage error:", (event as any).error);
          },
        },
      },
    },
    normalize: {
      invoke: {
        src: "normalizeRouter", // Enhanced router: FX from config, parallel processing
        input: ({ context }) => {
          const cls = (context as any).classifyOutput ??
            { exempted: [], nonExempted: [], buckets: {} };
          return {
            config: context.config as any,
            buckets: cls.buckets,
            exempted: cls.exempted,
            nonExempted: cls.nonExempted,
            processed: {},
          };
        },
        onDone: {
          target: "done",
          actions: assign({
            normalizedOutput: ({ event }) => {
              const output = (event as any).output;
              // Router returns { items, exempted }, use items directly
              return {
                data: output.items || [],
              };
            },
          }),
        },
        onError: {
          target: "error",
          actions: ({ event }: { event: any }) => {
            console.error("[Pipeline] Stage error:", (event as any).error);
          },
        },
      },
    },
    error: {
      type: "final",
    },
    done: {
      type: "final",
      output: ({ context }) => {
        const data = (context as any).normalizedOutput?.data || [];
        return {
          normalizedData: data,
          data,
          warnings: context.warnings,
        } as any;
      },
    },
  },
  output: ({ context }) => {
    const data = (context as any).normalizedOutput?.data || [];
    return {
      normalizedData: data,
      data,
      warnings: context.warnings,
    } as any;
  },
});
