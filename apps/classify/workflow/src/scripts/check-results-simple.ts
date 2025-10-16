#!/usr/bin/env -S deno run --allow-read --allow-write --allow-ffi --allow-env --env

import { Database } from "@db/sqlite";

const db = new Database("./data/classify-workflow-local-dev.db");

// Check family assignments
console.log("\n🔍 Recent Family Assignments:");
const families = db.sql`
  SELECT *
  FROM family_assignment_results
  ORDER BY created_at DESC
  LIMIT 10
`;
console.table(families);

// Check type classifications
console.log("\n🔍 Recent Type Classifications:");
const types = db.sql`
  SELECT *
  FROM type_classification_results
  ORDER BY created_at DESC
  LIMIT 10
`;
console.table(types);

// Check Bank Lending Rate classifications
console.log("\n🔍 Bank Lending Rate - Final Classifications:");
const bankRates = db.sql`
  SELECT
    si.name,
    far.family,
    tcr.indicatorType as type,
    tcr.temporalAggregation,
    ccr.is_currency
  FROM source_indicators si
  LEFT JOIN currency_check_results ccr ON si.id = ccr.indicator_id
  LEFT JOIN family_assignment_results far ON si.id = far.indicator_id
  LEFT JOIN type_classification_results tcr ON si.id = tcr.indicator_id
  WHERE si.name LIKE '%Bank Lending Rate%'
  ORDER BY far.created_at DESC
  LIMIT 5
`;
console.table(bankRates);

// Check Balance of Trade classifications
console.log("\n🔍 Balance of Trade - Final Classifications:");
const balance = db.sql`
  SELECT
    si.name,
    far.family,
    tcr.indicatorType as type,
    tcr.temporalAggregation,
    ccr.is_currency
  FROM source_indicators si
  LEFT JOIN currency_check_results ccr ON si.id = ccr.indicator_id
  LEFT JOIN family_assignment_results far ON si.id = far.indicator_id
  LEFT JOIN type_classification_results tcr ON si.id = tcr.indicator_id
  WHERE si.name LIKE '%Balance of Trade%'
  ORDER BY far.created_at DESC
  LIMIT 5
`;
console.table(balance);

db.close();
