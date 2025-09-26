/**
 * Real Economic Indicator Data for V2 Pipeline End-to-End Testing
 *
 * This dataset contains real economic indicators extracted from the Tellimer PostgreSQL database,
 * representing diverse indicator types across all V2 classification domains.
 *
 * Data Sources: World Bank, EUROSTAT, National Statistical Offices, Central Banks
 * Exclusions: IMF WEO data (as requested)
 * Coverage: Multiple countries, currencies, time scales, and magnitudes
 *
 * Expected V2 Domain Classifications:
 * - Monetary Stock: GDP indicators (USD billions)
 * - Monetary Flow: Wages, salaries (EUR/month, MKD/month)
 * - Counts: Population (millions of people)
 * - Percentages: Inflation rates, debt-to-GDP ratios (%)
 * - Indices: CPI, stock market indices (points)
 * - Ratios: Government debt to GDP (percent of GDP)
 * - Energy: Oil rigs (count)
 * - Trade: Current account, exports, external debt (USD/EUR millions/thousands)
 */

import type { ParsedData } from "../shared/types.ts";
import type { FXTable } from "../../types.ts";

export const realEconomicDataSet: ParsedData[] = [
  // MONETARY STOCK - GDP Indicators
  {
    id: "bahrain-gdp-2024",
    value: 47.74,
    unit: "USD billions",
    name: "GDP",
    country_iso: "BHR",
    date: "2024-12-31",
    category_group: "GDP",
    source_name: "World Bank",
    currency_code: "USD",
    periodicity: "Yearly",
    expected_domain: "monetaryStock",
  },
  {
    id: "macedonia-gdp-2024",
    value: 16.69,
    unit: "USD billions",
    name: "GDP",
    country_iso: "MKD",
    date: "2024-12-31",
    category_group: "GDP",
    source_name: "World Bank",
    currency_code: "USD",
    periodicity: "Yearly",
    expected_domain: "monetaryStock",
  },

  // MONETARY FLOW - Wages and Salaries
  {
    id: "greece-min-wage-2025",
    value: 968.0,
    unit: "EUR per month",
    name: "Minimum Wages",
    country_iso: "GRC",
    date: "2025-06-30",
    category_group: "Labour",
    source_name: "EUROSTAT",
    currency_code: "EUR",
    periodicity: "Quarterly",
    expected_domain: "monetaryFlow",
  },
  {
    id: "macedonia-min-wage-2025",
    value: 22567.0,
    unit: "MKD per month",
    name: "Minimum Wages",
    country_iso: "MKD",
    date: "2025-01-01",
    category_group: "Labour",
    source_name: "Ministry of Labor and Social Policy, Macedonia",
    currency_code: "MKD",
    periodicity: "Yearly",
    expected_domain: "monetaryFlow",
  },

  // COUNTS - Population
  {
    id: "solomon-islands-population-2024",
    value: 0.819,
    unit: "millions of people",
    name: "Population",
    country_iso: "SLB",
    date: "2024-12-31",
    category_group: "Labour",
    source_name: "World Bank",
    currency_code: null,
    periodicity: "Yearly",
    expected_domain: "counts",
  },

  // PERCENTAGES - Inflation Rates
  {
    id: "australia-inflation-2023",
    value: 4.1,
    unit: "percent",
    name: "Inflation Rate",
    country_iso: "AUS",
    date: "2023-12-31",
    category_group: "Prices",
    source_name: "Australian Bureau of Statistics",
    currency_code: null,
    periodicity: "Quarterly",
    expected_domain: "percentages",
  },
  {
    id: "bangladesh-inflation-2025",
    value: 8.29,
    unit: "percent",
    name: "Inflation Rate",
    country_iso: "BGD",
    date: "2025-08-31",
    category_group: "Prices",
    source_name: "Bangladesh Bureau of Statistics",
    currency_code: null,
    periodicity: "Monthly",
    expected_domain: "percentages",
  },

  // INDICES - CPI and Stock Market Indices
  {
    id: "bolivia-cpi-2025",
    value: 144.318,
    unit: "points",
    name: "Consumer Price Index CPI",
    country_iso: "BOL",
    date: "2025-08-31",
    category_group: "Prices",
    source_name: "Instituto Nacional de Estadística de Bolivia",
    currency_code: null,
    periodicity: "Monthly",
    expected_domain: "indices",
  },
  {
    id: "australia-stock-market-2023",
    value: 7033.2,
    unit: "points",
    name: "Stock Market",
    country_iso: "AUS",
    date: "2023-10-02",
    category_group: "Markets",
    source_name: "OTC/CFD",
    currency_code: null,
    periodicity: "Daily",
    expected_domain: "indices",
  },
  {
    id: "denmark-stock-market-2023",
    value: 2091.86,
    unit: "points",
    name: "Stock Market",
    country_iso: "DNK",
    date: "2023-10-02",
    category_group: "Markets",
    source_name: "OTC/CFD",
    currency_code: null,
    periodicity: "Daily",
    expected_domain: "indices",
  },

  // RATIOS - Debt to GDP
  {
    id: "argentina-debt-gdp-2024",
    value: 83.2,
    unit: "percent of GDP",
    name: "Government Debt to GDP",
    country_iso: "ARG",
    date: "2024-12-31",
    category_group: "Government",
    source_name: "Ministerio de Hacienda, Argentina",
    currency_code: null,
    periodicity: "Yearly",
    expected_domain: "ratios",
  },
  {
    id: "greece-debt-gdp-2024",
    value: 153.6,
    unit: "percent of GDP",
    name: "Government Debt to GDP",
    country_iso: "GRC",
    date: "2024-12-31",
    category_group: "Government",
    source_name: "National Statistical Service of Greece",
    currency_code: null,
    periodicity: "Yearly",
    expected_domain: "ratios",
  },

  // ENERGY - Oil Rigs (Count-based energy indicator)
  {
    id: "angola-oil-rigs-2025",
    value: 3.0,
    unit: "rigs",
    name: "Crude Oil Rigs",
    country_iso: "AGO",
    date: "2025-08-31",
    category_group: "Energy",
    source_name: "Baker Hughes Company",
    currency_code: null,
    periodicity: "Monthly",
    expected_domain: "energy",
  },

  // TRADE/MONETARY STOCK - Current Account, External Debt
  {
    id: "thailand-current-account-2025",
    value: 2214.0,
    unit: "USD millions",
    name: "Current Account",
    country_iso: "THA",
    date: "2025-07-31",
    category_group: "Trade",
    source_name: "Bank of Thailand",
    currency_code: "USD",
    periodicity: "Monthly",
    expected_domain: "monetaryStock",
  },
  {
    id: "greece-external-debt-2025",
    value: 567734.73,
    unit: "EUR millions",
    name: "External Debt",
    country_iso: "GRC",
    date: "2025-03-31",
    category_group: "Trade",
    source_name: "Bank of Greece",
    currency_code: "EUR",
    periodicity: "Quarterly",
    expected_domain: "monetaryStock",
  },
  {
    id: "macedonia-exports-2025",
    value: 779351.0,
    unit: "USD thousands",
    name: "Exports",
    country_iso: "MKD",
    date: "2025-07-31",
    category_group: "Trade",
    source_name: "State Statistical Office of the Republic of Macedonia",
    currency_code: "USD",
    periodicity: "Monthly",
    expected_domain: "monetaryStock",
  },
];

/**
 * Extended FX fallback rates covering all currencies in the real dataset
 */
export const realDataFXFallback = {
  base: "USD",
  rates: {
    USD: 1.0,
    EUR: 0.85,
    MKD: 58.5, // Macedonian Denar
    BDT: 110.0, // Bangladeshi Taka
    AUD: 1.35, // Australian Dollar
    DKK: 6.8, // Danish Krone
    BGN: 1.66, // Bulgarian Lev
    THB: 33.5, // Thai Baht
    AOA: 825.0, // Angolan Kwanza
    ARS: 350.0, // Argentine Peso
    GBP: 0.75, // British Pound
    JPY: 110.0, // Japanese Yen
    CAD: 1.25, // Canadian Dollar
    CHF: 0.92, // Swiss Franc
    CNY: 7.2, // Chinese Yuan
  },
  date: "2024-01-01",
  source: "fallback",
  sourceId: "real-data-test",
};

/**
 * Expected domain distribution for validation
 */
export const expectedDomainDistribution = {
  monetaryStock: 5, // GDP (2) + Current Account + External Debt + Exports
  monetaryFlow: 2, // Wages (2)
  counts: 1, // Population
  percentages: 2, // Inflation rates (2)
  indices: 3, // CPI + Stock markets (2)
  ratios: 2, // Debt-to-GDP ratios (2)
  energy: 1, // Oil rigs
  commodities: 0,
  agriculture: 0,
  metals: 0,
  crypto: 0,
};

/**
 * EXPANDED REAL ECONOMIC DATA SET
 *
 * Extended dataset with population counts, vehicle counts, wage data,
 * CPI transportation, government budget, consumer spending, and more
 * to test additional flows and edge cases.
 *
 * Data extracted from Tellimer PostgreSQL database on 2025-09-25
 * Sources: Multiple national statistical offices, central banks, industry associations
 */
export const expandedRealEconomicData: ParsedData[] = [
  // POPULATION COUNTS - Multiple countries
  {
    id: "cameroon-population-2024",
    value: 29.1,
    unit: "millions",
    name: "Population",
    country_iso: "CMR",
    date: "2024-12-31",
    category_group: "Demographics",
    source_name: "Institut National de la Statistique du Cameroun",
    currency_code: null,
    periodicity: "Yearly",
    expected_domain: "counts",
  },
  {
    id: "senegal-population-2024",
    value: 18.8,
    unit: "millions",
    name: "Population",
    country_iso: "SEN",
    date: "2024-12-31",
    category_group: "Demographics",
    source_name: "ANSD, Senegal",
    currency_code: null,
    periodicity: "Yearly",
    expected_domain: "counts",
  },

  // VEHICLE COUNTS - Auto exports and production
  {
    id: "korea-auto-exports-2025",
    value: 200317,
    unit: "units",
    name: "Auto Exports",
    country_iso: "KOR",
    date: "2025-08-31",
    category_group: "Manufacturing",
    source_name: "Korea Automobile Manufacturers Association (KAMA)",
    currency_code: null,
    periodicity: "Monthly",
    expected_domain: "counts",
  },
  {
    id: "mexico-auto-exports-2025",
    value: 296.796,
    unit: "thousand units",
    name: "Auto Exports",
    country_iso: "MEX",
    date: "2025-08-31",
    category_group: "Manufacturing",
    source_name: "Instituto Nacional de Estadística y Geografía (INEGI)",
    currency_code: null,
    periodicity: "Monthly",
    expected_domain: "counts",
  },
  {
    id: "germany-auto-exports-2023",
    value: 192500,
    unit: "units",
    name: "Auto Exports",
    country_iso: "DEU",
    date: "2023-08-31",
    category_group: "Manufacturing",
    source_name: "VDA - German Association of the Automotive Industry",
    currency_code: null,
    periodicity: "Monthly",
    expected_domain: "counts",
  },
  {
    id: "india-car-production-2025",
    value: 2693049,
    unit: "units",
    name: "Car Production",
    country_iso: "IND",
    date: "2025-08-31",
    category_group: "Manufacturing",
    source_name: "SIAM - Society of Indian Automobile Manufacturers",
    currency_code: null,
    periodicity: "Monthly",
    expected_domain: "counts",
  },

  // WAGE DATA - Multiple currencies and time scales
  {
    id: "ireland-hourly-earnings-2023",
    value: 28.43,
    unit: "EUR",
    name: "Average Hourly Earnings",
    country_iso: "IRL",
    date: "2023-12-31",
    category_group: "Labour",
    source_name: "Central Statistics Office Ireland",
    currency_code: "EUR",
    periodicity: "Quarterly",
    expected_domain: "monetaryFlow",
  },
  {
    id: "canada-hourly-earnings-2023",
    value: 34.98,
    unit: "CAD",
    name: "Average Hourly Earnings",
    country_iso: "CAN",
    date: "2023-09-30",
    category_group: "Labour",
    source_name: "Statistics Canada",
    currency_code: "CAD",
    periodicity: "Monthly",
    expected_domain: "monetaryFlow",
  },
  {
    id: "estonia-hourly-earnings-2025",
    value: 12.94,
    unit: "EUR per hour",
    name: "Average Hourly Earnings",
    country_iso: "EST",
    date: "2025-06-30",
    category_group: "Labour",
    source_name: "Statistics Estonia",
    currency_code: "EUR",
    periodicity: "Quarterly",
    expected_domain: "monetaryFlow",
  },
  {
    id: "canada-weekly-earnings-2023",
    value: 1215.02,
    unit: "CAD",
    name: "Average Weekly Earnings",
    country_iso: "CAN",
    date: "2023-07-31",
    category_group: "Labour",
    source_name: "Statistics Canada",
    currency_code: "CAD",
    periodicity: "Monthly",
    expected_domain: "monetaryFlow",
  },

  // CPI TRANSPORTATION - Multiple countries
  {
    id: "mexico-cpi-transportation-2025",
    value: 131.78,
    unit: "points",
    name: "CPI Transportation",
    country_iso: "MEX",
    date: "2025-08-31",
    category_group: "Prices",
    source_name: "Instituto Nacional de Estadística y Geografía (INEGI)",
    currency_code: null,
    periodicity: "Monthly",
    expected_domain: "indices",
  },
  {
    id: "usa-cpi-transportation-2023",
    value: 274.22,
    unit: "points",
    name: "CPI Transportation",
    country_iso: "USA",
    date: "2023-08-31",
    category_group: "Prices",
    source_name: "U.S. Bureau of Labor Statistics",
    currency_code: null,
    periodicity: "Monthly",
    expected_domain: "indices",
  },
  {
    id: "argentina-cpi-transportation-2025",
    value: 9387.33,
    unit: "points",
    name: "CPI Transportation",
    country_iso: "ARG",
    date: "2025-08-31",
    category_group: "Prices",
    source_name: "Instituto Nacional de Estadística y Censos (INDEC)",
    currency_code: null,
    periodicity: "Monthly",
    expected_domain: "indices",
  },
  {
    id: "bolivia-cpi-transportation-2025",
    value: 128.23,
    unit: "points",
    name: "CPI Transportation",
    country_iso: "BOL",
    date: "2025-08-31",
    category_group: "Prices",
    source_name: "Instituto Nacional de Estadística de Bolivia",
    currency_code: null,
    periodicity: "Monthly",
    expected_domain: "indices",
  },

  // GOVERNMENT BUDGET - Percentage of GDP
  {
    id: "denmark-government-budget-2022",
    value: 3.3,
    unit: "percent of GDP",
    name: "Government Budget",
    country_iso: "DNK",
    date: "2022-12-31",
    category_group: "Government",
    source_name: "Statistics Denmark",
    currency_code: null,
    periodicity: "Yearly",
    expected_domain: "percentages",
  },

  // CONSUMER SPENDING - Multiple currencies and scales
  {
    id: "bangladesh-consumer-spending-2024",
    value: 21321.8,
    unit: "BDT billions",
    name: "Consumer Spending",
    country_iso: "BGD",
    date: "2024-12-31",
    category_group: "Consumption",
    source_name: "Bangladesh Bureau of Statistics",
    currency_code: "BDT",
    periodicity: "Yearly",
    expected_domain: "monetaryFlow",
  },
  {
    id: "portugal-consumer-spending-2023",
    value: 33565.9,
    unit: "EUR millions",
    name: "Consumer Spending",
    country_iso: "PRT",
    date: "2023-12-31",
    category_group: "Consumption",
    source_name: "Statistics Portugal",
    currency_code: "EUR",
    periodicity: "Quarterly",
    expected_domain: "monetaryFlow",
  },
  {
    id: "china-consumer-spending-2024",
    value: 538646.1,
    unit: "CNY hundred millions",
    name: "Consumer Spending",
    country_iso: "CHN",
    date: "2024-12-31",
    category_group: "Consumption",
    source_name: "National Bureau of Statistics of China",
    currency_code: "CNY",
    periodicity: "Yearly",
    expected_domain: "monetaryFlow",
  },
  {
    id: "south-korea-consumer-spending-2025",
    value: 276188.1,
    unit: "KRW billions",
    name: "Consumer Spending",
    country_iso: "KOR",
    date: "2025-06-30",
    category_group: "Consumption",
    source_name: "The Bank of Korea",
    currency_code: "KRW",
    periodicity: "Quarterly",
    expected_domain: "monetaryFlow",
  },
  {
    id: "thailand-consumer-spending-2025",
    value: 1730395,
    unit: "THB millions",
    name: "Consumer Spending",
    country_iso: "THA",
    date: "2025-06-30",
    category_group: "Consumption",
    source_name: "Nesdb, Thailand",
    currency_code: "THB",
    periodicity: "Quarterly",
    expected_domain: "monetaryFlow",
  },
];

/**
 * Extended FX fallback rates for expanded dataset
 */
export const expandedDataFXFallback = {
  base: "USD",
  rates: {
    USD: 1.0,
    EUR: 0.85,
    CAD: 1.25,
    BDT: 110.0, // Bangladeshi Taka
    CNY: 7.2, // Chinese Yuan
    KRW: 1200.0, // South Korean Won
    THB: 33.5, // Thai Baht
    MXN: 18.0, // Mexican Peso
    ARS: 350.0, // Argentine Peso
    BOB: 6.9, // Bolivian Boliviano
    DKK: 6.8, // Danish Krone
  },
  date: "2024-01-01",
  source: "fallback",
  sourceId: "expanded-real-data-test",
};

/**
 * Expected domain distribution for expanded dataset
 */
export const expandedExpectedDomainDistribution = {
  monetaryFlow: 9, // Wages (4) + Consumer Spending (5)
  counts: 6, // Population (2) + Vehicle counts (4)
  indices: 8, // CPI Transportation (4) + existing CPI/stock (4)
  percentages: 1, // Government Budget (1)
  monetaryStock: 0, // None in this expanded set
  ratios: 0, // None in this expanded set
  energy: 0, // None in this expanded set
  commodities: 0,
  agriculture: 0,
  metals: 0,
  crypto: 0,
};

/**
 * EDGE CASES REAL ECONOMIC DATA SET
 *
 * This dataset contains real economic indicators with known scaling, unit, and
 * classification edge cases extracted from the Tellimer PostgreSQL database.
 * These indicators test the V2 pipeline's robustness in handling problematic
 * real-world data scenarios.
 *
 * Edge Cases Covered:
 * - Car Registrations: Cumulative stock vs flow confusion
 * - CPI with extreme values: Base/rebasing issues, hyperinflation
 * - GDP scaling issues: Mixed LCY vs USD, magnitude errors
 * - Government finance: Extreme values, currency confusion
 * - Consumer spending: Scale and currency normalization issues
 */
export const edgeCasesRealEconomicData: ParsedData[] = [
  // CAR REGISTRATIONS - Cumulative stock vs flow confusion
  {
    id: "ARGENTINACARREGARG2025-08-3101K5F3QXG75TBHWC6GW279D091",
    name: "Car Registrations",
    country_iso: "ARG",
    date: "2025-08-31",
    value: 51766.000,
    normalized: 51766.000,
    unit: "Thousand",
    normalizedUnit: "Thousand",
    currency_code: null,
    periodicity: "Monthly",
    expected_domain: "counts",
  } as ParsedData & { expected_domain: string },

  // CPI WITH EXTREME VALUES - Hyperinflation/rebasing issues
  {
    id: "VENEZUELACPITRAVEN2024-10-3101K05PN8SHE4Y083WF13WE240K",
    name: "CPI Transportation",
    country_iso: "VEN",
    date: "2024-10-31",
    value: 30966553343.100,
    normalized: 30966553343.100,
    unit: "thousand points",
    normalizedUnit: "thousand points",
    currency_code: null,
    periodicity: "Monthly",
    expected_domain: "indices",
  } as ParsedData & { expected_domain: string },

  // GDP LEVEL DATA - Proper scaling example
  {
    id: "WGDPBRAZBRA2024-12-3101K41HYSHZP378NCA5JFJVMTK0",
    name: "GDP",
    country_iso: "BRA",
    date: "2024-12-31",
    value: 2179.410,
    normalized: 2179.410,
    unit: "USD Billion",
    normalizedUnit: "USD Billion",
    currency_code: "USD",
    periodicity: "Yearly",
    expected_domain: "monetaryStock",
  } as ParsedData & { expected_domain: string },

  // GOVERNMENT FINANCE - Extreme values in local currency
  {
    id: "KYRGYZSTANGOVREVKGZ2024-12-3101K560E6H8R8700N2BPQQ70AXH",
    name: "Government Revenues",
    country_iso: "KGZ",
    date: "2024-12-31",
    value: 464005465.500,
    normalized: 464005465.500,
    unit: "KGS Thousand",
    normalizedUnit: "KGS Thousand",
    currency_code: "KGS",
    periodicity: "Monthly",
    expected_domain: "monetaryFlow",
  } as ParsedData & { expected_domain: string },

  // GOVERNMENT DEBT - Potentially implausible values
  {
    id: "JAMAICAGOVDEBJAM2024-09-3001K1HQHVEBRPMA3ZT02F08R8YN",
    name: "Government Debt",
    country_iso: "JAM",
    date: "2024-09-30",
    value: 2295088.090,
    normalized: 2295088.090,
    unit: "USD Million",
    normalizedUnit: "USD Million",
    currency_code: "USD",
    periodicity: "Monthly",
    expected_domain: "monetaryStock",
  } as ParsedData & { expected_domain: string },

  // CONSUMER SPENDING - Large values in local currency
  {
    id: "BURKINAFACONSPEBFA2024-12-3101K2NMVXR70D5Z6THVDBKACX7A",
    name: "Consumer Spending",
    country_iso: "BFA",
    date: "2024-12-31",
    value: 6297940.000,
    normalized: 6297940.000,
    unit: "XOF Billion",
    normalizedUnit: "XOF Billion",
    currency_code: "XOF",
    periodicity: "Yearly",
    expected_domain: "monetaryFlow",
  } as ParsedData & { expected_domain: string },
];

/**
 * FX fallback rates for edge cases dataset
 */
export const edgeCasesFXFallback: FXTable = {
  base: "USD",
  rates: {
    ...expandedDataFXFallback.rates,
    "KGS": 0.0118, // Kyrgyzstani Som
    "XOF": 0.00165, // West African CFA Franc
  },
};

/**
 * Expected domain distribution for edge cases dataset
 */
export const edgeCasesExpectedDomainDistribution = {
  counts: 1,
  indices: 1,
  monetaryStock: 2,
  monetaryFlow: 2,
  percentages: 0,
  ratios: 0,
  energy: 0,
  commodities: 0,
  agriculture: 0,
  metals: 0,
  crypto: 0,
};
