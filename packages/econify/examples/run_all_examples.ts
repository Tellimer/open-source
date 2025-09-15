#!/usr/bin/env deno run -A

/**
 * Run all Econify examples
 *
 * This script runs all examples in sequence to verify they work correctly.
 * Useful for testing after updates or for demonstration purposes.
 */

const examples = [
  {
    name: "Quickstart",
    file: "quickstart.ts",
    description: "Basic API usage with currency conversion",
  },
  {
    name: "Simple Consumer",
    file: "simple_consumer.ts",
    description: "Real-world integration patterns",
  },
  {
    name: "Exemptions System",
    file: "exemptions_example.ts",
    description: "Skip normalization for specific indicators",
  },
  {
    name: "Wages Processing",
    file: "wages_processing_example.ts",
    description: "Automatic wages detection and processing",
  },
  {
    name: "Time Resampling",
    file: "time_resampling_example.ts",
    description: "Standardize mixed time periods",
  },
  {
    name: "Advanced Usage",
    file: "advanced_usage.ts",
    description: "Comprehensive feature demonstration",
  },
  {
    name: "Time Sampling Advanced",
    file: "time_sampling_advanced.ts",
    description: "Advanced time conversion techniques",
  },
];

console.log("🚀 Running All Econify Examples");
console.log("=".repeat(50));
console.log();

let successCount = 0;
let failureCount = 0;

for (const [index, example] of examples.entries()) {
  const exampleNumber = index + 1;
  console.log(
    `📊 Example ${exampleNumber}/${examples.length}: ${example.name}`,
  );
  console.log(`📝 ${example.description}`);
  console.log(`🔧 Running: ${example.file}`);
  console.log("-".repeat(40));

  try {
    const startTime = performance.now();

    // Import and run the example
    const module = await import(`./${example.file}`);

    // If the module has a main function, call it
    if (typeof module.main === "function") {
      await module.main();
    }

    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    console.log(`✅ Success! (${duration}ms)`);
    successCount++;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    failureCount++;
  }

  console.log();

  // Add a small delay between examples for readability
  if (index < examples.length - 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

console.log("=".repeat(50));
console.log("📊 Summary:");
console.log(`✅ Successful: ${successCount}/${examples.length}`);
console.log(`❌ Failed: ${failureCount}/${examples.length}`);

if (failureCount === 0) {
  console.log("🎉 All examples ran successfully!");
} else {
  console.log("⚠️  Some examples failed. Check the output above for details.");
  Deno.exit(1);
}
