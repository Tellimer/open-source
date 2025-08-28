/**
 * Currency normalization functions
 */

import type { FXTable } from '../types.ts';

// ----------------------- Currency Normalization -----------------------
/**
 * Convert a monetary value from one currency to another using an FX table.
 *
 * @param value Amount in the source currency
 * @param from Source currency code (e.g. "EUR")
 * @param to Target currency code (e.g. "USD")
 * @param table FX rates with a base currency and rates map
 * @returns Converted amount in the target currency
 * @throws If required FX rates are missing or invalid
 */
export function normalizeCurrencyValue(
  value: number,
  from: string,
  to: string,
  table: FXTable
): number {
  const src = from.toUpperCase(),
    dst = to.toUpperCase(),
    base = table.base.toUpperCase();
  if (src === dst) return value;
  let vBase: number;
  if (src === base) vBase = value;
  else if (table.rates[src] != null) {
    const srcPerBase = table.rates[src];
    if (srcPerBase === 0) throw new Error(`Invalid FX rate for ${src}`);
    vBase = value / srcPerBase;
  } else {
    throw new Error(`No FX rate available to convert from ${src} to ${base}`);
  }
  if (dst === base) return vBase;
  const dstPerBase = table.rates[dst];
  if (dstPerBase == null) {
    throw new Error(`No FX rate available to convert from ${base} to ${dst}`);
  }
  return vBase * dstPerBase;
}
