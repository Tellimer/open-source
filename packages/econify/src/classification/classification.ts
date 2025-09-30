/**
 * Indicator classification logic
 */

import type {
  Classification,
  IndicatorInput,
  IndicatorType,
} from "../types.ts";
import {
  CURRENCY_SYMBOLS,
  CURRENCY_WORDS,
  FLOW_PATTERNS,
  ISO_CODES,
  RATE_PATTERNS,
  RATE_UNIT_PATTERNS,
  STOCK_PATTERNS,
  TIME_UNIT_PATTERNS,
} from "../patterns.ts";

// ----------------------- Helpers -----------------------
function normalizeText(s?: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileWordBoundaryRegex(patterns: readonly string[]): RegExp[] {
  return patterns.map((p) => new RegExp(`\\b${escapeRegExp(p)}\\b`, "i"));
}

const STOCK_RE = compileWordBoundaryRegex([...STOCK_PATTERNS]);
const FLOW_RE = compileWordBoundaryRegex([...FLOW_PATTERNS]);
const RATE_RE = compileWordBoundaryRegex([...RATE_PATTERNS]);
const TIME_RE = compileWordBoundaryRegex([...TIME_UNIT_PATTERNS]);
const CURR_WORD_RE = compileWordBoundaryRegex([...CURRENCY_WORDS]);

function anyMatch(text: string, regs: RegExp[]): boolean {
  return regs.some((re) => re.test(text));
}

function detectCurrencyInText(text: string): string | null {
  for (const code of ISO_CODES) {
    if (new RegExp(`\\b${code}\\b`, "i").test(text)) return code;
  }
  for (const [code, syms] of Object.entries(CURRENCY_SYMBOLS)) {
    for (const sym of syms) if (text.includes(sym.toLowerCase())) return code;
  }
  return null;
}

// ----------------------- Classification -----------------------
/**
 * Classify an economic indicator as stock, flow, rate, currency or unknown.
 *
 * Classification logic:
 * 1. RATE: Has percentage/ratio units OR rate keywords (highest priority for %, index, ratio)
 * 2. CURRENCY: FX-related patterns
 * 3. FLOW: Has time dimension in unit OR flow keywords (GDP, exports, sales, etc.)
 * 4. STOCK: Stock keywords (debt, reserves, population) WITHOUT time dimension
 * 5. UNKNOWN: Insufficient information
 *
 * @param input Indicator text or structured fields (name, description, unit, notes)
 * @returns Classification result with type, confidence, signals and detectedCurrency
 */
export function classifyIndicator(input: IndicatorInput): Classification {
  const raw = typeof input === "string" ? { name: input } : input;
  const parts = [raw?.name, raw?.description, raw?.unit, raw?.notes]
    .map(normalizeText)
    .filter((x) => x.length > 0);
  const all = parts.join(" | ");
  const name = normalizeText(raw?.name || "");
  const signals: string[] = [];

  // Detect unit characteristics
  const hasRateUnit = RATE_UNIT_PATTERNS.some((u) => all.includes(u));
  if (hasRateUnit) signals.push("unit:rate");

  const hasTime = anyMatch(all, TIME_RE);
  if (hasTime) signals.push("unit:per_time");

  const currencyDetected = detectCurrencyInText(all);
  if (currencyDetected) signals.push(`currency:${currencyDetected}`);

  // Detect keyword patterns
  const stockHit = anyMatch(all, STOCK_RE);
  if (stockHit) signals.push("kw:stock");

  const flowHit = anyMatch(all, FLOW_RE);
  if (flowHit) signals.push("kw:flow");

  const rateHit = anyMatch(all, RATE_RE);
  if (rateHit) signals.push("kw:rate");

  const currWordHit = anyMatch(all, CURR_WORD_RE);
  if (currWordHit) signals.push("kw:currency");

  // Special patterns for better classification
  const isIndexValue = /\b(index|score|rating|points)\b/i.test(name) &&
    !/\b(stock market|stock exchange)\b/i.test(name);
  if (isIndexValue) signals.push("pattern:index_value");

  const isGrowthRate = /\b(growth|change|yoy|mom|qoq)\b/i.test(name);
  if (isGrowthRate) signals.push("pattern:growth_rate");

  const isMonetaryAggregate = /\b(m0|m1|m2|m3|money supply|monetary base)\b/i
    .test(name);
  if (isMonetaryAggregate) signals.push("pattern:monetary_aggregate");

  // Classification decision tree with priority order
  let type: IndicatorType = "unknown";
  let confidence = 0.25;

  // Priority 1: Currency series (FX rates, exchange rates)
  const currencySeries = (currWordHit ||
    /\b(fx|exchange rate|spot|cross|usd\/[a-z]{3}|[a-z]{3}\/usd)\b/i.test(
      all,
    )) &&
    rateHit;
  if (currencySeries) {
    type = "currency";
    confidence = 0.95;
    signals.push("classified:currency");
  } // Priority 2: Rate indicators (%, ratios, indices, growth rates)
  else if (hasRateUnit || isIndexValue || isGrowthRate) {
    type = "rate";
    confidence = hasRateUnit ? 0.95 : (isIndexValue ? 0.90 : 0.85);
    signals.push("classified:rate");
  } // Priority 3: Explicit rate keywords (inflation, unemployment rate, etc.)
  else if (rateHit && !flowHit && !stockHit) {
    type = "rate";
    confidence = 0.85;
    signals.push("classified:rate_keyword");
  } // Priority 4: Flow indicators (has time dimension OR flow keywords)
  else if (hasTime || flowHit) {
    type = "flow";
    // Higher confidence if both time dimension AND flow keyword
    confidence = (hasTime && flowHit) ? 0.95 : (hasTime ? 0.90 : 0.80);
    signals.push("classified:flow");
  } // Priority 5: Stock indicators (stock keywords WITHOUT time dimension)
  else if (stockHit || isMonetaryAggregate) {
    type = "stock";
    confidence = isMonetaryAggregate ? 0.90 : 0.80;
    signals.push("classified:stock");
  } // Priority 6: Fallback - if has currency but no other strong signals
  else if (currencyDetected && !hasTime) {
    // Currency amount without time dimension is likely a stock (debt, reserves, etc.)
    type = "stock";
    confidence = 0.60;
    signals.push("classified:stock_currency_fallback");
  }

  return { type, confidence, signals, detectedCurrency: currencyDetected };
}

/** Determine if the indicator is a stock. */
export function isStock(i: IndicatorInput): boolean {
  return classifyIndicator(i).type === "stock";
}

/** Determine if the indicator is a flow. */
export function isFlow(i: IndicatorInput): boolean {
  return classifyIndicator(i).type === "flow";
}

/** Determine if the indicator is a rate. */
export function isRate(i: IndicatorInput): boolean {
  return classifyIndicator(i).type === "rate";
}

/** Determine if the indicator is a currency series. */
export function isCurrency(i: IndicatorInput): boolean {
  return classifyIndicator(i).type === "currency";
}
