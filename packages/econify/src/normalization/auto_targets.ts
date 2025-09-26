/**
 * Auto target detection by indicator series
 */

import type { Scale, TimeScale } from "../types.ts";
import type { ParsedData } from "../workflows/economic-data-workflow.ts";
import { parseUnit } from "../units/units.ts";
import { getScale, parseTimeScale } from "../scale/scale.ts";

export type IndicatorKeyResolver =
  | "name"
  | ((d: ParsedData) => string);

export interface TieBreakers {
  currency?: "prefer-targetCurrency" | "prefer-USD" | "none";
  magnitude?: "prefer-targetMagnitude" | "prefer-millions" | "none";
  time?: "prefer-targetTimeScale" | "prefer-month" | "none";
}

export interface AutoTargetOptions {
  indicatorKey?: IndicatorKeyResolver; // default: "name"
  autoTargetDimensions?: Array<"currency" | "magnitude" | "time">; // default: all
  minMajorityShare?: number; // default: 0.5
  tieBreakers?: TieBreakers;
  targetCurrency?: string; // for tie-breaker context
  targetMagnitude?: string; // for tie-breaker context
  targetTimeScale?: string; // for tie-breaker context
  allowList?: string[]; // indicator keys forced IN
  denyList?: string[]; // indicator keys forced OUT
}

export interface AutoTargetSelection {
  currency?: string;
  magnitude?: Scale;
  time?: TimeScale;
  shares: {
    currency: Record<string, number>;
    magnitude: Record<string, number>;
    time: Record<string, number>;
  };
  reason?: string;
}

export type AutoTargets = Map<string, AutoTargetSelection>;

function resolveKey(
  d: ParsedData,
  r: IndicatorKeyResolver | undefined,
): string {
  if (!r || r === "name") return String(d.name ?? "");
  return r(d);
}

function isMonetary(d: ParsedData): boolean {
  if (d.currency_code) return true;
  const p = parseUnit(d.unit ?? "");
  return p.category === "currency" || p.category === "composite";
}

function inc(map: Record<string, number>, k?: string | null) {
  if (!k) return;
  map[k] = (map[k] ?? 0) + 1;
}

function topWithShare(
  counts: Record<string, number>,
  groupSize: number,
): { key?: string; share: number; total: number } {
  let maxKey: string | undefined;
  let maxVal = -1;
  let total = 0;
  for (const [k, v] of Object.entries(counts)) {
    total += v;
    if (v > maxVal) {
      maxVal = v;
      maxKey = k;
    }
  }
  const denom = Math.max(groupSize, 1);
  const share = maxVal >= 0 ? (maxVal / denom) : 0;
  return { key: maxKey, share, total };
}

function applyTieBreaker(
  dim: "currency" | "magnitude" | "time",
  opts: AutoTargetOptions,
): string | undefined {
  const tb = opts.tieBreakers ?? {};
  if (dim === "currency") {
    const pref = tb.currency ?? "prefer-targetCurrency";
    if (pref === "prefer-targetCurrency" && opts.targetCurrency) {
      return opts.targetCurrency.toUpperCase();
    }
    if (pref === "prefer-USD") return "USD";
    return undefined;
  }
  if (dim === "magnitude") {
    const pref = tb.magnitude ?? "prefer-targetMagnitude";
    if (pref === "prefer-targetMagnitude" && opts.targetMagnitude) {
      return opts.targetMagnitude;
    }
    if (pref === "prefer-millions") return "millions";
    return undefined;
  }
  const pref = tb.time ?? "prefer-targetTimeScale";
  if (pref === "prefer-targetTimeScale" && opts.targetTimeScale) {
    return opts.targetTimeScale;
  }
  if (pref === "prefer-month") return "month";
  return undefined;
}

/**
 * Compute auto targets per indicator series
 */
export function computeAutoTargets(
  data: ParsedData[],
  options: AutoTargetOptions = {},
): AutoTargets {
  const dims = new Set(
    options.autoTargetDimensions ?? ["currency", "magnitude", "time"],
  );
  const minShare = options.minMajorityShare ?? 0.5;

  // Group by indicator key and count dimension tokens
  const groups = new Map<string, {
    currency: Record<string, number>;
    magnitude: Record<string, number>;
    time: Record<string, number>;
    size: number;
  }>();

  for (const item of data) {
    if (!isMonetary(item)) continue;
    const key = resolveKey(item, options.indicatorKey);
    if (!key) continue;
    // denyList filtering
    if (options.denyList && options.denyList.includes(key)) continue;
    // allowList: if provided, only include those keys
    if (options.allowList && !options.allowList.includes(key)) continue;

    const g = groups.get(key) ??
      { currency: {}, magnitude: {}, time: {}, size: 0 };

    // Prefer explicit metadata
    const currency = item.currency_code?.toUpperCase() ??
      parseUnit(item.unit).currency;
    const magnitude = item.scale
      ? getScale(item.scale)
      : (parseUnit(item.unit).scale ?? "ones");
    // Prefer unit time token over item.periodicity for time share extraction
    const unitTs = parseUnit(item.unit).timeScale;
    const time = unitTs ??
      (item.periodicity ? parseTimeScale(item.periodicity) : undefined);

    inc(g.currency, currency ?? undefined);
    inc(g.magnitude, magnitude ?? undefined);
    inc(g.time, time ?? undefined);
    g.size += 1;
    groups.set(key, g);
  }

  const result: AutoTargets = new Map();

  for (const [key, g] of groups.entries()) {
    const shares = {
      currency: {} as Record<string, number>,
      magnitude: {} as Record<string, number>,
      time: {} as Record<string, number>,
    };

    const dimsList: ("currency" | "magnitude" | "time")[] = [
      "currency",
      "magnitude",
      "time",
    ];

    // Normalize shares for each dimension
    for (const dim of dimsList) {
      const counts = g[dim];
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      if (total > 0) {
        for (const [k, v] of Object.entries(counts)) shares[dim][k] = v / total;
      }
    }

    const sel: AutoTargetSelection = { shares };

    const reasonParts: string[] = [];

    if (dims.has("currency")) {
      const { key: topKey, share } = topWithShare(g.currency, g.size);
      const chosen = (topKey && share >= minShare)
        ? topKey
        : (applyTieBreaker("currency", options) ?? undefined);
      sel.currency = chosen;
      if (topKey && share >= minShare && chosen === topKey) {
        reasonParts.push(`currency=majority(${topKey},${share.toFixed(2)})`);
      } else if (chosen) {
        const pref = options.tieBreakers?.currency ?? "prefer-targetCurrency";
        reasonParts.push(`currency=tie-break(${pref})`);
      } else {
        reasonParts.push("currency=none");
      }
    }

    if (dims.has("magnitude")) {
      const { key: topKey, share } = topWithShare(g.magnitude, g.size);
      const chosen = (topKey && share >= minShare)
        ? (topKey as Scale)
        : (applyTieBreaker("magnitude", options) as Scale | undefined);
      sel.magnitude = chosen;
      if (topKey && share >= minShare && chosen === topKey) {
        reasonParts.push(`magnitude=majority(${topKey},${share.toFixed(2)})`);
      } else if (chosen) {
        const pref = options.tieBreakers?.magnitude ?? "prefer-millions";
        reasonParts.push(`magnitude=tie-break(${pref})`);
      } else {
        reasonParts.push("magnitude=none");
      }
    }

    if (dims.has("time")) {
      const { key: topKey, share } = topWithShare(g.time, g.size);
      const chosen = (topKey && share >= minShare)
        ? (topKey as TimeScale)
        : (applyTieBreaker("time", options) as TimeScale | undefined);
      sel.time = chosen;
      if (topKey && share >= minShare && chosen === topKey) {
        reasonParts.push(`time=majority(${topKey},${share.toFixed(2)})`);
      } else if (chosen) {
        const pref = options.tieBreakers?.time ?? "prefer-month";
        reasonParts.push(`time=tie-break(${pref})`);
      } else {
        reasonParts.push("time=none");
      }
    }

    if (reasonParts.length > 0) sel.reason = reasonParts.join("; ");

    result.set(key, sel);
  }

  return result;
}
