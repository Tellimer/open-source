/**
 * Start Restate Cluster
 * Launches a 3-node Restate cluster with shared storage for high-throughput processing
 *
 * Architecture:
 * - 3 Restate nodes (restate-1, restate-2, restate-3)
 * - MinIO for shared Bifrost storage (replicated loglet)
 * - Load balanced across all nodes
 *
 * Ports:
 * - Node 1: 8080 (ingress), 9070 (admin), 5122 (node RPC)
 * - Node 2: 28080 (ingress), 29070 (admin), 25122 (node RPC)
 * - Node 3: 38080 (ingress), 39070 (admin), 35122 (node RPC)
 * - MinIO: 9000
 *
 * Usage:
 *   bun run cluster:start
 *   bun run cluster:stop
 *   bun run cluster:clean  # Stop + remove volumes
 */

import { execSync } from 'child_process';

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

async function startCluster() {
  console.log('🚀 Starting Restate Cluster');
  console.log('===========================\n');

  console.log('📋 Cluster Configuration:');
  console.log('   - 3 Restate nodes');
  console.log('   - Shared MinIO storage for Bifrost');
  console.log('   - Load distribution across nodes\n');

  console.log('🔧 Starting services...');
  exec(
    'docker-compose -f docker-compose.cluster.yml up -d',
    'Launching Docker containers'
  );

  console.log('\n⏳ Waiting for cluster to initialize...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n✅ Cluster started!\n');

  console.log('🔗 Access Points:');
  console.log('   Node 1 (Primary):');
  console.log('     - Ingress:  http://localhost:8080');
  console.log('     - Admin UI: http://localhost:9070');
  console.log('   Node 2:');
  console.log('     - Ingress:  http://localhost:28080');
  console.log('     - Admin UI: http://localhost:29070');
  console.log('   Node 3:');
  console.log('     - Ingress:  http://localhost:38080');
  console.log('     - Admin UI: http://localhost:39070');
  console.log('   MinIO S3:     http://localhost:9000\n');

  console.log('📊 Next Steps:');
  console.log('   1. Register your services with the cluster:');
  console.log('      curl -X POST http://localhost:9070/deployments \\');
  console.log('        -H "content-type: application/json" \\');
  console.log('        -d \'{"uri": "http://host.docker.internal:9080}\'');
  console.log('');
  console.log('   2. Start your classification service:');
  console.log('      bun run dev');
  console.log('');
  console.log('   3. Submit work to any node (they share state):');
  console.log('      bun run classify:ultra  # Can handle 3x throughput!\n');

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
