/**
 * Pattern definitions and constants for economic indicator normalization
 *
 * Note: Classification patterns removed - use @tellimer/classify package instead.
 * Econify focuses on normalization (currency, magnitude, time) not classification.
 */

// ----------------------- Pattern Definitions -----------------------

// Classification patterns (STOCK_PATTERNS, FLOW_PATTERNS, RATE_PATTERNS) removed.
// Use @tellimer/classify package for indicator type classification.

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

// RATE_UNIT_PATTERNS removed - not used for classification
// Use percentage detection in units/units.ts for normalization

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
