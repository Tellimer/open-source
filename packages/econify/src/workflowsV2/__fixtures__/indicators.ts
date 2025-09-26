// Comprehensive V2 fixtures covering domains, currencies, magnitudes, and time-bases
// ParsedData is intentionally loose in V2 to avoid cross-module coupling
import type { ParsedData } from "../shared/types.ts";

// Enhanced fixture type to include all DB fields for testing fallback logic
export interface FixtureData {
  id: string;
  value: number;
  unit: string;
  name: string;
  periodicity?: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly" | null;
  scale?: "Thousands" | "Millions" | "Billions" | null;
  currency_code?: string | null;
  category_group?: string;
}

export const fxFallbackBasic = {
  base: "USD",
  // simple flat table for tests; dates supply asOf for explain propagation
  rates: { EUR: 1.1, GBP: 1.25, JPY: 0.007, AUD: 0.65 },
  dates: {
    EUR: "2024-02-01",
    GBP: "2024-02-01",
    JPY: "2024-02-01",
    AUD: "2024-02-01",
  },
};

export const fxFallbackExtended = {
  base: "USD",
  rates: {
    EUR: 1.1,
    GBP: 1.25,
    JPY: 0.007,
    AUD: 0.65,
    NZD: 0.60,
    CAD: 0.75,
    CHF: 1.10,
    SEK: 0.095,
    DKK: 0.14,
    ZAR: 0.055,
    CNY: 0.14,
    INR: 0.012,
    KRW: 0.00075,
    BRL: 0.20,
    MXN: 0.06,
    NOK: 0.093,
    PLN: 0.25,
    CZK: 0.044,
    HUF: 0.0028,
    RON: 0.22,
    BGN: 0.56,
    HRK: 0.14,
    RSD: 0.0094,
    TRY: 0.032,
    ILS: 0.27,
    EGP: 0.032,
    MAD: 0.10,
    TND: 0.32,
    NGN: 0.0013,
    RUB: 0.011,
    KES: 0.0078,
    GHS: 0.083,
    XOF: 0.0017,
    XAF: 0.0017,
    AED: 0.27,
    SAR: 0.27,
    QAR: 0.27,
    BHD: 2.65,
    OMR: 2.60,
    KWD: 3.25,
    JOD: 1.41,
    IQD: 0.00076,
    LBP: 0.000011,
    LYD: 0.21,
    DZD: 0.0074,
    AOA: 0.0012,
    MUR: 0.022,
    SCR: 0.074,
    MVR: 0.065,
    LKR: 0.0031,
    PKR: 0.0036,
    BDT: 0.0091,
    NPR: 0.0075,
    BTN: 0.012,
    AFN: 0.014,
    UZS: 0.000079,
    KZT: 0.0022,
    KGS: 0.012,
    TJS: 0.091,
    AMD: 0.0025,
    GEL: 0.37,
    SYP: 0.00008,
    AZN: 0.59,
    BYN: 0.31,
    UAH: 0.024,
    MKD: 0.018,
    ALL: 0.011,
    BAM: 0.56,
    RWF: 0.00077,
    BIF: 0.00034,
    UGX: 0.00027,
    TZS: 0.00040,
    MWK: 0.00058,
    ZMW: 0.037,
    BWP: 0.073,
    CDF: 0.00040,
    NAD: 0.055,
    LSL: 0.055,
    SZL: 0.055,
    MZN: 0.016,
    MGA: 0.00022,
    ETB: 0.0081,
    DJF: 0.0056,
    SOS: 0.0018,
    SDG: 0.0017,
    GMD: 0.014,
    SLL: 0.000045,
    LRD: 0.0052,
    GNF: 0.00012,
    CVE: 0.011,
    STN: 0.043,
    XCD: 0.37,
    BBD: 0.50,
    BZD: 0.50,
    BSD: 1.0,
    BMD: 1.0,
    KYD: 1.20,
    JMD: 0.0064,
    TTD: 0.15,
    GYD: 0.0048,
    SRD: 0.028,
    BOB: 0.14,
    CLP: 0.0010,
    COP: 0.00023,
    CRC: 0.0020,
    DOP: 0.017,
    HTG: 0.0075,
    CUP: 0.039,
    GTQ: 0.13,
    HNL: 0.040,
    NIO: 0.027,
    PAB: 1.0,
    PEN: 0.27,
    PYG: 0.00013,
    UYU: 0.024,
    VES: 0.028,
    ARS: 0.0010,
    VND: 0.000039,
    MDL: 0.056,
    IDR: 0.000063,
    MYR: 0.22,
    SGD: 0.74,
    THB: 0.029,
    PHP: 0.017,
    BND: 0.74,
    KHR: 0.00025,
    LAK: 0.000046,
    MMK: 0.00048,
    MNT: 0.00029,
    MOP: 0.12,
    TWD: 0.031,
    HKD: 0.13,
    ISK: 0.0072,
    FJD: 0.44,
    PGK: 0.25,
    SBD: 0.12,
    TOP: 0.42,
    VUV: 0.0084,
    WST: 0.36,
    XPF: 0.0091,
  },
  dates: {
    EUR: "2024-02-01",
    GBP: "2024-02-01",
    JPY: "2024-02-01",
    AUD: "2024-02-01",
    NZD: "2024-02-01",
    CAD: "2024-02-01",
    CHF: "2024-02-01",
    SEK: "2024-02-01",
    DKK: "2024-02-01",
    ZAR: "2024-02-01",
    CNY: "2024-02-01",
    INR: "2024-02-01",
    KRW: "2024-02-01",
    BRL: "2024-02-01",
    MXN: "2024-02-01",
    NOK: "2024-02-01",
    PLN: "2024-02-01",
    CZK: "2024-02-01",
    HUF: "2024-02-01",
    RON: "2024-02-01",
    BGN: "2024-02-01",
    HRK: "2024-02-01",
    RSD: "2024-02-01",
    TRY: "2024-02-01",
    ILS: "2024-02-01",
    EGP: "2024-02-01",
    MAD: "2024-02-01",
    TND: "2024-02-01",
    NGN: "2024-02-01",
    KES: "2024-02-01",
    GHS: "2024-02-01",
    XOF: "2024-02-01",
    XAF: "2024-02-01",
    AED: "2024-02-01",
    SAR: "2024-02-01",
    QAR: "2024-02-01",
    BHD: "2024-02-01",
    OMR: "2024-02-01",
    KWD: "2024-02-01",
    JOD: "2024-02-01",
    LYD: "2024-02-01",
    DZD: "2024-02-01",
    AOA: "2024-02-01",
    MUR: "2024-02-01",
    SCR: "2024-02-01",
    MVR: "2024-02-01",
    LKR: "2024-02-01",
    PKR: "2024-02-01",
    BDT: "2024-02-01",
    NPR: "2024-02-01",
    AFN: "2024-02-01",
    UZS: "2024-02-01",
    KZT: "2024-02-01",
    KGS: "2024-02-01",
    TJS: "2024-02-01",
    AMD: "2024-02-01",
    GEL: "2024-02-01",
    AZN: "2024-02-01",
    BYN: "2024-02-01",
    UAH: "2024-02-01",
    MKD: "2024-02-01",
    ALL: "2024-02-01",
    BAM: "2024-02-01",
    RWF: "2024-02-01",
    BIF: "2024-02-01",
    UGX: "2024-02-01",
    TZS: "2024-02-01",
    MWK: "2024-02-01",
    ZMW: "2024-02-01",
    BWP: "2024-02-01",
    NAD: "2024-02-01",
    LSL: "2024-02-01",
    SZL: "2024-02-01",
    MZN: "2024-02-01",
    MGA: "2024-02-01",
    ETB: "2024-02-01",
    DJF: "2024-02-01",
    SOS: "2024-02-01",
    SDG: "2024-02-01",
    GMD: "2024-02-01",
    SLL: "2024-02-01",
    LRD: "2024-02-01",
    GNF: "2024-02-01",
    CVE: "2024-02-01",
    STN: "2024-02-01",
    XCD: "2024-02-01",
    BBD: "2024-02-01",
    BZD: "2024-02-01",
    BSD: "2024-02-01",
    BMD: "2024-02-01",
    KYD: "2024-02-01",
    JMD: "2024-02-01",
    TTD: "2024-02-01",
    GYD: "2024-02-01",
    SRD: "2024-02-01",
    BOB: "2024-02-01",
    CLP: "2024-02-01",
    COP: "2024-02-01",
    CRC: "2024-02-01",
    DOP: "2024-02-01",
    GTQ: "2024-02-01",
    HNL: "2024-02-01",
    NIO: "2024-02-01",
    PAB: "2024-02-01",
    PEN: "2024-02-01",
    PYG: "2024-02-01",
    UYU: "2024-02-01",
    VES: "2024-02-01",
    ARS: "2024-02-01",
    VND: "2024-02-01",
    IDR: "2024-02-01",
    MYR: "2024-02-01",
    SGD: "2024-02-01",
    THB: "2024-02-01",
    PHP: "2024-02-01",
    BND: "2024-02-01",
    KHR: "2024-02-01",
    LAK: "2024-02-01",
    MMK: "2024-02-01",
    MNT: "2024-02-01",
    MOP: "2024-02-01",
    TWD: "2024-02-01",
    HKD: "2024-02-01",
    FJD: "2024-02-01",
    PGK: "2024-02-01",
    SBD: "2024-02-01",
    TOP: "2024-02-01",
    VUV: "2024-02-01",
    WST: "2024-02-01",
    BTN: "2024-02-01",
  },
};

// Monetary Flow (wages/income) across multiple time-bases and currencies - based on real DB patterns
export const monetaryFlowSet: FixtureData[] = [
  // USD flows with various time bases - testing time unit vs periodicity fallback
  {
    id: "wf_usd_hr",
    value: 15,
    unit: "USD per hour",
    name: "Minimum Wage Hourly",
    periodicity: "Yearly",
    scale: null,
    currency_code: "USD",
    category_group: "Labour",
  }, // time unit wins
  {
    id: "wf_usd_day",
    value: 120,
    unit: "USD per day",
    name: "Daily Wage",
    periodicity: "Monthly",
    scale: null,
    currency_code: "USD",
    category_group: "Labour",
  }, // time unit wins
  {
    id: "wf_usd_wk",
    value: 850,
    unit: "USD per week",
    name: "Weekly Earnings",
    periodicity: "Quarterly",
    scale: null,
    currency_code: "USD",
    category_group: "Labour",
  }, // time unit wins
  {
    id: "wf_usd_mo",
    value: 3700,
    unit: "USD per month",
    name: "Monthly Salary",
    periodicity: "Monthly",
    scale: null,
    currency_code: "USD",
    category_group: "Labour",
  }, // both match
  {
    id: "wf_usd_qt",
    value: 11100,
    unit: "USD per quarter",
    name: "Quarterly Income",
    periodicity: "Quarterly",
    scale: null,
    currency_code: "USD",
    category_group: "Consumer",
  }, // both match
  {
    id: "wf_usd_yr",
    value: 44400,
    unit: "USD per year",
    name: "Annual Salary",
    periodicity: "Yearly",
    scale: null,
    currency_code: "USD",
    category_group: "Labour",
  }, // both match

  // EUR flows - testing periodicity mismatch scenarios
  {
    id: "wf_eur_hr",
    value: 12,
    unit: "EUR per hour",
    name: "EU Minimum Hourly",
    periodicity: null,
    scale: null,
    currency_code: "EUR",
    category_group: "Labour",
  }, // no periodicity
  {
    id: "wf_eur_wk",
    value: 950,
    unit: "EUR per week",
    name: "EU Weekly Wage",
    periodicity: "Monthly",
    scale: null,
    currency_code: "EUR",
    category_group: "Labour",
  }, // mismatch
  {
    id: "wf_eur_mo",
    value: 4100,
    unit: "EUR per month",
    name: "EU Monthly Salary",
    periodicity: "Quarterly",
    scale: null,
    currency_code: "EUR",
    category_group: "Labour",
  }, // mismatch
  {
    id: "wf_eur_qt",
    value: 12300,
    unit: "EUR per quarter",
    name: "EU Quarterly Income",
    periodicity: null,
    scale: null,
    currency_code: "EUR",
    category_group: "Consumer",
  }, // no periodicity
  {
    id: "wf_eur_yr",
    value: 49200,
    unit: "EUR per year",
    name: "EU Annual Salary",
    periodicity: "Yearly",
    scale: null,
    currency_code: "EUR",
    category_group: "Labour",
  }, // match

  // GBP flows
  {
    id: "wf_gbp_hr",
    value: 11.44,
    unit: "GBP per hour",
    name: "UK Minimum Hourly",
  },
  { id: "wf_gbp_wk", value: 650, unit: "GBP per week", name: "UK Weekly Wage" },
  {
    id: "wf_gbp_mo",
    value: 2800,
    unit: "GBP per month",
    name: "UK Monthly Salary",
  },
  {
    id: "wf_gbp_yr",
    value: 33600,
    unit: "GBP per year",
    name: "UK Annual Salary",
  },

  // JPY flows
  {
    id: "wf_jpy_hr",
    value: 1050,
    unit: "JPY per hour",
    name: "JP Hourly Wage",
  },
  { id: "wf_jpy_day", value: 8400, unit: "JPY per day", name: "JP Daily Wage" },
  {
    id: "wf_jpy_mo",
    value: 280000,
    unit: "JPY per month",
    name: "JP Monthly Salary",
  },
  {
    id: "wf_jpy_yr",
    value: 3360000,
    unit: "JPY per year",
    name: "JP Annual Salary",
  },

  // Other major currencies
  { id: "wf_aud_wk", value: 882, unit: "AUD per week", name: "AU Weekly Wage" },
  {
    id: "wf_aud_mo",
    value: 3800,
    unit: "AUD per month",
    name: "AU Monthly Salary",
  },
  {
    id: "wf_cad_hr",
    value: 16.65,
    unit: "CAD per hour",
    name: "CA Hourly Wage",
  },
  {
    id: "wf_cad_mo",
    value: 2880,
    unit: "CAD per month",
    name: "CA Monthly Salary",
  },
  {
    id: "wf_chf_mo",
    value: 4200,
    unit: "CHF per month",
    name: "CH Monthly Salary",
  },
  {
    id: "wf_nok_mo",
    value: 35000,
    unit: "NOK per month",
    name: "NO Monthly Salary",
  },
  {
    id: "wf_sek_mo",
    value: 32000,
    unit: "SEK per month",
    name: "SE Monthly Salary",
  },
  {
    id: "wf_dkk_mo",
    value: 25000,
    unit: "DKK per month",
    name: "DK Monthly Salary",
  },

  // Emerging markets
  {
    id: "wf_brl_mo",
    value: 1412,
    unit: "BRL per month",
    name: "BR Minimum Wage",
  },
  {
    id: "wf_mxn_mo",
    value: 7468,
    unit: "MXN per month",
    name: "MX Monthly Wage",
  },
  {
    id: "wf_inr_mo",
    value: 15000,
    unit: "INR per month",
    name: "IN Monthly Salary",
  },
  {
    id: "wf_cny_mo",
    value: 2590,
    unit: "CNY per month",
    name: "CN Monthly Wage",
  },
  {
    id: "wf_krw_mo",
    value: 2060000,
    unit: "KRW per month",
    name: "KR Monthly Salary",
  },
  {
    id: "wf_zar_mo",
    value: 4647,
    unit: "ZAR per month",
    name: "ZA Minimum Wage",
  },
  {
    id: "wf_rub_mo",
    value: 16242,
    unit: "RUB per month",
    name: "RU Monthly Wage",
  },
  {
    id: "wf_try_mo",
    value: 11402,
    unit: "TRY per month",
    name: "TR Minimum Wage",
  },
  {
    id: "wf_idr_mo",
    value: 4900000,
    unit: "IDR per month",
    name: "ID Monthly Wage",
  },
  {
    id: "wf_thb_mo",
    value: 15000,
    unit: "THB per month",
    name: "TH Monthly Wage",
  },
  {
    id: "wf_php_mo",
    value: 18000,
    unit: "PHP per month",
    name: "PH Monthly Wage",
  },
  {
    id: "wf_myr_mo",
    value: 1500,
    unit: "MYR per month",
    name: "MY Minimum Wage",
  },
  {
    id: "wf_vnd_mo",
    value: 6660000,
    unit: "VND per month",
    name: "VN Monthly Wage",
  },
  {
    id: "wf_egp_mo",
    value: 3500,
    unit: "EGP per month",
    name: "EG Monthly Wage",
  },
  {
    id: "wf_ngn_mo",
    value: 70000,
    unit: "NGN per month",
    name: "NG Minimum Wage",
  },
];

// Monetary Stock (levels) - based on real DB patterns
export const monetaryStockSet: FixtureData[] = [
  // USD stocks with various scales - testing scale vs unit parsing
  {
    id: "ws_usd",
    value: 23470,
    unit: "USD",
    name: "GDP per Capita",
    periodicity: "Yearly",
    scale: null,
    currency_code: "USD",
    category_group: "GDP",
  }, // no scale
  {
    id: "ws_usd_th",
    value: 125,
    unit: "USD thousands",
    name: "Median House Price",
    periodicity: "Yearly",
    scale: "Thousands",
    currency_code: "USD",
    category_group: "Housing",
  }, // both match
  {
    id: "ws_usd_mil",
    value: 850,
    unit: "USD millions",
    name: "Government Budget",
    periodicity: "Quarterly",
    scale: "Millions",
    currency_code: "USD",
    category_group: "Government",
  }, // both match
  {
    id: "ws_usd_bil",
    value: 21.4,
    unit: "USD billions",
    name: "GDP Nominal",
    periodicity: "Yearly",
    scale: "Billions",
    currency_code: "USD",
    category_group: "GDP",
  }, // both match

  // EUR stocks
  { id: "ws_eur", value: 35200, unit: "EUR", name: "GDP per Capita PPP" },
  {
    id: "ws_eur_th",
    value: 280,
    unit: "EUR thousands",
    name: "Average Home Value",
  },
  {
    id: "ws_eur_mil",
    value: 1250,
    unit: "EUR millions",
    name: "Trade Balance",
  },
  {
    id: "ws_eur_bil",
    value: 13.3,
    unit: "EUR billions",
    name: "National Debt",
  },

  // GBP stocks
  { id: "ws_gbp_mil", value: 780, unit: "GBP millions", name: "External Debt" },
  {
    id: "ws_gbp_bil",
    value: 2.8,
    unit: "GBP billions",
    name: "Government Spending",
  },

  // JPY stocks
  {
    id: "ws_jpy_mil",
    value: 125000,
    unit: "JPY millions",
    name: "Money Supply M1",
  },
  { id: "ws_jpy_bil", value: 550, unit: "JPY billions", name: "Public Debt" },

  // Other major currencies
  {
    id: "ws_cad_mil",
    value: 920,
    unit: "CAD millions",
    name: "Foreign Reserves",
  },
  {
    id: "ws_aud_mil",
    value: 620,
    unit: "AUD millions",
    name: "Private Credit",
  },
  {
    id: "ws_chf_mil",
    value: 890,
    unit: "CHF millions",
    name: "Banking Assets",
  },
  {
    id: "ws_nok_mil",
    value: 12000,
    unit: "NOK millions",
    name: "Oil Fund Value",
  },
  {
    id: "ws_sek_mil",
    value: 4500,
    unit: "SEK millions",
    name: "Government Revenue",
  },
  {
    id: "ws_dkk_mil",
    value: 3200,
    unit: "DKK millions",
    name: "Household Debt",
  },

  // Emerging markets with larger scales
  { id: "ws_cny_bil", value: 17.7, unit: "CNY billions", name: "GDP" },
  {
    id: "ws_inr_bil",
    value: 285,
    unit: "INR billions",
    name: "Government Debt",
  },
  {
    id: "ws_krw_bil",
    value: 2100,
    unit: "KRW billions",
    name: "National Debt",
  },
  { id: "ws_brl_mil", value: 890, unit: "BRL millions", name: "Trade Surplus" },
  {
    id: "ws_mxn_mil",
    value: 1250,
    unit: "MXN millions",
    name: "Foreign Investment",
  },
  {
    id: "ws_zar_mil",
    value: 450,
    unit: "ZAR millions",
    name: "Gold Reserves Value",
  },
  {
    id: "ws_rub_bil",
    value: 130,
    unit: "RUB billions",
    name: "National Wealth Fund",
  },
  {
    id: "ws_try_th",
    value: 850,
    unit: "TRY thousands",
    name: "Consumer Credit",
  },
  {
    id: "ws_idr_bil",
    value: 2800,
    unit: "IDR billions",
    name: "Government Budget",
  },
  {
    id: "ws_thb_mil",
    value: 1500,
    unit: "THB millions",
    name: "Tourism Revenue",
  },
  { id: "ws_php_mil", value: 890, unit: "PHP millions", name: "Remittances" },
  { id: "ws_vnd_bil", value: 4500, unit: "VND billions", name: "Export Value" },
  {
    id: "ws_egp_mil",
    value: 670,
    unit: "EGP millions",
    name: "Suez Canal Revenue",
  },
  { id: "ws_ngn_mil", value: 1200, unit: "NGN millions", name: "Oil Revenue" },

  // African currencies (CFA zones)
  { id: "ws_xof_bil", value: 45, unit: "XOF billions", name: "WAEMU Reserves" },
  { id: "ws_xaf_bil", value: 38, unit: "XAF billions", name: "CEMAC Reserves" },

  // Gulf currencies
  {
    id: "ws_sar_mil",
    value: 2800,
    unit: "SAR millions",
    name: "SAMA Reserves",
  },
  {
    id: "ws_aed_mil",
    value: 1500,
    unit: "AED millions",
    name: "Sovereign Fund",
  },
  { id: "ws_qar_mil", value: 890, unit: "QAR millions", name: "Gas Revenue" },
  { id: "ws_kwd_mil", value: 450, unit: "KWD millions", name: "Oil Fund" },
  {
    id: "ws_bhd_mil",
    value: 120,
    unit: "BHD millions",
    name: "Government Revenue",
  },
  { id: "ws_omr_mil", value: 280, unit: "OMR millions", name: "Trade Balance" },
];

// Non-monetary domain items (should ignore currency/time targeting) - based on real DB patterns
export const nonMonetarySet: FixtureData[] = [
  // Counts (various scales) - with realistic periodicity
  {
    id: "ct_persons",
    value: 125000,
    unit: "Persons",
    name: "Employment Level",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Labour",
  },
  {
    id: "ct_persons_l",
    value: 98500,
    unit: "persons",
    name: "Unemployed Persons",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Labour",
  },
  {
    id: "ct_companies",
    value: 1250,
    unit: "Companies",
    name: "New Business Registrations",
    periodicity: "Quarterly",
    scale: null,
    currency_code: null,
    category_group: "Business",
  },
  {
    id: "ct_units",
    value: 45000,
    unit: "Units",
    name: "Car Production",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Business",
  },
  {
    id: "ct_thousand",
    value: 125,
    unit: "Thousand",
    name: "Tourist Arrivals",
    periodicity: "Monthly",
    scale: "Thousands",
    currency_code: null,
    category_group: "Consumer",
  },
  {
    id: "ct_thousands",
    value: 89,
    unit: "Thousands",
    name: "Housing Starts",
    periodicity: "Monthly",
    scale: "Thousands",
    currency_code: null,
    category_group: "Housing",
  },
  {
    id: "ct_million",
    value: 68.5,
    unit: "Million",
    name: "Population",
    periodicity: "Yearly",
    scale: "Millions",
    currency_code: null,
    category_group: "Labour",
  },
  {
    id: "ct_billions",
    value: 1.4,
    unit: "Billions",
    name: "Global Population Segment",
    periodicity: "Yearly",
    scale: "Billions",
    currency_code: null,
    category_group: "Labour",
  },

  // Percentages (various formats) - with realistic periodicity
  {
    id: "pct_simple",
    value: 3.5,
    unit: "%",
    name: "Inflation Rate",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Prices",
  },
  {
    id: "pct_text_lower",
    value: 6.2,
    unit: "percent",
    name: "Unemployment Rate",
    periodicity: "Quarterly",
    scale: null,
    currency_code: null,
    category_group: "Labour",
  },
  {
    id: "pct_text_cap",
    value: 2.8,
    unit: "Percent",
    name: "GDP Growth",
    periodicity: "Quarterly",
    scale: null,
    currency_code: null,
    category_group: "GDP",
  },
  {
    id: "pct_gdp",
    value: 68.5,
    unit: "percent of GDP",
    name: "Debt to GDP Ratio",
    periodicity: "Yearly",
    scale: null,
    currency_code: null,
    category_group: "Government",
  },
  {
    id: "pct_per_1000",
    value: 3.4,
    unit: "per 1000 people",
    name: "Birth Rate",
    periodicity: "Yearly",
    scale: null,
    currency_code: null,
    category_group: "Health",
  },
  {
    id: "pct_per_100",
    value: 156,
    unit: "doses per 100 people",
    name: "Vaccination Coverage",
    periodicity: "Daily",
    scale: null,
    currency_code: null,
    category_group: "Health",
  },
  {
    id: "pct_per_million",
    value: 245,
    unit: "per one million people",
    name: "COVID Cases per Million",
    periodicity: "Daily",
    scale: null,
    currency_code: null,
    category_group: "Health",
  },

  // Indices - with realistic periodicity
  {
    id: "idx_points_lower",
    value: 105.3,
    unit: "points",
    name: "Consumer Confidence Index",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Consumer",
  },
  {
    id: "idx_points_cap",
    value: 62.8,
    unit: "Points",
    name: "Corruption Perception Index",
    periodicity: "Yearly",
    scale: null,
    currency_code: null,
    category_group: "Business",
  },
  {
    id: "idx_pmi",
    value: 52.1,
    unit: "points",
    name: "Manufacturing PMI",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Business",
  },
  {
    id: "idx_sentiment",
    value: 98.7,
    unit: "Points",
    name: "Business Sentiment",
    periodicity: "Monthly",
    scale: null,
    currency_code: null,
    category_group: "Business",
  },

  // Energy
  { id: "en_gwh", value: 1250, unit: "GWh", name: "Electricity Production" },
  {
    id: "en_gigawatt",
    value: 890,
    unit: "Gigawatt-hour",
    name: "Renewable Energy Generation",
  },
  {
    id: "en_terajoule",
    value: 450,
    unit: "Terajoule",
    name: "Natural Gas Consumption",
  },
  { id: "en_mw", value: 3200, unit: "MW", name: "Installed Capacity" },
  { id: "en_megawatt", value: 2100, unit: "Megawatt", name: "Peak Demand" },
  { id: "en_kt_co2", value: 1850, unit: "KT", name: "CO2 Emissions" },

  // Commodities - Oil
  { id: "co_bbl", value: 95000, unit: "barrel", name: "Daily Oil Production" },
  { id: "co_bbl_1k", value: 850, unit: "BBL/D/1K", name: "Crude Oil Output" },
  {
    id: "co_bbl_1m",
    value: 42.5,
    unit: "BBL/1Million",
    name: "Strategic Oil Reserves",
  },

  // Agriculture
  { id: "ag_tonnes", value: 125000, unit: "Tonnes", name: "Wheat Production" },
  { id: "ag_mt", value: 89, unit: "metric tonnes", name: "Rice Export" },
  {
    id: "ag_thousand_tonnes",
    value: 450,
    unit: "Thousand Tonnes",
    name: "Corn Harvest",
  },
  {
    id: "ag_kt",
    value: 230,
    unit: "Thousands of Tonnes",
    name: "Sugar Production",
  },
  {
    id: "ag_bushels",
    value: 2.8,
    unit: "Billion Bushels",
    name: "Soybean Stocks",
  },

  // Metals
  { id: "me_tonnes", value: 450, unit: "Tonnes", name: "Gold Reserves" },
  {
    id: "me_copper",
    value: 1250,
    unit: "copper tonnes",
    name: "Copper Production",
  },
  {
    id: "me_steel_kt",
    value: 890,
    unit: "Thousand Tonnes",
    name: "Steel Production",
  },
  { id: "me_aluminum", value: 320, unit: "Tonnes", name: "Aluminum Output" },

  // Crypto (various tokens)
  { id: "cr_btc", value: 21.5, unit: "BTC", name: "Bitcoin Holdings" },
  { id: "cr_eth", value: 1250, unit: "ETH", name: "Ethereum Balance" },
  { id: "cr_xrp", value: 50000, unit: "XRP", name: "Ripple Holdings" },
  { id: "cr_sol", value: 450, unit: "SOL", name: "Solana Staked" },
  { id: "cr_ada", value: 125000, unit: "ADA", name: "Cardano Holdings" },

  // Weather/Climate
  {
    id: "wx_celsius",
    value: 22.5,
    unit: "celsius",
    name: "Average Temperature",
  },
  { id: "wx_mm", value: 1250, unit: "mm", name: "Annual Precipitation" },

  // Time/Duration
  { id: "tm_years", value: 67, unit: "Years", name: "Retirement Age" },
  { id: "tm_hours", value: 38.5, unit: "Hours", name: "Average Work Week" },

  // Other specialized units
  {
    id: "sp_sipri",
    value: 125,
    unit: "SIPRI TIV Million",
    name: "Arms Exports",
  },
  {
    id: "sp_usd_liter",
    value: 1.45,
    unit: "USD/Liter",
    name: "Gasoline Price",
  },
  {
    id: "sp_doses",
    value: 2500000,
    unit: "doses",
    name: "Vaccines Administered",
  },
  {
    id: "sp_bam_sqm",
    value: 4500,
    unit: "BAM/SQ. METRE",
    name: "Real Estate Price per SqM",
  },

  // Index variations and ratios
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
  {
    id: "ratio_simple",
    value: 1.45,
    unit: "Ratio",
    name: "Debt Service Ratio",
  },

  // Growth rates and changes
  {
    id: "gr_annual",
    value: 3.2,
    unit: "Annual % growth",
    name: "GDP Growth Rate",
  },
  {
    id: "ch_percent",
    value: -1.5,
    unit: "Percent change",
    name: "Export Change",
  },
  {
    id: "ch_ppp",
    value: 2.8,
    unit: "Purchasing power parity; percent change",
    name: "PPP Adjusted Growth",
  },

  // Special volume units
  {
    id: "vol_bcf",
    value: 125,
    unit: "billion cubic feet",
    name: "Natural Gas Storage",
  },
  {
    id: "vol_th_bbl",
    value: 450,
    unit: "Thousand Barrels",
    name: "Oil Storage",
  },
  {
    id: "vol_th_units",
    value: 89,
    unit: "Thousand units",
    name: "Vehicle Sales",
  },

  // Special scales and formats
  {
    id: "sc_usd_hm",
    value: 3.2,
    unit: "USD Hundred Million",
    name: "Infrastructure Investment",
  },
  { id: "sc_usd_mil_lc", value: 450, unit: "USD million", name: "FDI Inflows" },
  {
    id: "sc_usd_th_lc",
    value: 125,
    unit: "USD Thousands",
    name: "Per Capita Investment",
  },
  { id: "sc_usd_cur", value: 2.8, unit: "U.S. dollars", name: "Exchange Rate" },
  {
    id: "sc_amt_cur",
    value: 890,
    unit: "AMT, current US$",
    name: "Alternative Min Tax",
  },
  {
    id: "sc_dod_cur",
    value: 340,
    unit: "DOD, current USD",
    name: "Defense Spending",
  },

  // Percent of GDP variations
  {
    id: "pct_gdp_cap",
    value: 45.2,
    unit: "Percent of GDP",
    name: "Investment Rate",
  },
  { id: "pct_gdp_sym", value: 23.8, unit: "% of GDP", name: "Tax Revenue" },
  {
    id: "pct_natcur_ppp",
    value: 4.5,
    unit: "National currency per current international dollar",
    name: "PPP Conversion Factor",
  },

  // Empty/missing units (for edge case testing)
  { id: "empty_unit", value: 100, unit: "", name: "No Unit Specified" },
  { id: "units_lower", value: 250, unit: "units", name: "Generic Units Lower" },
  {
    id: "million_lower",
    value: 5.5,
    unit: "million",
    name: "Generic Million Lower",
  },
];

// Mix for auto-target dominance testing (80% EUR dominance)
export const autoTargetEURDominant: FixtureData[] = [
  { id: "at_e1", value: 100, unit: "EUR per month", name: "EUR 1" },
  { id: "at_e2", value: 120, unit: "EUR per month", name: "EUR 2" },
  { id: "at_e3", value: 110, unit: "EUR per month", name: "EUR 3" },
  { id: "at_e4", value: 130, unit: "EUR per month", name: "EUR 4" },
  { id: "at_e5", value: 115, unit: "EUR per month", name: "EUR 5" },
  { id: "at_e6", value: 125, unit: "EUR per month", name: "EUR 6" },
  { id: "at_e7", value: 118, unit: "EUR per month", name: "EUR 7" },
  { id: "at_e8", value: 122, unit: "EUR per month", name: "EUR 8" },
  { id: "at_g1", value: 90, unit: "GBP per month", name: "GBP 1" },
  { id: "at_g2", value: 95, unit: "GBP per month", name: "GBP 2" },
];

// Mix for below dominance threshold
export const belowDominanceMix: FixtureData[] = [
  { id: "bd_e1", value: 100, unit: "EUR per month", name: "EUR 1" },
  { id: "bd_e2", value: 100, unit: "EUR per month", name: "EUR 2" },
  { id: "bd_e3", value: 100, unit: "EUR per month", name: "EUR 3" },
  { id: "bd_e4", value: 100, unit: "EUR per month", name: "EUR 4" },
  { id: "bd_e5", value: 100, unit: "EUR per month", name: "EUR 5" },
  { id: "bd_g1", value: 100, unit: "GBP per month", name: "GBP 1" },
  { id: "bd_g2", value: 100, unit: "GBP per month", name: "GBP 2" },
  { id: "bd_g3", value: 100, unit: "GBP per month", name: "GBP 3" },
  { id: "bd_g4", value: 100, unit: "GBP per month", name: "GBP 4" },
  { id: "bd_g5", value: 100, unit: "GBP per month", name: "GBP 5" },
];

// Full combined array to exercise router ordering and explain merge
export const allDomainsCombined: FixtureData[] = [
  ...monetaryFlowSet,
  ...monetaryStockSet,
  ...nonMonetarySet,
];

// DB-inspired realistic non-monetary units
export const realisticNonMonetarySet: FixtureData[] = [
  { id: "pct_db", value: 4.2, unit: "%", name: "Inflation" },
  { id: "pct_text_lower", value: 3.1, unit: "percent", name: "Share" },
  { id: "pct_text_cap", value: 7.5, unit: "Percent", name: "Rate" },
  {
    id: "pct_per_1000",
    value: 2.3,
    unit: "per 1000 people",
    name: "Doctors per 1000",
  },
  {
    id: "doses_per_100",
    value: 55,
    unit: "doses per 100 people",
    name: "Vaccinations",
  },
  {
    id: "idx_pts_lower",
    value: 105,
    unit: "points",
    name: "Economic Optimism Index",
  },
  { id: "idx_pts_cap", value: 62, unit: "Points", name: "Corruption Index" },
  { id: "ct_units", value: 12000, unit: "Units", name: "Car Production" },
  { id: "ct_persons", value: 250, unit: "Persons", name: "Employment Level" },
  {
    id: "ct_persons_l",
    value: 240,
    unit: "persons",
    name: "Employment Level (l)",
  },
  {
    id: "en_gwh_long",
    value: 180,
    unit: "Gigawatt-hour",
    name: "Electricity Production",
  },
  { id: "em_kt", value: 2100, unit: "KT", name: "CO2 Emissions" },
  { id: "wx_mm", value: 900, unit: "mm", name: "Precipitation" },
  { id: "wx_celsius", value: 23.5, unit: "celsius", name: "Temperature" },
  { id: "yrs_years", value: 65, unit: "Years", name: "Retirement Age Men" },
  {
    id: "oil_bblpd_k",
    value: 1300,
    unit: "BBL/D/1K",
    name: "Crude Oil Production",
  },
];

// DB-inspired realistic monetary variants (stocks)
export const realisticMonetaryStockSet: FixtureData[] = [
  { id: "ms_usd_bil", value: 1.2, unit: "USD billions", name: "GDP" },
  {
    id: "ms_eur_mil",
    value: 850,
    unit: "EUR millions",
    name: "Consumer Spending",
  },
  { id: "ms_gbp_mil", value: 320, unit: "GBP millions", name: "External Debt" },
  {
    id: "ms_jpy_mil",
    value: 500,
    unit: "JPY millions",
    name: "Money Supply M1",
  },
  { id: "ms_usd", value: 900, unit: "USD", name: "GDP per Capita PPP" },
];

// DB-inspired realistic monetary flows (wages/income)
export const realisticMonetaryFlowSet: FixtureData[] = [
  { id: "mf_aud_mo", value: 250, unit: "AUD per month", name: "Wages" },
  { id: "mf_eur_mo", value: 3200, unit: "EUR per month", name: "Earnings" },
  {
    id: "mf_usd_qtr",
    value: 9500,
    unit: "USD per quarter",
    name: "Income Quarterly",
  },
];

// Combined realistic set
export const realisticMixedSet: FixtureData[] = [
  ...realisticNonMonetarySet,
  ...realisticMonetaryStockSet,
  ...realisticMonetaryFlowSet,
];

// Scaled domain-specific sets (~10 each) inspired by DB distributions
export const percentagesSet: FixtureData[] = [
  { id: "p1", value: 1.2, unit: "%", name: "Headline CPI" },
  { id: "p2", value: 3.4, unit: "%", name: "Unemployment Rate" },
  {
    id: "p3",
    value: 55,
    unit: "doses per 100 people",
    name: "Vaccination Coverage",
  },
  { id: "p4", value: 2.1, unit: "per 1000 people", name: "Doctors per 1000" },
  { id: "p5", value: 40, unit: "percent of GDP", name: "Debt to GDP" },
  { id: "p6", value: 12.5, unit: "percent", name: "Share" },
  { id: "p7", value: 9.8, unit: "Percent", name: "Rate" },
  { id: "p8", value: 0.7, unit: "%", name: "Core CPI" },
  { id: "p9", value: 4.6, unit: "%", name: "PPI YoY" },
  { id: "p10", value: 6.3, unit: "%", name: "Retail Sales YoY" },
];

export const indicesSet: FixtureData[] = [
  { id: "i1", value: 100, unit: "points", name: "Economic Optimism Index" },
  { id: "i2", value: 62, unit: "Points", name: "Corruption Index" },
  { id: "i3", value: 120, unit: "points", name: "Business Confidence" },
  { id: "i4", value: 98, unit: "Points", name: "Consumer Confidence" },
  { id: "i5", value: 115, unit: "points", name: "PMI" },
  { id: "i6", value: 104, unit: "Points", name: "Industrial Sentiment" },
  { id: "i7", value: 88, unit: "points", name: "Services Sentiment" },
  { id: "i8", value: 132, unit: "Points", name: "Manufacturing Sentiment" },
  { id: "i9", value: 75, unit: "points", name: "Housing Index" },
  { id: "i10", value: 143, unit: "Points", name: "Market Index" },
];

export const countsSet: FixtureData[] = [
  { id: "c1", value: 2, unit: "Thousand", name: "Car Registrations" },
  { id: "c2", value: 3, unit: "Thousands", name: "Truck Registrations" },
  { id: "c3", value: 1.2, unit: "Million", name: "Population (subset)" },
  { id: "c4", value: 250, unit: "Persons", name: "Employment Level" },
  { id: "c5", value: 240, unit: "persons", name: "Employment Level (l)" },
  { id: "c6", value: 12000, unit: "Units", name: "Car Production" },
  { id: "c7", value: 800, unit: "Units", name: "Appliance Production" },
  { id: "c8", value: 1.5, unit: "Billions", name: "Microchips Shipped" },
  { id: "c9", value: 5, unit: "Thousands", name: "New Houses" },
  { id: "c10", value: 75, unit: "Thousand", name: "Tourist Arrivals" },
];
export const energySet: FixtureData[] = [
  { id: "e1", value: 150, unit: "GWh", name: "Electricity production" },
  {
    id: "e2",
    value: 180,
    unit: "Gigawatt-hour",
    name: "Electricity production",
  },
  { id: "e3", value: 210, unit: "GWh", name: "Hydro production" },
  { id: "e4", value: 75, unit: "GWh", name: "Solar generation" },
  { id: "e5", value: 90, unit: "GWh", name: "Wind generation" },
  { id: "e6", value: 45, unit: "Terajoule", name: "Bioenergy" },
  { id: "e7", value: 60, unit: "Terajoule", name: "Geothermal" },
  { id: "e8", value: 33, unit: "GWh", name: "Battery discharge" },
  { id: "e9", value: 27, unit: "Gigawatt-hour", name: "Pump storage" },
  { id: "e10", value: 12, unit: "GWh", name: "Other" },
];

export const commoditiesSet: FixtureData[] = [
  { id: "cm1", value: 10, unit: "barrel", name: "Crude output" },
  { id: "cm2", value: 12, unit: "barrel", name: "Crude output" },
  { id: "cm3", value: 8, unit: "barrel", name: "Crude output" },
  { id: "cm4", value: 1000, unit: "BBL/D/1K", name: "Oil production" },
  { id: "cm5", value: 1100, unit: "BBL/D/1K", name: "Oil production" },
  { id: "cm6", value: 1200, unit: "BBL/D/1K", name: "Oil production" },
  { id: "cm7", value: 15, unit: "barrel", name: "Crude output" },
  { id: "cm8", value: 17, unit: "barrel", name: "Crude output" },
  { id: "cm9", value: 14, unit: "barrel", name: "Crude output" },
  { id: "cm10", value: 9, unit: "barrel", name: "Crude output" },
];

export const agricultureSet: FixtureData[] = [
  { id: "ag1", value: 55, unit: "metric tonnes", name: "Wheat" },
  { id: "ag2", value: 70, unit: "Tonnes", name: "Corn" },
  { id: "ag3", value: 65, unit: "Tonnes", name: "Rice" },
  { id: "ag4", value: 80, unit: "metric tonnes", name: "Soybeans" },
  { id: "ag5", value: 90, unit: "Tonnes", name: "Sugar" },
  { id: "ag6", value: 45, unit: "metric tonnes", name: "Coffee" },
  { id: "ag7", value: 33, unit: "Tonnes", name: "Cocoa" },
  { id: "ag8", value: 27, unit: "Tonnes", name: "Cotton" },
  { id: "ag9", value: 21, unit: "metric tonnes", name: "Palm Oil" },
  { id: "ag10", value: 18, unit: "Tonnes", name: "Tea" },
];

export const metalsSet: FixtureData[] = [
  { id: "m1", value: 12, unit: "copper tonnes", name: "Copper" },
  { id: "m2", value: 9, unit: "Tonnes", name: "Aluminum" },
  { id: "m3", value: 8, unit: "Tonnes", name: "Zinc" },
  { id: "m4", value: 7, unit: "Tonnes", name: "Lead" },
  { id: "m5", value: 5, unit: "Tonnes", name: "Nickel" },
  { id: "m6", value: 3, unit: "Tonnes", name: "Tin" },
  { id: "m7", value: 2, unit: "Tonnes", name: "Cobalt" },
  { id: "m8", value: 4, unit: "Tonnes", name: "Lithium" },
  { id: "m9", value: 6, unit: "Tonnes", name: "Iron" },
  { id: "m10", value: 11, unit: "Tonnes", name: "Steel" },
];

export const cryptoSet: FixtureData[] = [
  { id: "cr1", value: 1.2, unit: "BTC", name: "Bitcoin" },
  { id: "cr2", value: 15, unit: "ETH", name: "Ethereum" },
  { id: "cr3", value: 300, unit: "XRP", name: "Ripple" },
  { id: "cr4", value: 50, unit: "LTC", name: "Litecoin" },
  { id: "cr5", value: 2, unit: "SOL", name: "Solana" },
  { id: "cr6", value: 1000, unit: "ADA", name: "Cardano" },
  { id: "cr7", value: 5, unit: "DOT", name: "Polkadot" },
  { id: "cr8", value: 20, unit: "BNB", name: "Binance Coin" },
  { id: "cr9", value: 3000, unit: "DOGE", name: "Dogecoin" },
  { id: "cr10", value: 100, unit: "TRX", name: "Tron" },
];

// Extra monetary sets to scale up totals
export const monetaryFlowSetExtra: FixtureData[] = [
  { id: "wf_usd_wk2", value: 550, unit: "USD per week", name: "Wage weekly 2" },
  {
    id: "wf_usd_qt",
    value: 8000,
    unit: "USD per quarter",
    name: "Income quarter",
  },
  {
    id: "wf_usd_yr2",
    value: 36000,
    unit: "USD per year",
    name: "Salary yearly",
  },
  { id: "wf_eur_wk", value: 900, unit: "EUR per week", name: "EU weekly" },
  {
    id: "wf_eur_qt",
    value: 9500,
    unit: "EUR per quarter",
    name: "EU quarterly",
  },
  {
    id: "wf_gbp_mo2",
    value: 3200,
    unit: "GBP per month",
    name: "UK monthly 2",
  },
  { id: "wf_gbp_yr", value: 41000, unit: "GBP per year", name: "UK yearly" },
  { id: "wf_jpy_wk", value: 70000, unit: "JPY per week", name: "JP weekly" },
  { id: "wf_aud_wk", value: 850, unit: "AUD per week", name: "AU weekly" },
  {
    id: "wf_aud_mo2",
    value: 3300,
    unit: "AUD per month",
    name: "AU monthly 2",
  },
];

export const monetaryStockSetExtra: FixtureData[] = [
  { id: "ws_usd_bil2", value: 2.4, unit: "USD billions", name: "GDP 2" },
  {
    id: "ws_eur_bil",
    value: 1.8,
    unit: "EUR billions",
    name: "Government Spending",
  },
  {
    id: "ws_gbp_mil2",
    value: 275,
    unit: "GBP millions",
    name: "External Debt 2",
  },
  { id: "ws_jpy_bil", value: 3.1, unit: "JPY billions", name: "Public Debt" },
  {
    id: "ws_aud_mil",
    value: 420,
    unit: "AUD millions",
    name: "Private Credit",
  },
  {
    id: "ws_nzd_mil",
    value: 310,
    unit: "NZD millions",
    name: "Money Supply M2",
  },
  { id: "ws_cad_mil", value: 600, unit: "CAD millions", name: "Reserves CAD" },
  { id: "ws_chf_mil", value: 290, unit: "CHF millions", name: "Assets" },
  { id: "ws_sek_mil", value: 330, unit: "SEK millions", name: "Liabilities" },
  { id: "ws_dkk_mil", value: 280, unit: "DKK millions", name: "Securities" },
];

// A large combined set to approach ~100 items
export const allDomainsCombinedLarge: FixtureData[] = [
  ...percentagesSet,
  ...indicesSet,
  ...countsSet,
  ...energySet,
  ...commoditiesSet,
  ...agricultureSet,
  ...metalsSet,
  ...cryptoSet,
  ...monetaryFlowSet,
  ...monetaryFlowSetExtra,
  ...monetaryStockSet,
  ...monetaryStockSetExtra,
];

// Extra percentages and per-population variants
export const percentagesExtraSet: FixtureData[] = [
  { id: "p11", value: 1.1, unit: "%", name: "Inflation MoM" },
  { id: "p12", value: 7.2, unit: "%", name: "Inflation YoY" },
  { id: "p13", value: 2.7, unit: "percent", name: "Unemployment" },
  { id: "p14", value: 3.9, unit: "Percent", name: "Participation" },
  {
    id: "p15",
    value: 33,
    unit: "percent of GDP",
    name: "Government Spending to GDP",
  },
  {
    id: "p16",
    value: 1.8,
    unit: "per one million people",
    name: "ICU Beds per million",
  },
  {
    id: "p17",
    value: 25,
    unit: "doses per 100 people",
    name: "Boosters per 100",
  },
  { id: "p18", value: 0.35, unit: "per 1000 people", name: "Nurses per 1000" },
  { id: "p19", value: 5.1, unit: "%", name: "PPI YoY" },
  { id: "p20", value: 8.2, unit: "%", name: "Wage Growth YoY" },
];

// Extra indices
export const indicesExtraSet: FixtureData[] = [
  { id: "i11", value: 101, unit: "points", name: "Economic Sentiment" },
  { id: "i12", value: 64, unit: "Points", name: "Freedom Index" },
  { id: "i13", value: 118, unit: "points", name: "Manufacturing PMI" },
  { id: "i14", value: 95, unit: "Points", name: "Services PMI" },
  { id: "i15", value: 140, unit: "points", name: "Housing Market Index" },
  { id: "i16", value: 108, unit: "Points", name: "Consumer Sentiment" },
  { id: "i17", value: 85, unit: "points", name: "Corruption Perception" },
  { id: "i18", value: 127, unit: "Points", name: "Innovation Index" },
  { id: "i19", value: 73, unit: "points", name: "Logistics Index" },
  { id: "i20", value: 150, unit: "Points", name: "Competitiveness Index" },
];

// Extra agriculture and metals
export const agricultureExtraSet: FixtureData[] = [
  { id: "ag11", value: 66, unit: "Tonnes", name: "Barley" },
  { id: "ag12", value: 72, unit: "metric tonnes", name: "Sunflower" },
  { id: "ag13", value: 44, unit: "Tonnes", name: "Rapeseed" },
  { id: "ag14", value: 39, unit: "metric tonnes", name: "Beans" },
  { id: "ag15", value: 51, unit: "Tonnes", name: "Sorghum" },
];

export const metalsExtraSet: FixtureData[] = [
  { id: "m11", value: 4.4, unit: "Tonnes", name: "Manganese" },
  { id: "m12", value: 2.2, unit: "Tonnes", name: "Chromium" },
  { id: "m13", value: 1.1, unit: "Tonnes", name: "Vanadium" },
  { id: "m14", value: 0.9, unit: "Tonnes", name: "Molybdenum" },
  { id: "m15", value: 7.7, unit: "Tonnes", name: "Bauxite" },
];

// Extra monetary flows/stocks with broader currencies
export const monetaryFlowSetExtra2: FixtureData[] = [
  { id: "wf_zar_mo", value: 18000, unit: "ZAR per month", name: "SA Wages" },
  { id: "wf_cny_mo", value: 7500, unit: "CNY per month", name: "CN Wages" },
  {
    id: "wf_cny_yr",
    value: 90000,
    unit: "CNY per year",
    name: "CN Annual Income",
  },
  { id: "wf_inr_day", value: 550, unit: "INR per day", name: "IN Daily Wage" },
  {
    id: "wf_inr_wk",
    value: 12000,
    unit: "INR per week",
    name: "IN Weekly Income",
  },
  { id: "wf_krw_mo", value: 4200000, unit: "KRW per month", name: "KR Wages" },
  { id: "wf_brl_mo", value: 3500, unit: "BRL per month", name: "BR Wages" },
  {
    id: "wf_mxn_qt",
    value: 28000,
    unit: "MXN per quarter",
    name: "MX Quarterly Income",
  },
  {
    id: "wf_clp_hr",
    value: 2100,
    unit: "CLP per hour",
    name: "CL Hourly Wage",
  },
  {
    id: "wf_clp_mo",
    value: 460000,
    unit: "CLP per month",
    name: "CL Monthly Wage",
  },
  {
    id: "wf_czk_mo",
    value: 18900,
    unit: "CZK per month",
    name: "CZ Monthly Wage",
  },
  {
    id: "wf_huf_mo",
    value: 266800,
    unit: "HUF per month",
    name: "HU Monthly Wage",
  },
  {
    id: "wf_pln_mo",
    value: 4242,
    unit: "PLN per month",
    name: "PL Monthly Wage",
  },
  {
    id: "wf_ils_mo",
    value: 5880,
    unit: "ILS per month",
    name: "IL Monthly Wage",
  },
  { id: "wf_hkd_hr", value: 40, unit: "HKD per hour", name: "HK Hourly Wage" },
  {
    id: "wf_hkd_mo",
    value: 19000,
    unit: "HKD per month",
    name: "HK Monthly Wage",
  },
  {
    id: "wf_sgd_mo",
    value: 1850,
    unit: "SGD per month",
    name: "SG Monthly Wage",
  },
  {
    id: "wf_twd_mo",
    value: 27470,
    unit: "TWD per month",
    name: "TW Monthly Wage",
  },
  {
    id: "wf_ars_mo",
    value: 234315,
    unit: "ARS per month",
    name: "AR Monthly Wage",
  },
  {
    id: "wf_cop_mo",
    value: 1300000,
    unit: "COP per month",
    name: "CO Monthly Wage",
  },
  {
    id: "wf_pen_mo",
    value: 1025,
    unit: "PEN per month",
    name: "PE Monthly Wage",
  },
  {
    id: "wf_uyu_mo",
    value: 21106,
    unit: "UYU per month",
    name: "UY Monthly Wage",
  },
  {
    id: "wf_gel_mo",
    value: 600,
    unit: "GEL per month",
    name: "GE Monthly Wage",
  },
  {
    id: "wf_azn_mo",
    value: 345,
    unit: "AZN per month",
    name: "AZ Monthly Wage",
  },
  {
    id: "wf_kzt_mo",
    value: 85000,
    unit: "KZT per month",
    name: "KZ Monthly Wage",
  },
  {
    id: "wf_uah_mo",
    value: 8000,
    unit: "UAH per month",
    name: "UA Monthly Wage",
  },
  {
    id: "wf_byn_mo",
    value: 626,
    unit: "BYN per month",
    name: "BY Monthly Wage",
  },
  {
    id: "wf_mdl_mo",
    value: 5000,
    unit: "MDL per month",
    name: "MD Monthly Wage",
  },
  {
    id: "wf_ron_mo",
    value: 3700,
    unit: "RON per month",
    name: "RO Monthly Wage",
  },
  {
    id: "wf_bgn_mo",
    value: 1077,
    unit: "BGN per month",
    name: "BG Monthly Wage",
  },
  {
    id: "wf_rsd_mo",
    value: 53000,
    unit: "RSD per month",
    name: "RS Monthly Wage",
  },
  {
    id: "wf_mkd_mo",
    value: 21776,
    unit: "MKD per month",
    name: "MK Monthly Wage",
  },
  {
    id: "wf_all_mo",
    value: 40000,
    unit: "ALL per month",
    name: "AL Monthly Wage",
  },
  {
    id: "wf_bam_mo",
    value: 1000,
    unit: "BAM per month",
    name: "BA Monthly Wage",
  },
];

export const monetaryStockSetExtra2: FixtureData[] = [
  { id: "ws_zar_mil", value: 820, unit: "ZAR millions", name: "ZAR Assets" },
  { id: "ws_cny_bil", value: 4.2, unit: "CNY billions", name: "CNY GDP" },
  {
    id: "ws_cny_hm",
    value: 230,
    unit: "CNY hundred millions",
    name: "CNY Government Revenue",
  },
  { id: "ws_inr_bil", value: 3.1, unit: "INR billions", name: "INR Debt" },
  { id: "ws_krw_mil", value: 910, unit: "KRW millions", name: "KRW Reserves" },
  { id: "ws_brl_mil", value: 670, unit: "BRL millions", name: "BRL Spending" },
  {
    id: "ws_mxn_mil",
    value: 480,
    unit: "MXN millions",
    name: "MXN Investment",
  },
  { id: "ws_mxn_th", value: 125, unit: "MXN thousands", name: "MXN Credit" },
  { id: "ws_clp_bil", value: 45, unit: "CLP billions", name: "CLP Budget" },
  { id: "ws_clp_mil", value: 890, unit: "CLP millions", name: "CLP Trade" },
  { id: "ws_cop_bil", value: 120, unit: "COP billions", name: "COP Debt" },
  { id: "ws_pen_mil", value: 340, unit: "PEN millions", name: "PEN Reserves" },
  { id: "ws_uyu_mil", value: 280, unit: "UYU millions", name: "UYU Savings" },
  { id: "ws_uyu_th", value: 890, unit: "UYU thousands", name: "UYU Credit" },
  { id: "ws_ars_mil", value: 670, unit: "ARS millions", name: "ARS Reserves" },
  { id: "ws_czk_bil", value: 2.3, unit: "CZK billions", name: "CZK GDP" },
  {
    id: "ws_czk_mil",
    value: 450,
    unit: "CZK millions",
    name: "CZK Investment",
  },
  { id: "ws_huf_bil", value: 890, unit: "HUF billions", name: "HUF Budget" },
  { id: "ws_huf_mil", value: 120, unit: "HUF millions", name: "HUF Trade" },
  { id: "ws_pln_mil", value: 560, unit: "PLN millions", name: "PLN Reserves" },
  { id: "ws_ron_mil", value: 340, unit: "RON millions", name: "RON Credit" },
  { id: "ws_bgn_mil", value: 230, unit: "BGN millions", name: "BGN Deposits" },
  { id: "ws_hrk_mil", value: 180, unit: "HRK millions", name: "HRK Reserves" },
  { id: "ws_rsd_mil", value: 890, unit: "RSD millions", name: "RSD Budget" },
  { id: "ws_mkd_mil", value: 120, unit: "MKD millions", name: "MKD Trade" },
  { id: "ws_gel_mil", value: 67, unit: "GEL millions", name: "GEL Reserves" },
  { id: "ws_azn_mil", value: 450, unit: "AZN millions", name: "AZN Oil Fund" },
  { id: "ws_kzt_mil", value: 780, unit: "KZT millions", name: "KZT Reserves" },
  { id: "ws_uzs_bil", value: 340, unit: "UZS billions", name: "UZS Budget" },
  { id: "ws_uah_mil", value: 560, unit: "UAH millions", name: "UAH Credit" },
  { id: "ws_byn_mil", value: 230, unit: "BYN millions", name: "BYN Trade" },
  { id: "ws_byn_th", value: 45, unit: "BYN thousands", name: "BYN Deposits" },
  { id: "ws_mdl_mil", value: 120, unit: "MDL millions", name: "MDL Reserves" },
  { id: "ws_mdl_th", value: 780, unit: "MDL thousands", name: "MDL Credit" },
  { id: "ws_all_mil", value: 89, unit: "ALL millions", name: "ALL Reserves" },
  { id: "ws_bam_mil", value: 56, unit: "BAM millions", name: "BAM Budget" },
  { id: "ws_bam_th", value: 230, unit: "BAM thousands", name: "BAM Trade" },
  { id: "ws_isk_bil", value: 2.1, unit: "ISK billions", name: "ISK GDP" },
  { id: "ws_isk_mil", value: 340, unit: "ISK millions", name: "ISK Reserves" },

  // Additional African currencies
  { id: "ws_kes_bil", value: 1.2, unit: "KES billions", name: "KE Budget" },
  { id: "ws_kes_mil", value: 450, unit: "KES millions", name: "KE Trade" },
  { id: "ws_ghs_mil", value: 230, unit: "GHS millions", name: "GH Reserves" },
  { id: "ws_etb_bil", value: 890, unit: "ETB billions", name: "ET Budget" },
  {
    id: "ws_dzd_bil",
    value: 340,
    unit: "DZD billions",
    name: "DZ Oil Revenue",
  },
  { id: "ws_dzd_mil", value: 120, unit: "DZD millions", name: "DZ Trade" },
  {
    id: "ws_mad_mil",
    value: 670,
    unit: "MAD millions",
    name: "MA Tourism Revenue",
  },
  { id: "ws_tnd_mil", value: 450, unit: "TND millions", name: "TN Budget" },
  {
    id: "ws_lyd_mil",
    value: 890,
    unit: "LYD millions",
    name: "LY Oil Revenue",
  },
  { id: "ws_ugx_bil", value: 120, unit: "UGX billions", name: "UG Budget" },
  { id: "ws_tzs_bil", value: 340, unit: "TZS billions", name: "TZ Reserves" },
  { id: "ws_tzs_mil", value: 780, unit: "TZS millions", name: "TZ Trade" },
  { id: "ws_rwf_bil", value: 56, unit: "RWF billions", name: "RW Budget" },
  { id: "ws_bif_mil", value: 230, unit: "BIF millions", name: "BI Reserves" },
  { id: "ws_mwk_mil", value: 890, unit: "MWK millions", name: "MW Aid" },
  {
    id: "ws_zmw_mil",
    value: 340,
    unit: "ZMW millions",
    name: "ZM Copper Revenue",
  },
  {
    id: "ws_aoa_bil",
    value: 2.3,
    unit: "AOA billions",
    name: "AO Oil Revenue",
  },
  { id: "ws_aoa_mil", value: 560, unit: "AOA millions", name: "AO Trade" },
  {
    id: "ws_mzn_mil",
    value: 120,
    unit: "MZN millions",
    name: "MZ Gas Revenue",
  },
  {
    id: "ws_gnf_bil",
    value: 780,
    unit: "GNF billions",
    name: "GN Mining Revenue",
  },
  {
    id: "ws_cdf_mil",
    value: 450,
    unit: "CDF millions",
    name: "CD Mineral Exports",
  },

  // Additional Asian currencies
  { id: "ws_lak_bil", value: 890, unit: "LAK billions", name: "LA Budget" },
  {
    id: "ws_khr_bil",
    value: 340,
    unit: "KHR billions",
    name: "KH Tourism Revenue",
  },
  { id: "ws_mmk_bil", value: 1200, unit: "MMK billions", name: "MM Trade" },
  {
    id: "ws_lkr_mil",
    value: 560,
    unit: "LKR millions",
    name: "LK Tea Exports",
  },
  {
    id: "ws_pkr_mil",
    value: 780,
    unit: "PKR millions",
    name: "PK Remittances",
  },
  {
    id: "ws_bdt_bil",
    value: 230,
    unit: "BDT billions",
    name: "BD Textile Exports",
  },
  { id: "ws_bdt_mil", value: 450, unit: "BDT millions", name: "BD Reserves" },
  { id: "ws_npr_mil", value: 120, unit: "NPR millions", name: "NP Tourism" },
  {
    id: "ws_btn_mil",
    value: 67,
    unit: "BTN millions",
    name: "BT Hydro Revenue",
  },
  { id: "ws_afn_mil", value: 340, unit: "AFN millions", name: "AF Aid" },
  {
    id: "ws_irr_bil",
    value: 890,
    unit: "IRR billions",
    name: "IR Oil Revenue",
  },
  {
    id: "ws_iqd_bil",
    value: 560,
    unit: "IQD billions",
    name: "IQ Oil Exports",
  },
  { id: "ws_syp_mil", value: 230, unit: "SYP millions", name: "SY Trade" },
  { id: "ws_jod_mil", value: 120, unit: "JOD millions", name: "JO Tourism" },
  {
    id: "ws_lbp_bil",
    value: 780,
    unit: "LBP billions",
    name: "LB Banking Assets",
  },

  // Caribbean and Central American currencies
  {
    id: "ws_jmd_mil",
    value: 340,
    unit: "JMD millions",
    name: "JM Tourism Revenue",
  },
  {
    id: "ws_ttd_mil",
    value: 890,
    unit: "TTD millions",
    name: "TT Oil Revenue",
  },
  { id: "ws_bbd_mil", value: 120, unit: "BBD millions", name: "BB Tourism" },
  {
    id: "ws_bsd_mil",
    value: 230,
    unit: "BSD millions",
    name: "BS Banking Assets",
  },
  { id: "ws_bzd_mil", value: 45, unit: "BZD millions", name: "BZ Tourism" },
  {
    id: "ws_gtq_mil",
    value: 560,
    unit: "GTQ millions",
    name: "GT Remittances",
  },
  {
    id: "ws_hnl_mil",
    value: 340,
    unit: "HNL millions",
    name: "HN Coffee Exports",
  },
  {
    id: "ws_nio_mil",
    value: 120,
    unit: "NIO millions",
    name: "NI Gold Exports",
  },
  {
    id: "ws_crc_mil",
    value: 780,
    unit: "CRC millions",
    name: "CR Tech Exports",
  },
  {
    id: "ws_pab_mil",
    value: 450,
    unit: "PAB millions",
    name: "PA Canal Revenue",
  },
  { id: "ws_dop_mil", value: 230, unit: "DOP millions", name: "DO Tourism" },
  { id: "ws_htg_mil", value: 89, unit: "HTG millions", name: "HT Aid" },
  { id: "ws_cup_mil", value: 56, unit: "CUP millions", name: "CU Tourism" },

  // Pacific Island currencies
  {
    id: "ws_fjd_mil",
    value: 67,
    unit: "FJD millions",
    name: "FJ Tourism Revenue",
  },
  {
    id: "ws_pgk_mil",
    value: 120,
    unit: "PGK millions",
    name: "PG Mining Revenue",
  },
  {
    id: "ws_sbd_mil",
    value: 45,
    unit: "SBD millions",
    name: "SB Timber Exports",
  },
  { id: "ws_vuv_mil", value: 23, unit: "VUV millions", name: "VU Tourism" },
  { id: "ws_wst_mil", value: 34, unit: "WST millions", name: "WS Remittances" },
  { id: "ws_top_mil", value: 28, unit: "TOP millions", name: "TO Aid" },
  { id: "ws_xpf_mil", value: 890, unit: "XPF millions", name: "PF Tourism" },

  // National currency (generic)
  {
    id: "ws_nat_cur",
    value: 1250,
    unit: "National currency",
    name: "Budget Balance",
  },
  {
    id: "ws_lcu_const",
    value: 890,
    unit: "Constant local currency units",
    name: "Real GDP",
  },
  {
    id: "ws_lcu_current",
    value: 1100,
    unit: "Current local currency units",
    name: "Nominal GDP",
  },
];

// X-Large combined set for maximal coverage
export const allDomainsCombinedXLarge: FixtureData[] = [
  ...percentagesSet,
  ...percentagesExtraSet,
  ...indicesSet,
  ...indicesExtraSet,
  ...countsSet,
  ...energySet,
  ...commoditiesSet,
  ...agricultureSet,
  ...agricultureExtraSet,
  ...metalsSet,
  ...metalsExtraSet,
  ...cryptoSet,
  ...monetaryFlowSet,
  ...monetaryFlowSetExtra,
  ...monetaryFlowSetExtra2,
  ...monetaryStockSet,
  ...monetaryStockSetExtra,
  ...monetaryStockSetExtra2,
];

// Special wage/income periodicities from database (comprehensive coverage)
export const wagePeriodicitySet: FixtureData[] = [
  // Hourly wages in various currencies
  {
    id: "wph_bwp",
    value: 7.5,
    unit: "BWP per hour",
    name: "BW Minimum Hourly",
  },
  { id: "wph_gbp", value: 11.44, unit: "GBP per hour", name: "UK Living Wage" },
  {
    id: "wph_eur",
    value: 12.41,
    unit: "EUR per hour",
    name: "EU Average Hourly",
  },

  // Daily wages
  {
    id: "wpd_ghs",
    value: 14.88,
    unit: "GHS per day",
    name: "GH Daily Minimum",
  },
  { id: "wpd_inr", value: 400, unit: "INR per day", name: "IN MGNREGA Rate" },

  // Weekly wages
  {
    id: "wpw_aud",
    value: 882.80,
    unit: "AUD per week",
    name: "AU Weekly Minimum",
  },
  {
    id: "wpw_eur",
    value: 750,
    unit: "EUR per week",
    name: "EU Weekly Average",
  },
  { id: "wpw_gbp", value: 550, unit: "GBP per week", name: "UK Weekly Median" },

  // Special formats with scale
  {
    id: "wpm_idr_mil",
    value: 4.9,
    unit: "IDR millions per month",
    name: "ID Monthly Minimum",
  },
  {
    id: "wpy_cny",
    value: 72000,
    unit: "CNY per year",
    name: "CN Annual Average",
  },

  // Other Central/Eastern European wages
  {
    id: "wpm_hrk",
    value: 4250,
    unit: "HRK per month",
    name: "HR Monthly Minimum",
  },
  {
    id: "wpm_ltl",
    value: 730,
    unit: "EUR per month",
    name: "LT Monthly Minimum",
  }, // Lithuania uses EUR
  {
    id: "wpm_lvl",
    value: 620,
    unit: "EUR per month",
    name: "LV Monthly Minimum",
  }, // Latvia uses EUR
  {
    id: "wpm_eur_ee",
    value: 725,
    unit: "EUR per month",
    name: "EE Monthly Minimum",
  }, // Estonia uses EUR
  {
    id: "wpm_eur_sk",
    value: 700,
    unit: "EUR per month",
    name: "SK Monthly Minimum",
  }, // Slovakia uses EUR
  {
    id: "wpm_eur_si",
    value: 1203,
    unit: "EUR per month",
    name: "SI Monthly Minimum",
  }, // Slovenia uses EUR
];

// Comprehensive set for testing all unique unit patterns from DB
export const dbComprehensiveSet: FixtureData[] = [
  ...allDomainsCombinedXLarge,
  ...wagePeriodicitySet,
];

// ============================================================================
// FALLBACK TEST SCENARIOS
// Testing what happens when units have no time, periodicity is null, etc.
// ============================================================================

/**
 * Test monetary indicators without time units in the unit string
 * Should fallback to periodicity for time-basis machine
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
