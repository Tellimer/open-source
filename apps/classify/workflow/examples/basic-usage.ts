/**
 * Basic usage example for the classify workflow
 *
 * This example shows how to trigger classification for a batch of indicators
 */

// Example: Classify indicators via HTTP API
const indicators = [
  {
    indicator_id: "gdp-growth-1",
    name: "GDP Annual Growth Rate",
    units: "Percent",
    description: "Annual percentage change in GDP",
    periodicity: "Annual",
    sample_values: [
      { date: "2023-12-31", value: 2.5 },
      { date: "2022-12-31", value: 3.1 },
      { date: "2021-12-31", value: -2.3 },
    ],
  },
  {
    indicator_id: "inflation-1",
    name: "Inflation Rate",
    units: "%",
    description: "Consumer price inflation year-over-year",
    periodicity: "Monthly",
    sample_values: [
      { date: "2024-01-31", value: 3.2 },
      { date: "2023-12-31", value: 3.4 },
      { date: "2023-11-30", value: 3.1 },
    ],
  },
  {
    indicator_id: "gdp-usd-1",
    name: "GDP",
    units: "USD Billion",
    description: "Gross Domestic Product in current USD",
    periodicity: "Annual",
    sample_values: [
      { date: "2023-12-31", value: 25500 },
      { date: "2022-12-31", value: 25000 },
      { date: "2021-12-31", value: 23300 },
    ],
  },
];

async function classifyIndicators() {
  const response = await fetch("http://localhost:3000/classify/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ indicators }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  console.log("Classification started:", result);
  console.log(`Trace ID: ${result.trace_id}`);
  console.log(`Processing ${result.count} indicators...`);
}

if (import.meta.main) {
  console.log("🚀 Starting classification workflow example\n");
  classifyIndicators()
    .then(() => {
      console.log("\n✅ Request sent successfully!");
      console.log("Check Motia logs and state for classification results.");
    })
    .catch((error) => {
      console.error("\n❌ Error:", error.message);
      Deno.exit(1);
    });
}
