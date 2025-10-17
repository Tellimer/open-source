/**
 * All-in-One Cluster Startup Script
 * Starts cluster, service, registers, and begins classification
 * Dynamically detects cluster size from docker-compose.cluster.yml
 *
 * Usage:
 *   bun run all-in-one --rpm=450
 *   bun run all-in-one --rpm=900 --force
 */

import { execSync, spawn } from 'child_process';
import { ChildProcess } from 'child_process';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';

interface ProcessHandle {
  name: string;
  process: ChildProcess;
}

const processes: ProcessHandle[] = [];

function cleanup() {
  console.log('\n🛑 Shutting down...');
  for (const handle of processes) {
    console.log(`   Stopping ${handle.name}...`);
    handle.process.kill('SIGTERM');
  }
  process.exit(0);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

function exec(command: string, description: string) {
  console.log(`   ${description}...`);
  try {
    execSync(command, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['inherit', 'pipe', 'pipe'],
    });
  } catch (error: any) {
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    throw error;
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForHealthCheck(url: string, maxAttempts: number = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return true;
    } catch {
      // Continue waiting
    }
    await sleep(1000);
  }
  return false;
}

function detectClusterSize(): { nodes: number; services: number } {
  try {
    const yaml = readFileSync('docker-compose.cluster.yml', 'utf8');
    const config: any = load(yaml);

    let nodeCount = 0;
    let serviceCount = 0;

    for (const [name, _] of Object.entries(config.services || {})) {
      if (name.startsWith('restate-') && name !== 'restate-data') {
        nodeCount++;
      } else if (name.startsWith('classify-service-')) {
        serviceCount++;
      }
    }

    return { nodes: nodeCount, services: serviceCount };
  } catch (error) {
    console.warn('⚠️  Could not detect cluster size, using defaults (5 nodes, 5 services)');
    return { nodes: 5, services: 5 };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const rpmArg = args.find(a => a.startsWith('--rpm='));
  const rpm = rpmArg ? rpmArg.split('=')[1] : '1000';
  const force = args.includes('--force');

  // Detect cluster size
  const { nodes: nodeCount, services: serviceCount } = detectClusterSize();

  console.log('🚀 Restate Cluster + Traefik Startup');
  console.log('====================================\n');
  console.log('📊 Cluster Configuration:');
  console.log(`   - ${nodeCount} Restate Nodes (orchestration)`);
  console.log(`   - ${serviceCount} Classification Services (processing)`);
  console.log('   - Traefik Load Balancer (HTTP/2, round-robin)\n');
  console.log(`Target RPM: ${rpm}`);
  console.log(`Mode: ${force ? 'Re-classify all' : 'Classify unclassified only'}\n`);

  // Step 1: Start cluster (includes nodes, services, and Traefik)
  console.log(`📦 Step 1/3: Starting ${nodeCount}-Node Cluster + ${serviceCount} Services + Traefik`);
  exec('docker-compose -f docker-compose.cluster.yml up -d', 'Starting all containers');
  console.log('   ✅ All containers started\n');

  // Step 2: Wait for cluster to be ready
  console.log('⏳ Step 2/3: Waiting for cluster to be ready...');
  console.log('   This may take 30-60 seconds on first start...\n');

  // Generate node list dynamically
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    name: `Node ${i + 1}`,
    port: 9070 + (i * 10000)
  }));

  let readyCount = 0;
  for (const node of nodes) {
    const ready = await waitForHealthCheck(`http://localhost:${node.port}/health`);
    if (ready) {
      console.log(`   ✅ ${node.name} ready`);
      readyCount++;
    } else {
      console.log(`   ⚠️  ${node.name} not ready (continuing anyway)`);
    }
  }

  if (readyCount === 0) {
    console.error('\n   ❌ No nodes ready!');
    console.log('   💡 Check logs: docker-compose -f docker-compose.cluster.yml logs');
    cleanup();
    return;
  }

  console.log(`\n   ✅ ${readyCount}/${nodes.length} nodes ready!\n`);

  // Check Traefik is ready by checking its API
  console.log('   Checking Traefik load balancer...');
  const traefikReady = await waitForHealthCheck('http://localhost:8081/api/overview');
  if (!traefikReady) {
    console.error('   ❌ Traefik not ready');
    console.log('   💡 Check logs: docker-compose -f docker-compose.cluster.yml logs traefik');
    cleanup();
    return;
  }
  console.log('   ✅ Traefik ready (5 services behind load balancer)\n');

  // Register Traefik endpoint with cluster
  console.log('🔗 Step 3/3: Registering services with cluster');
  try {
    const response = await fetch('http://localhost:9070/deployments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri: 'http://traefik:9080' }),
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`   ✅ Services registered via Traefik (ID: ${result.id})\n`);
  } catch (error: any) {
    console.error('   ❌ Registration failed:', error.message);
    console.log('   💡 Try manually:');
    console.log('      curl -X POST http://localhost:9070/deployments \\');
    console.log('        -H "content-type: application/json" \\');
    console.log('        -d \'{"uri": "http://traefik:9080"}\'');
    cleanup();
    return;
  }

  // Start classification
  console.log('✅ Setup Complete!\n');
  console.log('🚀 Starting classification...');
  console.log('   Press Ctrl+C to stop\n');
  console.log('─────────────────────────────────────────────────\n');

  // Run classification in foreground
  const classifyArgs = [
    'run',
    'src/scripts/classify-cluster.ts',
    '--openai',
    `--rpm=${rpm}`,
  ];

  if (force) {
    classifyArgs.push('--force');
  }

  const classifyProcess = spawn('bun', classifyArgs, {
    cwd: process.cwd(),
    stdio: 'inherit',
  });

  processes.push({ name: 'Classification Script', process: classifyProcess });

  classifyProcess.on('exit', (code) => {
    console.log(`\n✅ Classification completed with code ${code}`);
    console.log('\n📊 Next Steps:');
    console.log('   - View results: bun run queue');
    console.log('   - Check logs: bun run cluster:logs');
    console.log('   - Admin UI: http://localhost:9070\n');
    console.log('💡 Cluster is still running. To stop:');
    console.log('   bun run cluster:stop');
    cleanup();
  });
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  cleanup();
});
