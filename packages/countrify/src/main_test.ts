import { assert, assertEquals, assertThrows } from "@std/assert";
import { flagmoji } from "./main.ts";
import type { Country } from "./types/types.ts";

Deno.test("EmojiFlags - data", () => {
  assert(flagmoji.data.length > 0);
  const afghanistan = flagmoji.data.find((c) => c.code === "AF");
  assertEquals(afghanistan?.name, "Afghanistan");
  assertEquals(afghanistan?.code3, "AFG");
});

Deno.test("EmojiFlags - emojis", () => {
  assert(flagmoji.emojis.length > 0);
  const gbIndex = flagmoji.data.findIndex((c) => c.code === "GB");
  assertEquals(flagmoji.emojis[gbIndex], "🇬🇧");
});

Deno.test("EmojiFlags - codes", () => {
  assertEquals(flagmoji.codes.length, 251);
  assertEquals(flagmoji.codes[201], "SJ");
});

Deno.test("EmojiFlags - names", () => {
  assertEquals(flagmoji.names.length, 251);
  assertEquals(flagmoji.names[151], "Mauritania");
});

Deno.test("EmojiFlags - unicodes", () => {
  assertEquals(flagmoji.unicodes.length, 251);
  assertEquals(flagmoji.unicodes[102], "U+1F1EE U+1F1EA");
});

Deno.test("EmojiFlags - countryCode", () => {
  const denmark: Country | undefined = flagmoji.countryCode("dk");
  assertEquals(denmark?.code, "DK");
  assertEquals(denmark?.emoji, "🇩🇰");

  const nonExistent: Country | undefined = flagmoji.countryCode("xyz");
  assertEquals(nonExistent, undefined);
});

Deno.test("EmojiFlags - countryCode with alpha-3", () => {
  // Test alpha-3 code
  const denmark: Country | undefined = flagmoji.countryCode("DNK");
  assertEquals(denmark?.code, "DK");
  assertEquals(denmark?.code3, "DNK");
  assertEquals(denmark?.emoji, "🇩🇰");

  // Test that both alpha-2 and alpha-3 work
  const gbAlpha2 = flagmoji.countryCode("GB");
  const gbAlpha3 = flagmoji.countryCode("GBR");
  assertEquals(gbAlpha2, gbAlpha3);

  // Test case insensitivity
  const lowercase = flagmoji.countryCode("usa");
  const uppercase = flagmoji.countryCode("USA");
  assertEquals(lowercase, uppercase);
  assertEquals(lowercase?.code, "US");
  assertEquals(lowercase?.code3, "USA");
});

Deno.test("EmojiFlags - searchByName", () => {
  // Test exact match
  const unitedKingdom = flagmoji.searchByName("United Kingdom");
  assertEquals(unitedKingdom.length, 1);
  assertEquals(unitedKingdom[0].code, "GB");
  assertEquals(unitedKingdom[0].emoji, "🇬🇧");

  // Test partial match
  const united = flagmoji.searchByName("United");
  assert(united.length > 1);
  assert(united.some((country) => country.name === "United Kingdom"));
  assert(united.some((country) => country.name === "United States"));

  // Test case insensitive
  const denmark = flagmoji.searchByName("denmark");
  assertEquals(denmark.length, 1);
  assertEquals(denmark[0].code, "DK");
  assertEquals(denmark[0].emoji, "🇩🇰");

  // Test no match
  const nonExistent = flagmoji.searchByName("NonExistentCountry");
  assertEquals(nonExistent.length, 0);

  // Test empty input
  assertThrows(
    () => {
      flagmoji.searchByName("");
    },
    Error,
    "Expected a country name as the first argument",
  );
});

Deno.test("EmojiFlags - searchBySlug", () => {
  // exact slug
  const uk = flagmoji.searchBySlug("united-kingdom");
  assertEquals(uk.length, 1);
  assertEquals(uk[0]?.code, "GB");

  // case insensitivity
  const uk2 = flagmoji.searchBySlug("United-Kingdom");
  assertEquals(uk2, uk);

  // non-existent slug returns empty array
  const none = flagmoji.searchBySlug("no-such-slug");
  assertEquals(none.length, 0);

  // empty slug throws error
  assertThrows(
    () => {
      flagmoji.searchBySlug("");
    },
    Error,
    "Expected a country slug as the first argument",
  );
});

Deno.test("EmojiFlags - searchByName - Congo", () => {
  // Test "Congo"
  const congo = flagmoji.searchByName("Congo");
  assert(congo.length === 2); // Democratic Republic of the Congo and Republic of the Congo

  const drc = congo.find((c) => c.name === "DR Congo");
  assertEquals(drc?.code, "CD");
  assertEquals(drc?.emoji, "🇨🇩");

  const roc = congo.find((c) => c.name === "Congo");
  assertEquals(roc?.code, "CG");
  assertEquals(roc?.emoji, "🇨🇬");

  // Test "DR Congo"
  const drcByName = flagmoji.searchByName("DR Congo");
  assertEquals(drcByName.length, 1);
  assertEquals(drcByName[0].code, "CD");

  // Test "Congo" (the country, CG, by its specific name)
  const rocEntriesByName = flagmoji
    .searchByName("Congo")
    .filter((c) => c.name === "Congo");
  assertEquals(rocEntriesByName.length, 1);
  assertEquals(rocEntriesByName[0].code, "CG");
});

Deno.test("EmojiFlags - searchBySlug - Congo", () => {
  // Test getting 'DR Congo' (CD) by its slug 'republic-of-congo'
  const drcResults = flagmoji.searchBySlug("republic-of-congo");
  assertEquals(drcResults.length, 1);
  assertEquals(drcResults[0].code, "CD");
  assertEquals(drcResults[0].slug, "republic-of-congo");

  // Test getting 'Congo' (CG) by its slug 'congo'
  const rocResults = flagmoji.searchBySlug("congo");
  assertEquals(rocResults.length, 1);
  assertEquals(rocResults[0].code, "CG");
  assertEquals(rocResults[0].slug, "congo");
});

Deno.test("EmojiFlags - slug - Congo", () => {
  // Test "republic-of-congo" (slug for CD)
  const drcBySlug = flagmoji.slug("republic-of-congo");
  assertEquals(drcBySlug?.code, "CD");
  assertEquals(drcBySlug?.name, "DR Congo");

  // Test "congo" (slug for CG)
  const rocBySlug = flagmoji.slug("congo");
  assertEquals(rocBySlug?.code, "CG");
  assertEquals(rocBySlug?.name, "Congo");
});
