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
  magnitude?: "prefer-millions" | "none";
  time?: "prefer-month" | "none";
}

export interface AutoTargetOptions {
  indicatorKey?: IndicatorKeyResolver; // default: "name"
  autoTargetDimensions?: Array<"currency" | "magnitude" | "time">; // default: all
  minMajorityShare?: number; // default: 0.5
  tieBreakers?: TieBreakers;
  targetCurrency?: string; // for tie-breaker context
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
  // If a resolver function is provided, use it
  if (r && r !== "name") return r(d);

  // Normalize the key: trim whitespace and standardize case
  const normalizeKey = (key: string): string => {
    return key.trim().toLowerCase().replace(/\s+/g, " ");
  };

  // Default: try common indicator identifiers with sensible fallbacks
  const nameVal = d.name != null && String(d.name).trim() !== ""
    ? normalizeKey(String(d.name))
    : (typeof (d.metadata as Record<string, unknown> | undefined)
        ?.["indicator_name"] === "string"
      ? normalizeKey(
        String((d.metadata as Record<string, unknown>)?.["indicator_name"]),
      )
      : undefined);
  if (nameVal) return nameVal;

  const meta = d.metadata as Record<string, unknown> | undefined;
  const idCandidate =
    (typeof meta?.["indicator_id"] === "string"
      ? normalizeKey(meta?.["indicator_id"] as string)
      : (typeof meta?.["indicatorId"] === "string"
        ? normalizeKey(meta?.["indicatorId"] as string)
        : undefined)) ??
      (d.id != null ? normalizeKey(String(d.id)) : undefined);
  return idCandidate ?? "";
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
    const pref = tb.magnitude ?? "prefer-millions";
    if (pref === "prefer-millions") return "millions";
    return undefined;
  }
  const pref = tb.time ?? "prefer-month";
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
    indicatorType?: string; // Track indicator_type from @tellimer/classify
  }>();

  for (const item of data) {
    // Only filter by isMonetary if currency is in auto-target dimensions
    // Non-monetary indicators can still participate in magnitude/time targeting
    if (dims.has("currency") && !isMonetary(item)) continue;
    const key = resolveKey(item, options.indicatorKey);
    if (!key) continue;
    // denyList filtering - normalize list items for comparison if not using custom resolver
    if (options.denyList) {
      const normalizedDenyList =
        (options.indicatorKey && options.indicatorKey !== "name")
          ? options.denyList
          : options.denyList.map((k) =>
            k.trim().toLowerCase().replace(/\s+/g, " ")
          );
      if (normalizedDenyList.includes(key)) continue;
    }
    // allowList: if provided, only include those keys - normalize list items for comparison
    if (options.allowList) {
      const normalizedAllowList =
        (options.indicatorKey && options.indicatorKey !== "name")
          ? options.allowList
          : options.allowList.map((k) =>
            k.trim().toLowerCase().replace(/\s+/g, " ")
          );
      if (!normalizedAllowList.includes(key)) continue;
    }

    const g = groups.get(key) ??
      { currency: {}, magnitude: {}, time: {}, size: 0 };

    // Store indicator_type from first item in group (from @tellimer/classify)
    if (
      !g.indicatorType &&
      (item as unknown as { indicator_type?: string }).indicator_type
    ) {
      g.indicatorType =
        (item as unknown as { indicator_type?: string }).indicator_type;
    }

    // Prefer explicit metadata
    let currency = item.currency_code?.toUpperCase() ??
      parseUnit(item.unit).currency;
    if (currency) currency = currency.toUpperCase();
    // Filter out non-ISO currency tokens
    if (currency && !/^[A-Z]{3}$/.test(currency)) {
      currency = undefined;
    }
    const magnitude = item.scale
      ? getScale(item.scale)
      : (parseUnit(item.unit).scale ?? "ones");
    // Prefer time scale from unit parsing, fall back to periodicity field
    const time = parseUnit(item.unit).timeScale ||
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

    // Use indicator_type from @tellimer/classify package
    // Stock/Rate indicators should NOT have time dimension auto-targeted
    const shouldSkipTimeDimension = g.indicatorType === "stock" ||
      g.indicatorType === "rate";

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
        for (const [k, v] of Object.entries(counts)) {
          if (dim === "currency") {
            // Ensure ISO 4217 uppercase keys only
            const key = /^[A-Za-z]{3}$/.test(k) ? k.toUpperCase() : undefined;
            if (key) shares[dim][key] = v / total;
          } else {
            shares[dim][k] = v / total;
          }
        }
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
      // Skip time dimension auto-targeting for stock/rate indicators
      // Stock indicators (population, debt, reserves) are snapshots, not flows
      // Rate indicators (CPI, unemployment rate) are dimensionless ratios
      if (shouldSkipTimeDimension) {
        sel.time = undefined;
        const indicatorTypeMsg = g.indicatorType
          ? `${g.indicatorType} indicator`
          : "no time dimension";
        reasonParts.push(
          `time=skipped(${indicatorTypeMsg})`,
        );
      } else {
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
    }

    if (reasonParts.length > 0) sel.reason = reasonParts.join("; ");

    result.set(key, sel);
  }

  return result;
}
