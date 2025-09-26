import { assign, fromPromise, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../../shared/types.ts";
import { assessDataQuality } from "../../../quality/quality.ts";

interface QualityInput {
  config: {
    minQualityScore?: number;
  } & Record<string, unknown>;
  parsedData: ParsedData[];
}

interface QualityOutput {
  qualityScore: number;
  qualityReport: any;
  warnings: string[];
}

type QualityContext = QualityInput & {
  qualityScore?: number;
  qualityReport?: any;
  warnings: string[];
};

export const qualityMachine = setup({
  types: {
    context: {} as QualityContext,
    input: {} as QualityInput,
  },
  actors: {
    assessQuality: fromPromise(async ({ input }: { input: QualityContext }) => {
      const { parsedData, config } = input;
      const warnings: string[] = [];

      if (!parsedData || parsedData.length === 0) {
        throw new Error("No parsed data available for quality assessment");
      }

      // Assess data quality
      const qualityReport = assessDataQuality(parsedData, {
        checkOutliers: true,
        checkConsistency: true,
        checkCompleteness: true,
      });

      const qualityScore = qualityReport.overall;
      const minScore = config.minQualityScore || 70;

      // Generate warnings based on quality issues
      if (qualityScore < minScore) {
        warnings.push(
          `Quality score ${qualityScore} below threshold ${minScore}`,
        );
      }

      if (qualityReport.issues && qualityReport.issues.length > 0) {
        qualityReport.issues.forEach((issue: any) => {
          warnings.push(`Quality issue: ${issue.type} - ${issue.message}`);
        });
      }

      console.log(
        `[V2 quality] Assessed ${parsedData.length} items, score: ${qualityScore}/100`,
      );

      return {
        qualityScore,
        qualityReport,
        warnings,
      };
    }),
  },
  guards: {
    qualityPassed: ({ context }) => {
      const threshold = (context.config.minQualityScore as number) || 70;
      const score = context.qualityScore || 0;
      return score >= threshold;
    },
  },
}).createMachine({
  id: "qualityV2",
  context: ({ input }) => ({
    ...input,
    warnings: [],
  }),
  initial: "assessing",
  states: {
    assessing: {
      invoke: {
        src: "assessQuality",
        input: ({ context }) => context,
        onDone: {
          target: "review",
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
        },
      },
    },
    review: {
      always: [
        {
          guard: "qualityPassed",
          target: "passed",
        },
        {
          target: "failed",
        },
      ],
    },
    passed: {
      type: "final",
      output: ({ context }) => ({
        qualityScore: context.qualityScore || 0,
        qualityReport: context.qualityReport,
        warnings: context.warnings,
      } as QualityOutput),
    },
    failed: {
      type: "final",
      output: ({ context }) => ({
        qualityScore: context.qualityScore || 0,
        qualityReport: context.qualityReport,
        warnings: context.warnings,
      } as QualityOutput),
    },
    error: {
      type: "final",
    },
  },
  output: ({ context }) => ({
    qualityScore: context.qualityScore || 0,
    qualityReport: context.qualityReport,
    warnings: context.warnings,
  } as QualityOutput),
});
