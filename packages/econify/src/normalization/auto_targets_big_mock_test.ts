import { computeAutoTargets } from "../api/index.ts";
import type { ParsedData } from "../main.ts";

Deno.test("auto-target BIG MOCK: many indicators with large synthetic runs", () => {
  // Deterministic RNG (LCG)
  let seed = 987654321;
  const rng = () => (seed = (1664525 * seed + 1013904223) >>> 0) / 0x100000000;
  const pick = <T>(weights: Array<[T, number]>) => {
    const r = rng();
    let acc = 0;
    for (const [val, w] of weights) {
      acc += w;
      if (r < acc) return val;
    }
    return weights[weights.length - 1][0];
  };

  type Dist<T extends string> = Array<[T, number]>;

  // Distribution templates
  const skewC = (
    p: number,
  ): Dist<string> => [["USD", p], ["EUR", (1 - p) * 0.7], [
    "JPY",
    (1 - p) * 0.3,
  ]];
  const skewM = (
    p: number,
  ): Dist<string> => [["millions", p], ["thousand", 1 - p]];
  const skewT = (
    p: number,
  ): Dist<string> => [["month", p], ["quarter", (1 - p) * 0.6], [
    "year",
    (1 - p) * 0.4,
  ]];

  const ambC: Dist<string> = [["USD", 0.4], ["EUR", 0.35], ["JPY", 0.25]];
  const ambM: Dist<string> = [["millions", 0.5], ["thousand", 0.5]];
  const ambT: Dist<string> = [["month", 0.4], ["quarter", 0.35], [
    "year",
    0.25,
  ]];

  const makeUnit = (c: string, m: string, t: string) =>
    `${c} ${m === "millions" ? "Million" : "Thousand"} per ${t}`;

  const data: ParsedData[] = [];
  const indicators: Array<
    {
      name: string;
      cd: Dist<string>;
      md: Dist<string>;
      td: Dist<string>;
      size: number;
    }
  > = [];

  // 10 skewed, 10 ambiguous; each with 200 points => 4000 points total
  for (let i = 0; i < 10; i++) {
    indicators.push({
      name: `Skewed-${i + 1}`,
      cd: skewC(0.7 + (i % 3) * 0.05),
      md: skewM(0.7 + (i % 2) * 0.1),
      td: skewT(0.65 + (i % 3) * 0.05),
      size: 200,
    });
  }
  for (let i = 0; i < 10; i++) {
    indicators.push({
      name: `Ambiguous-${i + 1}`,
      cd: ambC,
      md: ambM,
      td: ambT,
      size: 200,
    });
  }

  for (const g of indicators) {
    for (let i = 0; i < g.size; i++) {
      const c = pick(g.cd);
      const m = pick(g.md);
      const t = pick(g.td);
      data.push({
        id: `${g.name}-${i}`,
        name: g.name,
        unit: makeUnit(c, m, t),
        value: 100 + i,
      });
    }
  }

  const out = computeAutoTargets(data, {
    indicatorKey: "name",
    minMajorityShare: 0.6,
    tieBreakers: {
      currency: "prefer-targetCurrency",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    targetCurrency: "USD",
  });

  const getSharesMax = (rec: Record<string, number> | undefined) => {
    if (!rec) return { key: undefined as string | undefined, share: 0 };
    let maxKey: string | undefined = undefined;
    let maxVal = -1;
    for (const [k, v] of Object.entries(rec)) {
      if (v > maxVal) {
        maxVal = v;
        maxKey = k;
      }
    }
    return { key: maxKey, share: Math.max(maxVal, 0) };
  };

  for (const g of indicators) {
    const sel = out.get(g.name.toLowerCase())!;
    if (!sel) throw new Error(`${g.name}: missing selection`);
    const r = String(sel.reason || "");

    // Currency
    const cTop = getSharesMax(sel.shares.currency);
    if (cTop.share >= 0.6) {
      if (!r.includes("currency=majority(")) {
        throw new Error(`${g.name}: expected currency majority`);
      }
    } else {
      if (!r.includes("currency=tie-break(")) {
        throw new Error(`${g.name}: expected currency tie-break`);
      }
      if (sel.currency !== "USD") {
        throw new Error(`${g.name}: currency should tie-break to USD`);
      }
    }

    // Magnitude
    const mTop = getSharesMax(sel.shares.magnitude);
    if (mTop.share >= 0.6) {
      if (!r.includes("magnitude=majority(")) {
        throw new Error(`${g.name}: expected magnitude majority`);
      }
    } else {
      if (!r.includes("magnitude=tie-break(")) {
        throw new Error(`${g.name}: expected magnitude tie-break`);
      }
      if (sel.magnitude !== "millions") {
        throw new Error(`${g.name}: magnitude should tie-break to millions`);
      }
    }

    // Time
    const tTop = getSharesMax(sel.shares.time);
    if (tTop.share >= 0.6) {
      if (!r.includes("time=majority(")) {
        throw new Error(`${g.name}: expected time majority`);
      }
    } else {
      if (!r.includes("time=tie-break(")) {
        throw new Error(`${g.name}: expected time tie-break`);
      }
      if (sel.time !== "month") {
        throw new Error(`${g.name}: time should tie-break to month`);
      }
    }
  }
});
