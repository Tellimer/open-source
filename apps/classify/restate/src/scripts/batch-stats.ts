/**
 * Batch Statistics Script
 * Query Restate SQL API for classification workflow statistics
 *
 * Usage:
 *   bun run src/scripts/batch-stats.ts
 *   bun run src/scripts/batch-stats.ts --minutes 30
 */

const RESTATE_ADMIN_URL = process.env.RESTATE_ADMIN_URL || 'http://localhost:9070';

interface QueryParams {
  minutes?: number;
}

function parseArgs(): QueryParams {
  const args = process.argv.slice(2);
  const params: QueryParams = { minutes: 60 };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--minutes') {
      params.minutes = parseInt(args[++i], 10);
    }
  }

  return params;
}

async function queryRestateSQL(query: string): Promise<any> {
  const response = await fetch(`${RESTATE_ADMIN_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`SQL query failed: ${response.statusText}`);
  }

  return await response.json();
}

async function getBatchStats(minutes: number) {
  console.log(`\n📊 Classification Batch Statistics (Last ${minutes} minutes)\n`);
  console.log('='.repeat(80));

  // Query 1: Overall workflow status breakdown
  const statusQuery = `
    SELECT
      inv_status as status,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
    FROM sys_invocation
    WHERE inv_target LIKE 'classification-workflow%'
      AND inv_created_at > CURRENT_TIMESTAMP - INTERVAL '${minutes}' MINUTE
    GROUP BY inv_status
    ORDER BY count DESC
  `;

  try {
    const statusResult = await queryRestateSQL(statusQuery);
    console.log('\n📈 Status Breakdown:');
    console.table(statusResult.rows);
  } catch (error) {
    console.error('Error querying status:', error);
  }

  // Query 2: Performance metrics
  const performanceQuery = `
    SELECT
      COUNT(*) as total_workflows,
      COUNT(CASE WHEN inv_status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN inv_status = 'running' THEN 1 END) as running,
      COUNT(CASE WHEN inv_status = 'suspended' THEN 1 END) as suspended,
      AVG(CASE WHEN inv_status = 'completed' THEN inv_duration ELSE NULL END) / 1000 as avg_duration_sec,
      MIN(inv_created_at) as first_workflow,
      MAX(inv_created_at) as last_workflow
    FROM sys_invocation
    WHERE inv_target LIKE 'classification-workflow%'
      AND inv_created_at > CURRENT_TIMESTAMP - INTERVAL '${minutes}' MINUTE
  `;

  try {
    const perfResult = await queryRestateSQL(performanceQuery);
    console.log('\n⚡ Performance Metrics:');
    if (perfResult.rows && perfResult.rows.length > 0) {
      const metrics = perfResult.rows[0];
      console.log(`  Total Workflows: ${metrics.total_workflows}`);
      console.log(`  Completed: ${metrics.completed}`);
      console.log(`  Running: ${metrics.running}`);
      console.log(`  Suspended: ${metrics.suspended}`);
      console.log(`  Avg Duration: ${metrics.avg_duration_sec?.toFixed(2) || 'N/A'} seconds`);
      console.log(`  First Workflow: ${metrics.first_workflow}`);
      console.log(`  Last Workflow: ${metrics.last_workflow}`);
    }
  } catch (error) {
    console.error('Error querying performance:', error);
  }

  // Query 3: Recent failures
  const failuresQuery = `
    SELECT
      inv_id,
      inv_key as indicator_id,
      inv_created_at,
      inv_retry_count,
      inv_status
    FROM sys_invocation
    WHERE inv_target LIKE 'classification-workflow%'
      AND inv_status IN ('backing-off', 'suspended')
      AND inv_created_at > CURRENT_TIMESTAMP - INTERVAL '${minutes}' MINUTE
    ORDER BY inv_created_at DESC
    LIMIT 10
  `;

  try {
    const failuresResult = await queryRestateSQL(failuresQuery);
    if (failuresResult.rows && failuresResult.rows.length > 0) {
      console.log('\n⚠️  Recent Failures/Retries:');
      console.table(failuresResult.rows);
    } else {
      console.log('\n✅ No failures or retries in the selected timeframe');
    }
  } catch (error) {
    console.error('Error querying failures:', error);
  }

  // Query 4: Throughput over time (by 5-minute intervals)
  const throughputQuery = `
    SELECT
      DATE_TRUNC('minute', inv_created_at, 5) as time_window,
      COUNT(*) as workflows_started,
      COUNT(CASE WHEN inv_status = 'completed' THEN 1 END) as workflows_completed
    FROM sys_invocation
    WHERE inv_target LIKE 'classification-workflow%'
      AND inv_created_at > CURRENT_TIMESTAMP - INTERVAL '${minutes}' MINUTE
    GROUP BY time_window
    ORDER BY time_window DESC
    LIMIT 12
  `;

  try {
    const throughputResult = await queryRestateSQL(throughputQuery);
    if (throughputResult.rows && throughputResult.rows.length > 0) {
      console.log('\n📊 Throughput (5-min intervals):');
      console.table(throughputResult.rows);
    }
  } catch (error) {
    console.error('Error querying throughput:', error);
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n💡 View live data in Restate UI: http://localhost:9070`);
  console.log(`💡 SQL endpoint: ${RESTATE_ADMIN_URL}/query\n`);
}

// Run
const params = parseArgs();
getBatchStats(params.minutes!).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
