import { countries } from "../data/data.ts";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const countriesWithSlugs = countries.map((country: { name: string }) => ({
  ...country,
  slug: createSlug(country.name),
}));

// Get the directory of the current script using node:path and fileURLToPath
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

// Construct the absolute path to the data file
const outputPath = path.join(scriptDir, "../data/data.ts");

const fileContent = `export const countries = ${
  JSON.stringify(
    countriesWithSlugs,
    null,
    2,
  )
};`;

// Use Deno.writeFileSync for writing the file
Deno.writeFileSync(outputPath, new TextEncoder().encode(fileContent), {
  mode: 0o666,
});

console.log("Slugs added and data.ts updated.");
