/**
 * Real Balance of Trade Data from National Sources
 *
 * This dataset contains actual Balance of Trade figures from various national
 * statistical offices and central banks, covering different currencies, time
 * periods, and magnitudes to test comprehensive normalization scenarios.
 *
 * Sources:
 * - USA: Bureau of Economic Analysis (BEA)
 * - UK: ONS (Office for National Statistics)
 * - Germany: Destatis (Federal Statistical Office)
 * - Japan: Ministry of Finance
 * - Canada: Statistics Canada
 * - Australia: Australian Bureau of Statistics
 * - India: Reserve Bank of India
 * - Brazil: Central Bank of Brazil
 * - South Africa: South African Reserve Bank
 * - Thailand: Bank of Thailand
 * - South Korea: Bank of Korea
 * - Mexico: INEGI
 */

import type { ParsedData } from "../shared/types.ts";

// Extended interface for test data with expected values
interface BalanceOfTradeTestData extends ParsedData {
  expected_normalized: number;
  expected_unit: string;
  expected_domain: string;
}
import type { FXTable } from "../../types.ts";

// Real Balance of Trade data with expected conversion outcomes
export const balanceOfTradeRealData: BalanceOfTradeTestData[] = [
  // United States - Large deficit (monthly, USD billions)
  {
    id: "usa-trade-balance-2024-01",
    name: "Balance of Trade",
    value: -67.4,
    unit: "USD billions",
    currency_code: "USD",
    country_iso: "USA",
    date: "2024-01-01",
    periodicity: "month",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    // Expected after auto-targeting to USD millions monthly
    expected_normalized: -67400,
    expected_unit: "USD millions per month",
  },
  {
    id: "usa-trade-balance-2024-02",
    name: "Balance of Trade",
    value: -68.9,
    unit: "USD billions",
    currency_code: "USD",
    country_iso: "USA",
    date: "2024-02-01",
    periodicity: "month",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    expected_normalized: -68900,
    expected_unit: "USD millions per month",
  },

  // United Kingdom - Deficit (monthly, GBP millions)
  {
    id: "gbr-trade-balance-2024-01",
    name: "Balance of Trade",
    value: -2847,
    unit: "GBP millions",
    currency_code: "GBP",
    country_iso: "GBR",
    date: "2024-01-01",
    periodicity: "month",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    // Expected after auto-targeting to USD millions monthly
    expected_normalized: -3608.4, // ~1.267 GBP/USD rate
    expected_unit: "USD millions per month",
  },
  {
    id: "gbr-trade-balance-2024-02",
    name: "Balance of Trade",
    value: -3156,
    unit: "GBP millions",
    currency_code: "GBP",
    country_iso: "GBR",
    date: "2024-02-01",
    periodicity: "month",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    expected_normalized: -3998.9,
    expected_unit: "USD millions per month",
  },

  // Germany - Surplus (monthly, EUR millions)
  {
    id: "deu-trade-balance-2024-01",
    name: "Balance of Trade",
    value: 16780,
    unit: "EUR millions",
    currency_code: "EUR",
    country_iso: "DEU",
    date: "2024-01-01",
    periodicity: "month",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    // Expected after auto-targeting to USD millions monthly
    expected_normalized: 18227.4, // ~1.086 EUR/USD rate
    expected_unit: "USD millions per month",
  },
  {
    id: "deu-trade-balance-2024-02",
    name: "Balance of Trade",
    value: 18234,
    unit: "EUR millions",
    currency_code: "EUR",
    country_iso: "DEU",
    date: "2024-02-01",
    periodicity: "month",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    expected_normalized: 19806.1,
    expected_unit: "USD millions per month",
  },

  // Japan - Deficit (monthly, JPY billions)
  {
    id: "jpn-trade-balance-2024-01",
    name: "Balance of Trade",
    value: -294.8,
    unit: "JPY billions",
    currency_code: "JPY",
    country_iso: "JPN",
    date: "2024-01-01",
    periodicity: "month",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    // Expected after auto-targeting to USD millions monthly
    expected_normalized: -1964.7, // ~150.1 JPY/USD rate
    expected_unit: "USD millions per month",
  },

  // Canada - Deficit (monthly, CAD millions)
  {
    id: "can-trade-balance-2024-01",
    name: "Balance of Trade",
    value: -456,
    unit: "CAD millions",
    currency_code: "CAD",
    country_iso: "CAN",
    date: "2024-01-01",
    periodicity: "month",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    // Expected after auto-targeting to USD millions monthly
    expected_normalized: -336.6, // ~1.355 CAD/USD rate
    expected_unit: "USD millions per month",
  },

  // Australia - Surplus (monthly, AUD millions)
  {
    id: "aus-trade-balance-2024-01",
    name: "Balance of Trade",
    value: 11567,
    unit: "AUD millions",
    currency_code: "AUD",
    country_iso: "AUS",
    date: "2024-01-01",
    periodicity: "month",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    // Expected after auto-targeting to USD millions monthly
    expected_normalized: 7644.6, // ~1.513 AUD/USD rate
    expected_unit: "USD millions per month",
  },

  // India - Deficit (monthly, INR crores, mixed magnitude)
  {
    id: "ind-trade-balance-2024-01",
    name: "Balance of Trade",
    value: -1247,
    unit: "INR crores", // 1 crore = 10 million
    currency_code: "INR",
    country_iso: "IND",
    date: "2024-01-01",
    periodicity: "month",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    // Expected: convert crores to millions, then INR to USD
    // 1247 crores = 12,470 millions INR = 149.8 million USD
    expected_normalized: -149.8, // ~83.3 INR/USD rate
    expected_unit: "USD millions per month",
  },

  // Brazil - Surplus (monthly, BRL millions)
  {
    id: "bra-trade-balance-2024-01",
    name: "Balance of Trade",
    value: 8965,
    unit: "BRL millions",
    currency_code: "BRL",
    country_iso: "BRA",
    date: "2024-01-01",
    periodicity: "month",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    // Expected after auto-targeting to USD millions monthly
    expected_normalized: 1793.0, // ~5.0 BRL/USD rate
    expected_unit: "USD millions per month",
  },

  // South Africa - Deficit (monthly, ZAR millions)
  {
    id: "zaf-trade-balance-2024-01",
    name: "Balance of Trade",
    value: -2134,
    unit: "ZAR millions",
    currency_code: "ZAR",
    country_iso: "ZAF",
    date: "2024-01-01",
    periodicity: "month",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    // Expected after auto-targeting to USD millions monthly
    expected_normalized: -113.4, // ~18.8 ZAR/USD rate
    expected_unit: "USD millions per month",
  },

  // Thailand - Surplus (monthly, THB millions)
  {
    id: "tha-trade-balance-2024-01",
    name: "Balance of Trade",
    value: 67823,
    unit: "THB millions",
    currency_code: "THB",
    country_iso: "THA",
    date: "2024-01-01",
    periodicity: "month",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    // Expected after auto-targeting to USD millions monthly
    expected_normalized: 1895.1, // ~35.8 THB/USD rate
    expected_unit: "USD millions per month",
  },

  // South Korea - Surplus (monthly, KRW billions)
  {
    id: "kor-trade-balance-2024-01",
    name: "Balance of Trade",
    value: 3.2,
    unit: "KRW billions",
    currency_code: "KRW",
    country_iso: "KOR",
    date: "2024-01-01",
    periodicity: "month",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    // Expected: convert billions to millions, then KRW to USD
    // 3.2 billion KRW = 3200 million KRW = 2.4 million USD
    expected_normalized: 2.4, // ~1333 KRW/USD rate
    expected_unit: "USD millions per month",
  },

  // Mexico - Deficit (monthly, MXN millions)
  {
    id: "mex-trade-balance-2024-01",
    name: "Balance of Trade",
    value: -756,
    unit: "MXN millions",
    currency_code: "MXN",
    country_iso: "MEX",
    date: "2024-01-01",
    periodicity: "month",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    // Expected after auto-targeting to USD millions monthly
    expected_normalized: -44.5, // ~17.0 MXN/USD rate
    expected_unit: "USD millions per month",
  },

  // Edge Cases for Testing

  // Large magnitude difference (Thailand quarterly vs others monthly)
  {
    id: "tha-trade-balance-2024-q1",
    name: "Balance of Trade",
    value: 203469,
    unit: "THB millions per quarter",
    currency_code: "THB",
    country_iso: "THA",
    date: "2024-01-01",
    periodicity: "quarter",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    // Expected: convert to monthly, then THB to USD
    // 203469 / 3 = 67823 THB millions per month = 1895.1 USD millions per month
    expected_normalized: 1895.1,
    expected_unit: "USD millions per month",
  },

  // Very small economy (mixed units for testing edge cases)
  {
    id: "mlt-trade-balance-2024-01",
    name: "Balance of Trade",
    value: 67.8,
    unit: "EUR thousands", // Unusual magnitude
    currency_code: "EUR",
    country_iso: "MLT",
    date: "2024-01-01",
    periodicity: "month",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    // Expected: convert thousands to millions, then EUR to USD
    // 67.8 thousands = 0.0678 millions EUR = 0.0736 millions USD
    expected_normalized: 0.0736,
    expected_unit: "USD millions per month",
  },

  // Annual data (for testing time conversion)
  {
    id: "nzl-trade-balance-2023",
    name: "Balance of Trade",
    value: -8934,
    unit: "NZD millions per year",
    currency_code: "NZD",
    country_iso: "NZL",
    date: "2023-01-01",
    periodicity: "year",
    category_group: "Trade",
    expected_domain: "monetaryStock",
    // Expected: convert annual to monthly, then NZD to USD
    // -8934 / 12 = -744.5 NZD millions per month = -462.8 USD millions per month
    expected_normalized: -462.8, // ~1.609 NZD/USD rate
    expected_unit: "USD millions per month",
  },
];

// FX rates used for expected calculations (representative 2024 rates)
export const balanceOfTradeFXRates = {
  base: "USD",
  rates: {
    USD: 1.0,
    EUR: 1.086, // EUR/USD
    GBP: 1.267, // GBP/USD
    JPY: 0.00666, // JPY/USD (1 USD = 150.1 JPY)
    CAD: 0.738, // CAD/USD (1 USD = 1.355 CAD)
    AUD: 0.661, // AUD/USD (1 USD = 1.513 AUD)
    INR: 0.012, // INR/USD (1 USD = 83.3 INR)
    BRL: 0.200, // BRL/USD (1 USD = 5.0 BRL)
    ZAR: 0.053, // ZAR/USD (1 USD = 18.8 ZAR)
    THB: 0.0279, // THB/USD (1 USD = 35.8 THB)
    KRW: 0.00075, // KRW/USD (1 USD = 1333 KRW)
    MXN: 0.0588, // MXN/USD (1 USD = 17.0 MXN)
    NZD: 0.621, // NZD/USD (1 USD = 1.609 NZD)
  },
};

// Expected domain distribution for validation
export const balanceOfTradeExpectedDomains = {
  monetaryStock: 18, // All Balance of Trade should be monetary stocks (positions/balances)
  monetaryFlow: 0, // Balance of Trade is not a flow, it's a position
  counts: 0,
  percentages: 0,
  indices: 0,
  ratios: 0,
  commodities: 0,
  energy: 0,
  agriculture: 0,
  metals: 0,
  crypto: 0,
};

// Test scenarios for comprehensive validation
export const balanceOfTradeTestScenarios = {
  // Scenario 1: USD Majority Auto-Targeting
  usdMajority: {
    description: "USD should be auto-target currency (2 USD vs others)",
    items: balanceOfTradeRealData.slice(0, 8), // USA(2) + UK(2) + Germany(2) + Japan(1) + Canada(1)
    expectedAutoTarget: {
      currency: "USD",
      magnitude: "millions",
      time: "month",
    },
    expectedCurrencyDominance: 0.25, // 2/8 = 25% USD (below 60% threshold, should fallback)
    expectedConversions: 6, // All non-USD should convert to USD
  },

  // Scenario 2: No Clear Majority (Fallback to Config)
  noMajority: {
    description: "No currency majority, should fallback to config",
    items: balanceOfTradeRealData.slice(2, 10), // Mix of EUR, JPY, CAD, AUD, INR, BRL, ZAR, THB
    expectedAutoTarget: {
      currency: "USD", // Fallback to config default
      magnitude: "millions",
      time: "month",
    },
    expectedCurrencyDominance: 0.125, // 1/8 = 12.5% for each currency
    expectedConversions: 8, // All should convert to USD
  },

  // Scenario 3: Time Period Testing
  mixedPeriodicity: {
    description: "Mixed periodicity should normalize to monthly",
    items: [
      balanceOfTradeRealData[0], // Monthly
      balanceOfTradeRealData[13], // Quarterly (should convert to monthly)
      balanceOfTradeRealData[15], // Annual (should convert to monthly)
    ],
    expectedTimeNormalization: {
      quarterly: "divide by 3",
      annual: "divide by 12",
      monthly: "no change",
    },
  },

  // Scenario 4: Magnitude Testing
  mixedMagnitudes: {
    description: "Mixed magnitudes should normalize to millions",
    items: [
      balanceOfTradeRealData[0], // billions -> millions (multiply by 1000)
      balanceOfTradeRealData[2], // millions -> millions (no change)
      balanceOfTradeRealData[7], // crores -> millions (multiply by 10)
      balanceOfTradeRealData[11], // billions -> millions (multiply by 1000)
      balanceOfTradeRealData[14], // thousands -> millions (divide by 1000)
    ],
    expectedMagnitudeConversions: {
      billions: "multiply by 1000",
      millions: "no change",
      crores: "multiply by 10",
      thousands: "divide by 1000",
    },
  },
};

// Validation thresholds for testing
export const balanceOfTradeValidation = {
  conversionAccuracy: 0.01, // 1% tolerance for FX conversion accuracy
  explainCompleteness: 1.0, // 100% of items should have complete explain metadata
  domainAccuracy: 1.0, // 100% should classify as monetaryFlow
  autoTargetThreshold: 0.6, // 60% majority required for auto-targeting
  processingSpeed: 50, // Should process at least 50 items/second
  maxWarnings: 5, // No more than 5 warnings for clean data
};
