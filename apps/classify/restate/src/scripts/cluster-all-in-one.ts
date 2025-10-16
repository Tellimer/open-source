/**
 * All-in-One Cluster Startup Script
 * Starts cluster, service, registers, and begins classification
 *
 * Usage:
 *   bun run all-in-one --rpm=450
 *   bun run all-in-one --rpm=900 --force
 */

import { execSync, spawn } from 'child_process';
import { ChildProcess } from 'child_process';

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

async function main() {
  const args = process.argv.slice(2);
  const rpmArg = args.find(a => a.startsWith('--rpm='));
  const rpm = rpmArg ? rpmArg.split('=')[1] : '450';
  const force = args.includes('--force');

  console.log('🚀 All-in-One Cluster Startup');
  console.log('==============================\n');
  console.log(`Target RPM: ${rpm}`);
  console.log(`Mode: ${force ? 'Re-classify all' : 'Classify unclassified only'}\n`);

  // Step 1: Start cluster
  console.log('📦 Step 1/4: Starting Restate Cluster');
  exec('docker-compose -f docker-compose.cluster.yml up -d', 'Starting Docker containers');
  console.log('   ✅ Cluster containers started\n');

  // Step 2: Wait for cluster to be ready
  console.log('⏳ Step 2/4: Waiting for cluster to be ready...');
  console.log('   This may take 30-60 seconds on first start...');

  const node1Ready = await waitForHealthCheck('http://localhost:9070/health');
  if (!node1Ready) {
    console.error('   ❌ Node 1 failed to start');
    console.log('   💡 Check logs: docker-compose -f docker-compose.cluster.yml logs');
    cleanup();
    return;
  }
  console.log('   ✅ Node 1 ready');

  const node2Ready = await waitForHealthCheck('http://localhost:29070/health');
  if (!node2Ready) {
    console.log('   ⚠️  Node 2 not ready (continuing anyway)');
  } else {
    console.log('   ✅ Node 2 ready');
  }

  const node3Ready = await waitForHealthCheck('http://localhost:39070/health');
  if (!node3Ready) {
    console.log('   ⚠️  Node 3 not ready (continuing anyway)');
  } else {
    console.log('   ✅ Node 3 ready');
  }

  console.log('\n📡 Step 3/4: Starting classification service');

  // Start the service in background
  const serviceProcess = spawn('bun', ['run', 'src/index.ts'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  processes.push({ name: 'Classification Service', process: serviceProcess });

  // Capture service output
  let serviceReady = false;
  serviceProcess.stdout?.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Restate SDK started listening')) {
      serviceReady = true;
      console.log('   ✅ Service started on port 9080');
    }
  });

  serviceProcess.stderr?.on('data', (data) => {
    const output = data.toString();
    if (output.includes('error') || output.includes('Error')) {
      console.error('   ⚠️  Service error:', output.substring(0, 200));
    }
  });

  // Wait for service to be ready
  console.log('   Waiting for service to start...');
  for (let i = 0; i < 30; i++) {
    if (serviceReady) break;
    await sleep(1000);
  }

  if (!serviceReady) {
    console.error('   ❌ Service failed to start');
    console.log('   💡 Try starting manually: bun run dev');
    cleanup();
    return;
  }

  // Wait a bit more for service to fully initialize
  await sleep(2000);

  // Register service with cluster
  console.log('\n🔗 Step 4/4: Registering service with cluster');
  try {
    const response = await fetch('http://localhost:9070/deployments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri: 'http://host.docker.internal:9080' }),
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`   ✅ Service registered (ID: ${result.id})\n`);
  } catch (error: any) {
    console.error('   ❌ Registration failed:', error.message);
    console.log('   💡 Try manually:');
    console.log('      curl -X POST http://localhost:9070/deployments \\');
    console.log('        -H "content-type: application/json" \\');
    console.log('        -d \'{"uri": "http://host.docker.internal:9080"}\'');
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
