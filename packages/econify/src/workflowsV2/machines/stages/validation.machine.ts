import { assign, fromPromise, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../../shared/types.ts";

interface ValidationInput {
  config: {
    validateSchema?: boolean;
    requiredFields?: string[];
  } & Record<string, unknown>;
  rawData: ParsedData[];
}

interface ValidationOutput {
  validatedData: ParsedData[];
  warnings: string[];
}

type ValidationContext = ValidationInput & {
  validatedData?: ParsedData[];
  warnings: string[];
};

export const validationMachine = setup({
  types: {
    context: {} as ValidationContext,
    input: {} as ValidationInput,
  },
  actors: {
    validateData: fromPromise(
      async ({ input }: { input: ValidationContext }) => {
        const { rawData, config } = input;
        const warnings: string[] = [];

        // Basic data validation
        if (!rawData || rawData.length === 0) {
          throw new Error("No data provided for validation");
        }

        // Schema validation if enabled
        if (config.validateSchema && config.requiredFields) {
          const invalid = rawData.filter(
            (item) => !config.requiredFields!.every((field) => field in item),
          );
          if (invalid.length > 0) {
            throw new Error(
              `${invalid.length} records missing required fields: ${
                config.requiredFields.join(", ")
              }`,
            );
          }
        }

        // Data quality warnings
        const emptyValues = rawData.filter((item) =>
          item.value === null || item.value === undefined
        );
        if (emptyValues.length > 0) {
          warnings.push(`${emptyValues.length} records have empty values`);
        }

        const missingUnits = rawData.filter((item) =>
          !item.unit || item.unit === "" || item.unit === "unknown"
        );
        if (missingUnits.length > 0) {
          warnings.push(
            `${missingUnits.length} records have missing or unknown units`,
          );
        }

        // Validate numeric values
        const nonNumeric = rawData.filter((item) => {
          const val = typeof item.value === "string"
            ? Number(item.value)
            : item.value;
          return typeof val !== "number" || isNaN(val);
        });
        if (nonNumeric.length > 0) {
          warnings.push(`${nonNumeric.length} records have non-numeric values`);
        }

        console.log(
          `[V2 validation] Validated ${rawData.length} records with ${warnings.length} warnings`,
        );

        return {
          validatedData: rawData,
          warnings,
        };
      },
    ),
  },
}).createMachine({
  id: "validationV2",
  context: ({ input }) => ({
    ...input,
    warnings: [],
  }),
  initial: "validating",
  states: {
    validating: {
      invoke: {
        src: "validateData",
        input: ({ context }) => context,
        onDone: {
          target: "done",
          actions: assign({
            validatedData: ({ event }) => (event as any).output.validatedData,
            warnings: ({ event }) => (event as any).output.warnings,
          }),
        },
        // onError removed - let error bubble up to parent
      },
    },
    error: {
      type: "final",
    },
    done: {
      type: "final",
      output: ({ context }) => ({
        validatedData: context.validatedData || [],
        warnings: context.warnings,
      } as ValidationOutput),
    },
  },
  output: ({ context }) => ({
    validatedData: context.validatedData || [],
    warnings: context.warnings,
  } as ValidationOutput),
});
