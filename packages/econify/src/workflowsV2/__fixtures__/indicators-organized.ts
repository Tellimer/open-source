/**
 * Comprehensive V2 Test Fixtures for Economic Indicators
 *
 * Organization:
 * 1. FX Rate Tables - Currency exchange rates
 * 2. Core Test Sets - Basic domain coverage
 * 3. Realistic DB Sets - Based on actual Tellimer data
 * 4. Scale-Specific Sets - Testing different magnitudes
 * 5. Domain Collections - Grouped by indicator type
 * 6. Edge Cases - Special formats and edge conditions
 * 7. Combined Sets - Pre-assembled test suites
 */

import type { ParsedData } from "../shared/types.ts";

// Enhanced fixture type to include all DB fields for testing fallback logic
export interface FixtureData extends Omit<ParsedData, "periodicity" | "scale"> {
  id: string;
  value: number;
  unit: string;
  name: string;
  periodicity?:
    | "Daily"
    | "Weekly"
    | "Monthly"
    | "Quarterly"
    | "Yearly"
    | null
    | undefined;
  scale?: string | null | undefined;
  currency_code?: string | null;
  category_group?: string;
}

// ============================================================================
// SECTION 1: FX RATE TABLES
// ============================================================================

/**
 * Basic FX table with major currencies only
 * Use for simple tests that don't need comprehensive currency coverage
 */
export const fxBasic = {
  base: "USD",
  rates: {
    EUR: 1.1,
    GBP: 1.25,
    JPY: 0.007,
    AUD: 0.65,
  },
  dates: {
    EUR: "2024-02-01",
    GBP: "2024-02-01",
    JPY: "2024-02-01",
    AUD: "2024-02-01",
  },
};

/**
 * Comprehensive FX table with 150+ currencies
 * Based on realistic exchange rates from Tellimer staging
 */
export const fxComprehensive = {
  base: "USD",
  rates: {
    // Major currencies
    EUR: 1.1,
    GBP: 1.25,
    JPY: 0.007,
    CHF: 1.10,

    // Commonwealth & Developed
    AUD: 0.65,
    NZD: 0.60,
    CAD: 0.75,
    SGD: 0.74,
    HKD: 0.13,

    // European (Non-Euro)
    NOK: 0.093,
    SEK: 0.095,
    DKK: 0.14,
    PLN: 0.25,
    CZK: 0.044,
    HUF: 0.0028,
    RON: 0.22,
    BGN: 0.56,
    HRK: 0.14,
    ISK: 0.0073,

    // Emerging Markets - Americas
    BRL: 0.20,
    MXN: 0.06,
    ARS: 0.0010,
    CLP: 0.0010,
    COP: 0.00023,
    PEN: 0.27,
    UYU: 0.024,
    BOB: 0.14,
    PYG: 0.00013,
    VES: 0.028,
    VEF: 0.0000001, // Venezuelan Bolívar Fuerte (old currency)

    // Emerging Markets - Asia
    CNY: 0.14,
    INR: 0.012,
    KRW: 0.00075,
    IDR: 0.000063,
    THB: 0.029,
    MYR: 0.22,
    PHP: 0.017,
    VND: 0.000039,
    PKR: 0.0036,
    BDT: 0.0091,

    // Middle East & North Africa
    AED: 0.27,
    SAR: 0.27,
    QAR: 0.27,
    KWD: 3.25,
    BHD: 2.65,
    OMR: 2.60,
    JOD: 1.41,
    ILS: 0.27,
    EGP: 0.032,
    MAD: 0.10,
    TND: 0.32,
    DZD: 0.0074,
    LYD: 0.21,

    // Sub-Saharan Africa
    ZAR: 0.055,
    NGN: 0.0013,
    KES: 0.0078,
    GHS: 0.083,
    ETB: 0.0081,
    UGX: 0.00027,
    TZS: 0.00040,
    RWF: 0.00077,
    ZMW: 0.037,
    BWP: 0.073,

    // CFA Zones
    XOF: 0.0017,
    XAF: 0.0017,

    // Former Soviet Union
    RUB: 0.011,
    UAH: 0.024,
    KZT: 0.0022,
    UZS: 0.000079,
    BYN: 0.31,
    AZN: 0.59,
    GEL: 0.37,
    AMD: 0.0025,
    KGS: 0.012,
    TJS: 0.091,

    // Other regions
    TRY: 0.032,
    RSD: 0.0094,
    MKD: 0.018,
    ALL: 0.011,
    BAM: 0.56,
    NAD: 0.055,
    LSL: 0.055,
    SZL: 0.055,
    MZN: 0.016,
    MWK: 0.00058,
    BIF: 0.00034,
    MGA: 0.00022,
    DJF: 0.0056,
    SOS: 0.0018,
    SDG: 0.0017,
    GMD: 0.014,
    SLL: 0.000045,
    LRD: 0.0052,
    GNF: 0.00012,
    CVE: 0.011,
    STN: 0.043,
    MUR: 0.022,
    SCR: 0.074,
    MVR: 0.065,
    LKR: 0.0031,
    NPR: 0.0075,
    BTN: 0.012,
    AFN: 0.014,
    MMK: 0.00048,
    LAK: 0.000046,
    KHR: 0.00025,
    MNT: 0.00029,
    MOP: 0.12,
    TWD: 0.031,
    BND: 0.74,

    // Caribbean & Central America
    JMD: 0.0064,
    TTD: 0.15,
    BBD: 0.50,
    BSD: 1.0,
    BZD: 0.50,
    XCD: 0.37,
    KYD: 1.20,
    BMD: 1.0,
    GYD: 0.0048,
    SRD: 0.028,
    GTQ: 0.13,
    HNL: 0.040,
    NIO: 0.027,
    CRC: 0.0020,
    PAB: 1.0,
    DOP: 0.017,

    // Pacific Islands
    FJD: 0.44,
    PGK: 0.25,
    SBD: 0.12,
    TOP: 0.42,
    VUV: 0.0084,
    WST: 0.36,

    // Additional for fixtures coverage
    AOA: 0.0012,
    LBP: 0.000011,
    SYP: 0.00004,
    HTG: 0.0073,
    CUP: 0.041,
    XPF: 0.0091,
    CDF: 0.00036,
    IQD: 0.00076,
    SSP: 0.0077,
    MDL: 0.056,
    KMF: 0.0022,
    KPW: 0.0011, // North Korean Won
    MRU: 0.025, // Mauritanian Ouguiya
  },
  // Dates object with same keys as rates
  dates: Object.fromEntries(
    Object.keys({
      EUR: 1,
      GBP: 1,
      JPY: 1,
      CHF: 1,
      AUD: 1,
      NZD: 1,
      CAD: 1,
      SGD: 1,
      HKD: 1,
      NOK: 1,
      SEK: 1,
      DKK: 1,
      PLN: 1,
      CZK: 1,
      HUF: 1,
      RON: 1,
      BGN: 1,
      HRK: 1,
      ISK: 1,
      BRL: 1,
      MXN: 1,
      ARS: 1,
      CLP: 1,
      COP: 1,
      PEN: 1,
      UYU: 1,
      BOB: 1,
      PYG: 1,
      VES: 1,
      VEF: 1,
      CNY: 1,
      INR: 1,
      KRW: 1,
      IDR: 1,
      THB: 1,
      MYR: 1,
      PHP: 1,
      VND: 1,
      PKR: 1,
      BDT: 1,
      AED: 1,
      SAR: 1,
      QAR: 1,
      KWD: 1,
      BHD: 1,
      OMR: 1,
      JOD: 1,
      ILS: 1,
      EGP: 1,
      MAD: 1,
      TND: 1,
      DZD: 1,
      LYD: 1,
      ZAR: 1,
      NGN: 1,
      KES: 1,
      GHS: 1,
      ETB: 1,
      UGX: 1,
      TZS: 1,
      RWF: 1,
      ZMW: 1,
      BWP: 1,
      XOF: 1,
      XAF: 1,
      RUB: 1,
      UAH: 1,
      KZT: 1,
      UZS: 1,
      BYN: 1,
      AZN: 1,
      GEL: 1,
      AMD: 1,
      KGS: 1,
      TJS: 1,
      TRY: 1,
      RSD: 1,
      MKD: 1,
      ALL: 1,
      BAM: 1,
      NAD: 1,
      LSL: 1,
      SZL: 1,
      MZN: 1,
      MWK: 1,
      BIF: 1,
      MGA: 1,
      DJF: 1,
      SOS: 1,
      SDG: 1,
      GMD: 1,
      SLL: 1,
      LRD: 1,
      GNF: 1,
      CVE: 1,
      STN: 1,
      MUR: 1,
      SCR: 1,
      MVR: 1,
      LKR: 1,
      NPR: 1,
      BTN: 1,
      AFN: 1,
      MMK: 1,
      LAK: 1,
      KHR: 1,
      MNT: 1,
      MOP: 1,
      TWD: 1,
      BND: 1,
      JMD: 1,
      TTD: 1,
      BBD: 1,
      BSD: 1,
      BZD: 1,
      XCD: 1,
      KYD: 1,
      BMD: 1,
      GYD: 1,
      SRD: 1,
      GTQ: 1,
      HNL: 1,
      NIO: 1,
      CRC: 1,
      PAB: 1,
      DOP: 1,
      FJD: 1,
      PGK: 1,
      SBD: 1,
      TOP: 1,
      VUV: 1,
      WST: 1,

      // Additional for fixtures coverage
      AOA: 1,
      LBP: 1,
      SYP: 1,
      HTG: 1,
      CUP: 1,
      XPF: 1,
      CDF: 1,
      IQD: 1,
      SSP: 1,
      MDL: 1,
      KMF: 1,
      KPW: 1,
      MRU: 1,
    }).map((k) => [k, "2024-02-01"]),
  ),
};

// ============================================================================
// SECTION 2: CORE TEST SETS - BASIC DOMAIN COVERAGE
// ============================================================================

/**
 * Basic monetary flow indicators (wages/income)
 * Covers major currencies and time periods
 */
export const monetaryFlowBasic: FixtureData[] = [
  {
    id: "wage_usd_hour",
    value: 15,
    unit: "USD per hour",
    name: "US Minimum Wage",
    periodicity: "Yearly",
    scale: null,
    currency_code: "USD",
    category_group: "Labour",
  },
  {
    id: "wage_usd_month",
    value: 3700,
    unit: "USD per month",
    name: "US Monthly Salary",
    periodicity: "Monthly",
    scale: null,
    currency_code: "USD",
    category_group: "Labour",
  },
  {
    id: "wage_usd_year",
    value: 44400,
    unit: "USD per year",
    name: "US Annual Salary",
    periodicity: "Yearly",
    scale: null,
    currency_code: "USD",
    category_group: "Labour",
  },
  {
    id: "wage_eur_month",
    value: 4100,
    unit: "EUR per month",
    name: "EU Monthly Salary",
    periodicity: "Monthly",
    scale: null,
    currency_code: "EUR",
    category_group: "Labour",
  },
  {
    id: "wage_gbp_week",
    value: 650,
    unit: "GBP per week",
    name: "UK Weekly Wage",
    periodicity: "Weekly",
    scale: null,
    currency_code: "GBP",
    category_group: "Labour",
  },
  {
    id: "wage_jpy_month",
    value: 280000,
    unit: "JPY per month",
    name: "JP Monthly Salary",
    periodicity: "Monthly",
    scale: null,
    currency_code: "JPY",
    category_group: "Labour",
  },
];

/**
 * Basic monetary stock indicators
 * Covers different scales (base, thousands, millions, billions)
 */
export const monetaryStockBasic: FixtureData[] = [
  {
    id: "gdp_usd",
    value: 23470,
    unit: "USD",
    name: "GDP per Capita",
    periodicity: "Yearly",
    scale: null,
    currency_code: "USD",
    category_group: "GDP",
  },
  {
    id: "budget_usd_mil",
    value: 850,
    unit: "USD millions",
    name: "Government Budget",
    periodicity: "Quarterly",
    scale: "Millions",
    currency_code: "USD",
    category_group: "Government",
  },
  {
    id: "gdp_usd_bil",
    value: 21.4,
    unit: "USD billions",
    name: "GDP Nominal",
    periodicity: "Yearly",
    scale: "Billions",
    currency_code: "USD",
    category_group: "GDP",
  },
  {
    id: "debt_eur_bil",
    value: 13.3,
    unit: "EUR billions",
    name: "National Debt",
    periodicity: "Yearly",
    scale: "Billions",
    currency_code: "EUR",
    category_group: "Government",
  },
];

/**
 * Basic non-monetary indicators
 * Covers percentages, indices, counts, energy, commodities
 */
export const nonMonetaryBasic: FixtureData[] = [
  // Percentages
  {
    id: "inflation",
    value: 3.5,
    unit: "%",
    name: "Inflation Rate",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Prices",
  },
  {
    id: "unemployment",
    value: 6.2,
    unit: "percent",
    name: "Unemployment Rate",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Labour",
  },
  {
    id: "debt_gdp",
    value: 68.5,
    unit: "percent of GDP",
    name: "Debt to GDP",
    periodicity: "Yearly",
    scale: null,
    currency_code: null,
    category_group: "Government",
  },

  // Indices
  {
    id: "confidence",
    value: 105.3,
    unit: "points",
    name: "Consumer Confidence",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Consumer",
  },
  {
    id: "corruption",
    value: 62.8,
    unit: "Points",
    name: "Corruption Index",
    periodicity: "Yearly",
    scale: null,
    currency_code: null,
    category_group: "Governance",
  },

  // Counts
  {
    id: "employment",
    value: 125000,
    unit: "Persons",
    name: "Employment Level",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Labour",
  },
  {
    id: "cars",
    value: 45000,
    unit: "Units",
    name: "Car Production",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Industry",
  },
  {
    id: "population",
    value: 68.5,
    unit: "Million",
    name: "Population",
    periodicity: "Yearly",
    scale: "Millions",
    currency_code: null,
    category_group: "Demographics",
  },

  // Energy
  {
    id: "electricity",
    value: 1250,
    unit: "GWh",
    name: "Electricity Production",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Energy",
  },
  {
    id: "emissions",
    value: 1850,
    unit: "KT",
    name: "CO2 Emissions",
    periodicity: "Yearly",
    scale: null,
    currency_code: null,
    category_group: "Climate",
  },

  // Commodities
  {
    id: "oil",
    value: 850,
    unit: "BBL/D/1K",
    name: "Crude Oil Output",
    periodicity: "Daily",
    scale: "Thousands",
    currency_code: null,
    category_group: "Energy",
  },
  {
    id: "wheat",
    value: 125000,
    unit: "Tonnes",
    name: "Wheat Production",
    periodicity: "Yearly",
    scale: null,
    currency_code: null,
    category_group: "Agriculture",
  },
  {
    id: "gold",
    value: 450,
    unit: "Tonnes",
    name: "Gold Reserves",
    periodicity: "Yearly",
    scale: null,
    currency_code: null,
    category_group: "Metals",
  },
];

// ============================================================================
// SECTION 3: AUTO-TARGET TEST SETS
// ============================================================================

/**
 * EUR-dominant set (80% EUR) for testing auto-target currency selection
 */
export const autoTargetEURDominant: FixtureData[] = [
  {
    id: "eur1",
    value: 100,
    unit: "EUR per month",
    name: "EUR Indicator 1",
    periodicity: "Monthly",
    scale: null,
    currency_code: "EUR",
    category_group: "Test",
  },
  {
    id: "eur2",
    value: 120,
    unit: "EUR per month",
    name: "EUR Indicator 2",
    periodicity: "Monthly",
    scale: null,
    currency_code: "EUR",
    category_group: "Test",
  },
  {
    id: "eur3",
    value: 110,
    unit: "EUR per month",
    name: "EUR Indicator 3",
    periodicity: "Monthly",
    scale: null,
    currency_code: "EUR",
    category_group: "Test",
  },
  {
    id: "eur4",
    value: 130,
    unit: "EUR per month",
    name: "EUR Indicator 4",
    periodicity: "Monthly",
    scale: null,
    currency_code: "EUR",
    category_group: "Test",
  },
  {
    id: "eur5",
    value: 115,
    unit: "EUR per month",
    name: "EUR Indicator 5",
    periodicity: "Monthly",
    scale: null,
    currency_code: "EUR",
    category_group: "Test",
  },
  {
    id: "eur6",
    value: 125,
    unit: "EUR per month",
    name: "EUR Indicator 6",
    periodicity: "Monthly",
    scale: null,
    currency_code: "EUR",
    category_group: "Test",
  },
  {
    id: "eur7",
    value: 118,
    unit: "EUR per month",
    name: "EUR Indicator 7",
    periodicity: "Monthly",
    scale: null,
    currency_code: "EUR",
    category_group: "Test",
  },
  {
    id: "eur8",
    value: 122,
    unit: "EUR per month",
    name: "EUR Indicator 8",
    periodicity: "Monthly",
    scale: null,
    currency_code: "EUR",
    category_group: "Test",
  },
  {
    id: "gbp1",
    value: 90,
    unit: "GBP per month",
    name: "GBP Indicator 1",
    periodicity: "Monthly",
    scale: null,
    currency_code: "GBP",
    category_group: "Test",
  },
  {
    id: "gbp2",
    value: 95,
    unit: "GBP per month",
    name: "GBP Indicator 2",
    periodicity: "Monthly",
    scale: null,
    currency_code: "GBP",
    category_group: "Test",
  },
];

/**
 * Below dominance threshold (50/50 EUR/GBP split)
 */
export const autoTargetNoDominance: FixtureData[] = [
  {
    id: "eur1",
    value: 100,
    unit: "EUR per month",
    name: "EUR 1",
    periodicity: "Monthly",
    scale: null,
    currency_code: "EUR",
    category_group: "Test",
  },
  {
    id: "eur2",
    value: 100,
    unit: "EUR per month",
    name: "EUR 2",
    periodicity: "Monthly",
    scale: null,
    currency_code: "EUR",
    category_group: "Test",
  },
  {
    id: "eur3",
    value: 100,
    unit: "EUR per month",
    name: "EUR 3",
    periodicity: "Monthly",
    scale: null,
    currency_code: "EUR",
    category_group: "Test",
  },
  {
    id: "eur4",
    value: 100,
    unit: "EUR per month",
    name: "EUR 4",
    periodicity: "Monthly",
    scale: null,
    currency_code: "EUR",
    category_group: "Test",
  },
  {
    id: "eur5",
    value: 100,
    unit: "EUR per month",
    name: "EUR 5",
    periodicity: "Monthly",
    scale: null,
    currency_code: "EUR",
    category_group: "Test",
  },
  {
    id: "gbp1",
    value: 100,
    unit: "GBP per month",
    name: "GBP 1",
    periodicity: "Monthly",
    scale: null,
    currency_code: "GBP",
    category_group: "Test",
  },
  {
    id: "gbp2",
    value: 100,
    unit: "GBP per month",
    name: "GBP 2",
    periodicity: "Monthly",
    scale: null,
    currency_code: "GBP",
    category_group: "Test",
  },
  {
    id: "gbp3",
    value: 100,
    unit: "GBP per month",
    name: "GBP 3",
    periodicity: "Monthly",
    scale: null,
    currency_code: "GBP",
    category_group: "Test",
  },
  {
    id: "gbp4",
    value: 100,
    unit: "GBP per month",
    name: "GBP 4",
    periodicity: "Monthly",
    scale: null,
    currency_code: "GBP",
    category_group: "Test",
  },
  {
    id: "gbp5",
    value: 100,
    unit: "GBP per month",
    name: "GBP 5",
    periodicity: "Monthly",
    scale: null,
    currency_code: "GBP",
    category_group: "Test",
  },
];

// ============================================================================
// SECTION 4: EDGE CASES AND SPECIAL FORMATS
// ============================================================================

/**
 * Edge cases for unit parsing and normalization
 */
export const edgeCases: FixtureData[] = [
  // Index variations
  { id: "idx_base", value: 100, unit: "Index", name: "Base Index" },
  {
    id: "idx_2010",
    value: 115.3,
    unit: "Index, 2010=100",
    name: "Price Index",
  },
  { id: "idx_pts", value: 88.5, unit: "index points", name: "Sentiment Index" },
  {
    id: "idx_pts_cap",
    value: 92.1,
    unit: "Index Points",
    name: "Market Index",
  },

  // Ratio and growth
  { id: "ratio", value: 1.45, unit: "Ratio", name: "Debt Service Ratio" },
  {
    id: "growth",
    value: 3.2,
    unit: "Annual % growth",
    name: "GDP Growth Rate",
  },
  { id: "change", value: -1.5, unit: "Percent change", name: "Export Change" },
  {
    id: "ppp_change",
    value: 2.8,
    unit: "Purchasing power parity; percent change",
    name: "PPP Growth",
  },

  // Special monetary formats
  {
    id: "cny_hm",
    value: 230,
    unit: "CNY hundred millions",
    name: "CN Gov Revenue",
  },
  {
    id: "idr_mil_mo",
    value: 4.9,
    unit: "IDR millions per month",
    name: "ID Min Wage",
  },
  {
    id: "usd_hm",
    value: 3.2,
    unit: "USD Hundred Million",
    name: "Infrastructure",
  },
  { id: "usd_cur", value: 2.8, unit: "U.S. dollars", name: "Exchange Rate" },

  // National/local currency
  {
    id: "nat_cur",
    value: 1250,
    unit: "National currency",
    name: "Budget Balance",
  },
  {
    id: "lcu_const",
    value: 890,
    unit: "Constant local currency units",
    name: "Real GDP",
  },
  {
    id: "lcu_current",
    value: 1100,
    unit: "Current local currency units",
    name: "Nominal GDP",
  },
  {
    id: "ppp_conv",
    value: 4.5,
    unit: "National currency per current international dollar",
    name: "PPP Factor",
  },

  // Special indicators
  { id: "sipri", value: 125, unit: "SIPRI TIV Million", name: "Arms Exports" },
  {
    id: "amt_cur",
    value: 890,
    unit: "AMT, current US$",
    name: "Alternative Min Tax",
  },
  {
    id: "dod_cur",
    value: 340,
    unit: "DOD, current USD",
    name: "Defense Spending",
  },
  {
    id: "bam_sqm",
    value: 4500,
    unit: "BAM/SQ. METRE",
    name: "Real Estate Price",
  },

  // Volume units
  {
    id: "gas_bcf",
    value: 125,
    unit: "billion cubic feet",
    name: "Natural Gas Storage",
  },
  {
    id: "oil_th_bbl",
    value: 450,
    unit: "Thousand Barrels",
    name: "Oil Storage",
  },
  { id: "cars_th", value: 89, unit: "Thousand units", name: "Vehicle Sales" },

  // Empty/lowercase variations
  { id: "empty", value: 100, unit: "", name: "No Unit Specified" },
  { id: "units_lc", value: 250, unit: "units", name: "Generic Units" },
  { id: "million_lc", value: 5.5, unit: "million", name: "Generic Million" },

  // GDP ratio variations
  {
    id: "pct_gdp_cap",
    value: 45.2,
    unit: "Percent of GDP",
    name: "Investment Rate",
  },
  { id: "pct_gdp_sym", value: 23.8, unit: "% of GDP", name: "Tax Revenue" },

  // Additional missing patterns from DB
  { id: "years", value: 65, unit: "Years", name: "Retirement Age" },
  { id: "celsius", value: 23.5, unit: "celsius", name: "Temperature" },
  { id: "mm", value: 850, unit: "mm", name: "Precipitation" },
  { id: "doses", value: 125000, unit: "doses", name: "Vaccine Doses" },
  { id: "usd_liter", value: 1.25, unit: "USD/Liter", name: "Gasoline Price" },
  { id: "eur_month", value: 1500, unit: "EUR/Month", name: "Minimum Wage" },
  { id: "eur_mwh", value: 85, unit: "EUR/MWh", name: "Electricity Price" },
  {
    id: "eur_sqm",
    value: 2500,
    unit: "EUR/SQ. METRE",
    name: "Real Estate Price",
  },
  {
    id: "php_sqm",
    value: 45000,
    unit: "PHP/SQ. METRE",
    name: "Property Price",
  },
  {
    id: "jpy_hundred_mil",
    value: 250,
    unit: "JPY Hundred Million",
    name: "Government Budget",
  },
  {
    id: "krw_hundred_mil",
    value: 180,
    unit: "KRW Hundred Million",
    name: "Trade Balance",
  },
  {
    id: "current_intl",
    value: 35000,
    unit: "Current international dollar",
    name: "GDP per capita PPP",
  },
  {
    id: "ppp_2017",
    value: 28000,
    unit: "Purchasing power parity; 2017 international dollar",
    name: "Real Income",
  },
  {
    id: "annual_growth",
    value: 2.8,
    unit: "Annual % growth",
    name: "Economic Growth",
  },
  {
    id: "percent_change",
    value: -1.2,
    unit: "Percent change",
    name: "Export Change",
  },
  {
    id: "ppp_percent",
    value: 3.1,
    unit: "Purchasing power parity; percent change",
    name: "PPP Growth",
  },

  // More monetary with different currencies and scales
  { id: "xof_bil", value: 125, unit: "XOF Billion", name: "WAEMU GDP" },
  { id: "xaf_bil", value: 95, unit: "XAF Billion", name: "CEMAC Reserves" },
  { id: "zar_mil", value: 450, unit: "ZAR Million", name: "Mining Revenue" },
  { id: "ngn_mil", value: 890, unit: "NGN Million", name: "Oil Exports" },
  { id: "rub_bil", value: 125, unit: "RUB Billion", name: "Energy Exports" },
  {
    id: "try_th",
    value: 450000,
    unit: "TRY Thousand",
    name: "Consumer Credit",
  },
  {
    id: "idr_bil",
    value: 2800,
    unit: "IDR Billion",
    name: "Government Budget",
  },
  { id: "vnd_bil", value: 4500, unit: "VND Billion", name: "Export Value" },
  { id: "cop_bil", value: 180, unit: "COP Billion", name: "Coffee Exports" },
  {
    id: "ars_mil",
    value: 320,
    unit: "ARS Million",
    name: "Agricultural Exports",
  },
  { id: "lbp_bil", value: 45, unit: "LBP Billion", name: "Banking Assets" },
  { id: "mwk_mil", value: 250, unit: "MWK Million", name: "Tobacco Exports" },
  { id: "zmw_mil", value: 180, unit: "ZMW Million", name: "Copper Revenue" },
  {
    id: "zmw_th",
    value: 890,
    unit: "ZMW Thousand",
    name: "Small Business Loans",
  },

  // Additional currencies from complete DB scan
  { id: "aed_bil", value: 125, unit: "AED Billion", name: "UAE GDP" },
  { id: "aed_mil", value: 890, unit: "AED Million", name: "Dubai Trade" },
  { id: "afn", value: 85, unit: "AFN", name: "Afghan Currency" },
  {
    id: "afn_mil",
    value: 250,
    unit: "AFN Million",
    name: "Afghanistan Budget",
  },
  { id: "all_month", value: 52000, unit: "ALL/Month", name: "Albania Wage" },
  { id: "amd_month", value: 68000, unit: "AMD/Month", name: "Armenia Wage" },
  { id: "amd_bil", value: 6.5, unit: "AMD Billion", name: "Armenia GDP" },
  { id: "aoa", value: 650, unit: "AOA", name: "Angolan Kwanza" },
  { id: "aoa_bil", value: 125, unit: "AOA Billion", name: "Angola GDP" },
  { id: "aoa_mil", value: 450, unit: "AOA Million", name: "Angola Trade" },
  { id: "aoa_month", value: 32000, unit: "AOA/Month", name: "Angola Min Wage" },
  { id: "ars_month", value: 156000, unit: "ARS/Month", name: "Argentina Wage" },
  {
    id: "aud_week",
    value: 882,
    unit: "AUD/Week",
    name: "Australia Weekly Wage",
  },
  { id: "aud_th", value: 125, unit: "AUD Thousand", name: "AU Small Business" },
  { id: "azn_month", value: 345, unit: "AZN/Month", name: "Azerbaijan Wage" },
  { id: "bam_month", value: 598, unit: "BAM/Month", name: "Bosnia Wage" },
  { id: "bam_th", value: 12, unit: "BAM Thousand", name: "Bosnia SME Credit" },
  { id: "bbd_mil", value: 45, unit: "BBD Million", name: "Barbados Trade" },
  { id: "bbd_th", value: 8.5, unit: "BBD Thousand", name: "Barbados Tourism" },
  { id: "bdt", value: 84, unit: "BDT", name: "Bangladesh Taka" },
  { id: "bdt_bil", value: 285, unit: "BDT Billion", name: "Bangladesh GDP" },
  { id: "bdt_month", value: 8000, unit: "BDT/Month", name: "Bangladesh Wage" },
  { id: "bgn_month", value: 933, unit: "BGN/Month", name: "Bulgaria Wage" },
  { id: "bgn_th", value: 45, unit: "BGN Thousand", name: "Bulgaria Credit" },
  { id: "bhd_month", value: 470, unit: "BHD/Month", name: "Bahrain Wage" },
  { id: "bif", value: 2905, unit: "BIF", name: "Burundi Franc" },
  { id: "bif_bil", value: 5600, unit: "BIF Billion", name: "Burundi GDP" },
  {
    id: "bil_bdt",
    value: 150,
    unit: "Billion BDT",
    name: "Bangladesh Reserves",
  },
  { id: "bil_usd", value: 25.6, unit: "Billion USD", name: "Regional GDP" },
  { id: "bil_xpf", value: 890, unit: "Billion XPF", name: "Pacific Trade" },
  { id: "bob", value: 6.9, unit: "BOB", name: "Boliviano Rate" },
  { id: "bob_month", value: 2362, unit: "BOB/Month", name: "Bolivia Wage" },
  { id: "bob_th", value: 25, unit: "BOB Thousand", name: "Bolivia Credit" },
  { id: "brl_month", value: 1412, unit: "BRL/Month", name: "Brazil Min Wage" },
  { id: "brl_th", value: 85, unit: "BRL Thousand", name: "Brazil Credit" },
  { id: "bwp_hour", value: 7.34, unit: "BWP/Hour", name: "Botswana Hourly" },
  { id: "bwp_month", value: 2000, unit: "BWP/Month", name: "Botswana Wage" },
  { id: "byn_month", value: 626, unit: "BYN/Month", name: "Belarus Wage" },
  { id: "byn_th", value: 15, unit: "BYN Thousand", name: "Belarus Credit" },
  { id: "bzd_mil", value: 125, unit: "BZD Million", name: "Belize Trade" },
  { id: "bzd_ths", value: 8.5, unit: "BZD Thousands", name: "Belize Tourism" },
  { id: "cad", value: 125500, unit: "CAD", name: "Canadian Dollar Amount" },
  { id: "cad_hour", value: 16.65, unit: "CAD/Hour", name: "Canada Min Wage" },
  { id: "cad_th", value: 95, unit: "CAD Thousand", name: "Canada SME Loan" },
  { id: "cdf", value: 2835, unit: "CDF", name: "Congo Franc" },
  { id: "cdf_mil", value: 450, unit: "CDF Million", name: "Congo Exports" },
  { id: "chf_month", value: 4200, unit: "CHF/Month", name: "Swiss Wage" },
  { id: "clp_hour", value: 2600, unit: "CLP/Hour", name: "Chile Hourly" },
  { id: "clp_month", value: 460000, unit: "CLP/Month", name: "Chile Min Wage" },
  { id: "cny", value: 7.3, unit: "CNY", name: "Chinese Yuan" },
  { id: "cny_bil", value: 17700, unit: "CNY Billion", name: "China GDP" },
  { id: "cny_month", value: 2590, unit: "CNY/Month", name: "China Min Wage" },
  {
    id: "cny_year",
    value: 120000,
    unit: "CNY/Year",
    name: "China Annual Income",
  },
  {
    id: "companies_ind",
    value: 2500,
    unit: "Companies and Individuals",
    name: "Business Registry",
  },
  { id: "cop_month", value: 1300000, unit: "COP/Month", name: "Colombia Wage" },
  {
    id: "crc_month",
    value: 365000,
    unit: "CRC/Month",
    name: "Costa Rica Wage",
  },
  { id: "cup_mil", value: 890, unit: "CUP Million", name: "Cuba Budget" },
  { id: "cup_month", value: 9500, unit: "CUP/Month", name: "Cuba Wage" },
  {
    id: "current_usd",
    value: 42000,
    unit: "Current USD",
    name: "Income Per Capita",
  },
  { id: "cve_month", value: 15000, unit: "CVE/Month", name: "Cape Verde Wage" },
  { id: "czk_bil", value: 250, unit: "CZK Billion", name: "Czech GDP" },
  { id: "czk_month", value: 18900, unit: "CZK/Month", name: "Czech Min Wage" },
  { id: "djf_mil", value: 125, unit: "DJF Million", name: "Djibouti Trade" },
  { id: "dkk_bil", value: 185, unit: "DKK Billion", name: "Denmark GDP" },
  { id: "dkk_month", value: 20000, unit: "DKK/Month", name: "Denmark Wage" },
  { id: "dkk_th", value: 450, unit: "DKK Thousand", name: "Denmark Credit" },
  { id: "dop_month", value: 21000, unit: "DOP/Month", name: "Dominican Wage" },
  { id: "dwellings", value: 125000, unit: "dwellings", name: "Housing Stock" },
  { id: "dzd_bil", value: 180, unit: "DZD Billion", name: "Algeria GDP" },
  {
    id: "dzd_month",
    value: 20000,
    unit: "DZD/Month",
    name: "Algeria Min Wage",
  },
  { id: "egp", value: 48.5, unit: "EGP", name: "Egyptian Pound" },
  { id: "egp_bil", value: 450, unit: "EGP Billion", name: "Egypt GDP" },
  { id: "egp_month", value: 3500, unit: "EGP/Month", name: "Egypt Min Wage" },
  { id: "etb", value: 125, unit: "ETB", name: "Ethiopian Birr" },
  { id: "etb_bil", value: 3200, unit: "ETB Billion", name: "Ethiopia GDP" },
  { id: "etb_month", value: 2500, unit: "ETB/Month", name: "Ethiopia Wage" },
  { id: "eur", value: 35000, unit: "EUR", name: "Euro Amount" },
  { id: "eur_hour", value: 12.5, unit: "EUR/Hour", name: "EU Min Wage" },
  { id: "eur_thous", value: 125, unit: "EUR Thous.", name: "EU SME Credit" },
  { id: "eur_week", value: 950, unit: "EUR/Week", name: "EU Weekly Wage" },
  { id: "eur_year", value: 48000, unit: "EUR/Year", name: "EU Annual Salary" },
  { id: "fcfa_mil", value: 250, unit: "FCFA Million", name: "CFA Trade" },
  { id: "fjd_mil", value: 85, unit: "FJD Million", name: "Fiji Trade" },
  { id: "fjd_th", value: 15, unit: "FJD Thousand", name: "Fiji Tourism" },
  { id: "gbp", value: 28500, unit: "GBP", name: "British Pound" },
  { id: "gbp_hour", value: 11.44, unit: "GBP/Hour", name: "UK Min Wage" },
  { id: "gel", value: 2.7, unit: "GEL", name: "Georgian Lari" },
  { id: "gel_month", value: 500, unit: "GEL/Month", name: "Georgia Wage" },
  { id: "gel_ths", value: 25, unit: "GEL Thousands", name: "Georgia Credit" },
  { id: "ghs_day", value: 18.15, unit: "GHS/Day", name: "Ghana Daily Wage" },
  { id: "gmd", value: 71, unit: "GMD", name: "Gambian Dalasi" },
  { id: "gmd_th", value: 45, unit: "GMD Thousand", name: "Gambia Trade" },
  { id: "gnf", value: 8600, unit: "GNF", name: "Guinean Franc" },
  { id: "gnf_bil", value: 125, unit: "GNF Billion", name: "Guinea GDP" },
  { id: "gtq_month", value: 3200, unit: "GTQ/Month", name: "Guatemala Wage" },
  { id: "gyd_bil", value: 2.5, unit: "GYD Billion", name: "Guyana GDP" },
  { id: "hkd_bil", value: 285, unit: "HKD Billion", name: "Hong Kong GDP" },
  { id: "hkd_hour", value: 40, unit: "HKD/Hour", name: "HK Min Wage" },
  {
    id: "hkd_month",
    value: 19000,
    unit: "HKD/Month",
    name: "HK Monthly Salary",
  },
  { id: "hnl_month", value: 11000, unit: "HNL/Month", name: "Honduras Wage" },
  { id: "hours", value: 40, unit: "Hours", name: "Work Week" },
  { id: "htg", value: 131, unit: "HTG", name: "Haitian Gourde" },
  { id: "htg_month", value: 7500, unit: "HTG/Month", name: "Haiti Wage" },
  { id: "huf_bil", value: 550, unit: "HUF Billion", name: "Hungary GDP" },
  {
    id: "huf_month",
    value: 266800,
    unit: "HUF/Month",
    name: "Hungary Min Wage",
  },
  { id: "hundred", value: 100, unit: "Hundred", name: "Count Hundred" },
  { id: "hundreds", value: 500, unit: "Hundreds", name: "Multiple Hundreds" },
  {
    id: "hundred_units",
    value: 250,
    unit: "Hundred Units",
    name: "Production Units",
  },
  { id: "idr", value: 15850, unit: "IDR", name: "Indonesian Rupiah" },
  {
    id: "idr_mil_month",
    value: 4.9,
    unit: "IDR Million/Month",
    name: "Indonesia Regional Wage",
  },
  {
    id: "idr_month",
    value: 4900000,
    unit: "IDR/Month",
    name: "Indonesia Wage",
  },
  { id: "idr_tril", value: 18.5, unit: "IDR Trillion", name: "Indonesia GDP" },
  { id: "ils_bil", value: 125, unit: "ILS Billion", name: "Israel GDP" },
  { id: "ils_month", value: 5880, unit: "ILS/Month", name: "Israel Min Wage" },
  { id: "individuals", value: 45000, unit: "Individuals", name: "Tax Payers" },
  {
    id: "inr_bil",
    value: 285,
    unit: "INR Billion",
    name: "India State Budget",
  },
  { id: "inr_day", value: 400, unit: "INR/Day", name: "India Daily Wage" },
  {
    id: "inr_month",
    value: 15000,
    unit: "INR/Month",
    name: "India Monthly Wage",
  },
  {
    id: "inr_tens_mil",
    value: 25,
    unit: "INR Tens of Million",
    name: "India Infrastructure",
  },
  { id: "iqd", value: 1310, unit: "IQD", name: "Iraqi Dinar" },
  { id: "iqd_bil", value: 450, unit: "IQD Billion", name: "Iraq GDP" },
  { id: "irr_bil", value: 8500, unit: "IRR Billion", name: "Iran GDP" },
  { id: "isk_bil", value: 4.5, unit: "ISK Billion", name: "Iceland GDP" },
  { id: "isk_month", value: 400000, unit: "ISK/Month", name: "Iceland Wage" },
  { id: "jmd_mil", value: 125, unit: "JMD Million", name: "Jamaica Trade" },
  { id: "jod_month", value: 260, unit: "JOD/Month", name: "Jordan Min Wage" },
  { id: "jod_ths", value: 15, unit: "JOD Thousands", name: "Jordan Credit" },
  { id: "jpy_hour", value: 1050, unit: "JPY/Hour", name: "Japan Hourly" },
  { id: "jpy_month", value: 280000, unit: "JPY/Month", name: "Japan Salary" },
  { id: "jpy_th", value: 450, unit: "JPY Thousand", name: "Japan Bonus" },
  { id: "kes", value: 155, unit: "KES", name: "Kenyan Shilling" },
  { id: "kes_bil", value: 125, unit: "KES Billion", name: "Kenya GDP" },
  { id: "kes_month", value: 15000, unit: "KES/Month", name: "Kenya Min Wage" },
  { id: "kg", value: 1000, unit: "Kg", name: "Weight Kilograms" },
  { id: "kgs_month", value: 2000, unit: "KGS/Month", name: "Kyrgyzstan Wage" },
  { id: "kgs_th", value: 125, unit: "KGS Thousand", name: "Kyrgyzstan Credit" },
  { id: "khr_bil", value: 125, unit: "KHR Billion", name: "Cambodia GDP" },
  { id: "khr_th", value: 850, unit: "KHR Thousand", name: "Cambodia Wage" },
  { id: "kmf_mil", value: 45, unit: "KMF Million", name: "Comoros Trade" },
  { id: "kpw_bil", value: 125, unit: "KPW Billion", name: "North Korea GDP" },
  { id: "krw_hour", value: 9860, unit: "KRW/Hour", name: "Korea Min Wage" },
  { id: "krw_month", value: 2060000, unit: "KRW/Month", name: "Korea Salary" },
  { id: "kwd_mil", value: 125, unit: "KWD Million", name: "Kuwait Trade" },
  { id: "kyd_mil", value: 85, unit: "KYD Million", name: "Cayman Trade" },
  { id: "kzt_bil", value: 225, unit: "KZT Billion", name: "Kazakhstan GDP" },
  { id: "kzt_month", value: 70000, unit: "KZT/Month", name: "Kazakhstan Wage" },
  { id: "kzt_th", value: 450, unit: "KZT Thousand", name: "Kazakhstan Credit" },
  { id: "lak", value: 22000, unit: "LAK", name: "Lao Kip" },
  { id: "lak_bil", value: 250, unit: "LAK Billion", name: "Laos GDP" },
  { id: "lak_month", value: 1300000, unit: "LAK/Month", name: "Laos Min Wage" },
  { id: "lbp", value: 89500, unit: "LBP", name: "Lebanese Pound" },
  { id: "lkr", value: 360, unit: "LKR", name: "Sri Lankan Rupee" },
  { id: "lkr_month", value: 12500, unit: "LKR/Month", name: "Sri Lanka Wage" },
  {
    id: "local_currency_intl",
    value: 4.5,
    unit: "Local currency units per international dollar",
    name: "PPP Conversion",
  },
  { id: "lrd", value: 192, unit: "LRD", name: "Liberian Dollar" },
  { id: "lrd_mil", value: 125, unit: "LRD Million", name: "Liberia Trade" },
  { id: "lsl_mil", value: 45, unit: "LSL Million", name: "Lesotho Trade" },
  { id: "lsl_month", value: 2050, unit: "LSL/Month", name: "Lesotho Wage" },
  { id: "lyd", value: 4.85, unit: "LYD", name: "Libyan Dinar" },
  { id: "lyd_mil", value: 450, unit: "LYD Million", name: "Libya Oil Revenue" },
  { id: "mad_month", value: 3111, unit: "MAD/Month", name: "Morocco Min Wage" },
  { id: "mdl_mil", value: 125, unit: "MDL Million", name: "Moldova Trade" },
  { id: "mdl_month", value: 4000, unit: "MDL/Month", name: "Moldova Wage" },
  { id: "mdl_th", value: 85, unit: "MDL Thousand", name: "Moldova Credit" },
  { id: "mga_bil", value: 65, unit: "MGA Billion", name: "Madagascar GDP" },
  {
    id: "mga_month",
    value: 250000,
    unit: "MGA/Month",
    name: "Madagascar Wage",
  },
  {
    id: "mil_points",
    value: 2.5,
    unit: "million points",
    name: "Index Million Points",
  },
  {
    id: "mil_sqm",
    value: 125,
    unit: "Million Square Metre",
    name: "Real Estate Area",
  },
  {
    id: "mil_ton",
    value: 450,
    unit: "Millions Ton",
    name: "Production Volume",
  },
  { id: "mil_units", value: 2.5, unit: "Million Units", name: "Sales Volume" },
  { id: "mkd_month", value: 21776, unit: "MKD/Month", name: "Macedonia Wage" },
  { id: "mmk", value: 2100, unit: "MMK", name: "Myanmar Kyat" },
  { id: "mmk_day", value: 4800, unit: "MMK/day", name: "Myanmar Daily Wage" },
  {
    id: "mnt_month",
    value: 660000,
    unit: "MNT/Month",
    name: "Mongolia Min Wage",
  },
  {
    id: "mnt_th_month",
    value: 1200,
    unit: "MNT Thousand/Month",
    name: "Mongolia Avg Wage",
  },
  {
    id: "mop_monthly",
    value: 6656,
    unit: "MOP/Monthly",
    name: "Macau Monthly Wage",
  },
  { id: "mop_th", value: 125, unit: "MOP Thousand", name: "Macau Trade" },
  { id: "mru", value: 45, unit: "MRU", name: "Mauritanian Ouguiya" },
  { id: "mru_bil", value: 8.5, unit: "MRU Billion", name: "Mauritania GDP" },
  {
    id: "mur_month",
    value: 11575,
    unit: "MUR/Month",
    name: "Mauritius Min Wage",
  },
  { id: "mvr_mil", value: 125, unit: "MVR Million", name: "Maldives Tourism" },
  { id: "mwk", value: 1150, unit: "MWK", name: "Malawi Kwacha" },
  { id: "mxn_day", value: 248.93, unit: "MXN/Day", name: "Mexico Daily Wage" },
  { id: "mxn_th", value: 125, unit: "MXN Thousand", name: "Mexico Credit" },
  { id: "myr_bil", value: 125, unit: "MYR Billion", name: "Malaysia GDP" },
  {
    id: "myr_month",
    value: 1500,
    unit: "MYR/Month",
    name: "Malaysia Min Wage",
  },
  { id: "mzn", value: 63, unit: "MZN", name: "Mozambique Metical" },
  { id: "mzn_month", value: 5500, unit: "MZN/Month", name: "Mozambique Wage" },
  {
    id: "net_balance",
    value: -125,
    unit: "Net Balance",
    name: "Trade Balance",
  },
  { id: "ngn", value: 1550, unit: "NGN", name: "Nigerian Naira" },
  { id: "ngn_bil", value: 450, unit: "NGN Billion", name: "Nigeria GDP" },
  {
    id: "ngn_month",
    value: 70000,
    unit: "NGN/Month",
    name: "Nigeria Min Wage",
  },
  { id: "nio_month", value: 8000, unit: "NIO/Month", name: "Nicaragua Wage" },
  {
    id: "nio_ths_month",
    value: 15,
    unit: "NIO Thousands/Month",
    name: "Nicaragua Avg Wage",
  },
  { id: "nok", value: 11.2, unit: "NOK", name: "Norwegian Krone" },
  { id: "nok_month", value: 35000, unit: "NOK/Month", name: "Norway Wage" },
  { id: "number", value: 125000, unit: "Number", name: "Count Number" },
  {
    id: "number_persons",
    value: 85000,
    unit: "Number of persons",
    name: "Population Count",
  },
  { id: "nzd", value: 1.72, unit: "NZD", name: "New Zealand Dollar" },
  { id: "nzd_hour", value: 23.15, unit: "NZD/Hour", name: "NZ Min Wage" },
  {
    id: "pct_total_labor",
    value: 65.5,
    unit: "% of total labor force",
    name: "Employment Rate",
  },
  { id: "omr_month", value: 325, unit: "OMR/month", name: "Oman Min Wage" },
  { id: "pab_hour", value: 2.72, unit: "PAB/Hour", name: "Panama Hourly" },
  { id: "pab_month", value: 850, unit: "PAB/Month", name: "Panama Wage" },
  { id: "pab_th", value: 15, unit: "PAB Thousand", name: "Panama Credit" },
  { id: "pen_month", value: 1025, unit: "PEN/Month", name: "Peru Min Wage" },
  { id: "people", value: 125000, unit: "people", name: "Population" },
  {
    id: "pct_points",
    value: 2.5,
    unit: "percentage points",
    name: "Interest Change",
  },
  {
    id: "pct_potential_gdp",
    value: -1.2,
    unit: "Percent of potential GDP",
    name: "Output Gap",
  },
  {
    id: "pct_total_labor_force",
    value: 65.5,
    unit: "Percent of total labor force",
    name: "Participation Rate",
  },
  { id: "pgk_week", value: 450, unit: "PGK/Week", name: "PNG Weekly Wage" },
  { id: "php", value: 58.5, unit: "PHP", name: "Philippine Peso" },
  { id: "php_bil", value: 450, unit: "PHP Billion", name: "Philippines GDP" },
  {
    id: "php_day",
    value: 610,
    unit: "PHP/day",
    name: "Philippines Daily Wage",
  },
  { id: "pkr", value: 278, unit: "PKR", name: "Pakistani Rupee" },
  { id: "pkr_bil", value: 125, unit: "PKR Billion", name: "Pakistan Budget" },
  {
    id: "pkr_month",
    value: 32000,
    unit: "PKR/Month",
    name: "Pakistan Min Wage",
  },
  { id: "pln_month", value: 4242, unit: "PLN/Month", name: "Poland Min Wage" },
  {
    id: "ppp_intl",
    value: 45000,
    unit: "Purchasing power parity; international dollars",
    name: "PPP Income",
  },
  { id: "pyg_mil", value: 450, unit: "PYG Million", name: "Paraguay Trade" },
  { id: "pyg_th", value: 8500, unit: "PYG Thousand", name: "Paraguay Credit" },
  {
    id: "pyg_th_month",
    value: 2550,
    unit: "PYG Thousand/Month",
    name: "Paraguay Wage",
  },
  { id: "qar_month", value: 1800, unit: "QAR/Month", name: "Qatar Min Wage" },
  { id: "ron_month", value: 3700, unit: "RON/Month", name: "Romania Min Wage" },
  { id: "rsd_month", value: 47154, unit: "RSD/Month", name: "Serbia Min Wage" },
  { id: "rub_month", value: 16242, unit: "RUB/Month", name: "Russia Min Wage" },
  { id: "rwf_bil", value: 125, unit: "RWF Billion", name: "Rwanda GDP" },
  { id: "sar_bil", value: 185, unit: "SAR Billion", name: "Saudi GDP" },
  { id: "sar_month", value: 4000, unit: "SAR/Month", name: "Saudi Min Wage" },
  { id: "sdg", value: 601, unit: "SDG", name: "Sudanese Pound" },
  { id: "sdg_mil", value: 125, unit: "SDG Million", name: "Sudan Trade" },
  { id: "sek_bil", value: 125, unit: "SEK Billion", name: "Sweden GDP" },
  { id: "sek_hour", value: 125, unit: "SEK/Hour", name: "Sweden Hourly" },
  { id: "sgd_month", value: 1850, unit: "SGD/Month", name: "Singapore Wage" },
  {
    id: "sll_mil",
    value: 450,
    unit: "SLL Million",
    name: "Sierra Leone Trade",
  },
  { id: "sos", value: 571, unit: "SOS", name: "Somali Shilling" },
  { id: "srd_mil", value: 125, unit: "SRD Million", name: "Suriname Trade" },
  { id: "ssp", value: 1300, unit: "SSP", name: "South Sudan Pound" },
  { id: "ssp_mil", value: 85, unit: "SSP Million", name: "South Sudan Oil" },
  { id: "syp", value: 13000, unit: "SYP", name: "Syrian Pound" },
  { id: "syp_mil", value: 450, unit: "SYP Million", name: "Syria Trade" },
  { id: "szl_bil", value: 8.5, unit: "SZL Billion", name: "Eswatini GDP" },
  { id: "szl_mil", value: 125, unit: "SZL Million", name: "Eswatini Trade" },
  { id: "szl_th", value: 45, unit: "SZL Thousand", name: "Eswatini Credit" },
  { id: "tens_th", value: 25, unit: "Tens of Thousands", name: "Large Count" },
  {
    id: "tens_th_sqm",
    value: 15,
    unit: "Tens of Thousands Square Metre",
    name: "Large Area",
  },
  {
    id: "ten_th_tonnes",
    value: 85,
    unit: "Ten Thousands of Tonnes",
    name: "Large Volume",
  },
  { id: "thb_bil", value: 125, unit: "THB Billion", name: "Thailand GDP" },
  { id: "thb_day", value: 353, unit: "THB/Day", name: "Thailand Daily Wage" },
  { id: "thb_month", value: 15000, unit: "THB/Month", name: "Thailand Wage" },
  {
    id: "th_bbl_day",
    value: 125,
    unit: "Thousand Barrels Per Da",
    name: "Oil Production",
  },
  { id: "th_bob", value: 85, unit: "Thousand BOB", name: "Bolivia Trade Vol" },
  { id: "th_mop", value: 125, unit: "Thousand MOP", name: "Macau Trade Vol" },
  {
    id: "th_points",
    value: 2.5,
    unit: "thousand points",
    name: "Index Thousands",
  },
  {
    id: "ths_ton",
    value: 450,
    unit: "Thousands of Ton",
    name: "Production Thousands",
  },
  {
    id: "ths_person",
    value: 125,
    unit: "Thousands Person",
    name: "Employment Thousands",
  },
  {
    id: "ths_sqm",
    value: 85,
    unit: "Thousands Square Metre",
    name: "Area Thousands",
  },
  { id: "th_usd", value: 450, unit: "Thousand USD", name: "USD Thousands" },
  { id: "tjs_month", value: 826, unit: "TJS/Month", name: "Tajikistan Wage" },
  { id: "tjs_th", value: 15, unit: "TJS Thousand", name: "Tajikistan Credit" },
  { id: "tnd_day", value: 16.5, unit: "TND/Day", name: "Tunisia Daily Wage" },
  { id: "tnd_th", value: 8.5, unit: "TND Thousand", name: "Tunisia Credit" },
  { id: "tril_usd", value: 23.5, unit: "Trillion USD", name: "US GDP" },
  { id: "try", value: 34.5, unit: "TRY", name: "Turkish Lira" },
  { id: "try_bil", value: 125, unit: "TRY Billion", name: "Turkey GDP" },
  { id: "try_month", value: 17002, unit: "TRY/Month", name: "Turkey Min Wage" },
  { id: "twd_bil", value: 650, unit: "TWD Billion", name: "Taiwan GDP" },
  { id: "twd_month", value: 27470, unit: "TWD/Month", name: "Taiwan Min Wage" },
  { id: "tzs_bil", value: 185, unit: "TZS Billion", name: "Tanzania GDP" },
  { id: "tzs_month", value: 350000, unit: "TZS/Month", name: "Tanzania Wage" },
  { id: "uah_month", value: 8000, unit: "UAH/Month", name: "Ukraine Min Wage" },
  { id: "uah_th", value: 45, unit: "UAH Thousand", name: "Ukraine Credit" },
  { id: "ugx_bil", value: 165, unit: "UGX Billion", name: "Uganda GDP" },
  { id: "ugx_month", value: 150000, unit: "UGX/Month", name: "Uganda Wage" },
  { id: "usd_hour", value: 15, unit: "USD/Hour", name: "US Min Wage" },
  {
    id: "usd_month",
    value: 3700,
    unit: "USD/Month",
    name: "US Monthly Salary",
  },
  {
    id: "usd_ths",
    value: 125,
    unit: "USD Thousands",
    name: "US Trade Thousands",
  },
  { id: "usd_tril", value: 1.5, unit: "USD Trillion", name: "Global Trade" },
  {
    id: "uyu_month",
    value: 21106,
    unit: "UYU/Month",
    name: "Uruguay Min Wage",
  },
  { id: "uyu_th", value: 85, unit: "UYU Thousand", name: "Uruguay Credit" },
  { id: "uzs_bil", value: 850, unit: "UZS Billion", name: "Uzbekistan GDP" },
  {
    id: "uzs_month",
    value: 1105000,
    unit: "UZS/Month",
    name: "Uzbekistan Wage",
  },
  {
    id: "uzs_th_month",
    value: 3500,
    unit: "UZS Thousand/Month",
    name: "Uzbekistan Avg Wage",
  },
  {
    id: "vef_mil",
    value: 125,
    unit: "VEF Million",
    name: "Venezuela Old Trade",
  },
  {
    id: "vef_month",
    value: 850000,
    unit: "VEF/Month",
    name: "Venezuela Old Wage",
  },
  { id: "ves", value: 50, unit: "VES", name: "Venezuelan Bolivar" },
  { id: "ves_mil", value: 450, unit: "VES Million", name: "Venezuela Trade" },
  { id: "ves_th", value: 850, unit: "VES Thousand", name: "Venezuela Credit" },
  {
    id: "vnd_th_month",
    value: 6660,
    unit: "VND Thousand/Month",
    name: "Vietnam Avg Wage",
  },
  { id: "xaf", value: 656, unit: "XAF", name: "Central African CFA" },
  { id: "xaf_mil", value: 125, unit: "XAF Million", name: "CEMAC Trade" },
  { id: "xof", value: 656, unit: "XOF", name: "West African CFA" },
  { id: "xof_month", value: 75000, unit: "XOF/Month", name: "WAEMU Min Wage" },
  { id: "xof_th", value: 450, unit: "XOF Thousand", name: "WAEMU Credit" },
  {
    id: "xpf_mil",
    value: 125,
    unit: "XPF Million",
    name: "Pacific Franc Trade",
  },
  { id: "yer", value: 250, unit: "YER", name: "Yemeni Rial" },
  { id: "zar_bil", value: 125, unit: "ZAR Billion", name: "South Africa GDP" },
  { id: "zar_hour", value: 27.58, unit: "ZAR/Hour", name: "SA Min Wage" },
  { id: "zar_month", value: 4647, unit: "ZAR/Month", name: "SA Monthly Wage" },
  { id: "zar_th", value: 85, unit: "ZAR Thousand", name: "SA Credit" },
  { id: "zig", value: 25, unit: "ZIG", name: "Zimbabwe Gold" },

  // Additional metadata patterns for testing
  {
    id: "biannual_report",
    value: 125,
    unit: "Million",
    name: "Biannual Report",
    periodicity: "Quarterly",
    scale: "Millions",
    currency_code: null,
    category_group: "Business",
  },
  {
    id: "annual_gdp",
    value: 2500,
    unit: "USD Billion",
    name: "Annual GDP",
    periodicity: "Yearly",
    scale: "Billions",
    currency_code: "USD",
    category_group: "GDP",
  },
  {
    id: "all_time_high",
    value: 4500,
    unit: "points",
    name: "Market All Time High",
    periodicity: null,
    scale: null,
    currency_code: null,
    category_group: "Markets",
  },
];

// ============================================================================
// SECTION 5: COMPREHENSIVE DOMAIN SETS
// ============================================================================

/**
 * Comprehensive percentages and per-capita indicators
 */
export const percentagesComprehensive: FixtureData[] = [
  { id: "cpi", value: 3.5, unit: "%", name: "Headline CPI" },
  {
    id: "unemployment",
    value: 6.2,
    unit: "percent",
    name: "Unemployment Rate",
  },
  {
    id: "unemployment_cap",
    value: 5.8,
    unit: "Percent",
    name: "Unemployment Rate SA",
  },
  {
    id: "debt_gdp",
    value: 68.5,
    unit: "percent of GDP",
    name: "Debt to GDP Ratio",
  },
  {
    id: "doctors",
    value: 3.4,
    unit: "per 1000 people",
    name: "Doctors per 1000",
  },
  {
    id: "vaccines",
    value: 156,
    unit: "doses per 100 people",
    name: "Vaccination Coverage",
  },
  {
    id: "covid",
    value: 245,
    unit: "per one million people",
    name: "COVID Cases per Million",
  },
  { id: "growth_yoy", value: 4.6, unit: "%", name: "PPI YoY" },
  { id: "retail_yoy", value: 6.3, unit: "%", name: "Retail Sales YoY" },
  { id: "wage_growth", value: 8.2, unit: "%", name: "Wage Growth YoY" },
];

/**
 * Comprehensive indices and scores
 */
export const indicesComprehensive: FixtureData[] = [
  {
    id: "optimism",
    value: 105.3,
    unit: "points",
    name: "Economic Optimism Index",
  },
  {
    id: "corruption",
    value: 62.8,
    unit: "Points",
    name: "Corruption Perception Index",
  },
  { id: "pmi_mfg", value: 52.1, unit: "points", name: "Manufacturing PMI" },
  { id: "pmi_svc", value: 49.8, unit: "Points", name: "Services PMI" },
  {
    id: "confidence",
    value: 98.7,
    unit: "points",
    name: "Consumer Confidence",
  },
  { id: "sentiment", value: 104.2, unit: "Points", name: "Business Sentiment" },
  { id: "housing", value: 75.3, unit: "points", name: "Housing Index" },
  { id: "market", value: 143.6, unit: "Points", name: "Market Index" },
  { id: "innovation", value: 127.4, unit: "points", name: "Innovation Index" },
  {
    id: "competitiveness",
    value: 150.2,
    unit: "Points",
    name: "Competitiveness Index",
  },
];

/**
 * Comprehensive count indicators
 */
export const countsComprehensive: FixtureData[] = [
  {
    id: "employment",
    value: 125000,
    unit: "Persons",
    name: "Employment Level",
  },
  {
    id: "unemployed",
    value: 98500,
    unit: "persons",
    name: "Unemployed Persons",
  },
  {
    id: "companies",
    value: 1250,
    unit: "Companies",
    name: "New Business Registrations",
  },
  { id: "cars", value: 45000, unit: "Units", name: "Car Production" },
  { id: "appliances", value: 800, unit: "units", name: "Appliance Production" },
  { id: "tourists_k", value: 125, unit: "Thousand", name: "Tourist Arrivals" },
  { id: "housing_k", value: 89, unit: "Thousands", name: "Housing Starts" },
  { id: "population_m", value: 68.5, unit: "Million", name: "Population" },
  { id: "chips_b", value: 1.5, unit: "Billions", name: "Microchips Shipped" },
];

/**
 * Comprehensive energy indicators
 */
export const energyComprehensive: FixtureData[] = [
  {
    id: "electricity_gwh",
    value: 1250,
    unit: "GWh",
    name: "Electricity Production",
  },
  {
    id: "electricity_long",
    value: 890,
    unit: "Gigawatt-hour",
    name: "Renewable Generation",
  },
  {
    id: "gas_tj",
    value: 450,
    unit: "Terajoule",
    name: "Natural Gas Consumption",
  },
  { id: "capacity_mw", value: 3200, unit: "MW", name: "Installed Capacity" },
  { id: "demand_mw", value: 2100, unit: "Megawatt", name: "Peak Demand" },
  { id: "co2_kt", value: 1850, unit: "KT", name: "CO2 Emissions" },
  { id: "hydro_gwh", value: 210, unit: "GWh", name: "Hydro Production" },
  { id: "solar_gwh", value: 75, unit: "GWh", name: "Solar Generation" },
  { id: "wind_gwh", value: 90, unit: "GWh", name: "Wind Generation" },
  { id: "bioenergy_tj", value: 45, unit: "Terajoule", name: "Bioenergy" },
];

/**
 * Comprehensive commodities indicators
 */
export const commoditiesComprehensive: FixtureData[] = [
  { id: "oil_bbl", value: 95000, unit: "barrel", name: "Daily Oil Production" },
  { id: "oil_k", value: 850, unit: "BBL/D/1K", name: "Crude Oil Output" },
  {
    id: "oil_reserves",
    value: 42.5,
    unit: "BBL/1Million",
    name: "Strategic Oil Reserves",
  },
  {
    id: "oil_storage",
    value: 450,
    unit: "Thousand Barrels",
    name: "Oil Storage",
  },
  {
    id: "gas_bcf",
    value: 125,
    unit: "billion cubic feet",
    name: "Natural Gas Storage",
  },
];

/**
 * Comprehensive agriculture indicators
 */
export const agricultureComprehensive: FixtureData[] = [
  { id: "wheat_t", value: 125000, unit: "Tonnes", name: "Wheat Production" },
  { id: "rice_mt", value: 89, unit: "metric tonnes", name: "Rice Export" },
  { id: "corn_kt", value: 450, unit: "Thousand Tonnes", name: "Corn Harvest" },
  {
    id: "sugar_kts",
    value: 230,
    unit: "Thousands of Tonnes",
    name: "Sugar Production",
  },
  {
    id: "soybeans_bb",
    value: 2.8,
    unit: "Billion Bushels",
    name: "Soybean Stocks",
  },
  { id: "coffee_mt", value: 45, unit: "metric tonnes", name: "Coffee" },
  { id: "cocoa_t", value: 33, unit: "Tonnes", name: "Cocoa" },
  { id: "cotton_t", value: 27, unit: "Tonnes", name: "Cotton" },
  { id: "palm_mt", value: 21, unit: "metric tonnes", name: "Palm Oil" },
  { id: "tea_t", value: 18, unit: "Tonnes", name: "Tea" },
];

/**
 * Comprehensive metals indicators
 */
export const metalsComprehensive: FixtureData[] = [
  { id: "gold_t", value: 450, unit: "Tonnes", name: "Gold Reserves" },
  {
    id: "copper_t",
    value: 1250,
    unit: "copper tonnes",
    name: "Copper Production",
  },
  {
    id: "steel_kt",
    value: 890,
    unit: "Thousand Tonnes",
    name: "Steel Production",
  },
  { id: "aluminum_t", value: 320, unit: "Tonnes", name: "Aluminum Output" },
  { id: "zinc_t", value: 280, unit: "Tonnes", name: "Zinc" },
  { id: "nickel_t", value: 150, unit: "Tonnes", name: "Nickel" },
  { id: "lithium_t", value: 45, unit: "Tonnes", name: "Lithium" },
  { id: "iron_t", value: 560, unit: "Tonnes", name: "Iron Ore" },
];

/**
 * Comprehensive crypto indicators
 */
export const cryptoComprehensive: FixtureData[] = [
  { id: "btc", value: 21.5, unit: "BTC", name: "Bitcoin Holdings" },
  { id: "eth", value: 1250, unit: "ETH", name: "Ethereum Balance" },
  { id: "xrp", value: 50000, unit: "XRP", name: "Ripple Holdings" },
  { id: "sol", value: 450, unit: "SOL", name: "Solana Staked" },
  { id: "ada", value: 125000, unit: "ADA", name: "Cardano Holdings" },
  { id: "dot", value: 890, unit: "DOT", name: "Polkadot" },
  { id: "bnb", value: 320, unit: "BNB", name: "Binance Coin" },
  { id: "doge", value: 450000, unit: "DOGE", name: "Dogecoin" },
  { id: "ltc", value: 125, unit: "LTC", name: "Litecoin" },
  { id: "trx", value: 89000, unit: "TRX", name: "Tron" },
];

// ============================================================================
// SECTION 6: PRE-ASSEMBLED TEST SUITES
// ============================================================================

/**
 * Small test suite for quick tests
 */
export const testSuiteSmall: FixtureData[] = [
  ...monetaryFlowBasic,
  ...monetaryStockBasic,
  ...nonMonetaryBasic,
];

/**
 * Medium test suite with good domain coverage
 */
export const testSuiteMedium: FixtureData[] = [
  ...testSuiteSmall,
  ...percentagesComprehensive,
  ...indicesComprehensive,
  ...energyComprehensive,
  ...commoditiesComprehensive,
];

/**
 * Large test suite with comprehensive coverage
 */
export const testSuiteLarge: FixtureData[] = [
  ...testSuiteMedium,
  ...countsComprehensive,
  ...agricultureComprehensive,
  ...metalsComprehensive,
  ...cryptoComprehensive,
  ...edgeCases,
];

/**
 * Export mapping for backward compatibility
 */
export const fxFallbackBasic = fxBasic;
export const fxFallbackExtended = fxComprehensive;
export const monetaryFlowSet = monetaryFlowBasic;
export const monetaryStockSet = monetaryStockBasic;
export const nonMonetarySet = nonMonetaryBasic;
export const allDomainsCombined = testSuiteSmall;
export const allDomainsCombinedLarge = testSuiteMedium;
export const allDomainsCombinedXLarge = testSuiteLarge;

// ============================================================================
// SECTION 7: FALLBACK TEST SCENARIOS
// ============================================================================

/**
 * Test monetary indicators without time units in the unit string
 * Should fall back to periodicity field for time basis
 */
export const monetaryNoTimeUnitSet: FixtureData[] = [
  // Stocks without time - should use periodicity for time fallback
  {
    id: "fb_usd_mil",
    value: 500,
    unit: "USD Million",
    name: "Current Account",
    periodicity: "Quarterly",
    scale: "Millions",
    currency_code: "USD",
    category_group: "Trade",
  },
  {
    id: "fb_eur_bil",
    value: 12.5,
    unit: "EUR Billion",
    name: "GDP",
    periodicity: "Yearly",
    scale: "Billions",
    currency_code: "EUR",
    category_group: "GDP",
  },
  {
    id: "fb_gbp",
    value: 45000,
    unit: "GBP",
    name: "Per Capita Income",
    periodicity: "Yearly",
    scale: null,
    currency_code: "GBP",
    category_group: "GDP",
  },
  {
    id: "fb_jpy_mil",
    value: 8900,
    unit: "JPY Million",
    name: "Money Supply",
    periodicity: "Monthly",
    scale: "Millions",
    currency_code: "JPY",
    category_group: "Money",
  },

  // No time unit AND no periodicity - ultimate fallback
  {
    id: "fb_no_time_no_period",
    value: 1200,
    unit: "USD Million",
    name: "Reserves",
    periodicity: null,
    scale: "Millions",
    currency_code: "USD",
    category_group: "Reserves",
  },
];

/**
 * Test wages with conflicting time units vs periodicity
 * Time unit in the unit string should win
 */
export const wageConflictSet: FixtureData[] = [
  // Hour wage with yearly periodicity - hour should win
  {
    id: "conflict_hr_yr",
    value: 25,
    unit: "USD per hour",
    name: "Hourly Rate",
    periodicity: "Yearly",
    scale: null,
    currency_code: "USD",
    category_group: "Labour",
  },

  // Monthly wage with daily periodicity - month should win
  {
    id: "conflict_mo_day",
    value: 5000,
    unit: "EUR per month",
    name: "Monthly Salary",
    periodicity: "Daily",
    scale: null,
    currency_code: "EUR",
    category_group: "Labour",
  },

  // Weekly wage with quarterly periodicity - week should win
  {
    id: "conflict_wk_qt",
    value: 800,
    unit: "GBP per week",
    name: "Weekly Wage",
    periodicity: "Quarterly",
    scale: null,
    currency_code: "GBP",
    category_group: "Labour",
  },
];

/**
 * Test scale conflicts - scale in unit vs scale field
 */
export const scaleConflictSet: FixtureData[] = [
  // Unit says millions, scale says billions - unit should win
  {
    id: "scale_conflict_1",
    value: 100,
    unit: "USD millions",
    name: "Trade Balance",
    periodicity: "Monthly",
    scale: "Billions",
    currency_code: "USD",
    category_group: "Trade",
  },

  // Unit has no scale, scale field has value - use scale field
  {
    id: "scale_from_field",
    value: 50,
    unit: "EUR",
    name: "Government Spending",
    periodicity: "Quarterly",
    scale: "Millions",
    currency_code: "EUR",
    category_group: "Government",
  },

  // Both match - harmony
  {
    id: "scale_harmony",
    value: 75,
    unit: "GBP billions",
    name: "National Debt",
    periodicity: "Yearly",
    scale: "Billions",
    currency_code: "GBP",
    category_group: "Government",
  },
];

/**
 * Test currency code mismatches
 */
export const currencyMismatchSet: FixtureData[] = [
  // Unit has USD, currency_code has EUR - unit should win
  {
    id: "curr_mismatch_1",
    value: 100,
    unit: "USD millions",
    name: "FDI",
    periodicity: "Quarterly",
    scale: "Millions",
    currency_code: "EUR",
    category_group: "Trade",
  },

  // Unit has no currency, currency_code provided - use currency_code
  {
    id: "curr_from_field",
    value: 500,
    unit: "millions",
    name: "Budget",
    periodicity: "Yearly",
    scale: "Millions",
    currency_code: "JPY",
    category_group: "Government",
  },

  // Special: National currency
  {
    id: "nat_currency",
    value: 1000,
    unit: "National currency",
    name: "GDP",
    periodicity: "Yearly",
    scale: null,
    currency_code: null,
    category_group: "GDP",
  },
];

/**
 * Test real DB patterns with various category groups
 */
export const categoryGroupSet: FixtureData[] = [
  // Labour category
  {
    id: "cat_labour_1",
    value: 4.5,
    unit: "%",
    name: "Unemployment Rate",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Labour",
  },
  {
    id: "cat_labour_2",
    value: 3500,
    unit: "EUR per month",
    name: "Wages",
    periodicity: "Monthly",
    scale: null,
    currency_code: "EUR",
    category_group: "Labour",
  },

  // Prices category
  {
    id: "cat_prices_1",
    value: 2.3,
    unit: "%",
    name: "Inflation Rate",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Prices",
  },
  {
    id: "cat_prices_2",
    value: 105.2,
    unit: "points",
    name: "CPI Index",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Prices",
  },

  // GDP category
  {
    id: "cat_gdp_1",
    value: 2.5,
    unit: "%",
    name: "GDP Growth Rate",
    periodicity: "Quarterly",
    scale: null,
    currency_code: null,
    category_group: "GDP",
  },
  {
    id: "cat_gdp_2",
    value: 1500,
    unit: "USD billions",
    name: "GDP Constant Prices",
    periodicity: "Quarterly",
    scale: "Billions",
    currency_code: "USD",
    category_group: "GDP",
  },

  // Trade category
  {
    id: "cat_trade_1",
    value: -250,
    unit: "USD millions",
    name: "Current Account",
    periodicity: "Quarterly",
    scale: "Millions",
    currency_code: "USD",
    category_group: "Trade",
  },
  {
    id: "cat_trade_2",
    value: 125,
    unit: "SIPRI TIV Million",
    name: "Weapons Sales",
    periodicity: "Yearly",
    scale: "Millions",
    currency_code: null,
    category_group: "Trade",
  },

  // Money category
  {
    id: "cat_money_1",
    value: 3.5,
    unit: "%",
    name: "Interest Rate",
    periodicity: "Daily",
    scale: null,
    currency_code: null,
    category_group: "Money",
  },
  {
    id: "cat_money_2",
    value: 8500,
    unit: "EUR millions",
    name: "Money Supply M2",
    periodicity: "Monthly",
    scale: "Millions",
    currency_code: "EUR",
    category_group: "Money",
  },

  // Health category
  {
    id: "cat_health_1",
    value: 2.3,
    unit: "per 1000 people",
    name: "Medical Doctors",
    periodicity: "Yearly",
    scale: null,
    currency_code: null,
    category_group: "Health",
  },
  {
    id: "cat_health_2",
    value: 155,
    unit: "doses per 100 people",
    name: "Vaccination Rate",
    periodicity: "Daily",
    scale: null,
    currency_code: null,
    category_group: "Health",
  },

  // Climate category
  {
    id: "cat_climate_1",
    value: 23.5,
    unit: "celsius",
    name: "Temperature",
    periodicity: "Yearly",
    scale: null,
    currency_code: null,
    category_group: "Climate",
  },
  {
    id: "cat_climate_2",
    value: 1850,
    unit: "KT",
    name: "CO2 Emissions",
    periodicity: "Yearly",
    scale: null,
    currency_code: null,
    category_group: "Climate",
  },
];

/**
 * Test mixed periodicity patterns
 */
export const mixedPeriodicitySet: FixtureData[] = [
  // Daily periodicity indicators
  {
    id: "daily_1",
    value: 1.25,
    unit: "%",
    name: "Overnight Rate",
    periodicity: "Daily",
    scale: null,
    currency_code: null,
    category_group: "Money",
  },
  {
    id: "daily_2",
    value: 450,
    unit: "Persons",
    name: "COVID Deaths",
    periodicity: "Daily",
    scale: null,
    currency_code: null,
    category_group: "Health",
  },

  // Weekly periodicity (rare)
  {
    id: "weekly_1",
    value: 650,
    unit: "GBP per week",
    name: "Weekly Earnings",
    periodicity: "Weekly",
    scale: null,
    currency_code: "GBP",
    category_group: "Labour",
  },

  // Monthly periodicity (common)
  {
    id: "monthly_1",
    value: 3.2,
    unit: "%",
    name: "Core CPI",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Prices",
  },
  {
    id: "monthly_2",
    value: 52.5,
    unit: "points",
    name: "Manufacturing PMI",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Business",
  },

  // Quarterly periodicity
  {
    id: "quarterly_1",
    value: 2.8,
    unit: "%",
    name: "GDP Growth QoQ",
    periodicity: "Quarterly",
    scale: null,
    currency_code: null,
    category_group: "GDP",
  },
  {
    id: "quarterly_2",
    value: -150,
    unit: "USD millions",
    name: "Current Account",
    periodicity: "Quarterly",
    scale: "Millions",
    currency_code: "USD",
    category_group: "Trade",
  },

  // Yearly periodicity
  {
    id: "yearly_1",
    value: 45.5,
    unit: "percent of GDP",
    name: "Debt to GDP",
    periodicity: "Yearly",
    scale: null,
    currency_code: null,
    category_group: "Government",
  },
  {
    id: "yearly_2",
    value: 68.5,
    unit: "Million",
    name: "Population",
    periodicity: "Yearly",
    scale: "Millions",
    currency_code: null,
    category_group: "Labour",
  },
];

/**
 * Ultimate test set combining all fallback scenarios
 */
export const fallbackComprehensiveSet: FixtureData[] = [
  ...monetaryNoTimeUnitSet,
  ...wageConflictSet,
  ...scaleConflictSet,
  ...currencyMismatchSet,
  ...categoryGroupSet,
  ...mixedPeriodicitySet,
];
