import { match, P } from "@gabriel/ts-pattern";
import type { ParsedData } from "../shared/types.ts";
import { parseUnit } from "../../units/units.ts";
import { parseWithCustomUnits } from "../../custom/custom_units.ts";
import {
  isCountIndicator,
  isCountUnit,
} from "../../count/count-normalization.ts";

type Custom = {
  category: string;
  normalized?: string;
  custom: true;
};

export type BucketKey =
  | "monetaryStock"
  | "monetaryFlow"
  | "counts"
  | "percentages"
  | "indices"
  | "ratios"
  | "commodities"
  | "crypto";

// Helper matchers
const matchers = {
  // Check if name contains wage-like terms
  isWageLike: (name: string) =>
    /(\bwage\b|\bwages\b|\bminimum\s*wage\b|\bsalary\b|\bearnings\b|\bcompensation\b|\bpay\b)/i
      .test(name),

  // Check if it's a monetary stock indicator (regardless of time scale)
  isMonetaryStock: (name: string) => {
    // First check for M0/M1/M2 money supply patterns (no word boundary before M[012])
    if (/m[012]\s+money\s+supply/i.test(name)) return true;

    // Then check for other monetary stock patterns
    return /\b(money\s+supply|monetary\s+base|broad\s+money|narrow\s+money|government\s+debt|public\s+debt|external\s+debt|national\s+debt|sovereign\s+debt|market\s+cap|total\s+assets|bank\s+assets)\b/i
      .test(name);
  },

  // Check if it's a monetary flow indicator (even without explicit time in unit)
  // These are inherently flows that measure money movement over a period
  isMonetaryFlow: (name: string) =>
    /\b(current\s+account|trade\s+balance|exports?|imports?|fdi|foreign\s+direct\s+investment|remittances?|capital\s+flows?|portfolio\s+investment|financial\s+account|balance\s+of\s+payments|trade\s+deficit|trade\s+surplus)\b/i
      .test(name),

  // Check if it's a percentage unit
  isPercentage: (parsed: any) => parsed.category === "percentage",

  // Check if it's an index
  isIndex: (parsed: any, unit: string) =>
    parsed.category === "index" || unit.toLowerCase() === "ratio",

  // Check for ratio pattern (contains "/" but no time scale, or specific ratio units)
  isRatio: (unit: string, parsed: any) => {
    const unitLower = unit.toLowerCase();

    // Check for explicit ratio units
    if (unitLower === "times" || unitLower === "ratio") return true;

    // Check for "per X inhabitants/people/population" patterns (demographic ratios)
    if (/per\s+\d+\s+(inhabitants|people|population)/i.test(unit)) return true;

    // Original logic for "/" ratios
    if (!unit.includes("/") || parsed.timeScale) return false;
    const hasTimeUnit = /(\/|per)\s*(hour|day|week|month|year|quarter|annum)/i
      .test(unit);
    const hasEnergyDenominator =
      /\/(gwh|kwh|mwh|megawatt|mw|terajoule|tj|mmbtu|btu)/i.test(unit);
    return !hasTimeUnit && !hasEnergyDenominator;
  },

  // Check for commodity custom categories
  isCommodityCustom: (custom: any) =>
    custom &&
    ["emissions", "commodity", "agriculture", "metals", "energy"].includes(
      custom.category,
    ),

  // Check for crypto custom category
  isCryptoCustom: (custom: any) =>
    custom && custom.category === "cryptocurrency",

  // Check for energy patterns
  hasEnergyPattern: (name: string, unit: string) =>
    /(electricity|distillate|gasoline|fuel|energy|stocks?|oil|gas|crude|wti|brent|barrels?|bbls?|capacity|exports)/i
      .test(name) ||
    /(gwh|kwh|mwh|gw|megawatts?|mw|terajoules?|tj|mmbtu|btu|barrels?|bbls?|mtpa)/i
      .test(unit) ||
    /(oil\s+rigs?|crude\s+oil\s+rigs?|drilling\s+rigs?|wells?|refineries)/i
      .test(name),

  // Check for emissions patterns
  hasEmissionsPattern: (combined: string) =>
    /co2e?|carbon\s+credits?|emissions?/i.test(combined),

  // Check for metals patterns (including precious metals)
  hasMetalsPattern: (combined: string) =>
    /\b(gold|silver|platinum|palladium|copper|steel|aluminum|aluminium|nickel|zinc|lead|tin|iron\s*ore)\b/i
      .test(combined) ||
    /\b(troy\s+oz|troy\s+ounces?|ounces?\s+troy)\b/i.test(combined),

  // Check for agriculture patterns
  hasAgriculturePattern: (name: string, unit: string) =>
    /(wheat|rice|corn|soybeans?|coffee|cocoa|cotton|palm.*?oil|tea|sugar|grain|livestock|cattle|farmland|agricultural)/i
      .test(name) ||
    /(bushels?|short.*?tons?|metric.*?tonnes?|hectares?)/i.test(unit),

  // Check for crypto patterns
  hasCryptoPattern: (combined: string, unit: string) =>
    /\b(btc|bitcoin|eth|ethereum|wei|sol|solana|ada|cardano|dot|polkadot|matic|polygon|bnb|binance|xrp|ripple|doge|dogecoin|ltc|litecoin)\b/i
      .test(combined) ||
    /^(BTC|ETH|SOL|ADA|DOT|MATIC|BNB|XRP|DOGE|LTC)$/i.test(unit),

  // Check for reserves (monetary or commodity)
  isReserve: (name: string) => /\breserves?\b/i.test(name),

  // Check for infrastructure/physical units
  isInfrastructure: (name: string, unit: string) =>
    /(roads?|railways?|airports?|seaports?|infrastructure)/i.test(name) ||
    /(km|kilometers?|kilometres?|miles?|facilities)/i.test(unit),

  // Check for count indicators
  isCount: (parsed: any, name?: string, unit?: string) => {
    // Check parsed categories
    if (parsed.category === "population" || parsed.category === "count") {
      return true;
    }

    // Check using existing count functions
    if (isCountIndicator(name, unit) || isCountUnit(unit || "")) {
      return true;
    }

    // Check for specific count-like units that aren't caught by the above
    const unitLower = (unit || "").toLowerCase();
    const countUnitPatterns = [
      /trucks?/i,
      /cars?/i,
      /vehicles?/i,
      /buses/i,
      /motorcycles?/i,
      /motorbikes?/i,
      /doctors?/i,
      /nurses?/i,
      /teachers?/i,
      /workers?/i,
      /employees?/i,
      /staff/i,
      /schools?/i,
      /universities/i,
      /colleges?/i,
      /institutions?/i,
      /facilities/i,
      /factories/i,
      /plants?/i,
      /startups?/i,
      /companies?/i,
      /businesses?/i,
      /users?/i,
      /subscribers?/i,
      /connections?/i,
      /accounts?/i,
      /farms?/i,
      /cattle/i,
      /sheep/i,
      /livestock/i,
      /animals?/i,
      /units?/i,
      /items?/i,
      /pieces?/i,
      /components?/i,
      /persons?/i,
      /people/i,
      /individuals?/i,
      /households?/i,
      /students?/i,
      /pupils?/i,
      /graduates?/i,
    ];

    return countUnitPatterns.some((pattern) => pattern.test(unitLower));
  },

  // Check if has currency (monetary)
  hasCurrency: (parsed: any) => !!parsed.currency,

  // Check if has time scale (flow vs stock)
  hasTimeScale: (parsed: any) => !!parsed.timeScale,
};

export function bucketForItem(item: ParsedData): BucketKey {
  const parsed = parseUnit(item.unit || "");
  const name = (item.name || "").toLowerCase();
  const unitLower = (item.unit || "").toLowerCase();
  const combined = `${unitLower} ${name}`;
  const custom = parseWithCustomUnits(`${name} ${item.unit || ""}`) ||
    parseWithCustomUnits(item.unit || "");

  return match({
    parsed,
    name,
    unitLower,
    combined,
    custom,
    unit: item.unit || "",
    itemName: item.name,
  })
    // Dimensionless categories
    .when(
      ({ parsed }) => matchers.isPercentage(parsed),
      () => "percentages",
    )
    .when(
      ({ parsed, unitLower }) => matchers.isIndex(parsed, unitLower),
      () => "indices",
    )
    // Ratios (early detection)
    .when(
      ({ unit, parsed }) => matchers.isRatio(unit, parsed),
      () => "ratios",
    )
    // Check for energy/commodity prices BEFORE monetary flows
    .when(
      ({ unitLower, name }) => {
        // Electricity or energy prices are commodities
        const isEnergyPrice = name.includes("electricity price") ||
          name.includes("energy price") ||
          name.includes("oil price") ||
          (unitLower.includes("/mwh") || unitLower.includes("/kwh") ||
            unitLower.includes("/gwh") || unitLower.includes("/barrel") ||
            unitLower.includes("per barrel"));
        return isEnergyPrice;
      },
      () => "commodities",
    )
    // Check for monetary flows first (currency with time component)
    .when(
      ({ parsed, unitLower }) => {
        // Currency units WITH per/slash time components are flows
        return matchers.hasCurrency(parsed) &&
          (unitLower.includes(" per ") || unitLower.includes("/"));
      },
      ({ itemName }) => {
        // Wages are always flow
        if (matchers.isWageLike(itemName || "")) return "monetaryFlow";
        // Otherwise it's a flow (has time in unit)
        return "monetaryFlow";
      },
    )
    // Check for pure monetary values (stocks - no time in unit)
    // This catches export/import values, debt, money supply, etc.
    .when(
      ({ parsed, unitLower }) => {
        // Pure currency units without per/slash (not prices)
        return matchers.hasCurrency(parsed) &&
          !unitLower.includes(" per ") &&
          !unitLower.includes("/");
      },
      ({ parsed, itemName }) => {
        // Wages are always flow
        if (matchers.isWageLike(itemName || "")) return "monetaryFlow";
        // Trade flows, FDI, remittances etc are always flows
        if (matchers.isMonetaryFlow(itemName || "")) return "monetaryFlow";

        // Special handling for GDP: treat as flow if it has periodicity (for auto-targeting)
        // This allows GDP with periodicity to get time normalization
        if (itemName && /gdp/i.test(itemName) && item.periodicity) {
          return "monetaryFlow";
        }

        // Money supply, debt, assets are always stock
        if (matchers.isMonetaryStock(itemName || "")) return "monetaryStock";
        // Otherwise check if time is IN the unit string (not just periodicity)
        // We default to stock unless there's explicit time in the unit
        return "monetaryStock";
      },
    )
    // Cryptocurrency (check before commodities and reserves)
    .when(
      ({ custom }) => matchers.isCryptoCustom(custom),
      () => "crypto",
    )
    .when(
      ({ combined, unit }) => matchers.hasCryptoPattern(combined, unit),
      () => "crypto",
    )
    // Custom categories for commodities
    .when(
      ({ custom }) => matchers.isCommodityCustom(custom),
      () => "commodities",
    )
    // Reserves (check if monetary or commodity)
    .when(
      ({ name }) => matchers.isReserve(name),
      ({ parsed }) =>
        matchers.hasCurrency(parsed)
          ? (matchers.hasTimeScale(parsed) ? "monetaryFlow" : "monetaryStock")
          : "commodities",
    )
    // Commodities (check before counts to avoid misclassification)
    .when(
      ({ name, unitLower }) => matchers.hasEnergyPattern(name, unitLower),
      () => "commodities",
    )
    .when(
      ({ combined }) => matchers.hasEmissionsPattern(combined),
      () => "commodities",
    )
    .when(
      ({ combined }) => matchers.hasMetalsPattern(combined),
      () => "commodities",
    )
    // Check for physical commodity units (tonnes, barrels, etc.) before counts
    .when(
      ({ unit }) => {
        const unitLower = (unit || "").toLowerCase();
        return /\b(tonnes?|barrels?|gallons?|bushels?|ounces?|metric tons?|tons?)\b/i
          .test(unitLower);
      },
      () => "commodities",
    )
    // Counts (check after commodities to avoid misclassifying "Thousands of Tonnes" as counts)
    .when(
      ({ parsed, itemName, unit }) => matchers.isCount(parsed, itemName, unit),
      () => "counts",
    )
    // Infrastructure/physical units (should be counts)
    .when(
      ({ name, unit }) => matchers.isInfrastructure(name, unit),
      () => "counts",
    )
    .when(
      ({ name, unitLower }) => matchers.hasAgriculturePattern(name, unitLower),
      () => "commodities",
    )
    .when(
      ({ parsed }) => parsed.category === "energy",
      () => "commodities",
    )
    // Monetary (wages are always flow, others depend on timeScale)
    .when(
      ({ itemName }) => matchers.isWageLike(itemName || ""),
      () => "monetaryFlow",
    )
    .otherwise(
      ({ parsed }) =>
        matchers.hasTimeScale(parsed) ? "monetaryFlow" : "monetaryStock",
    ) as BucketKey;
}

// Export helper for wage detection (used elsewhere)
export function isWageLikeName(name?: string): boolean {
  return matchers.isWageLike(name || "");
}
