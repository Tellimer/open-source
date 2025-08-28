import { Country } from "../types/types.ts";
import { code3Mapping } from "./code3_mapping.ts";

const dataPath = new URL("../data/data.json", import.meta.url).pathname;

// Read the existing data.json
const dataText = await Deno.readTextFile(dataPath);
const data: Country[] = JSON.parse(dataText);

let updated = false;

// Iterate through each country and add missing code3 if applicable
data.forEach((country) => {
  if (!country.code3) {
    const alpha2 = country.code.toUpperCase();
    const alpha3 = code3Mapping[alpha2];
    if (alpha3) {
      country.code3 = alpha3;
      updated = true;
      console.log(`Added code3 for ${country.name}: ${alpha3}`);
    } else {
      console.warn(`No code3 found for country code: ${alpha2}`);
    }
  }
});

// Write the updated data back to data.json
if (updated) {
  await Deno.writeTextFile(dataPath, JSON.stringify(data, null, 2));
  console.log("Updated data.json with missing code3 fields.");
} else {
  console.log("No updates needed. All countries already have code3 fields.");
}
