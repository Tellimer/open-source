/**
 * Integration tests for comprehensive unit handling
 */

import { assertEquals } from 'jsr:@std/assert';
import { parseUnit, normalizeValue } from './main.ts';
import type { FXTable } from './types.ts';

Deno.test('Integration - parse real-world economic indicator units', () => {
  const realWorldUnits = [
    // Currencies with scales
    {
      input: 'USD Million',
      currency: 'USD',
      scale: 'millions',
      category: 'currency',
    },
    {
      input: 'EUR Billion',
      currency: 'EUR',
      scale: 'billions',
      category: 'currency',
    },
    {
      input: 'GBP Thousand',
      currency: 'GBP',
      scale: 'thousands',
      category: 'currency',
    },
    {
      input: 'JPY Billion',
      currency: 'JPY',
      scale: 'billions',
      category: 'currency',
    },
    {
      input: 'NGN Billion',
      currency: 'NGN',
      scale: 'billions',
      category: 'currency',
    },
    {
      input: 'KES Billion',
      currency: 'KES',
      scale: 'billions',
      category: 'currency',
    },

    // Flows (currency with time)
    {
      input: 'USD Million per year',
      currency: 'USD',
      scale: 'millions',
      timeScale: 'year',
      category: 'composite',
    },
    {
      input: 'EUR Billion/quarter',
      currency: 'EUR',
      scale: 'billions',
      timeScale: 'quarter',
      category: 'composite',
    },

    // Percentages
    { input: 'percent of GDP', category: 'percentage', normalized: '% of GDP' },
    { input: 'percent', category: 'percentage', normalized: '%' },
    { input: 'percentage points', category: 'percentage', normalized: 'pp' },
    { input: 'basis points', category: 'percentage', normalized: 'bps' },

    // Physical units
    { input: 'BBL/D/1K', category: 'physical', normalized: 'BBL/D/1K' },
    { input: 'Tonnes', category: 'physical', normalized: 'tonnes' },
    {
      input: 'thousand tonnes',
      category: 'physical',
      normalized: 'thousand tonnes',
    },
    { input: 'hectares', category: 'physical', normalized: 'hectares' },

    // Energy
    { input: 'Gigawatt-hour', category: 'energy', normalized: 'GWh' },
    { input: 'Terajoule', category: 'energy', normalized: 'TJ' },

    // Ratios
    {
      input: 'USD/Liter',
      currency: 'USD',
      category: 'composite',
      isComposite: true,
    },
    {
      input: 'KRW/Hour',
      currency: 'KRW',
      category: 'composite',
      timeScale: 'hour',
      isComposite: true,
    },

    // Population and counts
    { input: 'persons', category: 'population', normalized: 'persons' },
    {
      input: 'per 1000 people',
      category: 'rate',
      normalized: 'per 1000 people',
    },
    {
      input: 'doses per 100 people',
      category: 'count',
      normalized: 'doses per 100 people',
    },
    { input: 'households', category: 'count', normalized: 'households' },

    // Indices
    { input: 'points', category: 'index', normalized: 'points' },
    { input: 'index', category: 'index', normalized: 'index' },
  ];

  for (const test of realWorldUnits) {
    const result = parseUnit(test.input);
    assertEquals(
      result.category,
      test.category,
      `Category mismatch for "${test.input}"`
    );

    if (test.currency) {
      assertEquals(
        result.currency,
        test.currency,
        `Currency mismatch for "${test.input}"`
      );
    }
    if (test.scale) {
      assertEquals(
        result.scale,
        test.scale,
        `Scale mismatch for "${test.input}"`
      );
    }
    if (test.timeScale) {
      assertEquals(
        result.timeScale,
        test.timeScale,
        `TimeScale mismatch for "${test.input}"`
      );
    }
    if (test.normalized) {
      assertEquals(
        result.normalized,
        test.normalized,
        `Normalized mismatch for "${test.input}"`
      );
    }
    if (test.isComposite !== undefined) {
      assertEquals(
        result.isComposite,
        test.isComposite,
        `IsComposite mismatch for "${test.input}"`
      );
    }
  }
});

Deno.test('Integration - normalize values with unit parsing', () => {
  const fx: FXTable = {
    base: 'USD',
    rates: {
      EUR: 0.85,
      GBP: 0.75,
      JPY: 150,
      NGN: 1500,
      KES: 150,
    },
  };

  // Test 1: Currency conversion with magnitude scaling
  const val1 = normalizeValue(100, 'USD Million', {
    toCurrency: 'EUR',
    toMagnitude: 'billions',
    fx,
  });
  assertEquals(Math.round(val1 * 1000) / 1000, 0.085);

  // Test 2: Flow normalization (currency + time + magnitude)
  // 12 USD Million per month
  // -> 0.012 USD Billion per month (magnitude: 12 / 1000)
  // -> 0.144 USD Billion per year (time: 0.012 * 12)
  // -> 0.1224 EUR Billion per year (currency: 0.144 * 0.85)
  const val2 = normalizeValue(12, 'USD Million per month', {
    toCurrency: 'EUR',
    toMagnitude: 'billions',
    toTimeScale: 'year',
    fx,
  });
  assertEquals(Math.round(val2 * 10000) / 10000, 0.1224);

  // Test 3: Wage conversion (USD/Hour to EUR/Day assuming 8 hour day)
  const val3 = normalizeValue(50, 'USD/Hour', {
    toCurrency: 'EUR',
    toTimeScale: 'day',
    fx,
  });
  // 50 USD/hour * 0.85 EUR/USD * 24 hours/day = 1020 EUR/day
  assertEquals(Math.round(val3), 1020);
});

Deno.test('Integration - handle all unit formats from dataset', () => {
  // Sample of actual units from the dataset
  const datasetUnits = [
    'percent',
    'percent of GDP',
    'EUR Billion',
    'USD Million',
    'NGN Billion',
    'KES Billion',
    'EUR Million',
    'USD Billion',
    'Index',
    'BBL/D/1K',
    'percentage points',
    'basis points',
    'USD/Liter',
    'KRW/Hour',
    'persons',
    'per 1000 people',
    'doses per 100 people',
    'Gigawatt-hour',
    'Terajoule',
    'hectares',
    'thousand tonnes',
    'households',
    'vehicles',
    'workers',
    'students',
  ];

  // Ensure all units can be parsed without errors
  for (const unit of datasetUnits) {
    const result = parseUnit(unit);
    // Should not be unknown for any known unit
    if (unit !== '') {
      assertEquals(
        result.category !== 'unknown',
        true,
        `Unit "${unit}" was not recognized`
      );
    }
  }
});
