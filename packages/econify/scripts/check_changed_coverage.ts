// deno run --allow-read --allow-run packages/econify/scripts/check_changed_coverage.ts [lcovPath] [thresholdPercent]
// Enforces that each changed TypeScript file meets the coverage threshold.
// "Changed" is computed vs PR base (GITHUB_BASE_REF) or HEAD~1 for push builds.
// It reads LCOV and checks per-file line coverage for files within the current package.

// Minimal LCOV parser for per-file line coverage
function parseLcovByFile(content: string): Map<string, { total: number; covered: number }> {
  const map = new Map<string, { total: number; covered: number }>();
  let current: string | null = null;
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("SF:")) {
      let p = line.slice(3).trim();
      // Normalize file:// URIs and backslashes
      p = p.replace(/^file:\/\//, "");
      p = p.replace(/^\/*/, "/");
      p = p.replace(/\\/g, "/");
      current = p;
      if (!map.has(p)) map.set(p, { total: 0, covered: 0 });
    } else if (line.startsWith("DA:") && current) {
      const rest = line.slice(3);
      const m = rest.match(/^(\d+),(\d+)$/);
      if (m) {
        const hits = Number(m[2]);
        const obj = map.get(current)!;
        obj.total += 1;
        if (hits > 0) obj.covered += 1;
      }
    } else if (line === "end_of_record") {
      current = null;
    }
  }
  return map;
}

async function git(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const cmd = new Deno.Command("git", { args, stdout: "piped", stderr: "piped" });
  const out = await cmd.output();
  const stdout = new TextDecoder().decode(out.stdout).trim();
  const stderr = new TextDecoder().decode(out.stderr).trim();
  return { code: out.code, stdout, stderr };
}

function toPercent(covered: number, total: number): number {
  return total === 0 ? 0 : (covered / total) * 100;
}

function endsWithPath(haystack: string, needle: string): boolean {
  // Compare on forward-slash paths only
  const h = haystack.replace(/\\/g, "/");
  const n = needle.replace(/\\/g, "/");
  return h === n || h.endsWith("/" + n);
}

if (import.meta.main) {
  const lcovPath = Deno.args[0] ?? "coverage/lcov.info";
  const thresholdStr = Deno.args[1] ?? "80";
  const threshold = Number(thresholdStr);
  if (Number.isNaN(threshold) || threshold < 0 || threshold > 100) {
    console.error(`Invalid threshold: ${thresholdStr}`);
    Deno.exit(2);
  }

  // Read LCOV
  let lcov: string;
  try {
    lcov = await Deno.readTextFile(lcovPath);
  } catch (err) {
    console.error(`Failed to read LCOV file at ${lcovPath}:`, err.message);
    Deno.exit(2);
  }
  const byFile = parseLcovByFile(lcov);

  // Establish base for diff
  const event = Deno.env.get("GITHUB_EVENT_NAME") ?? "";
  const baseRef = Deno.env.get("GITHUB_BASE_REF") ?? "origin/main";
  const isPR = event === "pull_request";

  // Try to compute merge-base to be robust
  let base = isPR ? `origin/${baseRef.replace(/^origin\//, "")}` : "HEAD~1";
  // Ensure refs exist (ignore errors)
  await git(["fetch", "--depth=1", "origin"]).catch(() => ({} as any));
  const mb = await git(["merge-base", "HEAD", base]);
  if (mb.code === 0 && mb.stdout) base = mb.stdout;

  // Limit diff to current package directory
  const diff = await git(["diff", "--name-only", `${base}...HEAD`, "--", "."]);
  if (diff.code !== 0) {
    console.error("git diff failed:", diff.stderr || diff.stdout);
    Deno.exit(2);
  }

  const changed = diff.stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => s.endsWith(".ts") || s.endsWith(".tsx"));

  if (changed.length === 0) {
    console.log("No changed TS files detected in this package; skipping per-file coverage gate.");
    Deno.exit(0);
  }

  // Check coverage for each changed file
  const failures: { file: string; percent: number; covered: number; total: number }[] = [];

  for (const file of changed) {
    // Attempt to find matching coverage entry by suffix
    let entry: { total: number; covered: number } | undefined;
    for (const [sf, cov] of byFile.entries()) {
      if (endsWithPath(sf, file)) {
        entry = cov;
        break;
      }
    }
    if (!entry) {
      failures.push({ file, percent: 0, covered: 0, total: 0 });
      continue;
    }
    const pct = toPercent(entry.covered, entry.total);
    if (pct + 1e-9 < threshold) {
      failures.push({ file, percent: pct, covered: entry.covered, total: entry.total });
    }
  }

  if (failures.length > 0) {
    console.error("Changed-files coverage below threshold:");
    for (const f of failures) {
      console.error(`  ${f.file}: ${f.percent.toFixed(2)}% (covered ${f.covered}/${f.total}) < ${threshold}%`);
    }
    Deno.exit(1);
  }

  console.log(`All changed TS files meet coverage ≥ ${threshold}%`);
}

