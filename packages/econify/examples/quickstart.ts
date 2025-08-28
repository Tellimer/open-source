/**
 * Econify Quickstart Example
 * 
 * Simple, clean API - no XState knowledge required!
 */

import { processEconomicData } from '../src/main.ts';

// Your economic data
const economicData = [
  { value: 100, unit: 'USD Million', name: 'Q1 Revenue' },
  { value: 110, unit: 'USD Million', name: 'Q2 Revenue' },
  { value: 16500, unit: 'EUR Billion', name: 'EU GDP' },
  { value: 3.5, unit: 'percent', name: 'Inflation Rate' },
];

// Process the data
const result = await processEconomicData(economicData, {
  // Convert everything to EUR billions
  targetCurrency: 'EUR',
  targetMagnitude: 'billions',
  
  // Provide exchange rates
  fxFallback: {
    base: 'USD',
    rates: { EUR: 0.92 }
  }
});

// Use the results
console.log(`✅ Processed ${result.data.length} indicators`);
console.log(`📊 Quality score: ${result.metrics.qualityScore}/100`);
console.log(`⏱️ Time: ${result.metrics.processingTime}ms\n`);

result.data.forEach(item => {
  const value = (item.normalized || item.value).toFixed(2);
  const unit = item.normalizedUnit || item.unit;
  console.log(`${item.name}: ${value} ${unit}`);
});

// That's it! No XState, no complexity, just clean results.