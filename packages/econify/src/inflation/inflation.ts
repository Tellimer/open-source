/**
 * Inflation adjustment utilities using CPI data
 */

import { parseUnit } from "../units/units.ts";

export interface CPIData {
  country: string;
  year: number;
  month?: number;
  value: number;
  base_year?: number;
}

export interface InflationOptions {
  fromYear: number;
  toYear: number;
  country?: string;
  frequency?: "annual" | "monthly";
  method?: "cpi" | "gdp_deflator" | "custom";
  customIndex?: number[];
}

// Sample CPI data (base year 2020 = 100)
// In production, this would be fetched from an API
const CPI_DATA: Record<string, Record<number, number>> = {
  US: {
    2015: 86.5,
    2016: 87.8,
    2017: 89.8,
    2018: 92.0,
    2019: 93.6,
    2020: 100.0,
    2021: 104.7,
    2022: 112.9,
    2023: 117.3,
    2024: 121.5,
  },
  EU: {
    2015: 88.2,
    2016: 88.6,
    2017: 90.1,
    2018: 91.9,
    2019: 93.1,
    2020: 100.0,
    2021: 102.9,
    2022: 111.5,
    2023: 117.8,
    2024: 120.3,
  },
  UK: {
    2015: 85.9,
    2016: 86.7,
    2017: 89.1,
    2018: 91.3,
    2019: 93.0,
    2020: 100.0,
    2021: 102.5,
    2022: 111.8,
    2023: 119.6,
    2024: 122.1,
  },
  JP: {
    2015: 95.8,
    2016: 95.6,
    2017: 96.1,
    2018: 97.1,
    2019: 97.7,
    2020: 100.0,
    2021: 99.8,
    2022: 102.3,
    2023: 105.7,
    2024: 108.2,
  },
};

// Currency to country mapping
const CURRENCY_COUNTRY_MAP: Record<string, string> = {
  USD: "US",
  EUR: "EU",
  GBP: "UK",
  JPY: "JP",
  // Add more mappings as needed
};

/**
 * Adjust value for inflation
 */
export function adjustForInflation(
  value: number,
  options: InflationOptions & { unit?: string },
): number {
  const {
    fromYear,
    toYear,
    country = inferCountry(options.unit),
    method = "cpi",
  } = options;

  if (!country) {
    throw new Error("Country must be specified or inferable from unit");
  }

  if (method === "cpi") {
    return adjustWithCPI(value, fromYear, toYear, country);
  }

  throw new Error(`Inflation method ${method} not yet implemented`);
}

/**
 * Adjust using CPI data
 */
function adjustWithCPI(
  value: number,
  fromYear: number,
  toYear: number,
  country: string,
): number {
  const cpiData = CPI_DATA[country];

  if (!cpiData) {
    throw new Error(`No CPI data available for ${country}`);
  }

  const fromCPI = cpiData[fromYear];
  const toCPI = cpiData[toYear];

  if (!fromCPI || !toCPI) {
    throw new Error(`CPI data not available for years ${fromYear}-${toYear}`);
  }

  // Adjust value: value * (toCPI / fromCPI)
  return value * (toCPI / fromCPI);
}

/**
 * Infer country from currency in unit
 */
function inferCountry(unit?: string): string | null {
  if (!unit) return null;

  const parsed = parseUnit(unit);
  if (parsed.currency) {
    return CURRENCY_COUNTRY_MAP[parsed.currency] || null;
  }

  return null;
}

/**
 * Get inflation rate between two years
 */
export function getInflationRate(
  fromYear: number,
  toYear: number,
  country: string,
  annualized = true,
): number {
  const cpiData = CPI_DATA[country];

  if (!cpiData) {
    throw new Error(`No CPI data available for ${country}`);
  }

  const fromCPI = cpiData[fromYear];
  const toCPI = cpiData[toYear];

  if (!fromCPI || !toCPI) {
    throw new Error(`CPI data not available for years ${fromYear}-${toYear}`);
  }

  const totalInflation = ((toCPI - fromCPI) / fromCPI) * 100;

  if (annualized && toYear > fromYear) {
    const years = toYear - fromYear;
    return Math.pow(toCPI / fromCPI, 1 / years) - 1;
  }

  return totalInflation;
}

/**
 * Convert nominal to real values
 */
export function nominalToReal(
  nominalValue: number,
  year: number,
  baseYear: number,
  country: string,
): number {
  return adjustWithCPI(nominalValue, year, baseYear, country);
}

/**
 * Convert real to nominal values
 */
export function realToNominal(
  realValue: number,
  baseYear: number,
  targetYear: number,
  country: string,
): number {
  return adjustWithCPI(realValue, baseYear, targetYear, country);
}

/**
 * Calculate real growth rate
 */
export function realGrowthRate(
  nominalGrowth: number,
  inflationRate: number,
): number {
  // Fisher equation: (1 + nominal) = (1 + real) * (1 + inflation)
  return ((1 + nominalGrowth / 100) / (1 + inflationRate / 100) - 1) * 100;
}

/**
 * Adjust time series for inflation
 */
export function adjustTimeSeriesForInflation(
  series: Array<{ year: number; value: number }>,
  baseYear: number,
  country: string,
): Array<{ year: number; value: number; real_value: number }> {
  return series.map((point) => ({
    ...point,
    real_value: adjustWithCPI(point.value, point.year, baseYear, country),
  }));
}

/**
 * Calculate purchasing power parity (PPP) adjusted value
 */
export function adjustForPPP(
  value: number,
  fromCountry: string,
  toCountry: string,
  year: number,
): number {
  // Simplified PPP adjustment using relative CPI levels
  const fromCPI = CPI_DATA[fromCountry]?.[year];
  const toCPI = CPI_DATA[toCountry]?.[year];

  if (!fromCPI || !toCPI) {
    throw new Error(
      `PPP data not available for ${fromCountry}-${toCountry} in ${year}`,
    );
  }

  // This is a simplified approximation
  // In reality, you'd use actual PPP conversion factors
  return value * (toCPI / fromCPI);
}

/**
 * Get available countries for inflation adjustment
 */
export function getAvailableCountries(): string[] {
  return Object.keys(CPI_DATA);
}

/**
 * Get available year range for a country
 */
export function getAvailableYears(country: string): number[] {
  const data = CPI_DATA[country];
  if (!data) {
    throw new Error(`No data available for ${country}`);
  }
  return Object.keys(data).map(Number).sort();
}
