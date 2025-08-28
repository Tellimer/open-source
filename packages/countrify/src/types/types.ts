/**
 * Represents a country with its associated flag emoji and other details.
 */
export interface Country {
  code: string;
  code3: string;
  emoji: string;
  unicode: string;
  name: string;
  title: string;
  dialCode?: string | null;
  slug?: string;
}

/**
 * Interface for the EmojiFlags class methods and properties.
 */
export interface FlagmojiType {
  /**
   * The entire dataset of countries.
   */
  readonly data: Country[];

  /**
   * Get the country object for a given country code.
   * @param code The ISO 3166-1 alpha-2 or alpha-3 country code.
   */
  countryCode(code: string): Country | undefined;

  /**
   * Search for countries by name.
   * @param name The country name to search for.
   */
  searchByName(name: string): Country[];

  /**
   * Get an array of all emojis.
   */
  readonly emojis: string[];

  /**
   * Get an array of all country codes.
   */
  readonly codes: string[];

  /**
   * Get an array of all country names.
   */
  readonly names: string[];

  /**
   * Get an array of all emojis represented as unicode.
   */
  readonly unicodes: string[];
}
