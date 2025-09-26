/**
 * Expected Results for Synthetic Test Data
 *
 * Defines the exact expected outputs for each synthetic test case
 * based on V2 workflow classification and normalization logic.
 */

import type { ParsedData } from "../shared/types.ts";

// Standard test configuration used for expectations
export const STANDARD_CONFIG = {
  targetCurrency: "USD",
  targetMagnitude: "millions" as const,
  targetTimeScale: "month" as const,
  fxRates: {
    EUR: 1.1, // 1 EUR = 1.1 USD
    GBP: 1.25, // 1 GBP = 1.25 USD
    JPY: 0.007, // 1 JPY = 0.007 USD
    CNY: 0.14, // 1 CNY = 0.14 USD
    INR: 0.012, // 1 INR = 0.012 USD
    NGN: 0.0013, // 1 NGN = 0.0013 USD
    KES: 0.0078, // 1 KES = 0.0078 USD
    ZAR: 0.055, // 1 ZAR = 0.055 USD
    BRL: 0.20, // 1 BRL = 0.20 USD
    KRW: 0.00075, // 1 KRW = 0.00075 USD
    HKD: 0.13, // 1 HKD = 0.13 USD
    CHF: 1.10, // 1 CHF = 1.10 USD
  },
};

export interface ExpectedResult extends ParsedData {
  id: string;
  expectedNormalizedValue: number;
  expectedNormalizedUnit: string;
  expectedDomain:
    | "monetaryStock"
    | "monetaryFlow"
    | "counts"
    | "percentages"
    | "indices"
    | "energy"
    | "commodities"
    | "agriculture"
    | "metals"
    | "crypto"
    | "ratios";
  expectedQualityScore?: number;
  expectedFXApplied: boolean;
  expectedFXRate?: number;
  expectedExplain: {
    originalUnit: string;
    normalizedUnit: string;
    conversionApplied: boolean;
    conversionSummary: string;
    fx?: {
      originalCurrency: string;
      targetCurrency: string;
      rate: number;
      source: "live" | "fallback";
    };
    magnitude?: {
      originalScale: string;
      targetScale: string;
      factor: number;
    };
    time?: {
      originalTimeScale: string;
      targetTimeScale: string;
      factor: number;
    };
  };
}

// ============================================================================
// SECTION 1: MONETARY STOCK EXPECTATIONS
// ============================================================================

export const expectedMonetaryStocks: ExpectedResult[] = [
  // GDP USD variants - magnitude conversion only
  {
    id: "gdp_usd_k",
    value: 25000000,
    unit: "USD Thousand",
    name: "GDP (Small Economy)",
    expectedNormalizedValue: 25000, // 25M thousands → 25M millions
    expectedNormalizedUnit: "USD millions",
    expectedDomain: "monetaryStock",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "USD Thousand",
      normalizedUnit: "USD millions",
      conversionApplied: true,
      conversionSummary: "Converted from thousands to millions scale",
      magnitude: {
        originalScale: "thousands",
        targetScale: "millions",
        factor: 0.001,
      },
    },
  },
  {
    id: "gdp_usd_m",
    value: 25000,
    unit: "USD Million",
    name: "GDP (Medium Economy)",
    expectedNormalizedValue: 25000, // Already in millions
    expectedNormalizedUnit: "USD millions",
    expectedDomain: "monetaryStock",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "USD Million",
      normalizedUnit: "USD millions",
      conversionApplied: false,
      conversionSummary:
        "No conversion needed - already in target currency and scale",
    },
  },
  {
    id: "gdp_usd_b",
    value: 25,
    unit: "USD Billion",
    name: "GDP (Large Economy)",
    expectedNormalizedValue: 25000, // 25 billions → 25,000 millions
    expectedNormalizedUnit: "USD millions",
    expectedDomain: "monetaryStock",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "USD Billion",
      normalizedUnit: "USD millions",
      conversionApplied: true,
      conversionSummary: "Converted from billions to millions scale",
      magnitude: {
        originalScale: "billions",
        targetScale: "millions",
        factor: 1000,
      },
    },
  },

  // EUR stocks - FX + magnitude conversion
  {
    id: "debt_eur_m",
    value: 5000,
    unit: "EUR Million",
    name: "National Debt (Medium)",
    expectedNormalizedValue: 5500, // 5000 * 1.1 EUR/USD
    expectedNormalizedUnit: "USD millions",
    expectedDomain: "monetaryStock",
    expectedFXApplied: true,
    expectedFXRate: 1.1,
    expectedExplain: {
      originalUnit: "EUR Million",
      normalizedUnit: "USD millions",
      conversionApplied: true,
      conversionSummary: "Converted from EUR to USD using exchange rate",
      fx: {
        originalCurrency: "EUR",
        targetCurrency: "USD",
        rate: 1.1,
        source: "fallback",
      },
    },
  },
  {
    id: "debt_eur_b",
    value: 5,
    unit: "EUR Billion",
    name: "National Debt (Large)",
    expectedNormalizedValue: 5500, // 5 * 1000 (B→M) * 1.1 (EUR→USD) = 5500
    expectedNormalizedUnit: "USD millions",
    expectedDomain: "monetaryStock",
    expectedFXApplied: true,
    expectedFXRate: 1.1,
    expectedExplain: {
      originalUnit: "EUR Billion",
      normalizedUnit: "USD millions",
      conversionApplied: true,
      conversionSummary: "Converted EUR billions to USD millions",
      fx: {
        originalCurrency: "EUR",
        targetCurrency: "USD",
        rate: 1.1,
        source: "fallback",
      },
      magnitude: {
        originalScale: "billions",
        targetScale: "millions",
        factor: 1000,
      },
    },
  },

  // Other currencies
  {
    id: "reserves_gbp_m",
    value: 1500,
    unit: "GBP Million",
    name: "Foreign Reserves",
    expectedNormalizedValue: 1875, // 1500 * 1.25 GBP/USD
    expectedNormalizedUnit: "USD millions",
    expectedDomain: "monetaryStock",
    expectedFXApplied: true,
    expectedFXRate: 1.25,
    expectedExplain: {
      originalUnit: "GBP Million",
      normalizedUnit: "USD millions",
      conversionApplied: true,
      conversionSummary: "Converted from GBP to USD using exchange rate",
      fx: {
        originalCurrency: "GBP",
        targetCurrency: "USD",
        rate: 1.25,
        source: "fallback",
      },
    },
  },
  {
    id: "reserves_jpy_b",
    value: 120,
    unit: "JPY Billion",
    name: "Central Bank Reserves",
    expectedNormalizedValue: 840, // 120 * 1000 * 0.007 = 840
    expectedNormalizedUnit: "USD millions",
    expectedDomain: "monetaryStock",
    expectedFXApplied: true,
    expectedFXRate: 0.007,
    expectedExplain: {
      originalUnit: "JPY Billion",
      normalizedUnit: "USD millions",
      conversionApplied: true,
      conversionSummary: "Converted JPY billions to USD millions",
      fx: {
        originalCurrency: "JPY",
        targetCurrency: "USD",
        rate: 0.007,
        source: "fallback",
      },
      magnitude: {
        originalScale: "billions",
        targetScale: "millions",
        factor: 1000,
      },
    },
  },

  // Emerging market currencies
  {
    id: "budget_ngn_b",
    value: 15,
    unit: "NGN Billion",
    name: "Government Budget",
    expectedNormalizedValue: 19.5, // 15 * 1000 * 0.0013 = 19.5
    expectedNormalizedUnit: "USD millions",
    expectedDomain: "monetaryStock",
    expectedFXApplied: true,
    expectedFXRate: 0.0013,
    expectedExplain: {
      originalUnit: "NGN Billion",
      normalizedUnit: "USD millions",
      conversionApplied: true,
      conversionSummary: "Converted NGN billions to USD millions",
      fx: {
        originalCurrency: "NGN",
        targetCurrency: "USD",
        rate: 0.0013,
        source: "fallback",
      },
      magnitude: {
        originalScale: "billions",
        targetScale: "millions",
        factor: 1000,
      },
    },
  },
];

// ============================================================================
// SECTION 2: MONETARY FLOW EXPECTATIONS
// ============================================================================

export const expectedMonetaryFlows: ExpectedResult[] = [
  // USD wages - time conversion only
  {
    id: "wage_usd_hour",
    value: 25,
    unit: "USD per hour",
    name: "Hourly Wage",
    expectedNormalizedValue: 0.018261, // 25 * 730.44 hours/month / 1M = 0.018261 millions
    expectedNormalizedUnit: "USD millions per month",
    expectedDomain: "monetaryFlow",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "USD per hour",
      normalizedUnit: "USD millions per month",
      conversionApplied: true,
      conversionSummary: "Converted from per hour to per month time scale",
      time: {
        originalTimeScale: "hour",
        targetTimeScale: "month",
        factor: 730.44, // ~24 * 30.44 hours per month
      },
    },
  },
  {
    id: "wage_usd_month",
    value: 4500,
    unit: "USD per month",
    name: "Monthly Salary",
    expectedNormalizedValue: 0.0045, // 4500 → 0.0045 millions
    expectedNormalizedUnit: "USD millions per month",
    expectedDomain: "monetaryFlow",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "USD per month",
      normalizedUnit: "USD millions per month",
      conversionApplied: true,
      conversionSummary: "Converted to millions scale",
      magnitude: {
        originalScale: "ones",
        targetScale: "millions",
        factor: 0.000001,
      },
    },
  },
  {
    id: "wage_usd_year",
    value: 54000,
    unit: "USD per year",
    name: "Annual Salary",
    expectedNormalizedValue: 0.0045, // 54000 / 12 months = 4500 → 0.0045 millions
    expectedNormalizedUnit: "USD millions per month",
    expectedDomain: "monetaryFlow",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "USD per year",
      normalizedUnit: "USD millions per month",
      conversionApplied: true,
      conversionSummary:
        "Converted from per year to per month and to millions scale",
      time: {
        originalTimeScale: "year",
        targetTimeScale: "month",
        factor: 0.0833, // 1/12
      },
      magnitude: {
        originalScale: "ones",
        targetScale: "millions",
        factor: 0.000001,
      },
    },
  },

  // EUR wages - FX + time conversion
  {
    id: "wage_eur_month",
    value: 3800,
    unit: "EUR per month",
    name: "Monthly Salary (EUR)",
    expectedNormalizedValue: 0.00418, // 3800 * 1.1 EUR/USD = 4180 → 0.00418 millions
    expectedNormalizedUnit: "USD millions per month",
    expectedDomain: "monetaryFlow",
    expectedFXApplied: true,
    expectedFXRate: 1.1,
    expectedExplain: {
      originalUnit: "EUR per month",
      normalizedUnit: "USD millions per month",
      conversionApplied: true,
      conversionSummary: "Converted from EUR to USD and to millions scale",
      fx: {
        originalCurrency: "EUR",
        targetCurrency: "USD",
        rate: 1.1,
        source: "fallback",
      },
      magnitude: {
        originalScale: "ones",
        targetScale: "millions",
        factor: 0.000001,
      },
    },
  },

  // Complex conversions - JPY with time + FX + magnitude
  {
    id: "wage_jpy_month",
    value: 280000,
    unit: "JPY per month",
    name: "Japanese Monthly Salary",
    expectedNormalizedValue: 0.00196, // 280000 * 0.007 JPY/USD = 1960 → 0.00196 millions
    expectedNormalizedUnit: "USD millions per month",
    expectedDomain: "monetaryFlow",
    expectedFXApplied: true,
    expectedFXRate: 0.007,
    expectedExplain: {
      originalUnit: "JPY per month",
      normalizedUnit: "USD millions per month",
      conversionApplied: true,
      conversionSummary: "Converted from JPY to USD and to millions scale",
      fx: {
        originalCurrency: "JPY",
        targetCurrency: "USD",
        rate: 0.007,
        source: "fallback",
      },
      magnitude: {
        originalScale: "ones",
        targetScale: "millions",
        factor: 0.000001,
      },
    },
  },

  // Revenue with magnitudes
  {
    id: "revenue_usd_mil_year",
    value: 150,
    unit: "USD Million per year",
    name: "Annual Revenue",
    expectedNormalizedValue: 12.5, // 150 / 12 months = 12.5 millions
    expectedNormalizedUnit: "USD millions per month",
    expectedDomain: "monetaryFlow",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "USD Million per year",
      normalizedUnit: "USD millions per month",
      conversionApplied: true,
      conversionSummary: "Converted from per year to per month time scale",
      time: {
        originalTimeScale: "year",
        targetTimeScale: "month",
        factor: 0.0833,
      },
    },
  },
];

// ============================================================================
// SECTION 3: COUNTS DOMAIN EXPECTATIONS
// ============================================================================

export const expectedCounts: ExpectedResult[] = [
  {
    id: "pop_total",
    value: 50000000,
    unit: "persons",
    name: "Total Population",
    expectedNormalizedValue: 50000000,
    expectedNormalizedUnit: "ones",
    expectedDomain: "counts",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "persons",
      normalizedUnit: "ones",
      conversionApplied: true,
      conversionSummary: "Normalized to count units (ones)",
    },
  },
  {
    id: "households_total",
    value: 15000000,
    unit: "households",
    name: "Total Households",
    expectedNormalizedValue: 15000000,
    expectedNormalizedUnit: "ones",
    expectedDomain: "counts",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "households",
      normalizedUnit: "ones",
      conversionApplied: true,
      conversionSummary: "Normalized to count units (ones)",
    },
  },
  {
    id: "items_million",
    value: 2.5,
    unit: "Million items",
    name: "Mass Produced Items",
    expectedNormalizedValue: 2500000, // 2.5 * 1,000,000
    expectedNormalizedUnit: "ones",
    expectedDomain: "counts",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "Million items",
      normalizedUnit: "ones",
      conversionApplied: true,
      conversionSummary:
        "Converted from millions scale to individual count units",
      magnitude: {
        originalScale: "millions",
        targetScale: "ones",
        factor: 1000000,
      },
    },
  },
];

// ============================================================================
// SECTION 4: PERCENTAGES DOMAIN EXPECTATIONS
// ============================================================================

export const expectedPercentages: ExpectedResult[] = [
  {
    id: "unemployment_rate",
    value: 5.2,
    unit: "percent",
    name: "Unemployment Rate",
    expectedNormalizedValue: 5.2,
    expectedNormalizedUnit: "%",
    expectedDomain: "percentages",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "percent",
      normalizedUnit: "%",
      conversionApplied: true,
      conversionSummary: "Standardized percentage format",
    },
  },
  {
    id: "inflation_rate",
    value: 3.1,
    unit: "%",
    name: "Inflation Rate",
    expectedNormalizedValue: 3.1,
    expectedNormalizedUnit: "%",
    expectedDomain: "percentages",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "%",
      normalizedUnit: "%",
      conversionApplied: false,
      conversionSummary: "Percentage values passed through unchanged",
    },
  },
  {
    id: "interest_change",
    value: 0.75,
    unit: "percentage points",
    name: "Interest Rate Change",
    expectedNormalizedValue: 0.75,
    expectedNormalizedUnit: "pp",
    expectedDomain: "percentages",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "percentage points",
      normalizedUnit: "pp",
      conversionApplied: true,
      conversionSummary: "Standardized percentage points format",
    },
  },
  {
    id: "bond_yield_change",
    value: 25,
    unit: "basis points",
    name: "Bond Yield Change",
    expectedNormalizedValue: 25,
    expectedNormalizedUnit: "bps",
    expectedDomain: "percentages",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "basis points",
      normalizedUnit: "bps",
      conversionApplied: true,
      conversionSummary: "Standardized basis points format",
    },
  },
  {
    id: "debt_to_gdp",
    value: 65.5,
    unit: "percent of GDP",
    name: "Debt-to-GDP Ratio",
    expectedNormalizedValue: 65.5,
    expectedNormalizedUnit: "% of GDP",
    expectedDomain: "percentages",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "percent of GDP",
      normalizedUnit: "% of GDP",
      conversionApplied: true,
      conversionSummary: "Standardized relative percentage format",
    },
  },
];

// ============================================================================
// SECTION 5: INDICES DOMAIN EXPECTATIONS
// ============================================================================

export const expectedIndices: ExpectedResult[] = [
  {
    id: "stock_index_main",
    value: 2850.5,
    unit: "points",
    name: "Main Stock Index",
    expectedNormalizedValue: 2850.5,
    expectedNormalizedUnit: "points",
    expectedDomain: "indices",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "points",
      normalizedUnit: "points",
      conversionApplied: false,
      conversionSummary: "Index values preserved in original units",
    },
  },
  {
    id: "consumer_confidence",
    value: 105.2,
    unit: "index",
    name: "Consumer Confidence Index",
    expectedNormalizedValue: 105.2,
    expectedNormalizedUnit: "index",
    expectedDomain: "indices",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "index",
      normalizedUnit: "index",
      conversionApplied: false,
      conversionSummary: "Index values preserved in original units",
    },
  },
  {
    id: "stock_index_tech",
    value: 4250.8,
    unit: "Points", // Capital P
    name: "Technology Index",
    expectedNormalizedValue: 4250.8,
    expectedNormalizedUnit: "Points",
    expectedDomain: "indices",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "Points",
      normalizedUnit: "Points",
      conversionApplied: false,
      conversionSummary: "Index values preserved in original units",
    },
  },
];

// ============================================================================
// SECTION 6: PHYSICAL DOMAINS EXPECTATIONS
// ============================================================================

export const expectedPhysical: ExpectedResult[] = [
  // Energy domain
  {
    id: "electricity_gwh",
    value: 150.5,
    unit: "GWh",
    name: "Electricity Generation",
    expectedNormalizedValue: 150.5,
    expectedNormalizedUnit: "GWh",
    expectedDomain: "commodities",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "GWh",
      normalizedUnit: "GWh",
      conversionApplied: false,
      conversionSummary: "Energy units preserved (no standardization in V2)",
    },
  },
  {
    id: "electricity_long",
    value: 150.5,
    unit: "Gigawatt-hour",
    name: "Power Generation",
    expectedNormalizedValue: 150.5,
    expectedNormalizedUnit: "Gigawatt-hour",
    expectedDomain: "commodities",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "Gigawatt-hour",
      normalizedUnit: "Gigawatt-hour",
      conversionApplied: false,
      conversionSummary: "Energy units preserved (no standardization in V2)",
    },
  },

  // Commodities
  {
    id: "oil_short",
    value: 2500,
    unit: "BBL/D/1K",
    name: "Daily Oil Output",
    expectedNormalizedValue: 2500,
    expectedNormalizedUnit: "BBL/D/1K",
    expectedDomain: "commodities",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "BBL/D/1K",
      normalizedUnit: "BBL/D/1K",
      conversionApplied: false,
      conversionSummary: "Commodity units preserved in original form",
    },
  },

  // Agriculture
  {
    id: "wheat_production",
    value: 850.5,
    unit: "thousand tonnes",
    name: "Wheat Production",
    expectedNormalizedValue: 850.5,
    expectedNormalizedUnit: "thousand tonnes",
    expectedDomain: "agriculture",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "thousand tonnes",
      normalizedUnit: "thousand tonnes",
      conversionApplied: false,
      conversionSummary: "Agriculture units preserved in original form",
    },
  },
  {
    id: "rice_harvest",
    value: 1250.8,
    unit: "Tonnes", // Capital T
    name: "Rice Harvest",
    expectedNormalizedValue: 1250.8,
    expectedNormalizedUnit: "Tonnes",
    expectedDomain: "agriculture",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "Tonnes",
      normalizedUnit: "Tonnes",
      conversionApplied: false,
      conversionSummary: "Agriculture units preserved in original form",
    },
  },

  // Metals
  {
    id: "gold_production",
    value: 125.5,
    unit: "tonnes",
    name: "Gold Production",
    expectedNormalizedValue: 125.5,
    expectedNormalizedUnit: "tonnes",
    expectedDomain: "metals",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "tonnes",
      normalizedUnit: "tonnes",
      conversionApplied: false,
      conversionSummary: "Metal units preserved in original form",
    },
  },
  {
    id: "co2_short",
    value: 125500,
    unit: "KT",
    name: "CO2 Emissions",
    expectedNormalizedValue: 125500,
    expectedNormalizedUnit: "KT",
    expectedDomain: "agriculture", // Environmental often classified as agriculture
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "KT",
      normalizedUnit: "KT",
      conversionApplied: false,
      conversionSummary: "Agriculture units preserved in original form",
    },
  },
];

// ============================================================================
// SECTION 7: RATES AND RATIOS EXPECTATIONS
// ============================================================================

export const expectedRates: ExpectedResult[] = [
  {
    id: "oil_price",
    value: 85.50,
    unit: "USD per barrel",
    name: "Crude Oil Price",
    expectedNormalizedValue: 85.50,
    expectedNormalizedUnit: "USD per barrel",
    expectedDomain: "ratios",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "USD per barrel",
      normalizedUnit: "USD per barrel",
      conversionApplied: false,
      conversionSummary: "Ratio values maintained in original form",
    },
  },
  {
    id: "birth_rate",
    value: 12.5,
    unit: "per 1000 people",
    name: "Birth Rate",
    expectedNormalizedValue: 12.5,
    expectedNormalizedUnit: "per 1000 people",
    expectedDomain: "ratios",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "per 1000 people",
      normalizedUnit: "per 1000 people",
      conversionApplied: false,
      conversionSummary: "Ratio values maintained in original form",
    },
  },
  {
    id: "price_earnings",
    value: 18.5,
    unit: "ratio",
    name: "Price-to-Earnings Ratio",
    expectedNormalizedValue: 18.5,
    expectedNormalizedUnit: "ratio",
    expectedDomain: "ratios",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "ratio",
      normalizedUnit: "ratio",
      conversionApplied: false,
      conversionSummary: "Ratio values maintained in original form",
    },
  },
];

// ============================================================================
// SECTION 8: CRYPTO DOMAIN EXPECTATIONS
// ============================================================================

export const expectedCrypto: ExpectedResult[] = [
  {
    id: "bitcoin_price",
    value: 42500.50,
    unit: "USD",
    name: "Bitcoin Price",
    expectedNormalizedValue: 42500.50,
    expectedNormalizedUnit: "USD",
    expectedDomain: "crypto",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "USD",
      normalizedUnit: "USD",
      conversionApplied: false,
      conversionSummary: "Cryptocurrency units preserved in original form",
    },
  },
  {
    id: "btc_market_cap",
    value: 850.5,
    unit: "USD Billion",
    name: "Bitcoin Market Cap",
    expectedNormalizedValue: 850500, // 850.5 * 1000 (B→M)
    expectedNormalizedUnit: "USD millions",
    expectedDomain: "crypto", // But with monetary conversion since it has magnitude
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "USD Billion",
      normalizedUnit: "USD millions",
      conversionApplied: true,
      conversionSummary: "Converted from billions to millions scale",
      magnitude: {
        originalScale: "billions",
        targetScale: "millions",
        factor: 1000,
      },
    },
  },
  {
    id: "eth_gas_price",
    value: 25.5,
    unit: "gwei",
    name: "Ethereum Gas Price",
    expectedNormalizedValue: 25.5,
    expectedNormalizedUnit: "gwei",
    expectedDomain: "crypto",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "gwei",
      normalizedUnit: "gwei",
      conversionApplied: false,
      conversionSummary: "Cryptocurrency units preserved in original form",
    },
  },
];

// ============================================================================
// SECTION 9: EDGE CASES EXPECTATIONS
// ============================================================================

export const expectedEdgeCases: ExpectedResult[] = [
  {
    id: "mixed_case",
    value: 125.5,
    unit: "UsD MiLlIoN",
    name: "Mixed Case Currency",
    expectedNormalizedValue: 125.5,
    expectedNormalizedUnit: "USD millions", // Should normalize case
    expectedDomain: "monetaryStock",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "UsD MiLlIoN",
      normalizedUnit: "USD millions",
      conversionApplied: true,
      conversionSummary: "Normalized case and format",
    },
  },
  {
    id: "zero_value",
    value: 0,
    unit: "USD Million",
    name: "Zero Value Test",
    expectedNormalizedValue: 0,
    expectedNormalizedUnit: "USD millions",
    expectedDomain: "monetaryStock",
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "USD Million",
      normalizedUnit: "USD millions",
      conversionApplied: false,
      conversionSummary:
        "No conversion needed - already in target currency and scale",
    },
  },
  {
    id: "negative_value",
    value: -125.5,
    unit: "EUR Billion",
    name: "Negative Value",
    expectedNormalizedValue: -138050, // -125.5 * 1000 * 1.1 = -138050
    expectedNormalizedUnit: "USD millions",
    expectedDomain: "monetaryStock",
    expectedFXApplied: true,
    expectedFXRate: 1.1,
    expectedExplain: {
      originalUnit: "EUR Billion",
      normalizedUnit: "USD millions",
      conversionApplied: true,
      conversionSummary:
        "Converted EUR billions to USD millions (negative value preserved)",
      fx: {
        originalCurrency: "EUR",
        targetCurrency: "USD",
        rate: 1.1,
        source: "fallback",
      },
      magnitude: {
        originalScale: "billions",
        targetScale: "millions",
        factor: 1000,
      },
    },
  },
  {
    id: "just_currency",
    value: 125.5,
    unit: "USD",
    name: "Just Currency Code",
    expectedNormalizedValue: 0.0001255, // 125.5 → 0.0001255 millions
    expectedNormalizedUnit: "USD millions",
    expectedDomain: "monetaryStock", // Will classify as stock without time component
    expectedFXApplied: false,
    expectedExplain: {
      originalUnit: "USD",
      normalizedUnit: "USD millions",
      conversionApplied: true,
      conversionSummary: "Converted to millions scale",
      magnitude: {
        originalScale: "ones",
        targetScale: "millions",
        factor: 0.000001,
      },
    },
  },
];

// ============================================================================
// COMBINED EXPECTATIONS
// ============================================================================

export const allExpectedResults: ExpectedResult[] = [
  ...expectedMonetaryStocks,
  ...expectedMonetaryFlows,
  ...expectedCounts,
  ...expectedPercentages,
  ...expectedIndices,
  ...expectedPhysical,
  ...expectedRates,
  ...expectedCrypto,
  ...expectedEdgeCases,
];

export const expectedByDomain = {
  monetaryStock: expectedMonetaryStocks,
  monetaryFlow: expectedMonetaryFlows,
  counts: expectedCounts,
  percentages: expectedPercentages,
  indices: expectedIndices,
  physical: expectedPhysical,
  rates: expectedRates,
  crypto: expectedCrypto,
  edgeCases: expectedEdgeCases,
};

/**
 * Utility to get expected result by ID
 */
export function getExpectedResult(id: string): ExpectedResult | undefined {
  return allExpectedResults.find((result) => result.id === id);
}

/**
 * Helper to validate actual vs expected results
 */
export function validateResult(
  actual: any,
  expected: ExpectedResult,
): { passed: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check normalized value (with tolerance for floating point)
  const valueTolerance = Math.abs(expected.expectedNormalizedValue * 0.001); // 0.1% tolerance
  const valueDiff = Math.abs(
    actual.normalizedValue - expected.expectedNormalizedValue,
  );
  if (valueDiff > valueTolerance) {
    errors.push(
      `Value mismatch: expected ${expected.expectedNormalizedValue}, got ${actual.normalizedValue}`,
    );
  }

  // Check normalized unit
  if (actual.normalizedUnit !== expected.expectedNormalizedUnit) {
    errors.push(
      `Unit mismatch: expected "${expected.expectedNormalizedUnit}", got "${actual.normalizedUnit}"`,
    );
  }

  // Check FX application
  const hasFX = !!(actual.explain?.fx);
  if (hasFX !== expected.expectedFXApplied) {
    errors.push(
      `FX application mismatch: expected ${expected.expectedFXApplied}, got ${hasFX}`,
    );
  }

  // Check FX rate if applicable
  if (expected.expectedFXApplied && expected.expectedFXRate) {
    const actualRate = actual.explain?.fx?.rate;
    if (actualRate) {
      // Handle both rate formats: EUR->USD (1.1) or USD->EUR (0.909)
      const directMatch =
        Math.abs(actualRate - expected.expectedFXRate) < 0.001;
      const inverseMatch =
        Math.abs(actualRate - (1 / expected.expectedFXRate)) < 0.001;
      if (!directMatch && !inverseMatch) {
        errors.push(
          `FX rate mismatch: expected ${expected.expectedFXRate}, got ${actualRate}`,
        );
      }
    } else {
      errors.push(`Missing FX rate`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}
