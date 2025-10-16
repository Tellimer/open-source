#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Clear Motia State
 *
 * Removes accumulated state from .motia/motia.state.json to prevent memory bloat.
 * Run this if you notice the state file growing large during long batch runs.
 *
 * Usage:
 *   deno task clear-state
 *
 * Or directly:
 *   deno run --allow-read --allow-write scripts/clear-motia-state.ts
 */

const STATE_FILE = '.motia/motia.state.json';

console.log('🧹 Motia State Cleanup Tool');
console.log('===========================\n');

try {
  const stat = await Deno.stat(STATE_FILE);
  const sizeMB = (stat.size / 1024 / 1024).toFixed(2);

  console.log(`📊 Current state file: ${STATE_FILE}`);
  console.log(`   Size: ${sizeMB}MB\n`);

  // Read and analyze current state
  const stateContent = await Deno.readTextFile(STATE_FILE);
  const state = JSON.parse(stateContent);

  const groups: Record<string, number> = {};
  for (const key of Object.keys(state)) {
    const group = key.split(':')[0];
    groups[group] = (groups[group] || 0) + 1;
  }

  console.log('📋 State groups:');
  for (const [group, count] of Object.entries(groups).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`   ${group}: ${count} items`);
  }

  const totalItems = Object.keys(state).length;
  console.log(`\n   Total: ${totalItems} items\n`);

  if (totalItems === 0) {
    console.log('✅ State is already empty. Nothing to clean.');
    Deno.exit(0);
  }

  console.log('⚠️  This will DELETE all Motia state data.');
  console.log('   SQLite database will be preserved.\n');

  const proceed = confirm('Continue with cleanup?');

  if (!proceed) {
    console.log('\n❌ Cleanup cancelled.');
    Deno.exit(0);
  }

  // Backup current state
  const backupFile = `${STATE_FILE}.backup-${Date.now()}`;
  await Deno.copyFile(STATE_FILE, backupFile);
  console.log(`\n💾 Backup created: ${backupFile}`);

  // Clear state (write empty object)
  await Deno.writeTextFile(STATE_FILE, '{}');

  const newStat = await Deno.stat(STATE_FILE);
  const newSizeMB = (newStat.size / 1024 / 1024).toFixed(2);

  console.log(`\n✅ State cleared!`);
  console.log(`   Before: ${sizeMB}MB`);
  console.log(`   After: ${newSizeMB}MB`);
  console.log(
    `   Freed: ${(parseFloat(sizeMB) - parseFloat(newSizeMB)).toFixed(2)}MB`
  );

  console.log('\n💡 To restore from backup if needed:');
  console.log(`   cp ${backupFile} ${STATE_FILE}`);
} catch (error) {
  if (error instanceof Deno.errors.NotFound) {
    console.log('❌ State file not found.');
    console.log("   This is normal if Motia hasn't been run yet.");
  } else {
    console.error('❌ Error:', error);
  }
  Deno.exit(1);
}
