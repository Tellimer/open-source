import { assign, fromPromise, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../../shared/types.ts";
import { parseUnit } from "../../../units/units.ts";
import { inferUnit } from "../../../inference/inference.ts";

interface ParsingInput {
  config: {
    inferUnits?: boolean;
  } & Record<string, unknown>;
  validatedData: ParsedData[];
}

interface ParsingOutput {
  parsedData: ParsedData[];
  warnings: string[];
}

type ParsingContext = ParsingInput & {
  parsedData?: ParsedData[];
  warnings: string[];
};

export const parsingMachine = setup({
  types: {
    context: {} as ParsingContext,
    input: {} as ParsingInput,
  },
  actors: {
    parseUnits: fromPromise(async ({ input }: { input: ParsingContext }) => {
      const { validatedData, config } = input;
      const parsed: ParsedData[] = [];
      const warnings: string[] = [];

      for (const item of validatedData) {
        // Coerce numeric strings to numbers to avoid skipping normalization
        const coercedValue = (typeof item.value === "string")
          ? Number(item.value)
          : item.value;

        // Skip items with invalid numeric values
        if (typeof coercedValue !== "number" || isNaN(coercedValue)) {
          warnings.push(`Skipping item with invalid value: ${item.value}`);
          continue;
        }

        let unit = item.unit;
        let inferredUnit: string | undefined;

        // Unit inference if enabled and needed
        if (config.inferUnits && (!unit || unit === "unknown" || unit === "")) {
          const inferred = inferUnit(coercedValue, {
            text: item.description,
            indicatorName: item.name,
            context: item.context,
          });

          if (inferred.confidence > 0.7) {
            unit = inferred.unit;
            inferredUnit = unit;
            console.log(
              `[V2 parsing] Inferred unit "${unit}" for "${item.name}" (confidence: ${inferred.confidence})`,
            );
          } else if (!unit || unit === "unknown" || unit === "") {
            warnings.push(
              `Could not infer unit for "${item.name}" (confidence: ${inferred.confidence})`,
            );
          }
        }

        // Parse the unit
        const parsedUnit = parseUnit(unit || "");

        // Create parsed data item
        const parsedItem: ParsedData = {
          ...item,
          value: coercedValue,
          unit: unit || "",
          parsedUnit,
          inferredUnit,
        };

        parsed.push(parsedItem);
      }

      console.log(
        `[V2 parsing] Parsed ${parsed.length}/${validatedData.length} items with ${warnings.length} warnings`,
      );

      return {
        parsedData: parsed,
        warnings,
      };
    }),
  },
}).createMachine({
  id: "parsingV2",
  context: ({ input }) => ({
    ...input,
    warnings: [],
  }),
  initial: "parsing",
  states: {
    parsing: {
      invoke: {
        src: "parseUnits",
        input: ({ context }) => context,
        onDone: {
          target: "done",
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
        },
      },
    },
    error: {
      type: "final",
    },
    done: {
      type: "final",
      output: ({ context }) => ({
        parsedData: context.parsedData || [],
        warnings: context.warnings,
      } as ParsingOutput),
    },
  },
  output: ({ context }) => ({
    parsedData: context.parsedData || [],
    warnings: context.warnings,
  } as ParsingOutput),
});
