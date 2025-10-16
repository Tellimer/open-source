#!/usr/bin/env -S deno run --allow-read --allow-write --allow-ffi --allow-env --env

import { Database } from "@db/sqlite";

const db = new Database("./data/classify-workflow-local-dev.db");

// Check family assignments with branch info
console.log("\n🔍 Family Assignments (with branch):");
const families = db.sql`
  SELECT
    indicator_id,
    family,
    confidence,
    branch,
    created_at
  FROM family_assignments
  ORDER BY created_at DESC
  LIMIT 10
`;
console.table(families);

// Check type classifications with branch info
console.log("\n🔍 Type Classifications (with branch):");
const types = db.sql`
  SELECT
    indicator_id,
    indicatorType,
    confidence,
    branch,
    created_at
  FROM type_classifications
  ORDER BY created_at DESC
  LIMIT 10
`;
console.table(types);

// Check final classifications for Bank Lending Rate
console.log("\n🔍 Bank Lending Rate Classifications:");
const bankRates = db.sql`
  SELECT
    si.name,
    fc.family,
    fc.indicator_type,
    fc.temporal_aggregation,
    fc.is_currency,
    fa.branch as family_branch
  FROM final_classifications fc
  JOIN source_indicators si ON fc.indicator_id = si.id
  LEFT JOIN family_assignments fa ON fc.indicator_id = fa.indicator_id
  WHERE si.name LIKE '%Bank Lending Rate%'
  ORDER BY fc.created_at DESC
  LIMIT 5
`;
console.table(bankRates);

// Check Balance of Trade classifications (should be non-currency branch)
console.log("\n🔍 Balance of Trade Classifications:");
const balanceOfTrade = db.sql`
  SELECT
    si.name,
    fc.family,
    fc.indicator_type,
    fc.temporal_aggregation,
    fc.is_currency,
    fa.branch as family_branch
  FROM final_classifications fc
  JOIN source_indicators si ON fc.indicator_id = si.id
  LEFT JOIN family_assignments fa ON fc.indicator_id = fa.indicator_id
  WHERE si.name LIKE '%Balance of Trade%'
  ORDER BY fc.created_at DESC
  LIMIT 5
`;
console.table(balanceOfTrade);

db.close();
