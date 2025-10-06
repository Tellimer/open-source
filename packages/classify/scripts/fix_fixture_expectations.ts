#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Fix expectation fields in tests/fixtures/v2-test-indicators.ts
 * Rules applied (deterministic, no LLM):
 * - indicator_type 'ratio'|'percentage'|'share'|'spread' → temporal_aggregation 'not-applicable'
 * - indicator_type 'count'|'volume' → temporal_aggregation 'period-total'
 * - FX rates, interest rates, yields → heat_map_orientation 'neutral'
 * - Unemployment rate/percentage → heat_map_orientation 'lower-is-positive' and temporal 'not-applicable'
 * - Inflation/CPI inflation rates → heat_map_orientation 'lower-is-positive'
 * - CPI/PPI level indices → heat_map_orientation 'neutral'
 * - Debt stocks/ratios → heat_map_orientation 'lower-is-positive'
 * - Heuristic: set is_monetary=true when currency context exists (currency_code present, units look like currency, FX/rate/yield prices, debt/reserves/flows in currency)
 * Notes:
 * - Only edits expectation.* fields, leaves other data untouched.
 */

const FIXTURE_PATH = './tests/fixtures/v2-test-indicators.ts';

function replaceExpectationValue(
  block: string,
  key: string,
  value: string | boolean
): string {
  const boolOrQuoted =
    typeof value === 'boolean' ? String(value) : `'${value}'`;
  const re = new RegExp(`(\\b${key}\\s*:\\s*)([^,]+)`, '');
  if (re.test(block)) {
    return block.replace(re, `$1${boolOrQuoted}`);
  }
  // If missing, append before closing brace of expectation
  return block.replace(
    /\n\s*}\s*,?\s*$/,
    (_) => `\n      ${key}: ${boolOrQuoted},\n    }`
  );
}

function includesAny(hay: string, needles: string[]): boolean {
  const u = hay.toUpperCase() as string;
  return needles.some((n) => u.includes(n.toUpperCase()));
}

const content = await Deno.readTextFile(FIXTURE_PATH);

// Split on objects under TEST_INDICATORS array; operate on expectation blocks per indicator
const startMatch = content.match(
  /export const TEST_INDICATORS: TestIndicatorFixture\[\] = \[/
);
if (!startMatch) {
  console.error('Could not find TEST_INDICATORS start');
  Deno.exit(1);
}

const head = content.slice(0, startMatch.index! + startMatch[0].length);
const tail = content.slice(startMatch.index! + startMatch[0].length);

const lines = tail.split('\n');
let braceDepth = 0;
let current: string[] = [];
const rebuilt: string[] = [];

function processIndicatorBlock(block: string): string {
  // Extract name to apply semantically-driven orientation fixes
  const nameMatch = block.match(/\bname:\s*'([^']+)'/);
  const name = nameMatch ? nameMatch[1] : '';

  // Extract currency_code and units for monetary heuristic
  const currencyCodeMatch = block.match(/\bcurrency_code:\s*('([^']+)'|null)/);
  const currencyCode =
    currencyCodeMatch && currencyCodeMatch[2] ? currencyCodeMatch[2] : null;
  const unitsMatch = block.match(/\bunits:\s*('([^']+)'|null)/);
  const unitsVal = unitsMatch && unitsMatch[2] ? unitsMatch[2] : null;

  // Extract current expectation block
  const expMatch = block.match(/expectation:\s*\{[\s\S]*?\n\s*\}/);
  if (!expMatch) return block; // nothing to change
  let exp = expMatch[0];

  // Read current indicator_type
  const typeMatch = exp.match(/indicator_type:\s*'([^']+)'/);
  const indicatorType = typeMatch ? typeMatch[1] : '';

  // Read current temporal_aggregation
  const temporalMatch = exp.match(/temporal_aggregation:\s*'([^']+)'/);
  const temporal = temporalMatch ? temporalMatch[1] : '';

  // Read current orientation
  const orientMatch = exp.match(/heat_map_orientation:\s*'([^']+)'/);
  const orient = orientMatch ? orientMatch[1] : '';
  // Read current is_monetary
  const monetaryMatch = exp.match(/is_monetary:\s*(true|false)/);
  const isMonetaryCurrent = monetaryMatch
    ? monetaryMatch[1] === 'true'
    : undefined;

  // Rule: ratio|percentage|share|spread → temporal = not-applicable
  if (
    indicatorType === 'ratio' ||
    indicatorType === 'percentage' ||
    indicatorType === 'share' ||
    indicatorType === 'spread'
  ) {
    if (temporal !== 'not-applicable') {
      exp = replaceExpectationValue(
        exp,
        'temporal_aggregation',
        'not-applicable'
      );
    }
  }

  // Rule: count|volume → temporal = period-total
  if (indicatorType === 'count' || indicatorType === 'volume') {
    if (temporal !== 'period-total') {
      exp = replaceExpectationValue(
        exp,
        'temporal_aggregation',
        'period-total'
      );
    }
  }

  // FX, interest, yield → neutral
  if (
    includesAny(name, [
      'FX RATE',
      'EXCHANGE RATE',
      'YIELD',
      'INTEREST RATE',
      'SOFR',
      'LIBOR',
    ])
  ) {
    if (orient !== 'neutral') {
      exp = replaceExpectationValue(exp, 'heat_map_orientation', 'neutral');
    }
  }

  // Unemployment → lower-is-positive + temporal NA for percentage
  if (includesAny(name, ['UNEMPLOYMENT'])) {
    if (orient !== 'lower-is-positive') {
      exp = replaceExpectationValue(
        exp,
        'heat_map_orientation',
        'lower-is-positive'
      );
    }
    if (indicatorType === 'percentage' && temporal !== 'not-applicable') {
      exp = replaceExpectationValue(
        exp,
        'temporal_aggregation',
        'not-applicable'
      );
    }
  }

  // Inflation CPI/PPI rate → lower-is-positive; CPI level (index) stays neutral
  if (
    includesAny(name, ['INFLATION']) ||
    (includesAny(name, ['CPI', 'PPI']) && indicatorType === 'rate')
  ) {
    if (orient !== 'lower-is-positive') {
      exp = replaceExpectationValue(
        exp,
        'heat_map_orientation',
        'lower-is-positive'
      );
    }
  }

  // CPI/PPI level indices (index type) → neutral
  if (includesAny(name, ['CPI', 'PPI']) && indicatorType === 'index') {
    if (orient !== 'neutral') {
      exp = replaceExpectationValue(exp, 'heat_map_orientation', 'neutral');
    }
  }

  // Debt stocks/ratios → lower-is-positive
  if (includesAny(name, ['DEBT']) || includesAny(name, ['DT.DOD', 'DT.AMT'])) {
    if (orient !== 'lower-is-positive') {
      exp = replaceExpectationValue(
        exp,
        'heat_map_orientation',
        'lower-is-positive'
      );
    }
  }

  // Heuristic for is_monetary
  const unitsIsCurrency = unitsVal
    ? /USD|EUR|GBP|JPY|CNY|AUD|CAD|CHF|INR|MXN|BRL|RUB|TRY|ZAR|SAR|AED|NGN|KZT|PLN|SEK|NOK|DKK|CZK|HUF|ILS|RON|COP|PEN|CLP|ARS|UYU|BOB|CRC|NIO|GTQ|HNL|PYG|DOP|BBD|TTD|XOF|XAF|XPF|MWK|\$|€|£|¥|LCU|LOCAL CURRENCY|CURRENT PRICES|CONSTANT PRICES/i.test(
        unitsVal
      )
    : false;
  const nameSuggestsMonetary = includesAny(name, [
    'FX RATE',
    'EXCHANGE RATE',
    'SOFR',
    'LIBOR',
    'YIELD',
    'PRICE',
    'COST',
  ]);
  const realEconomyMonetary =
    includesAny(name, ['DEBT', 'RESERVES', 'EXPORT', 'IMPORT', 'GDP']) &&
    (indicatorType === 'stock' ||
      indicatorType === 'flow' ||
      indicatorType === 'balance');
  const shouldBeMonetary = Boolean(
    currencyCode ||
      unitsIsCurrency ||
      nameSuggestsMonetary ||
      realEconomyMonetary
  );

  if (typeof isMonetaryCurrent === 'boolean') {
    if (isMonetaryCurrent !== shouldBeMonetary) {
      exp = replaceExpectationValue(exp, 'is_monetary', shouldBeMonetary);
    }
  } else {
    exp = replaceExpectationValue(exp, 'is_monetary', shouldBeMonetary);
  }

  // Re-integrate expectation back into block
  return block.replace(expMatch[0], exp);
}

for (const line of lines) {
  // Accumulate indicator objects
  current.push(line);
  for (const ch of line) {
    if (ch === '{') braceDepth++;
    if (ch === '}') braceDepth--;
  }
  // End of an indicator (object closed and followed by comma)
  if (braceDepth === 0 && current.length > 0 && /}\s*,?\s*$/.test(line)) {
    const block = current.join('\n');
    const fixed = processIndicatorBlock(block);
    rebuilt.push(fixed);
    current = [];
  }
}

const newContent = head + '\n' + rebuilt.join('\n');
await Deno.writeTextFile(FIXTURE_PATH, newContent);
console.log('✅ Fixture expectations updated');
