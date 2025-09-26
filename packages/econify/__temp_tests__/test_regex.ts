// Test the actual isMonetaryStock function
const isMonetaryStock = (name: string) => {
  // First check for M0/M1/M2 money supply patterns (no word boundary before M[012])
  if (/m[012]\s+money\s+supply/i.test(name)) return true;

  // Then check for other monetary stock patterns
  return /\b(money\s+supply|monetary\s+base|broad\s+money|narrow\s+money|government\s+debt|public\s+debt|external\s+debt|national\s+debt|sovereign\s+debt|market\s+cap|total\s+assets|bank\s+assets)\b/i
    .test(name);
};

const tests = [
  "M2 Money Supply",
  "m2 money supply",
  "M1 Money Supply",
  "M0 Money Supply",
  "Government Debt",
  "External Debt",
  "Public Debt",
  "Market Cap",
  "Total Assets",
  "Broad Money",
  "Monetary Base",
];

for (const test of tests) {
  const result = isMonetaryStock(test);
  console.log(`"${test}" -> ${result}`);
}
