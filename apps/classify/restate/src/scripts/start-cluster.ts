/**
 * Start Restate Cluster
 * Launches a multi-node Restate cluster with shared storage for high-throughput processing
 * Dynamically detects cluster size from docker-compose.cluster.yml
 *
 * Architecture:
 * - N Restate nodes (orchestration)
 * - M Classification services (processing)
 * - Traefik load balancer (HTTP/2, round-robin)
 * - MinIO for shared Bifrost storage
 * - TimescaleDB for persistent data
 *
 * Ports (per node, with 10000 offset):
 * - Node 1: 8080 (ingress), 9070 (admin), 5122 (node RPC)
 * - Node 2: 28080, 29070, 25122
 * - Node N: (8080 + N*10000), (9070 + N*10000), (5122 + N*10000)
 *
 * Usage:
 *   bun run cluster:start
 *   bun run cluster:stop
 *   bun run cluster:clean  # Stop + remove volumes
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';

function exec(command: string, description: string) {
  console.log(`   ${description}...`);
  try {
    const output = execSync(command, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    return output;
  } catch (error: any) {
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    throw error;
  }
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

async function startCluster() {
  const { nodes: nodeCount, services: serviceCount } = detectClusterSize();

  console.log('🚀 Starting Restate Cluster');
  console.log('===========================\n');

  console.log('📋 Cluster Configuration:');
  console.log(`   - ${nodeCount} Restate nodes (orchestration)`);
  console.log(`   - ${serviceCount} Classification services (processing)`);
  console.log('   - Traefik load balancer (HTTP/2, round-robin)');
  console.log('   - TimescaleDB (max_connections=2000)');
  console.log('   - Shared MinIO storage for Bifrost\n');

  console.log('🔧 Starting services...');
  exec(
    'docker-compose -f docker-compose.cluster.yml up -d',
    'Launching Docker containers'
  );

  console.log('\n⏳ Waiting for cluster to initialize...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n✅ Cluster started!\n');

  console.log('🔗 Access Points:');
  for (let i = 1; i <= Math.min(nodeCount, 3); i++) {
    const offset = (i - 1) * 10000;
    console.log(`   Node ${i}${i === 1 ? ' (Primary)' : ''}:`);
    console.log(`     - Ingress:  http://localhost:${8080 + offset}`);
    console.log(`     - Admin UI: http://localhost:${9070 + offset}`);
  }
  if (nodeCount > 3) {
    console.log(`   ... and ${nodeCount - 3} more nodes`);
  }
  console.log('   Traefik:      http://localhost:9080 (service)');
  console.log('   Traefik UI:   http://localhost:8081 (dashboard)');
  console.log('   TimescaleDB:  localhost:5432');
  console.log('   MinIO S3:     http://localhost:9000\n');

  console.log('📊 Next Steps:');
  console.log('   1. Run complete workflow (auto-register + classify):');
  console.log('      bun run all-in-one');
  console.log('');
  console.log('   2. Or manually register and classify:');
  console.log('      curl -X POST http://localhost:9070/deployments \\');
  console.log('        -H "content-type: application/json" \\');
  console.log('        -d \'{"uri": "http://traefik:9080}\'');
  console.log('      bun run classify:cluster:ultra\n');

  console.log('💡 Cluster Management:');
  console.log('   - View logs:   docker-compose -f docker-compose.cluster.yml logs -f');
  console.log('   - Stop cluster: bun run cluster:stop');
  console.log('   - Check status: docker-compose -f docker-compose.cluster.yml ps');
}

async function stopCluster() {
  console.log('🛑 Stopping Restate Cluster');
  console.log('===========================\n');

  exec(
    'docker-compose -f docker-compose.cluster.yml down',
    'Stopping containers'
  );

  console.log('\n✅ Cluster stopped\n');
  console.log('💡 Data is preserved in Docker volumes.');
  console.log('   To clean everything: bun run cluster:clean');
}

async function cleanCluster() {
  console.log('🧹 Cleaning Restate Cluster');
  console.log('===========================\n');

  console.log('⚠️  This will remove all cluster data!');
  console.log('   Waiting 3 seconds... (Ctrl+C to cancel)\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  exec(
    'docker-compose -f docker-compose.cluster.yml down -v',
    'Stopping containers and removing volumes'
  );

  console.log('\n✅ Cluster cleaned\n');
  console.log('💡 All workflow state has been deleted.');
  console.log('   Start fresh with: bun run cluster:start');
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'start':
      await startCluster();
      break;
    case 'stop':
      await stopCluster();
      break;
    case 'clean':
      await cleanCluster();
      break;
    default:
      console.log('Usage:');
      console.log('  bun run cluster:start  - Start 3-node cluster');
      console.log('  bun run cluster:stop   - Stop cluster (preserve data)');
      console.log('  bun run cluster:clean  - Stop cluster + remove all data');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
