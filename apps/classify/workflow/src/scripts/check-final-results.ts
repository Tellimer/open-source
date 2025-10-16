#!/usr/bin/env -S deno run --allow-read --allow-write --allow-ffi --allow-env --env

import { Database } from "@db/sqlite";

const db = new Database("./data/classify-workflow-local-dev.db");

// Check Bank Lending Rate classifications
console.log("\n🔍 Bank Lending Rate - Final Classifications:");
const bankRates = db.sql`
  SELECT
    name,
    family,
    indicator_type,
    temporal_aggregation,
    is_currency_denominated,
    detected_currency,
    family_confidence,
    type_confidence
  FROM classifications
  WHERE name LIKE '%Bank Lending Rate%'
  ORDER BY created_at DESC
  LIMIT 10
`;
console.table(bankRates);

// Check Balance of Trade classifications
console.log("\n🔍 Balance of Trade - Final Classifications:");
const balance = db.sql`
  SELECT
    name,
    family,
    indicator_type,
    temporal_aggregation,
    is_currency_denominated,
    detected_currency,
    family_confidence,
    type_confidence
  FROM classifications
  WHERE name LIKE '%Balance of Trade%'
  ORDER BY created_at DESC
  LIMIT 10
`;
console.table(balance);

// Summary by family
console.log("\n📊 Summary by Family:");
const familySummary = db.sql`
  SELECT
    family,
    COUNT(*) as count,
    AVG(family_confidence) as avg_confidence
  FROM classifications
  GROUP BY family
  ORDER BY count DESC
`;
console.table(familySummary);

// Summary by is_currency_denominated
console.log("\n💰 Currency vs Non-Currency:");
const currencySummary = db.sql`
  SELECT
    is_currency_denominated,
    COUNT(*) as count
  FROM classifications
  GROUP BY is_currency_denominated
`;
console.table(currencySummary);

db.close();
