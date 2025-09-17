const path = Deno.args[0] ?? "coverage/lcov.info";
const limit = Number(Deno.args[1] ?? "50");
const txt = await Deno.readTextFile(path);
let file = "";
let lf = 0, lh = 0;
const res: Array<{ file: string; lf: number; lh: number }> = [];
for (const line of txt.split(/\r?\n/)) {
  if (line.startsWith("SF:")) {
    if (file) res.push({ file, lf, lh });
    file = line.slice(3);
    lf = 0;
    lh = 0;
  } else if (line.startsWith("LF:")) {
    lf = Number(line.slice(3));
  } else if (line.startsWith("LH:")) {
    lh = Number(line.slice(3));
  }
}
if (file) res.push({ file, lf, lh });
res.sort((a, b) => (a.lh / a.lf) - (b.lh / b.lf));
for (const r of res.slice(0, limit)) {
  const pct = r.lf === 0 ? 100 : (r.lh / r.lf) * 100;
  console.log(`${pct.toFixed(2)}% ${r.file} (hit=${r.lh} total=${r.lf})`);
}
