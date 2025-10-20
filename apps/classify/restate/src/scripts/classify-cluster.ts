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

interface TraefikService {
  name: string;
  loadBalancer?: {
    servers: Array<{ url: string }>;
  };
}

// Cluster node endpoints (shared-state Restate cluster)
const CLUSTER_NODES = [
  { name: "Node 1", url: "http://localhost:8080", adminUrl: "http://localhost:9070" },
  { name: "Node 2", url: "http://localhost:18080", adminUrl: "http://localhost:19070" },
  { name: "Node 3", url: "http://localhost:28080", adminUrl: "http://localhost:29070" },
  { name: "Node 4", url: "http://localhost:38080", adminUrl: "http://localhost:39070" },
  { name: "Node 5", url: "http://localhost:48080", adminUrl: "http://localhost:49070" },
];

/**
 * Detect number of services behind Traefik load balancer
 */
async function detectServiceCount(): Promise<number> {
  try {
    const response = await fetch("http://localhost:8081/api/http/services");
    if (!response.ok) return 5; // Default fallback

    const services = await response.json();

    // Traefik API returns an array of services
    // Find the "classify@docker" service and count its load balancer servers
    if (Array.isArray(services)) {
      const classifyService = services.find((s: TraefikService) =>
        s.name === 'classify@docker'
      );

      if (classifyService?.loadBalancer?.servers) {
        return classifyService.loadBalancer.servers.length;
      }
    }

    return 5; // Default fallback
  } catch (error) {
    return 5; // Default fallback on error
  }
}

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

  // Each indicator goes through 7 stages (normalize, time, cumulative, family, type, orientation, save)
  const estimatedRequestsPerIndicator = 7;

  // Support both --ipm (indicators per minute) and --rpm (requests per minute)
  const ipmArg = args.find((arg) => arg.startsWith("--ipm="));
  const rpmArg = args.find((arg) => arg.startsWith("--rpm="));

  let targetRPM: number;
  let targetIndicatorsPerMin: number;

  if (ipmArg) {
    // User specified indicators per minute - calculate RPM
    targetIndicatorsPerMin = parseInt(ipmArg.split("=")[1]);
    targetRPM = targetIndicatorsPerMin * estimatedRequestsPerIndicator;
  } else if (rpmArg) {
    // User specified RPM - calculate indicators per minute
    targetRPM = parseInt(rpmArg.split("=")[1]);
    targetIndicatorsPerMin = targetRPM / estimatedRequestsPerIndicator;
  } else {
    // Default: 450 indicators/min
    targetIndicatorsPerMin = 450;
    targetRPM = targetIndicatorsPerMin * estimatedRequestsPerIndicator;
  }

  const force = args.includes("--force");

  console.log("🚀 Cluster Classification Script");
  console.log("=================================\n");
  console.log(`Mode: ${force ? "Re-classify all" : "Classify unclassified only"}`);
  console.log(`LLM Provider: ${llmProvider}`);

  // Detect service count
  const serviceCount = await detectServiceCount();

  console.log(`\n📊 Cluster Configuration:`);
  console.log(`   Restate Nodes: ${CLUSTER_NODES.length}`);
  console.log(`   Classification Services: ${serviceCount} (behind Traefik)`);
  console.log(`   Load Balancer: Traefik (HTTP/2, round-robin)`);
  console.log(`\n🎯 Performance Targets:`);
  console.log(`   Target Throughput: ${Math.round(targetIndicatorsPerMin)} indicators/min`);
  console.log(`   API Rate: ${targetRPM} RPM (${estimatedRequestsPerIndicator} requests per indicator)`);
  console.log(`   Per-Node Load: ~${Math.floor(targetRPM / CLUSTER_NODES.length)} RPM, ~${Math.floor(targetIndicatorsPerMin / CLUSTER_NODES.length)} indicators/min\n`);

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
  const indicators = sourceIndicators.map(si => {
    // Parse sample_values from JSON string to array
    let parsedSampleValues = undefined;
    if (si.sample_values) {
      try {
        const fullSampleValues = JSON.parse(si.sample_values);

        // Limit sample values to most recent 50 points for efficiency
        // This is enough for cumulative pattern detection while minimizing payload size
        if (Array.isArray(fullSampleValues) && fullSampleValues.length > 50) {
          parsedSampleValues = fullSampleValues.slice(-50); // Take last 50 points (most recent)
        } else {
          parsedSampleValues = fullSampleValues;
        }
      } catch (error) {
        console.warn(`⚠️  Failed to parse sample_values for ${si.id}:`, error);
      }
    }

    return {
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
      sample_values: parsedSampleValues,
    };
  });

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
  const batchSize = 5;
  const delayBetweenBatchesMs = Math.max(
    100,
    (batchSize / targetIndicatorsPerMin) * 60000
  );
  const totalBatches = Math.ceil(indicators.length / batchSize);
  const estimatedTimeSeconds = (totalBatches * delayBetweenBatchesMs) / 1000;

  console.log("⚙️  Processing Configuration:");
  console.log(`   Total Indicators: ${indicators.length}`);
  console.log(`   Batch Size: ${batchSize} indicators`);
  console.log(`   Total Batches: ${totalBatches}`);
  console.log(`   Target Throughput: ${Math.round(targetIndicatorsPerMin)} indicators/min`);
  console.log(`   Delay Between Batches: ${Math.round(delayBetweenBatchesMs)}ms`);
  console.log(`   Estimated Total Time: ${Math.floor(estimatedTimeSeconds / 60)}m ${Math.floor(estimatedTimeSeconds % 60)}s\n`);

  // Use all configured nodes (health already verified by all-in-one script)
  console.log("🏥 Using cluster nodes:");
  CLUSTER_NODES.forEach((node) => {
    console.log(`   ✅ ${node.name} (${node.url})`);
  });
  console.log("");

  // Use all nodes for load balancing
  const activeNodes = CLUSTER_NODES;

  console.log(`🚀 Distributing workload across ${activeNodes.length} nodes → Traefik → ${serviceCount} services\n`);

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

      console.log(`\n${'='.repeat(70)}`);
      console.log(`📊 PROGRESS UPDATE - Batch ${i + 1}/${totalBatches}`);
      console.log(`${'='.repeat(70)}`);
      console.log(`📈 Indicators: ${totalSubmitted}/${indicators.length} (${((totalSubmitted / indicators.length) * 100).toFixed(1)}%) | Failed: ${totalFailed}`);
      console.log(`⏱️  Time: ${Math.floor(elapsed)}s elapsed | ETA: ${Math.floor(eta / 60)}m ${Math.floor(eta % 60)}s remaining`);
      console.log(`🚀 Throughput: ${throughput.toFixed(1)} indicators/min (target: ${Math.round(targetIndicatorsPerMin)})`);
      console.log(`📡 API Load: ~${Math.floor(throughput * estimatedRequestsPerIndicator)} RPM across cluster`);
      console.log(`🔄 Active: ${activeNodes.length} nodes → Traefik → ${serviceCount} services processing in parallel`);
      console.log(`${'='.repeat(70)}\n`);
    }

    // Wait before next batch (except for last batch)
    if (i < totalBatches - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatchesMs));
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;
  const avgThroughput = (totalSubmitted / totalTime) * 60;

  console.log("\n" + "=".repeat(70));
  console.log("✅ CLASSIFICATION COMPLETE!");
  console.log("=".repeat(70));
  console.log("\n📊 CLUSTER PERFORMANCE SUMMARY:");
  console.log(`   Architecture: ${activeNodes.length} Restate Nodes → Traefik → 5 Services`);
  console.log(`   Total Processed: ${totalSubmitted}/${indicators.length} indicators`);
  console.log(`   Failed: ${totalFailed}`);
  console.log(`   Success Rate: ${((totalSubmitted / (totalSubmitted + totalFailed)) * 100).toFixed(1)}%`);
  console.log(`   Total Time: ${Math.floor(totalTime / 60)}m ${Math.floor(totalTime % 60)}s`);
  console.log(`   Avg Throughput: ${avgThroughput.toFixed(1)} indicators/min`);
  console.log(`   Speedup vs Single Node: ~${(avgThroughput / 50).toFixed(1)}x\n`);

  console.log("📊 PER-NODE DISTRIBUTION:");
  for (const [url, stats] of nodeStats.entries()) {
    const avgTime = stats.submitted > 0 ? stats.totalTime / (stats.submitted / batchSize) : 0;
    const pct = ((stats.submitted / totalSubmitted) * 100).toFixed(1);
    console.log(`   ${stats.node}: ${stats.submitted} indicators (${pct}%) | Avg batch: ${avgTime.toFixed(0)}ms`);
  }

  console.log("\n💡 NEXT STEPS:");
  console.log("   - Check queue status: bun run queue");
  console.log("   - View cluster logs: bun run cluster:logs");
  console.log("   - Admin UI: http://localhost:9070");
  console.log("   - Stop cluster: docker-compose -f docker-compose.cluster.yml down");
}

classifyWithCluster().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
