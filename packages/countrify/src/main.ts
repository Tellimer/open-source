import type { Country, FlagmojiType } from "./types/types.ts";
// needed to use `assert` instread of with for node compatibility issues
import { countries } from "./data/data.ts";

/**
 * A class for working with country flag emojis.
 */
export class Flagmoji implements FlagmojiType {
  /**
   * The entire dataset of countries.
   */
  readonly data: Country[] = countries as Country[];

  /**
   * Get the country object for a given country code.
   * @param code The ISO 3166-1 alpha-2 or alpha-3 country code.
   * @returns The country object, or undefined if not found.
   */
  countryCode(code: string): Country | undefined {
    if (!code) {
      throw new Error("Expected a country code as the first argument");
    }

    const upperCode = code.toUpperCase();
    return this.data.find(
      (country) => country.code === upperCode || country.code3 === upperCode,
    );
  }

  /**
   * Search for countries by name.
   * @param name The country name to search for.
   * @returns An array of matching country objects.
   */
  searchByName(name: string): Country[] {
    if (!name) {
      throw new Error("Expected a country name as the first argument");
    }
    const searchTerm = name.toLowerCase();
    return this.data.filter((country) =>
      country.name.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Search for countries by slug.
   * @param slug The country slug to search for.
   * @returns An array of matching country objects.
   */
  searchBySlug(slug: string): Country[] {
    if (!slug) {
      throw new Error("Expected a country slug as the first argument");
    }
    const searchTerm = slug.toLowerCase();
    return this.data.filter((country) => country.slug === searchTerm);
  }

  /**
   * Get an array of all emojis.
   */
  get emojis(): string[] {
    return this.data.map((country) => country.emoji);
  }

  /**
   * Get an array of all country codes.
   */
  get codes(): string[] {
    return this.data.map((country) => country.code);
  }

  /**
   * Get an array of all country names.
   */
  get names(): string[] {
    return this.data.map((country) => country.name);
  }

  /**
   * Get an array of all emojis represented as unicode.
   */
  get unicodes(): string[] {
    return this.data.map((country) => country.unicode);
  }

  /**
   * Get the country object for a given country slug.
   * @param slug The country slug.
   * @returns The country object, or undefined if not found.
   */
  slug(slug: string): Country | undefined {
    if (!slug) {
      throw new Error("Expected a country slug as the first argument");
    }
    const lowerSlug = slug.toLowerCase();
    return this.data.find((country) => country.slug === lowerSlug);
  }
}

/**
 * A singleton instance of the Flagmoji class.
 */
export const flagmoji: Flagmoji = new Flagmoji();
