/**
 * Magnitude and time scaling functions
 */

import type { Scale, TimeScale } from "../types.ts";
import { PER_YEAR, SCALE_MAP, SCALE_TOKENS, TIME_TOKENS } from "../patterns.ts";

// ----------------------- Helpers -----------------------
function normalizeText(s?: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ----------------------- Unit Normalization Helpers -----------------------
/**
 * Detect numeric scale factor from unit text (e.g. "EUR Billion" -> 1e9)
 */
export function detectScale(unitOrText?: string): number {
  const s = normalizeText(unitOrText);
  for (const [scale, re] of SCALE_TOKENS) {
    if (re.test(s)) return SCALE_MAP[scale];
  }
  return 1;
}

/**
 * Parse magnitude token from text (e.g. "billions", "millions").
 */
export function getScale(unitOrText?: string): Scale {
  const s = (unitOrText ?? "").toLowerCase();
  for (const [scale, re] of SCALE_TOKENS) if (re.test(s)) return scale;
  return "ones";
}

/**
 * Convert a value between magnitudes (e.g. millions -> billions).
 */
export function rescaleMagnitude(
  value: number,
  from: Scale,
  to: Scale,
): number {
  return value * (SCALE_MAP[from] / SCALE_MAP[to]);
}

/** Convert a value to millions based on detected magnitude in text. */
export function toMillions(value: number, unitOrText?: string): number {
  return rescaleMagnitude(value, getScale(unitOrText), "millions");
}

/** Convert a value from millions to a target magnitude. */
export function fromMillions(valueInMillions: number, to: Scale): number {
  return rescaleMagnitude(valueInMillions, "millions", to);
}

// ----------------------- Time Basis Helpers -----------------------
/**
 * Convert a flow between time bases (e.g. month -> year).
 */
export function rescaleTime(
  value: number,
  from: TimeScale,
  to: TimeScale,
): number {
  if (from === to) return value;
  return value * (PER_YEAR[from] / PER_YEAR[to]);
}

/**
 * Parse a time scale token from text (e.g. "per month" -> "month").
 */
export function parseTimeScale(unitOrText?: string): TimeScale | null {
  const s = (unitOrText ?? "").toLowerCase();
  for (const [basis, re] of TIME_TOKENS) if (re.test(s)) return basis;
  return null;
}

/**
 * Rescale a flow value based on provided or inferred time scale.
 */
export function rescaleFlow(
  value: number,
  opts: { unitText?: string; from?: TimeScale | null; to: TimeScale },
): number {
  const fromBasis = opts.from ?? parseTimeScale(opts.unitText);
  if (!fromBasis) {
    throw new Error(
      "Cannot infer 'from' time basis; provide opts.from or include it in unitText.",
    );
  }
  return rescaleTime(value, fromBasis, opts.to);
}
