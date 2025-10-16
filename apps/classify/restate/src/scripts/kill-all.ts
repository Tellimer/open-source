/**
 * Kill All Restate Processes Script
 * Safely stops ONLY processes using Restate ports or explicitly named restate-server
 *
 * This script uses a safe approach:
 * 1. Find processes by specific port numbers (8080, 9070, 9080, 5122)
 * 2. Find processes with "restate-server" in the command
 * 3. Does NOT use broad pattern matching that could kill unrelated apps
 *
 * Usage:
 *   bun run src/scripts/kill-all.ts
 *   bun run src/scripts/kill-all.ts --clean  # Also removes restate-data
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ProcessInfo {
  pid: string;
  name: string;
  port?: number;
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    clean: args.includes('--clean') || args.includes('-c'),
  };
}

function exec(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch (error: any) {
    // If exit code is 1, it usually means no processes found
    if (error.status === 1) {
      return '';
    }
    return error.stdout || '';
  }
}

function getProcessesOnPort(port: number): ProcessInfo[] {
  const output = exec(`lsof -ti:${port}`);
  if (!output.trim()) return [];

  const pids = output.trim().split('\n').filter(p => p);
  const processes: ProcessInfo[] = [];

  for (const pid of pids) {
    const cmdOutput = exec(`ps -p ${pid} -o comm=`);
    if (cmdOutput.trim()) {
      processes.push({
        pid,
        name: cmdOutput.trim(),
        port,
      });
    }
  }

  return processes;
}

function getRestateServerProcesses(): ProcessInfo[] {
  const output = exec(`pgrep -f "restate-server"`);
  if (!output.trim()) return [];

  const pids = output.trim().split('\n').filter(p => p);
  const processes: ProcessInfo[] = [];

  for (const pid of pids) {
    const cmdOutput = exec(`ps -p ${pid} -o command=`);
    if (cmdOutput.trim() && cmdOutput.includes('restate-server')) {
      processes.push({
        pid,
        name: 'restate-server',
      });
    }
  }

  return processes;
}

function killProcess(pid: string, signal: NodeJS.Signals = 'SIGTERM'): boolean {
  try {
    process.kill(parseInt(pid), signal);
    return true;
  } catch (error: any) {
    if (error.code === 'ESRCH') {
      // Process doesn't exist, that's ok
      return false;
    }
    console.log(`     ⚠️  Failed to kill PID ${pid}: ${error.message}`);
    return false;
  }
}

function cleanRestateData() {
  const dataDir = path.join(process.cwd(), 'restate-data');

  if (!fs.existsSync(dataDir)) {
    console.log('   ✓ No restate-data directory found');
    return;
  }

  try {
    fs.rmSync(dataDir, { recursive: true, force: true });
    console.log('   ✓ Removed restate-data directory');
  } catch (error: any) {
    console.log(`   ⚠️  Failed to remove restate-data: ${error.message}`);
  }
}

function checkPorts() {
  const ports = [8080, 9070, 9080, 5122];
  const names = ['Ingress HTTP', 'Admin API', 'Service Endpoint', 'Node RPC'];

  console.log('\n🔍 Checking Restate ports:');

  for (let i = 0; i < ports.length; i++) {
    const port = ports[i];
    const name = names[i];
    const output = exec(`lsof -ti:${port}`);
    if (output.trim()) {
      console.log(`   ⚠️  Port ${port} (${name}) still in use by PID(s): ${output.trim().replace(/\n/g, ', ')}`);
    } else {
      console.log(`   ✓ Port ${port} (${name}) is free`);
    }
  }
}

async function main() {
  const { clean } = parseArgs();

  console.log('🛑 Killing Restate Processes (Safe Mode)');
  console.log('=========================================\n');
  console.log('This script only kills:');
  console.log('  - Processes using Restate ports (8080, 9070, 9080, 5122)');
  console.log('  - Processes named "restate-server"');
  console.log('  - Your other applications will NOT be affected\n');

  // Step 1: Find and kill restate-server processes
  console.log('📦 Finding restate-server processes:');
  const restateProcs = getRestateServerProcesses();
  if (restateProcs.length > 0) {
    console.log(`   Found ${restateProcs.length} restate-server process(es):`);
    restateProcs.forEach(p => console.log(`     - PID ${p.pid}`));

    let killed = 0;
    for (const proc of restateProcs) {
      if (killProcess(proc.pid, 'SIGTERM')) killed++;
    }
    console.log(`   ✓ Sent SIGTERM to ${killed} process(es)`);
  } else {
    console.log('   ✓ No restate-server processes found');
  }

  // Step 2: Find and kill processes on Restate ports
  console.log('\n🔌 Finding processes on Restate ports:');
  const restatePorts = [8080, 9070, 9080, 5122];
  const portNames = ['Ingress HTTP', 'Admin API', 'Service Endpoint', 'Node RPC'];

  const allPortProcs = new Map<string, ProcessInfo>();

  for (let i = 0; i < restatePorts.length; i++) {
    const port = restatePorts[i];
    const name = portNames[i];
    const procs = getProcessesOnPort(port);

    if (procs.length > 0) {
      console.log(`   Port ${port} (${name}):`);
      procs.forEach(p => {
        console.log(`     - PID ${p.pid} (${p.name})`);
        allPortProcs.set(p.pid, p);
      });
    }
  }

  if (allPortProcs.size > 0) {
    let killed = 0;
    for (const [pid] of allPortProcs) {
      if (killProcess(pid, 'SIGTERM')) killed++;
    }
    console.log(`   ✓ Sent SIGTERM to ${killed} process(es)`);
  } else {
    console.log('   ✓ No processes found on Restate ports');
  }

  // Wait for graceful shutdown
  if (restateProcs.length > 0 || allPortProcs.size > 0) {
    console.log('\n⏳ Waiting 2 seconds for graceful shutdown...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check for remaining processes and force kill if needed
    console.log('\n🔨 Checking for remaining processes:');

    let remainingCount = 0;

    // Check restate-server processes
    const remainingRestate = getRestateServerProcesses();
    if (remainingRestate.length > 0) {
      console.log(`   Found ${remainingRestate.length} stubborn restate-server process(es), force killing...`);
      for (const proc of remainingRestate) {
        if (killProcess(proc.pid, 'SIGKILL')) remainingCount++;
      }
    }

    // Check port processes
    for (const port of restatePorts) {
      const remainingPortProcs = getProcessesOnPort(port);
      if (remainingPortProcs.length > 0) {
        console.log(`   Found ${remainingPortProcs.length} process(es) still on port ${port}, force killing...`);
        for (const proc of remainingPortProcs) {
          if (killProcess(proc.pid, 'SIGKILL')) remainingCount++;
        }
      }
    }

    if (remainingCount > 0) {
      console.log(`   ✓ Force killed ${remainingCount} stubborn process(es)`);
    } else {
      console.log('   ✓ All processes exited gracefully');
    }
  }

  // Check final port status
  checkPorts();

  // Clean data directory if requested
  if (clean) {
    console.log('\n🧹 Cleaning Data:');
    cleanRestateData();
  }

  console.log('\n✅ Done!');
  console.log('\n📝 Summary:');
  console.log('   - Only killed processes on Restate ports (8080, 9070, 9080, 5122)');
  console.log('   - Only killed processes named "restate-server"');
  console.log('   - All other applications left running');

  if (!clean) {
    console.log('\n💡 To also clean restate-data, run: bun run kill --clean');
  }
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
