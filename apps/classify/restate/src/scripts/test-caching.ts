/**
 * Test script to verify OpenAI prompt caching is working
 * Runs multiple identical LLM calls and checks for cached tokens
 */

import { createLLMClient, getLLMConfig } from "../llm/clients.ts";
import { z } from "zod";

const testSchema = z.object({
  indicator_type: z.string(),
  confidence: z.number(),
});

// Create a long system prompt (>1024 tokens to trigger caching)
const systemPrompt = `
You are an expert economic indicator classifier. Your task is to classify economic indicators into specific types.

INDICATOR TYPES:
1. Balance of Payments (BOP) - International transactions
2. Government Finance - Fiscal indicators
3. Monetary - Money supply, interest rates
4. Prices - Inflation, CPI, PPI
5. Production - Industrial output, manufacturing
6. Trade - Imports, exports, trade balance
7. Labor Market - Employment, unemployment, wages
8. National Accounts - GDP, GNI, consumption
9. Financial Markets - Stock prices, bond yields
10. External Debt - Foreign debt obligations

CLASSIFICATION RULES:
- Balance of Payments indicators track international transactions between residents and non-residents
- Government Finance indicators measure fiscal position, revenue, expenditure
- Monetary indicators track money supply, credit, interest rates
- Price indicators measure inflation, cost of living, producer prices
- Production indicators track output in various sectors
- Trade indicators measure cross-border goods and services flows
- Labor Market indicators track employment, wages, productivity
- National Accounts indicators measure economic activity, GDP components
- Financial Market indicators track asset prices, yields, returns
- External Debt indicators measure foreign currency obligations

EXAMPLES:
- "Current Account Balance" → Balance of Payments
- "Government Debt" → Government Finance
- "M2 Money Supply" → Monetary
- "Consumer Price Index" → Prices
- "Industrial Production" → Production
- "Exports of Goods" → Trade
- "Unemployment Rate" → Labor Market
- "GDP Growth Rate" → National Accounts
- "Stock Market Index" → Financial Markets
- "External Debt Outstanding" → External Debt

CONFIDENCE SCORING:
- 1.0: Perfect match, unambiguous
- 0.8-0.9: Strong match, very likely correct
- 0.6-0.7: Good match, probably correct
- 0.4-0.5: Weak match, uncertain
- 0.0-0.3: Very uncertain, multiple possibilities

Analyze the indicator name and classify it with a confidence score.
`.trim();

console.log("🧪 Testing OpenAI Prompt Caching\n");
console.log("=" + "=".repeat(50));

// Get OpenAI config
const llmConfig = getLLMConfig("test", "openai");
const llmClient = createLLMClient(llmConfig);

console.log(`\n📏 System prompt length: ${systemPrompt.length} characters (~${Math.ceil(systemPrompt.length / 4)} tokens)`);
console.log("   (Caching requires >1024 tokens)\n");

// Test indicators
const testIndicators = [
  "Current Account Balance",
  "Government Debt to GDP",
  "Consumer Price Index",
];

async function testCaching() {
  console.log("🔄 Running 3 identical calls to test caching:\n");

  for (let i = 0; i < 3; i++) {
    console.log(`Call ${i + 1}/3: ${testIndicators[i]}`);

    try {
      const result = await llmClient.generateObject({
        systemPrompt,
        userPrompt: `Classify this indicator: "${testIndicators[i]}"`,
        schema: testSchema,
      });

      console.log(`  ✅ Result: ${result.indicator_type} (confidence: ${result.confidence})`);
      console.log();
    } catch (error) {
      console.error(`  ❌ Error:`, error);
      console.log();
    }

    // Small delay between calls
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("=" + "=".repeat(50));
  console.log("\n📊 Expected behavior:");
  console.log("  Call 1: cachedTokens=0 (first call, nothing cached yet)");
  console.log("  Call 2: cachedTokens>0 (system prompt should be cached)");
  console.log("  Call 3: cachedTokens>0 (system prompt still cached)");
  console.log("\n💰 Cost savings with 75% cache discount:");
  console.log("  No cache: $0.40/M tokens");
  console.log("  With cache: $0.10/M cached + $0.40/M uncached");
  console.log("  Savings: 75% on cached portion of prompts");
  console.log("\n⚠️  If cachedTokens=0 on all calls, caching is NOT working!");
}

testCaching();