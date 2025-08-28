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
  return {
    value: a.value * b.value,
    unit: `${a.unit} * ${b.unit}`,
  };
}

/**
 * Divide values with unit tracking
 */
export function unitDivide(a: UnitValue, b: UnitValue): UnitValue {
  const parsedA = parseUnit(a.unit);
  const parsedB = parseUnit(b.unit);

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
    value: a.value - b.value,
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

  return {
    value: Math.pow(a.value, exponent),
    unit: exponent === -1 ? `1/${a.unit}` : `${a.unit}^${exponent}`,
  };
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
