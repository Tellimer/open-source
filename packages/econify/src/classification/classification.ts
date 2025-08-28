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
 * @param input Indicator text or structured fields (name, description, unit, notes)
 * @returns Classification result with type, confidence, signals and detectedCurrency
 */
export function classifyIndicator(input: IndicatorInput): Classification {
  const raw = typeof input === "string" ? { name: input } : input;
  const parts = [raw?.name, raw?.description, raw?.unit, raw?.notes]
    .map(normalizeText)
    .filter((x) => x.length > 0);
  const all = parts.join(" | ");
  const signals: string[] = [];

  const hasRateUnit = RATE_UNIT_PATTERNS.some((u) => all.includes(u));
  if (hasRateUnit) signals.push("unit:rate");
  const hasTime = anyMatch(all, TIME_RE);
  if (hasTime) signals.push("unit:per_time");
  const currencyDetected = detectCurrencyInText(all);
  if (currencyDetected) signals.push(`currency:${currencyDetected}`);

  const stockHit = anyMatch(all, STOCK_RE);
  if (stockHit) signals.push("kw:stock");
  const flowHit = anyMatch(all, FLOW_RE);
  if (flowHit) signals.push("kw:flow");
  const rateHit = anyMatch(all, RATE_RE);
  if (rateHit) signals.push("kw:rate");
  const currWordHit = anyMatch(all, CURR_WORD_RE);
  if (currWordHit) signals.push("kw:currency");

  let type: IndicatorType = "unknown";
  let confidence = 0.25;
  if (hasRateUnit || rateHit) {
    type = "rate";
    confidence = hasRateUnit ? 0.95 : 0.8;
  } else if (flowHit || hasTime) {
    type = "flow";
    confidence = hasTime && flowHit ? 0.9 : 0.75;
  } else if (stockHit) {
    type = "stock";
    confidence = 0.75;
  }

  const currencySeries = (currWordHit ||
    /fx|exchange rate|spot|cross|usd\/[a-z]{3}|[a-z]{3}\/usd/i.test(all)) &&
    rateHit;
  if (currencySeries) {
    type = "currency";
    confidence = Math.max(confidence, 0.85);
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
