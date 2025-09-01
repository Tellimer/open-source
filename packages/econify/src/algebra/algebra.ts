/**
 * Unit algebra for mathematical operations preserving units
 */

import { parseUnit } from "../units/units.ts";

/** Value with unit string for algebra operations. */
export interface UnitValue {
  value: number;
  unit: string;
}

/**
 * Round to avoid floating-point precision issues
 */
function roundPrecision(value: number, precision = 10): number {
  return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
}

/**
 * Check if two units match, handling plural forms
 */
function unitsMatch(unit1: string, unit2: string): boolean {
  if (unit1 === unit2) return true;

  // Handle plural forms
  const singular1 = unit1.endsWith("s") ? unit1.slice(0, -1) : unit1;
  const singular2 = unit2.endsWith("s") ? unit2.slice(0, -1) : unit2;

  return singular1 === singular2;
}

/**
 * Multiply values with unit tracking
 */
export function unitMultiply(a: UnitValue, b: UnitValue): UnitValue {
  const parsedA = parseUnit(a.unit);
  const parsedB = parseUnit(b.unit);

  // Handle time-based multiplication (e.g., USD/Hour * Hours = USD)
  if (parsedA.timeScale && b.unit.toLowerCase().includes(parsedA.timeScale)) {
    return {
      value: a.value * b.value,
      unit: parsedA.currency || parsedA.normalized || "unknown",
    };
  }

  // Handle inverse (e.g., USD * 1/EUR = USD/EUR)
  if (parsedA.currency && parsedB.currency) {
    return {
      value: a.value * b.value,
      unit: `${parsedA.currency}/${parsedB.currency}`,
    };
  }

  // Default multiplication
  const result = {
    value: a.value * b.value,
    unit: `${a.unit} * ${b.unit}`,
  };

  // Simplify the resulting unit
  result.unit = simplifyUnit(result.unit);

  return result;
}

/**
 * Divide values with unit tracking
 */
export function unitDivide(a: UnitValue, b: UnitValue): UnitValue {
  const _parsedA = parseUnit(a.unit);
  const _parsedB = parseUnit(b.unit);

  // Same units cancel out
  if (a.unit === b.unit) {
    return {
      value: a.value / b.value,
      unit: "ratio",
    };
  }

  // Create rate (e.g., USD / Hour = USD/Hour)
  return {
    value: a.value / b.value,
    unit: `${a.unit}/${b.unit}`,
  };
}

/**
 * Add values with unit checking
 */
export function unitAdd(a: UnitValue, b: UnitValue): UnitValue {
  if (a.unit !== b.unit) {
    throw new Error(`Cannot add different units: ${a.unit} and ${b.unit}`);
  }

  return {
    value: a.value + b.value,
    unit: a.unit,
  };
}

/**
 * Subtract values with unit checking
 */
export function unitSubtract(a: UnitValue, b: UnitValue): UnitValue {
  if (a.unit !== b.unit) {
    throw new Error(`Cannot subtract different units: ${a.unit} and ${b.unit}`);
  }

  return {
    value: roundPrecision(a.value - b.value),
    unit: a.unit,
  };
}

/**
 * Power operation with unit handling
 */
export function unitPower(a: UnitValue, exponent: number): UnitValue {
  if (exponent === 0) {
    return { value: 1, unit: "dimensionless" };
  }

  if (exponent === 1) {
    return a;
  }

  const result = {
    value: Math.pow(a.value, exponent),
    unit: exponent === -1 ? `1/${a.unit}` : `${a.unit}^${exponent}`,
  };

  // Simplify unit if possible
  result.unit = simplifyUnit(result.unit);

  return result;
}

/**
 * Simplify unit expressions
 */
function simplifyUnit(unit: string): string {
  let simplified = unit;

  // Handle power simplification (e.g., meters^2^0.5 -> meters)
  const powerPattern = /^(.+)\^(\d+(?:\.\d+)?)\^(0\.5|0\.25|0\.75)$/;
  const powerMatch = simplified.match(powerPattern);
  if (powerMatch) {
    const [, baseUnit, power, exponent] = powerMatch;
    const newPower = parseFloat(power) * parseFloat(exponent);
    if (newPower === 1) {
      simplified = baseUnit;
    } else {
      simplified = `${baseUnit}^${newPower}`;
    }
  }

  // Handle simple power simplification (e.g., meters^2^0.5 -> meters)
  const simplePowerPattern = /^(.+)\^2\^0\.5$/;
  const simplePowerMatch = simplified.match(simplePowerPattern);
  if (simplePowerMatch) {
    simplified = simplePowerMatch[1];
  }

  // Handle multiplication cancellation (e.g., USD/barrel * barrels -> USD)
  const multiplyPattern = /^(.+)\/(.+) \* (.+)$/;
  const multiplyMatch = simplified.match(multiplyPattern);
  if (multiplyMatch) {
    const [, numerator, denominator, multiplier] = multiplyMatch;
    if (unitsMatch(denominator.trim(), multiplier.trim())) {
      simplified = numerator;
    }
  }

  // Handle reverse multiplication cancellation (e.g., barrels * USD/barrel -> USD)
  const reverseMultiplyPattern = /^(.+) \* (.+)\/(.+)$/;
  const reverseMultiplyMatch = simplified.match(reverseMultiplyPattern);
  if (reverseMultiplyMatch) {
    const [, multiplier, numerator, denominator] = reverseMultiplyMatch;
    if (unitsMatch(multiplier.trim(), denominator.trim())) {
      simplified = numerator;
    }
  }

  // Handle more complex cancellations
  // e.g., "USD/barrel * barrels" -> "USD"
  if (simplified.includes("/") && simplified.includes("*")) {
    const parts = simplified.split(" * ");
    if (parts.length === 2) {
      const [part1, part2] = parts;
      if (part1.includes("/")) {
        const [num, denom] = part1.split("/");
        if (unitsMatch(denom.trim(), part2.trim())) {
          simplified = num.trim();
        }
      } else if (part2.includes("/")) {
        const [num, denom] = part2.split("/");
        if (unitsMatch(denom.trim(), part1.trim())) {
          simplified = num.trim();
        }
      }
    }
  }

  // Handle multiplication with dimensionless units (ratio, percent, etc.)
  if (simplified.includes(" * ")) {
    const parts = simplified.split(" * ");
    if (parts.length === 2) {
      const [part1, part2] = parts;
      if (isDimensionless(part1.trim())) {
        simplified = part2.trim();
      } else if (isDimensionless(part2.trim())) {
        simplified = part1.trim();
      }
    }
  }

  return simplified;
}

/**
 * Check if a unit is dimensionless
 */
function isDimensionless(unit: string): boolean {
  const dimensionlessUnits = [
    "ratio",
    "percent",
    "%",
    "dimensionless",
    "factor",
  ];
  return dimensionlessUnits.includes(unit.toLowerCase());
}

/**
 * Chain operations with unit tracking
 */
/** Fluent API to chain unit-aware operations. */
export class UnitChain {
  constructor(private current: UnitValue) {}

  multiply(other: UnitValue): UnitChain {
    this.current = unitMultiply(this.current, other);
    return this;
  }

  divide(other: UnitValue): UnitChain {
    this.current = unitDivide(this.current, other);
    return this;
  }

  add(other: UnitValue): UnitChain {
    this.current = unitAdd(this.current, other);
    return this;
  }

  subtract(other: UnitValue): UnitChain {
    this.current = unitSubtract(this.current, other);
    return this;
  }

  power(exponent: number): UnitChain {
    this.current = unitPower(this.current, exponent);
    return this;
  }

  value(): UnitValue {
    return this.current;
  }
}

export function chain(initial: UnitValue): UnitChain {
  return new UnitChain(initial);
}
