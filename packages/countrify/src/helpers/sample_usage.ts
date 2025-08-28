import { flagmoji } from "../main.ts";

// Using ISO 3166-1 alpha-2 code
const denmark = flagmoji.countryCode("DK");
console.log(denmark);
// => { code: "DK", code3: "DNK", emoji: "🇩🇰", ... }

// Using ISO 3166-1 alpha-3 code
const usa = flagmoji.countryCode("USA");
console.log(usa);
// => { code: "US", code3: "USA", emoji: "🇺🇸", ... }

// Case-insensitive search
const uk = flagmoji.countryCode("gbr");
console.log(uk);
// => { code: "GB", code3: "GBR", emoji: "🇬🇧", ... }

const france = flagmoji.countryCode("fr")?.emoji;
console.log(france);
// => "🇫🇷"

const spain = flagmoji.countryCode("es")?.emoji;
console.log(spain);
// => "🇪🇸"

const argentina = flagmoji.countryCode("ar")?.emoji;
console.log(argentina);
// => "🇦🇷"

const uganda = flagmoji.searchByName("uganda")?.[0]?.emoji;
console.log(uganda);
// => "🇺🇬"

const unknown = flagmoji.countryCode("unknown")?.emoji;
console.log(unknown);
// => undefined
