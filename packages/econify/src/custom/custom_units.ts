/**
 * Custom unit definitions and registration
 */

import type { UnitCategory, UnitPattern } from "../units/units.ts";

/** Definition for a custom unit pattern and conversion. */
export interface CustomUnit {
  pattern: RegExp | string;
  category: UnitCategory | string;
  normalized?: string;
  conversionFactor?: {
    to: string;
    factor: number;
  };
  parser?: (text: string) => unknown;
  validator?: (value: number) => boolean;
}

// Registry for custom units
const customUnits = new Map<string, CustomUnit>();
const customPatterns: UnitPattern[] = [];

/**
 * Register a custom unit
 */
export function registerCustomUnit(name: string, unit: CustomUnit): void {
  customUnits.set(name, unit);

  // Add to pattern list
  const pattern = typeof unit.pattern === "string"
    ? new RegExp(unit.pattern, "i")
    : unit.pattern;

  customPatterns.push({
    pattern,
    category: unit.category as UnitCategory,
    normalized: unit.normalized,
  });
}

/**
 * Register multiple custom units
 */
export function registerCustomUnits(units: Record<string, CustomUnit>): void {
  for (const [name, unit] of Object.entries(units)) {
    registerCustomUnit(name, unit);
  }
}

/**
 * Get custom unit by name
 */
export function getCustomUnit(name: string): CustomUnit | undefined {
  return customUnits.get(name);
}

/**
 * Parse with custom units
 */
export function parseWithCustomUnits(text: string): {
  category: UnitCategory;
  normalized?: string;
  custom: true;
} | null {
  for (const pattern of customPatterns) {
    if (pattern.pattern.test(text)) {
      return {
        category: pattern.category as UnitCategory,
        normalized: pattern.normalized,
        custom: true,
      };
    }
  }
  return null;
}

/**
 * Convert using custom unit
 */
export function convertCustomUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
): number | null {
  const from = customUnits.get(fromUnit);
  const to = customUnits.get(toUnit);

  if (from?.conversionFactor && from.conversionFactor.to === toUnit) {
    return value * from.conversionFactor.factor;
  }

  if (to?.conversionFactor && to.conversionFactor.to === fromUnit) {
    return value / to.conversionFactor.factor;
  }

  return null;
}

/**
 * Pre-defined domain-specific units
 */
/** Pre-defined domain unit registries loadable via loadDomainUnits(). */
export const DOMAIN_UNITS = {
  emissions: {
    CO2_tonnes: {
      pattern: /CO2e?\s*tonnes?/i,
      category: "emissions",
      normalized: "CO2 tonnes",
      conversionFactor: { to: "kg", factor: 1000 },
    },
    carbon_credits: {
      pattern: /carbon\s+credits?/i,
      category: "emissions",
      normalized: "carbon credits",
    },
  },

  crypto: {
    BTC: {
      pattern: /\bBTC\b|bitcoin/i,
      category: "cryptocurrency",
      normalized: "BTC",
    },
    ETH: {
      pattern: /\bETH\b|ethereum/i,
      category: "cryptocurrency",
      normalized: "ETH",
    },
    wei: {
      pattern: /\bwei\b/i,
      category: "cryptocurrency",
      normalized: "wei",
      conversionFactor: { to: "ETH", factor: 1e-18 },
    },
  },

  commodities: {
    gold_oz: {
      pattern: /gold\s+oz|troy\s+ounces?/i,
      category: "commodity",
      normalized: "troy oz",
    },
    crude_barrel: {
      pattern: /crude\s+barrel|WTI|Brent/i,
      category: "commodity",
      normalized: "barrel",
    },
  },
};

/**
 * Load domain-specific units
 */
export function loadDomainUnits(domain: keyof typeof DOMAIN_UNITS): void {
  const units = DOMAIN_UNITS[domain];
  if (units) {
    registerCustomUnits(units);
  }
}
