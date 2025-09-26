/**
 * Parity testing fixtures for comparing V1 vs V2 outputs
 * Curated datasets spanning all domains with known expected behaviors
 */

import { fxFallbackExtended } from "./indicators-organized.ts";

// Core monetary indicators (stocks and flows)
export const monetaryParitySet = [
  // Monetary stocks (GDP, debt, reserves)
  {
    id: "gdp-usa-2023",
    value: 25000,
    unit: "USD billions",
    category_group: "GDP",
    periodicity: "annual",
    expected_domain: "monetaryStock",
  },
  {
    id: "gdp-eur-2023",
    value: 15000,
    unit: "EUR billions",
    category_group: "GDP",
    periodicity: "annual",
    expected_domain: "monetaryStock",
  },
  {
    id: "debt-jpn-2023",
    value: 1200,
    unit: "JPY trillions",
    category_group: "debt",
    periodicity: "annual",
    expected_domain: "monetaryStock",
  },

  // Monetary flows (wages, trade)
  {
    id: "wage-uk-2023",
    value: 35000,
    unit: "GBP per year",
    category_group: "wages",
    periodicity: "annual",
    expected_domain: "monetaryFlow",
  },
  {
    id: "wage-de-2023",
    value: 4500,
    unit: "EUR per month",
    category_group: "wages",
    periodicity: "monthly",
    expected_domain: "monetaryFlow",
  },
  {
    id: "trade-balance-2023",
    value: -50,
    unit: "USD billions",
    category_group: "trade",
    periodicity: "quarterly",
    expected_domain: "monetaryStock",
  },
];

// Count-based indicators
export const countsParitySet = [
  {
    id: "population-usa-2023",
    value: 335000000,
    unit: "people",
    category_group: "population",
    periodicity: "annual",
    expected_domain: "counts",
  },
  {
    id: "vehicles-de-2023",
    value: 48000000,
    unit: "vehicles",
    category_group: "transport",
    periodicity: "annual",
    expected_domain: "counts",
  },
  {
    id: "households-fr-2023",
    value: 30500000,
    unit: "households",
    category_group: "demographics",
    periodicity: "annual",
    expected_domain: "counts",
  },
];

// Percentage indicators
export const percentagesParitySet = [
  {
    id: "unemployment-usa-2023",
    value: 3.7,
    unit: "%",
    category_group: "unemployment",
    periodicity: "monthly",
    expected_domain: "percentages",
  },
  {
    id: "inflation-eur-2023",
    value: 2.1,
    unit: "percent",
    category_group: "inflation",
    periodicity: "annual",
    expected_domain: "percentages",
  },
  {
    id: "interest-rate-2023",
    value: 5.25,
    unit: "% per annum",
    category_group: "rates",
    periodicity: "quarterly",
    expected_domain: "percentages",
  },
];

// Index indicators
export const indicesParitySet = [
  {
    id: "cpi-usa-2023",
    value: 307.2,
    unit: "index points",
    category_group: "prices",
    periodicity: "monthly",
    expected_domain: "indices",
  },
  {
    id: "pmi-manufacturing-2023",
    value: 52.1,
    unit: "points",
    category_group: "manufacturing",
    periodicity: "monthly",
    expected_domain: "indices",
  },
  {
    id: "stock-index-2023",
    value: 4500,
    unit: "index",
    category_group: "finance",
    periodicity: "daily",
    expected_domain: "indices",
  },
];

// Ratio indicators
export const ratiosParitySet = [
  {
    id: "debt-to-gdp-2023",
    value: 1.2,
    unit: "ratio",
    category_group: "finance",
    periodicity: "annual",
    expected_domain: "ratios",
  },
  {
    id: "price-earnings-2023",
    value: 18.5,
    unit: "ratio",
    category_group: "finance",
    periodicity: "quarterly",
    expected_domain: "ratios",
  },
  {
    id: "current-ratio-2023",
    value: 1.8,
    unit: "ratio",
    category_group: "finance",
    periodicity: "quarterly",
    expected_domain: "ratios",
  },
];

// Energy indicators
export const energyParitySet = [
  {
    id: "electricity-usa-2023",
    value: 4200,
    unit: "TWh",
    category_group: "electricity",
    periodicity: "annual",
    expected_domain: "energy",
  },
  {
    id: "gas-consumption-2023",
    value: 850,
    unit: "bcm",
    category_group: "gas",
    periodicity: "monthly",
    expected_domain: "energy",
  },
  {
    id: "oil-production-2023",
    value: 12.5,
    unit: "million barrels per day",
    category_group: "oil",
    periodicity: "daily",
    expected_domain: "energy",
  },
];

// Commodities indicators
export const commoditiesParitySet = [
  {
    id: "oil-price-2023",
    value: 85.50,
    unit: "USD per barrel",
    category_group: "oil",
    periodicity: "daily",
    expected_domain: "commodities",
  },
  {
    id: "gold-price-2023",
    value: 1950,
    unit: "USD per ounce",
    category_group: "gold",
    periodicity: "daily",
    expected_domain: "commodities",
  },
  {
    id: "wheat-price-2023",
    value: 650,
    unit: "USD per tonne",
    category_group: "agriculture",
    periodicity: "daily",
    expected_domain: "commodities",
  },
];

// Agriculture indicators
export const agricultureParitySet = [
  {
    id: "wheat-production-2023",
    value: 750,
    unit: "million tonnes",
    category_group: "agriculture",
    periodicity: "annual",
    expected_domain: "agriculture",
  },
  {
    id: "corn-yield-2023",
    value: 180,
    unit: "bushels per acre",
    category_group: "agriculture",
    periodicity: "annual",
    expected_domain: "agriculture",
  },
  {
    id: "livestock-cattle-2023",
    value: 95000000,
    unit: "head",
    category_group: "agriculture",
    periodicity: "annual",
    expected_domain: "agriculture",
  },
];

// Metals indicators
export const metalsParitySet = [
  {
    id: "steel-production-2023",
    value: 1900,
    unit: "million tonnes",
    category_group: "metals",
    periodicity: "annual",
    expected_domain: "metals",
  },
  {
    id: "copper-price-2023",
    value: 8500,
    unit: "USD per tonne",
    category_group: "metals",
    periodicity: "daily",
    expected_domain: "metals",
  },
  {
    id: "aluminum-inventory-2023",
    value: 1200000,
    unit: "tonnes",
    category_group: "metals",
    periodicity: "monthly",
    expected_domain: "metals",
  },
];

// Crypto indicators
export const cryptoParitySet = [
  {
    id: "bitcoin-price-2023",
    value: 45000,
    unit: "USD per BTC",
    category_group: "crypto",
    periodicity: "daily",
    expected_domain: "crypto",
  },
  {
    id: "ethereum-price-2023",
    value: 3200,
    unit: "USD per ETH",
    category_group: "crypto",
    periodicity: "daily",
    expected_domain: "crypto",
  },
  {
    id: "crypto-market-cap-2023",
    value: 1.2,
    unit: "USD trillions",
    category_group: "crypto",
    periodicity: "daily",
    expected_domain: "crypto",
  },
];

// Combined comprehensive parity dataset
export const comprehensiveParitySet = [
  ...monetaryParitySet,
  ...countsParitySet,
  ...percentagesParitySet,
  ...indicesParitySet,
  ...ratiosParitySet,
  ...energyParitySet,
  ...commoditiesParitySet,
  ...agricultureParitySet,
  ...metalsParitySet,
  ...cryptoParitySet,
];

// Edge cases for parity testing
export const edgeCasesParitySet = [
  // Mixed currencies with auto-targeting
  {
    id: "mixed-eur-dominant-1",
    value: 1000,
    unit: "EUR millions",
    category_group: "GDP",
    periodicity: "annual",
  },
  {
    id: "mixed-eur-dominant-2",
    value: 2000,
    unit: "EUR millions",
    category_group: "GDP",
    periodicity: "annual",
  },
  {
    id: "mixed-eur-dominant-3",
    value: 1500,
    unit: "EUR millions",
    category_group: "GDP",
    periodicity: "annual",
  },
  {
    id: "mixed-usd-minority",
    value: 500,
    unit: "USD millions",
    category_group: "GDP",
    periodicity: "annual",
  },

  // Time scale variations
  {
    id: "wage-daily",
    value: 200,
    unit: "USD per day",
    category_group: "wages",
    periodicity: "daily",
  },
  {
    id: "wage-weekly",
    value: 1000,
    unit: "GBP per week",
    category_group: "wages",
    periodicity: "weekly",
  },

  // Large/small values
  {
    id: "very-large-gdp",
    value: 1e15,
    unit: "USD",
    category_group: "GDP",
    periodicity: "annual",
  },
  {
    id: "very-small-rate",
    value: 0.001,
    unit: "percent",
    category_group: "rates",
    periodicity: "daily",
  },
];

// FX rates for parity testing
export const parityFXRates = fxFallbackExtended;

// Test configurations for parity
export const parityConfigs = {
  // Standard USD targeting
  usdTarget: {
    targetCurrency: "USD" as const,
    targetMagnitude: "millions" as const,
    targetTimeScale: "month" as const,
    autoTargetByIndicator: false,
    useLiveFX: false,
    fxFallback: parityFXRates,
    explain: true,
  },

  // Auto-targeting enabled
  autoTarget: {
    autoTargetByIndicator: true,
    targetTimeScale: "month" as const,
    useLiveFX: false,
    fxFallback: parityFXRates,
    explain: true,
  },

  // EUR targeting
  eurTarget: {
    targetCurrency: "EUR" as const,
    targetMagnitude: "billions" as const,
    targetTimeScale: "year" as const,
    autoTargetByIndicator: false,
    useLiveFX: false,
    fxFallback: parityFXRates,
    explain: true,
  },
};
