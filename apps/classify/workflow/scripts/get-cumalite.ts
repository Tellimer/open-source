#!/usr/bin/env -S deno run --allow-read --allow-env --allow-ffi

/**
 * Detect likely cumulative (YTD-style) time series by shape, not strings.
 * Heuristics (monthly/quarterly only):
 * - Non-decreasing within year (allow small noise)
 * - Resets between years (first of year << last of previous year)
 * - Within latest year, noticeable growth
 * Excludes percent/rate/index-like series.
 */

import { Database } from '@db/sqlite';

type Row = {
  id: string;
  name: string | null;
  periodicity: string | null;
  units: string | null;
  sample_values: string | null;
};

function parsePoints(raw: string | null): Array<{ date: Date; value: number }> {
  if (!raw) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const points: Array<{ date: Date; value: number }> = [];
  for (const p of arr as any[]) {
    const d = p?.date;
    let v = p?.value;
    if (!d || v === undefined || v === null) continue;
    if (typeof v === 'string') {
      const n = Number(v);
      if (Number.isNaN(n)) continue;
      v = n;
    }
    if (typeof d === 'string' && d.includes('last10')) continue; // drop aggregates
    let ds = String(d);
    if (ds.includes('T')) ds = ds.split('T')[0];
    try {
      const date = new Date(ds);
      if (Number.isNaN(date.getTime())) continue;
      points.push({ date, value: Number(v) });
    } catch {
      // ignore bad point
    }
  }
  points.sort((a, b) => a.date.getTime() - b.date.getTime());
  return points;
}

function heuristics(points: Array<{ date: Date; value: number }>) {
  // Group by calendar year
  const byYear = new Map<number, Array<number>>();
  for (const p of points) {
    const y = p.date.getUTCFullYear();
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(p.value);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => a - b);
  if (years.length < 2) return null;
  // Non-decreasing within-year ratio (allow small noise)
  let totalSteps = 0;
  let nondecSteps = 0;
  for (const y of years) {
    const vals = byYear.get(y)!;
    if (vals.length < 3) continue;
    for (let i = 0; i < vals.length - 1; i++) {
      totalSteps++;
      if (vals[i + 1] >= vals[i] * 0.98) nondecSteps++; // 2% tolerance
    }
  }
  if (totalSteps === 0) return null;
  const nondecRatio = nondecSteps / totalSteps;
  // Resets between years (first of current << last of previous)
  let resets = 0;
  let transitions = 0;
  for (let i = 1; i < years.length; i++) {
    const prev = byYear.get(years[i - 1])!;
    const curr = byYear.get(years[i])!;
    if (prev.length === 0 || curr.length === 0) continue;
    transitions++;
    const prevLast = prev[prev.length - 1];
    const currFirst = curr[0];
    if (currFirst <= prevLast * 0.7) resets++; // 30% drop heuristic
  }
  // Growth in latest year
  const lyVals = byYear.get(years[years.length - 1])!;
  const growthOk =
    lyVals.length >= 4 && lyVals[lyVals.length - 1] >= lyVals[0] * 1.3;
  // Score for sorting
  const score =
    nondecRatio * 0.6 +
    (transitions ? resets / transitions : 0) * 0.3 +
    (growthOk ? 0.1 : 0);
  return { nondecRatio, resets, transitions, growthOk, score };
}

function looksExcluded(name: string, units: string): boolean {
  const n = name.toLowerCase();
  const u = units.toLowerCase();
  return (
    u.includes('%') ||
    u.includes('percent') ||
    n.includes('ratio') ||
    n.includes('rate') ||
    n.includes('index') ||
    n.includes('inflation')
  );
}

async function main() {
  const dbPath =
    Deno.env.get('CLASSIFY_DB_LOCAL_DEV') ||
    './data/classify-workflow-local-dev.db';
  const db = new Database(dbPath);
  try {
    const rows = db.sql<Row>`
      SELECT id, name, periodicity, units, sample_values
      FROM source_indicators
      WHERE sample_values IS NOT NULL
        AND (periodicity LIKE '%Month%' OR periodicity LIKE '%Quarter%')
    ` as Row[];

    const candidates: Array<{
      id: string;
      name: string;
      periodicity: string;
      score: number;
      nondec_ratio: number;
      resets: number;
      transitions: number;
      growth_ok: boolean;
    }> = [];

    for (const r of rows) {
      const name = r.name ?? '';
      const units = r.units ?? '';
      if (looksExcluded(name, units)) continue;
      const pts = parsePoints(r.sample_values);
      if (pts.length < 8) continue;
      const h = heuristics(pts);
      if (!h) continue;
      const likely = h.nondecRatio >= 0.75 && (h.resets >= 1 || h.growthOk);
      if (!likely) continue;
      candidates.push({
        id: r.id,
        name: r.name ?? '',
        periodicity: r.periodicity ?? '',
        score: Number(h.score.toFixed(3)),
        nondec_ratio: Number(h.nondecRatio.toFixed(3)),
        resets: h.resets,
        transitions: h.transitions,
        growth_ok: h.growthOk,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    // Output top 20 as JSON
    console.log(JSON.stringify(candidates.slice(0, 20), null, 2));
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  main().catch((e) => {
    console.error('❌ Error:', e?.message ?? String(e));
    Deno.exit(1);
  });
}
