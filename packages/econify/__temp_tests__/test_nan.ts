import { createPipeline } from "./src/workflows/economic-data-workflow.ts";
import type {
  ParsedData,
  PipelineConfig,
} from "./src/workflows/economic-data-workflow.ts";

const problematicData: ParsedData[] = [
  {
    value: NaN,
    unit: "USD",
    name: "Invalid Value",
  },
  {
    value: Infinity,
    unit: "EUR",
    name: "Infinite Value",
  },
];

const config: PipelineConfig = {
  minQualityScore: 50,
  validateSchema: true,
  requiredFields: ["value", "unit"],
  useLiveFX: false,
  engine: "v1", // Explicitly use V1
};

const pipeline = createPipeline(config);

console.log("Testing V1 pipeline with NaN and Infinity...");
const start = Date.now();

try {
  const result = await pipeline.run(problematicData);
  console.log("Success! Result:", result);
  console.log(`Completed in ${Date.now() - start}ms`);
} catch (error) {
  console.log(`Error after ${Date.now() - start}ms:`, error.message);
}
