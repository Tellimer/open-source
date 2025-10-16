/**
 * Check Restate Queue Status
 * Shows how many workflows are running/pending/completed
 */

import { execSync } from 'child_process';

async function checkQueue() {
  console.log('📊 Restate Queue Status');
  console.log('======================\n');

  try {
    // Query using SQL API with proper output format
    const query = `
      SELECT
        status,
        COUNT(*) as count,
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM sys_invocation
      WHERE target_service_name = 'classification-workflow'
      GROUP BY status
    `;

    const response = await fetch('http://localhost:9070/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, format: 'json_compact' }),
    });

    if (!response.ok) {
      console.error(`❌ Query failed: ${response.statusText}`);
      console.log('\n💡 Make sure Restate server is running on port 9070');
      return;
    }

    const data = await response.json();

    console.log('Workflow Status Distribution:');
    console.log('─────────────────────────────');

    let total = 0;
    if (data.length > 0) {
      for (const row of data) {
        const status = row.status || 'unknown';
        const count = parseInt(row.count) || 0;
        total += count;

        const icon =
          status === 'completed' ? '✅' :
          status === 'running' ? '🔄' :
          status === 'pending' ? '⏳' :
          status === 'suspended' ? '⏸️' :
          status === 'backing-off' ? '🔁' : '❓';

        console.log(`${icon} ${status.padEnd(15)} ${count.toString().padStart(6)} workflows`);
      }
      console.log('─────────────────────────────');
      console.log(`   TOTAL:          ${total.toString().padStart(6)} workflows`);
    } else {
      console.log('   No workflows found');
    }

    // Check service invocations too
    const serviceQuery = `
      SELECT
        target_service_name,
        status,
        COUNT(*) as count
      FROM sys_invocation
      WHERE target_service_name IN (
        'normalization',
        'time-inference',
        'family-assignment',
        'type-classification'
      )
      AND created_at > NOW() - INTERVAL '5' MINUTE
      GROUP BY target_service_name, status
      ORDER BY target_service_name, status
    `;

    const serviceResponse = await fetch('http://localhost:9070/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: serviceQuery, format: 'json_compact' }),
    });

    if (serviceResponse.ok) {
      const serviceData = await serviceResponse.json();

      if (serviceData.length > 0) {
        console.log('\n🔧 Service Invocations (last 5 minutes):');
        console.log('──────────────────────────────────────');
        for (const row of serviceData) {
          const service = (row.target_service_name || '').padEnd(25);
          const status = (row.status || '').padEnd(12);
          const count = (row.count || 0).toString().padStart(5);
          console.log(`   ${service} ${status} ${count}`);
        }
      }
    }

    // Check for backing-off/suspended workflows
    const problemQuery = `
      SELECT
        id,
        target,
        status,
        retry_count,
        last_failure,
        created_at
      FROM sys_invocation
      WHERE target_service_name = 'classification-workflow'
        AND status IN ('backing-off', 'suspended')
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const problemResponse = await fetch('http://localhost:9070/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: problemQuery, format: 'json_compact' }),
    });

    if (problemResponse.ok) {
      const problemData = await problemResponse.json();

      if (problemData.length > 0) {
        console.log('\n⚠️  Problem Workflows:');
        console.log('───────────────────────');
        for (const row of problemData) {
          console.log(`\n   ID: ${row.id}`);
          console.log(`   Status: ${row.status}`);
          console.log(`   Retries: ${row.retry_count || 0}`);
          if (row.last_failure) {
            console.log(`   Error: ${row.last_failure.substring(0, 100)}...`);
          }
        }
      }
    }

    console.log('\n💡 View detailed status in Restate UI:');
    console.log('   http://localhost:9070');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    console.log('\n💡 Make sure Restate server is running:');
    console.log('   bun run dev:local:ultra');
  }
}

checkQueue().catch(console.error);
