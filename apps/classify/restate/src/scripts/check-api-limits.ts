/**
 * Check OpenAI API Rate Limits
 *
 * Makes a test request to OpenAI and displays your rate limits
 *
 * Usage:
 *   bun run src/scripts/check-api-limits.ts
 */

async function checkOpenAILimits() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY not set");
    process.exit(1);
  }

  console.log("🔍 Checking OpenAI API Rate Limits...\n");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
    });

    // Extract rate limit headers
    const headers = response.headers;

    const limitRequests = headers.get("x-ratelimit-limit-requests");
    const limitTokens = headers.get("x-ratelimit-limit-tokens");
    const remainingRequests = headers.get("x-ratelimit-remaining-requests");
    const remainingTokens = headers.get("x-ratelimit-remaining-tokens");
    const resetRequests = headers.get("x-ratelimit-reset-requests");
    const resetTokens = headers.get("x-ratelimit-reset-tokens");

    if (!limitRequests) {
      console.log("⚠️  Rate limit headers not found. Response:");
      console.log(`   Status: ${response.status}`);
      console.log(`   Headers:`, Object.fromEntries(headers.entries()));

      if (response.ok) {
        const body = await response.json();
        console.log(`   Body:`, body);
      } else {
        const errorText = await response.text();
        console.log(`   Error:`, errorText);
      }
      return;
    }

    // Determine tier based on RPM
    let tier = "Unknown";
    const rpm = parseInt(limitRequests);

    if (rpm <= 3) tier = "Free";
    else if (rpm <= 500) tier = "Tier 1";
    else if (rpm <= 5000) tier = "Tier 2";
    else if (rpm <= 10000) tier = "Tier 3";
    else if (rpm <= 30000) tier = "Tier 4";
    else tier = "Tier 5+";

    // Calculate safe rate for classify scripts
    const safeRpm = Math.floor(rpm * 0.6); // 60% of limit
    const fastRpm = Math.floor(rpm * 0.3); // 30% of limit
    const indicatorsPerMinSafe = Math.floor(safeRpm / 3);
    const indicatorsPerMinFast = Math.floor(fastRpm / 3);

    console.log("✅ OpenAI API Rate Limits");
    console.log("=========================\n");

    console.log(`📊 Your Tier: ${tier}`);
    console.log(`   Requests per Minute (RPM): ${limitRequests}`);
    console.log(`   Tokens per Minute (TPM): ${parseInt(limitTokens).toLocaleString()}`);
    console.log();

    console.log(`📈 Current Usage:`);
    console.log(`   Remaining Requests: ${remainingRequests}/${limitRequests}`);
    console.log(`   Remaining Tokens: ${parseInt(remainingTokens).toLocaleString()}/${parseInt(limitTokens).toLocaleString()}`);
    console.log(`   Resets in: ${resetRequests}`);
    console.log();

    console.log(`🚀 Recommended Settings for Classify Scripts:`);
    console.log(`   Safe Mode (30% utilization):`);
    console.log(`     RPM: ${fastRpm} → ${indicatorsPerMinFast} indicators/min`);
    console.log(`     Command: bun run classify:safe`);
    console.log();
    console.log(`   Fast Mode (60% utilization):`);
    console.log(`     RPM: ${safeRpm} → ${indicatorsPerMinSafe} indicators/min`);
    console.log(`     Command: bun run classify:fast`);
    console.log();

    if (rpm >= 500) {
      console.log(`   ✅ Your limits support classify:max (480 RPM)`);
      console.log(`      Command: bun run classify:max`);
    } else {
      console.log(`   ⚠️  classify:max (480 RPM) exceeds your limit (${rpm} RPM)`);
      console.log(`      Use classify:safe or classify:fast instead`);
    }

    console.log();
    console.log(`⏱️  Estimated Time for 10,903 indicators:`);
    console.log(`   Safe Mode: ${Math.ceil(10903 / indicatorsPerMinFast / 60)} hours`);
    console.log(`   Fast Mode: ${(10903 / indicatorsPerMinSafe / 60).toFixed(1)} hours`);

  } catch (error) {
    console.error("❌ Error checking rate limits:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  checkOpenAILimits();
}
