/**
 * Cluster Classification Script
 * Distributes workload across all 3 Restate cluster nodes for 3x throughput
 *
 * Load Balancing Strategy:
 * - Round-robin distribution across nodes
 * - Each node gets equal share of batches
 * - Failures automatically retry on next node
 */

import { getDb } from "../db/client.ts";

interface SourceIndicator {
  id: string;
  name: string;
  units: string | null;
  long_name: string | null;
  source_name: string | null;
  periodicity: string | null;
  aggregation_method: string | null;
  scale: string | null;
  topic: string | null;
  category_group: string | null;
  dataset: string | null;
  currency_code: string | null;
  definition: string | null;
  sample_values: string | null;
}

interface SubmissionStats {
  node: string;
  submitted: number;
  failed: number;
  totalTime: number;
}

// Cluster node endpoints (shared-state Restate cluster)
const CLUSTER_NODES = [
  { name: "Node 1", url: "http://localhost:8080", adminUrl: "http://localhost:9070" },
  { name: "Node 2", url: "http://localhost:28080", adminUrl: "http://localhost:29070" },
  { name: "Node 3", url: "http://localhost:38080", adminUrl: "http://localhost:39070" },
];

async function submitBatch(
  nodeUrl: string,
  indicators: any[],
  llmProvider: string,
  timeout: number = 10000
): Promise<{ success: boolean; traceId?: string; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${nodeUrl}/classify-api/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        indicators,
        llm_provider: llmProvider,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const result = await response.json();
    return { success: true, traceId: result.trace_id };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      return { success: false, error: "Timeout" };
    }
    return { success: false, error: error.message };
  }
}

async function classifyWithCluster() {
  const args = process.argv.slice(2);
  const llmProvider = args.includes("--anthropic")
    ? "anthropic"
    : args.includes("--local")
    ? "local"
    : "openai";

  const rpmArg = args.find((arg) => arg.startsWith("--rpm="));
  const targetRPM = rpmArg ? parseInt(rpmArg.split("=")[1]) : 450; // 3x 150 RPM default

  const force = args.includes("--force");

  console.log("🚀 Cluster Classification Script");
  console.log("=================================\n");
  console.log(`Mode: ${force ? "Re-classify all" : "Classify unclassified only"}`);
  console.log(`LLM Provider: ${llmProvider}`);
  console.log(`Target RPM: ${targetRPM} (distributed across 3 nodes)`);
  console.log(`Per-Node RPM: ${Math.floor(targetRPM / 3)}\n`);

  // Fetch indicators
  console.log("🔍 Fetching indicators from database...");
  const db = getDb();

  let sourceIndicators: SourceIndicator[];

  if (force) {
    // Classify all indicators (ignore existing classifications)
    sourceIndicators = await db`
      SELECT
        id, name, units, long_name, source_name, periodicity,
        aggregation_method, scale, topic, category_group, dataset,
        currency_code, definition, sample_values
      FROM source_indicators
      ORDER BY created_at DESC
    ` as unknown as SourceIndicator[];
  } else {
    // Only classify indicators without existing classifications
    sourceIndicators = await db`
      SELECT
        si.id, si.name, si.units, si.long_name, si.source_name, si.periodicity,
        si.aggregation_method, si.scale, si.topic, si.category_group, si.dataset,
        si.currency_code, si.definition, si.sample_values
      FROM source_indicators si
      LEFT JOIN classifications c ON si.id = c.indicator_id
      WHERE c.indicator_id IS NULL
      ORDER BY si.created_at DESC
    ` as unknown as SourceIndicator[];
  }

  // Convert to indicator format
  const indicators = sourceIndicators.map(si => ({
    indicator_id: si.id,
    name: si.name,
    units: si.units,
    long_name: si.long_name,
    source_name: si.source_name,
    periodicity: si.periodicity,
    aggregation_method: si.aggregation_method,
    scale: si.scale,
    topic: si.topic,
    category_group: si.category_group,
    dataset: si.dataset,
    currency_code: si.currency_code,
  }));

  console.log(`✅ Found ${indicators.length} indicators to classify\n`);

  if (indicators.length === 0) {
    console.log("✅ No indicators to classify!");
    return;
  }

  // Show sample
  console.log("📋 Sample indicators:");
  for (let i = 0; i < Math.min(5, indicators.length); i++) {
    console.log(`   ${i + 1}. ${indicators[i].name} (${indicators[i].indicator_id})`);
  }
  if (indicators.length > 5) {
    console.log(`   ... and ${indicators.length - 5} more\n`);
  }

  // Calculate batching parameters
  const estimatedRequestsPerIndicator = 3;
  const targetIndicatorsPerMinute = targetRPM / estimatedRequestsPerIndicator;
  const batchSize = 5;
  const delayBetweenBatchesMs = Math.max(
    100,
    (batchSize / targetIndicatorsPerMinute) * 60000
  );
  const totalBatches = Math.ceil(indicators.length / batchSize);
  const estimatedTimeSeconds = (totalBatches * delayBetweenBatchesMs) / 1000;

  console.log("📊 Rate Limiting Configuration:");
  console.log(`   Target RPM: ${targetRPM} requests/minute (across cluster)`);
  console.log(`   Per-Node RPM: ~${Math.floor(targetRPM / 3)} requests/minute`);
  console.log(`   Est. Requests per Indicator: ${estimatedRequestsPerIndicator}`);
  console.log(`   Target Throughput: ${targetIndicatorsPerMinute.toFixed(1)} indicators/minute`);
  console.log(`   Batch Size: ${batchSize} indicators`);
  console.log(`   Delay Between Batches: ${delayBetweenBatchesMs}ms`);
  console.log(`   Estimated Total Time: ${Math.floor(estimatedTimeSeconds / 60)}m ${Math.floor(estimatedTimeSeconds % 60)}s\n`);

  // Check cluster health
  console.log("🏥 Checking cluster health...");
  const healthChecks = await Promise.all(
    CLUSTER_NODES.map(async (node) => {
      try {
        const response = await fetch(`${node.url}/classify-api/health`, {
          signal: AbortSignal.timeout(2000),
        });
        return { node: node.name, healthy: response.ok };
      } catch {
        return { node: node.name, healthy: false };
      }
    })
  );

  const healthyNodes = healthChecks.filter((h) => h.healthy);
  console.log(`   Healthy nodes: ${healthyNodes.length}/3`);
  healthChecks.forEach((h) => {
    const icon = h.healthy ? "✅" : "❌";
    console.log(`   ${icon} ${h.node}`);
  });

  if (healthyNodes.length === 0) {
    console.error("\n❌ No healthy nodes found!");
    console.log("💡 Start the cluster with: bun run cluster:start");
    console.log("💡 Then register services: bun run dev");
    process.exit(1);
  }

  // Use only healthy nodes for load balancing
  const activeNodes = CLUSTER_NODES.filter((node) =>
    healthyNodes.some((h) => h.node === node.name)
  );

  if (healthyNodes.length < 3) {
    console.log(`\n⚠️  Warning: Only ${healthyNodes.length} node(s) healthy. Load balancing across available nodes...\n`);
  } else {
    console.log("   ✅ All nodes healthy!\n");
  }

  console.log(`📤 Starting cluster classification...\n`);

  const nodeStats = new Map<string, SubmissionStats>();
  CLUSTER_NODES.forEach((node) => {
    nodeStats.set(node.url, {
      node: node.name,
      submitted: 0,
      failed: 0,
      totalTime: 0,
    });
  });

  let currentNodeIndex = 0;
  let totalSubmitted = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  for (let i = 0; i < totalBatches; i++) {
    const batchStart = i * batchSize;
    const batchEnd = Math.min(batchStart + batchSize, indicators.length);
    const batch = indicators.slice(batchStart, batchEnd);

    // Round-robin to next healthy node
    let attempts = 0;
    let success = false;

    while (!success && attempts < activeNodes.length) {
      const node = activeNodes[currentNodeIndex];
      currentNodeIndex = (currentNodeIndex + 1) % activeNodes.length;

      const batchStartTime = Date.now();
      const result = await submitBatch(node.url, batch, llmProvider, 10000);
      const batchTime = Date.now() - batchStartTime;

      const stats = nodeStats.get(node.url)!;
      stats.totalTime += batchTime;

      if (result.success) {
        stats.submitted += batch.length;
        totalSubmitted += batch.length;
        console.log(
          `   ✅ Batch ${i + 1}/${totalBatches} → ${node.name}: ${batch.length} indicators (trace: ${result.traceId?.substring(0, 8)}...)`
        );
        success = true;
      } else {
        stats.failed += batch.length;
        totalFailed += batch.length;
        console.log(
          `   ⚠️  Batch ${i + 1}/${totalBatches} → ${node.name}: FAILED (${result.error})`
        );
        attempts++;
      }
    }

    if (!success) {
      console.log(`   ❌ Batch ${i + 1}/${totalBatches}: Failed on all nodes, skipping...`);
    }

    // Progress report every 50 batches
    if ((i + 1) % 50 === 0 || i === totalBatches - 1) {
      const elapsed = (Date.now() - startTime) / 1000;
      const throughput = (totalSubmitted / elapsed) * 60;
      const remaining = indicators.length - totalSubmitted;
      const eta = remaining / (throughput / 60);

      console.log(`\n📊 Progress: ${totalSubmitted}/${indicators.length} indicators (${((totalSubmitted / indicators.length) * 100).toFixed(1)}%)`);
      console.log(`⏱️  Elapsed: ${Math.floor(elapsed)}s | ETA: ${Math.floor(eta / 60)}m ${Math.floor(eta % 60)}s`);
      console.log(`🚀 Throughput: ${throughput.toFixed(1)} indicators/min (target: ${targetIndicatorsPerMinute.toFixed(1)} ind/min)`);
      console.log(`📡 Est. API Requests: ${totalSubmitted * estimatedRequestsPerIndicator}/${indicators.length * estimatedRequestsPerIndicator} (${estimatedRequestsPerIndicator} per indicator)\n`);
    }

    // Wait before next batch (except for last batch)
    if (i < totalBatches - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatchesMs));
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;

  console.log("\n✅ Classification Complete!\n");
  console.log("📊 Final Statistics:");
  console.log("===================");
  console.log(`   Total Submitted: ${totalSubmitted}/${indicators.length}`);
  console.log(`   Total Failed: ${totalFailed}`);
  console.log(`   Total Time: ${Math.floor(totalTime / 60)}m ${Math.floor(totalTime % 60)}s`);
  console.log(`   Avg Throughput: ${((totalSubmitted / totalTime) * 60).toFixed(1)} indicators/min\n`);

  console.log("📊 Per-Node Statistics:");
  console.log("======================");
  for (const [url, stats] of nodeStats.entries()) {
    const avgTime = stats.submitted > 0 ? stats.totalTime / (stats.submitted / batchSize) : 0;
    console.log(`   ${stats.node}:`);
    console.log(`     - Submitted: ${stats.submitted} indicators`);
    console.log(`     - Failed: ${stats.failed} indicators`);
    console.log(`     - Avg Batch Time: ${avgTime.toFixed(0)}ms`);
  }

  console.log("\n💡 Next Steps:");
  console.log("   - Check queue status: bun run queue");
  console.log("   - View cluster logs: bun run cluster:logs");
  console.log("   - Monitor Admin UI: http://localhost:9070");
}

classifyWithCluster().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
