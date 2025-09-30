/**
 * Pattern definitions and constants for economic indicator classification
 */

// ----------------------- Pattern Definitions -----------------------

/**
 * STOCK PATTERNS - Indicators that represent levels/snapshots at a point in time
 * These are NOT flows - they don't have a "per time" dimension
 * Examples: Debt levels, reserves, population, money supply
 */
export const STOCK_PATTERNS = [
  // Financial stocks
  "debt",
  "reserves",
  "balance sheet",
  "outstanding",
  "assets",
  "liabilities",
  "holdings",
  "portfolio",
  "capital",
  "equity",
  "net worth",

  // Monetary aggregates
  "money supply",
  "m0",
  "m1",
  "m2",
  "m3",
  "monetary base",
  "broad money",
  "narrow money",

  // Population & demographics
  "population",
  "inhabitants",
  "residents",
  "people",
  "workforce",
  "labor force",
  "labour force",
  "employed persons",
  "employed",
  "employment level",
  "total employment",

  // Inventory & physical stocks
  "inventory",
  "stock",
  "stockpile",
  "storage",

  // Positions & balances
  "position",
  "balance",
  "level",

  // Index values (these are levels, not flows)
  "corruption index",
  "ease of doing business",
  "competitiveness index",
  "human development index",
  "gini coefficient",
  "gini index",
] as const;

/**
 * FLOW PATTERNS - Indicators that measure activity over a period
 * These NEED a time dimension (per year, per month, etc.)
 * Examples: GDP, exports, production, sales
 */
export const FLOW_PATTERNS = [
  // Economic output & activity
  "gdp",
  "gross domestic product",
  "gnp",
  "gross national product",
  "gni",
  "gross national income",
  "production",
  "output",
  "manufacturing",

  // Trade
  "exports",
  "imports",
  "trade",
  "balance of trade",
  "current account",
  "capital account",

  // Income & expenditure
  "revenue",
  "income",
  "earnings",
  "wages",
  "salary",
  "compensation",
  "spending",
  "expenditure",
  "consumption",
  "investment",
  "capex",
  "capital expenditure",

  // Sales & transactions
  "sales",
  "turnover",
  "receipts",
  "payments",
  "remittances",
  "transfers",

  // Movement & flow
  "arrivals",
  "departures",
  "visitors",
  "tourists",
  "migration",
  "registrations",
  "births",
  "deaths",

  // Government finance
  "tax revenue",
  "tax revenues",
  "government revenue",
  "government revenues",
  "government spending",
  "fiscal deficit",
  "budget deficit",
  "surplus",

  // Corporate
  "profit",
  "loss",
  "ebitda",
  "cash flow",
  "free cash flow",
  "dividends",
] as const;

/**
 * RATE PATTERNS - Indicators that are ratios, percentages, or indices
 * These are dimensionless or have special units (%, bps, index points)
 * Examples: Interest rates, inflation, unemployment rate, CPI
 */
export const RATE_PATTERNS = [
  // Interest rates
  "rate",
  "interest rate",
  "policy rate",
  "repo rate",
  "discount rate",
  "prime rate",
  "libor",
  "sofr",

  // Yields & returns
  "yield",
  "return",
  "coupon",

  // Economic indicators
  "inflation",
  "deflation",
  "deflator",
  "gdp deflator",
  "cpi",
  "consumer price index",
  "ppi",
  "producer price index",
  "unemployment",
  "unemployment rate",

  // Ratios
  "ratio",
  "debt to gdp",
  "debt-to-gdp",
  "loan to value",
  "ltv",
  "price to earnings",
  "p/e",
  "price to book",
  "p/b",

  // Percentages & indices
  "percent",
  "percentage",
  "index",
  "indicator",
  "score",
  "rating",

  // Financial metrics
  "margin",
  "spread",
  "premium",
  "discount",
  "volatility",
  "beta",

  // Growth rates
  "growth",
  "change",
  "yoy",
  "year-over-year",
  "mom",
  "month-over-month",
  "qoq",
  "quarter-over-quarter",
] as const;

export const CURRENCY_WORDS = [
  "currency",
  "exchange rate",
  "fx",
  "foreign exchange",
];

export const TIME_UNIT_PATTERNS = [
  "per year",
  "per quarter",
  "per month",
  "per week",
  "per day",
  "per hour",
  "/year",
  "/yr",
  "/q",
  "/quarter",
  "/month",
  "/mo",
  "/wk",
  "/day",
  "/d",
  "/h",
  "annual",
  "annually",
  "monthly",
  "weekly",
  "daily",
] as const;

export const RATE_UNIT_PATTERNS = [
  "%",
  "percent",
  "percentage",
  "bps",
  "basis points",
] as const;

// Currency detection — symbols & ISO 4217
export const CURRENCY_SYMBOLS: Record<string, string[]> = {
  USD: ["$"],
  EUR: ["€"],
  GBP: ["£"],
  JPY: ["¥"],
  CNY: ["¥", "元", "￥"],
  INR: ["₹"],
  KRW: ["₩"],
  RUB: ["₽"],
  AUD: ["A$"],
  CAD: ["C$"],
  NZD: ["NZ$"],
  CHF: ["Fr", "SFr"],
  SEK: ["kr"],
  NOK: ["kr"],
  DKK: ["kr"],
  ZAR: ["R"],
  TRY: ["₺"],
  MXN: ["$"],
  BRL: ["R$"],
  SGD: ["S$"],
  HKD: ["HK$"],
  AED: ["د.إ"],
  SAR: ["﷼"],
  ARS: ["$", "AR$"],
  AOA: ["Kz"],
  XOF: ["CFA"],
  XAF: ["FCFA"],
  EGP: ["E£"],
  NGN: ["₦"],
};

export const ISO_CODES: ReadonlySet<string> = new Set<string>(
  Object.keys(CURRENCY_SYMBOLS),
);

// ----------------------- Scale and Time Constants -----------------------
export type Scale =
  | "ones"
  | "hundreds"
  | "thousands"
  | "millions"
  | "hundred-millions" // 100 million (Chinese 亿, yi)
  | "billions"
  | "trillions";

export const SCALE_MAP: Record<Scale, number> = {
  ones: 1,
  hundreds: 1e2,
  thousands: 1e3,
  millions: 1e6,
  "hundred-millions": 1e8, // 100 million (Chinese 亿, yi)
  billions: 1e9,
  trillions: 1e12,
};

export const SCALE_TOKENS: Array<[Scale, RegExp]> = [
  ["trillions", /\btrill?i?on?s?\b|\btn\b/i],
  ["billions", /\bbill?i?on?s?\b|\bbn\b/i],
  // IMPORTANT: "hundred million" must come BEFORE "million" pattern
  ["hundred-millions", /\bhundred\s+mill?i?on?s?\b/i],
  ["millions", /\bmill?i?on?s?\b|\bmn\b|\bmio\b/i],
  ["thousands", /\bthou?sand?s?\b|\bk\b|\b000s\b/i],
  ["hundreds", /\bhundreds?\b/i],
];

export type TimeScale = "year" | "quarter" | "month" | "week" | "day" | "hour";

export const PER_YEAR: Record<TimeScale, number> = {
  year: 1,
  quarter: 4,
  month: 12,
  week: 52,
  day: 365,
  hour: 365 * 24,
};

export const TIME_TOKENS: Array<[TimeScale, RegExp]> = [
  ["year", /\b(per|a|an)\s*year\b|\bannual(?:ly)?\b|\/\s*(yr|year)\b|\byoy\b/i],
  [
    "quarter",
    /\b(per|a)\s*quarter\b|\bquarterly\b|\/\s*(q|quarter)\b|\bqoq\b|\bq\/q\b/i,
  ],
  [
    "month",
    /\b(per|a)\s*month\b|\bmonthly\b|\/\s*(mo|month)\b|\bmom\b|\bm\/m\b/i,
  ],
  ["week", /\b(per|a)\s*week\b|\bweekly\b|\/\s*(wk|week)\b/i],
  ["day", /\b(per|a)\s*day\b|\bdaily\b|\/\s*(d|day)\b/i],
  ["hour", /\b(per|an?)\s*hour\b|\bhourly\b|\/\s*(h|hr|hour)\b/i],
];
