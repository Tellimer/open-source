/**
 * Example: Auto-target by indicator with explain.targetSelection
 */

import { processEconomicData } from "../src/main.ts";
import type { ParsedData } from "../src/main.ts";

export async function main() {
  const data: ParsedData[] = [
    { id: "AUS", value: 11027, unit: "USD Million", name: "Balance of Trade" },
    { id: "AUT", value: 365.1, unit: "EUR Million", name: "Balance of Trade" },
    {
      id: "AZE",
      value: 2445459.7,
      unit: "USD Thousand per quarter",
      name: "Balance of Trade",
    },
  ];

  const result = await processEconomicData(data, {
    autoTargetByIndicator: true,
    indicatorKey: "name",
    autoTargetDimensions: ["currency", "magnitude", "time"],
    minMajorityShare: 0.5,
    tieBreakers: {
      currency: "prefer-targetCurrency",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    targetCurrency: "USD",
    explain: true,
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { EUR: 0.8511 } },
  });

  console.log("\n🧪 Auto-target by indicator: targetSelection in explain\n");
  for (const item of result.data) {
    const unit = item.normalizedUnit || item.unit;
    console.log(
      `• ${item.id} ${item.name}: ${item.normalized ?? item.value} ${unit}`,
    );
    if (item.explain?.targetSelection) {
      console.log("   targetSelection:");
      console.log(`     mode: ${item.explain.targetSelection.mode}`);
      console.log(
        `     indicatorKey: ${item.explain.targetSelection.indicatorKey}`,
      );
      const sel = item.explain.targetSelection.selected;
      console.log(
        `     selected: currency=${sel?.currency ?? ""}, magnitude=${
          sel?.magnitude ?? ""
        }, time=${sel?.time ?? ""}`,
      );
      const reason = String(item.explain.targetSelection.reason || "");
      console.log(`     reason: ${reason}`);
    }
  }
}

if (import.meta.main) {
  await main();
}
