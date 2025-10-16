#!/usr/bin/env -S deno run --allow-read --allow-env --allow-ffi

/**
 * View classification errors and failures
 *
 * Usage:
 *   deno task view:errors              # Show all errors
 *   deno task view:errors summary      # Show error summary
 *   deno task view:errors details      # Show detailed error logs
 */

import { Database } from '@db/sqlite';

interface ErrorLog {
  id: number;
  indicator_id: string;
  indicator_name?: string;
  stage: string;
  error_message: string;
  created_at: string;
}

function getErrorSummary(db: Database) {
  const query = `
    SELECT
      stage,
      COUNT(*) as error_count,
      COUNT(DISTINCT indicator_id) as unique_indicators
    FROM processing_log
    WHERE status = 'failed'
    GROUP BY stage
    ORDER BY error_count DESC
  `;

  const stmt = db.prepare(query);
  return stmt.all<{
    stage: string;
    error_count: number;
    unique_indicators: number;
  }>();
}

function getFailedIndicators(db: Database) {
  const query = `
    SELECT DISTINCT
      p.indicator_id,
      s.name as indicator_name,
      COUNT(DISTINCT p.stage) as failed_stages,
      GROUP_CONCAT(DISTINCT p.stage) as stages
    FROM processing_log p
    LEFT JOIN source_indicators s ON p.indicator_id = s.id
    WHERE p.status = 'failed'
    GROUP BY p.indicator_id
    ORDER BY failed_stages DESC, p.indicator_id
  `;

  const stmt = db.prepare(query);
  return stmt.all<{
    indicator_id: string;
    indicator_name: string | null;
    failed_stages: number;
    stages: string;
  }>();
}

function getDetailedErrors(db: Database, limit: number = 50) {
  const query = `
    SELECT
      p.id,
      p.indicator_id,
      s.name as indicator_name,
      p.stage,
      p.error_message,
      p.created_at
    FROM processing_log p
    LEFT JOIN source_indicators s ON p.indicator_id = s.id
    WHERE p.status = 'failed'
    ORDER BY p.created_at DESC
    LIMIT ?
  `;

  const stmt = db.prepare(query);
  return stmt.all<ErrorLog>(limit);
}

function getIncompleteIndicators(db: Database) {
  const query = `
    SELECT DISTINCT
      p.indicator_id,
      s.name as indicator_name,
      MAX(p.stage) as last_stage,
      MAX(p.created_at) as last_updated
    FROM processing_log p
    LEFT JOIN source_indicators s ON p.indicator_id = s.id
    WHERE p.indicator_id NOT IN (
      SELECT indicator_id FROM classifications
    )
    AND p.indicator_id NOT IN (
      SELECT DISTINCT indicator_id FROM processing_log WHERE status = 'failed'
    )
    GROUP BY p.indicator_id
    ORDER BY last_updated DESC
    LIMIT 20
  `;

  const stmt = db.prepare(query);
  return stmt.all<{
    indicator_id: string;
    indicator_name: string | null;
    last_stage: string;
    last_updated: string;
  }>();
}

function printSummary(db: Database) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                   ERROR SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const summary = getErrorSummary(db);

  if (summary.length === 0) {
    console.log('✅ No errors found! All indicators processed successfully.\n');
    return;
  }

  console.log('Errors by Stage:');
  console.log('─'.repeat(60));
  let totalErrors = 0;
  let totalIndicators = 0;

  summary.forEach((row) => {
    console.log(
      `  ${row.stage.padEnd(20)} ${row.error_count} errors (${row.unique_indicators} indicators)`
    );
    totalErrors += row.error_count;
    totalIndicators += row.unique_indicators;
  });

  console.log('─'.repeat(60));
  console.log(
    `  Total: ${totalErrors} errors across ${totalIndicators} indicators\n`
  );

  // Check for incomplete indicators (stuck in progress)
  const incomplete = getIncompleteIndicators(db);
  if (incomplete.length > 0) {
    console.log(
      `⚠️  Found ${incomplete.length} indicators that started but never completed/failed`
    );
    console.log(
      '   (These may be stuck in progress or timed out)\n'
    );
  }
}

function printFailedIndicators(db: Database) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                 FAILED INDICATORS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const failed = getFailedIndicators(db);

  if (failed.length === 0) {
    console.log('✅ No failed indicators found!\n');
    return;
  }

  console.log(`Found ${failed.length} indicators with errors:\n`);

  failed.forEach((row, idx) => {
    console.log(`${idx + 1}. ${row.indicator_id}`);
    if (row.indicator_name) {
      console.log(`   Name: ${row.indicator_name}`);
    }
    console.log(
      `   Failed Stages: ${row.failed_stages} (${row.stages})`
    );
    console.log();
  });
}

function printDetailedErrors(db: Database) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                 DETAILED ERROR LOGS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const errors = getDetailedErrors(db, 50);

  if (errors.length === 0) {
    console.log('✅ No errors found!\n');
    return;
  }

  console.log(`Showing most recent ${errors.length} errors:\n`);

  errors.forEach((error, idx) => {
    console.log(`${idx + 1}. [${error.stage}] ${error.indicator_id}`);
    if (error.indicator_name) {
      console.log(`   Name: ${error.indicator_name}`);
    }
    console.log(`   Time: ${error.created_at}`);
    if (error.error_message) {
      const shortError =
        error.error_message.length > 150
          ? error.error_message.substring(0, 150) + '...'
          : error.error_message;
      console.log(`   Error: ${shortError}`);
    }
    console.log();
  });
}

function printIncomplete(db: Database) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('              INCOMPLETE INDICATORS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const incomplete = getIncompleteIndicators(db);

  if (incomplete.length === 0) {
    console.log('✅ No incomplete indicators found!\n');
    return;
  }

  console.log(
    `Found ${incomplete.length} indicators that started but never completed:\n`
  );
  console.log(
    '(These may be stuck in progress, timed out, or still processing)\n'
  );

  incomplete.forEach((row, idx) => {
    console.log(`${idx + 1}. ${row.indicator_id}`);
    if (row.indicator_name) {
      console.log(`   Name: ${row.indicator_name}`);
    }
    console.log(`   Last Stage: ${row.last_stage}`);
    console.log(`   Last Updated: ${row.last_updated}`);
    console.log();
  });
}

async function main() {
  const args = Deno.args;
  const mode = args[0] || 'summary';

  const dbPath = './data/classify-workflow-local-dev.db';
  const db = new Database(dbPath);

  try {
    switch (mode) {
      case 'summary':
        printSummary(db);
        break;

      case 'indicators':
        printFailedIndicators(db);
        break;

      case 'details':
        printDetailedErrors(db);
        break;

      case 'incomplete':
        printIncomplete(db);
        break;

      case 'all':
        printSummary(db);
        printFailedIndicators(db);
        printIncomplete(db);
        printDetailedErrors(db);
        break;

      default:
        console.error(`Unknown mode: ${mode}`);
        console.error(`Valid modes: summary, indicators, details, incomplete, all`);
        Deno.exit(1);
    }

    // Show helpful commands
    const failedCount = getFailedIndicators(db).length;
    if (failedCount > 0) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('                  NEXT STEPS');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log(
        `💡 To retry failed indicators, use: deno task run:retry-failed`
      );
      console.log(
        `💡 To target specific indicator: deno task run:target INDICATOR_ID\n`
      );
    }
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('❌ Error:', error);
    Deno.exit(1);
  });
}
