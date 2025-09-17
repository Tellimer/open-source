// deno run --allow-read packages/econify/scripts/check_coverage.ts [lcovPath] [thresholdPercent]
// Parses an LCOV file and fails (exit code 1) if total line coverage is below threshold.

if (import.meta.main) {
  const lcovPath = Deno.args[0] ?? "coverage/lcov.info";
  const thresholdStr = Deno.args[1] ?? "100";
  const threshold = Number(thresholdStr);
  if (Number.isNaN(threshold) || threshold < 0 || threshold > 100) {
    console.error(`Invalid threshold: ${thresholdStr}`);
    Deno.exit(2);
  }

  let content: string;
  try {
    content = await Deno.readTextFile(lcovPath);
  } catch (err) {
    console.error(`Failed to read LCOV file at ${lcovPath}:`, err.message);
    Deno.exit(2);
  }

  let total = 0;
  let covered = 0;

  // LCOV DA:<line>,<hits>
  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith("DA:")) {
      const rest = line.slice(3);
      const [, _lineStr, hitsStr] = rest.match(/^(\d+),(\d+)$/) ?? [];
      if (_lineStr && hitsStr) {
        total += 1;
        if (Number(hitsStr) > 0) covered += 1;
      }
    }
  }

  if (total === 0) {
    console.error(
      "No instrumented lines found in LCOV report. Did you run coverage?",
    );
    Deno.exit(2);
  }

  const percent = (covered / total) * 100;
  const pctStr = percent.toFixed(2);

  if (percent + 1e-9 < threshold) {
    console.error(
      `Coverage ${pctStr}% is below threshold ${threshold}% (covered ${covered}/${total})`,
    );
    Deno.exit(1);
  } else {
    console.log(
      `Coverage OK: ${pctStr}% (covered ${covered}/${total}) >= ${threshold}%`,
    );
  }
}
