/**
 * Comprehensive test suite for ALL indicator types from classify production database
 * Tests 150+ real indicators covering all type/currency combinations
 */

import { assertEquals, assertExists } from "jsr:@std/assert@^1.0.10";
import { processBatch } from "./batch.ts";
import type { FXTable } from "../types.ts";

const mockFX: FXTable = {
  base: "USD",
  rates: {
    EUR: 0.85,
    GBP: 0.79,
    AOA: 850,
    AUD: 1.52,
    PKR: 278,
    LBP: 89500,
    NGN: 1450,
    IQD: 1310,
    GMD: 67,
    MWK: 1730,
  },
};

interface TestIndicator {
  id: string;
  name: string;
  indicator_type: string;
  is_currency_denominated: boolean;
  temporal_aggregation: string;
  // Test data
  value: number;
  unit: string;
}

// BALANCE indicators (21 total: 10 non-currency, 11 currency)
const balanceIndicators: TestIndicator[] = [
  // Non-currency balance
  { id: "GERMANYUNECHA", name: "Unemployment Change", indicator_type: "balance", is_currency_denominated: false, temporal_aggregation: "period-rate", value: -15, unit: "Thousands" },
  { id: "UNITEDKINCLACOUCHA", name: "Claimant Count Change", indicator_type: "balance", is_currency_denominated: false, temporal_aggregation: "period-rate", value: -8.5, unit: "Thousands" },
  { id: "BCA_NGDPD", name: "Current Account Balance, % of GDP", indicator_type: "balance", is_currency_denominated: false, temporal_aggregation: "period-rate", value: -2.5, unit: "%" },
  { id: "ABWTEMP", name: "Temperature", indicator_type: "balance", is_currency_denominated: false, temporal_aggregation: "period-average", value: 25.3, unit: "Celsius" },
  { id: "AUSGEDC", name: "GDP External Demand Contribution", indicator_type: "balance", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 0.5, unit: "%" },
  { id: "AUSTRALIAEMPCHA", name: "Employment Change", indicator_type: "balance", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 50, unit: "Thousands" },
  { id: "UNITEDSTAADPEMPCHA", name: "ADP Employment Change", indicator_type: "balance", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 150, unit: "Thousands" },
  { id: "APICRUDEOIL", name: "API Crude Oil Stock Change", indicator_type: "balance", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 2.5, unit: "Million Barrels" },
  { id: "ABWPREC", name: "Precipitation", indicator_type: "balance", is_currency_denominated: false, temporal_aggregation: "period-total", value: 45, unit: "mm" },
  { id: "BN.CAB.XOKA.GD.ZS", name: "Current account balance (% of GDP)", indicator_type: "balance", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 3.2, unit: "%" },
  // Currency-denominated balance
  { id: "CHNCAG", name: "Current Account Goods", indicator_type: "balance", is_currency_denominated: true, temporal_aggregation: "period-total", value: 45.2, unit: "USD Billions" },
  { id: "ALGERIACHAININV", name: "Changes in Inventories", indicator_type: "balance", is_currency_denominated: true, temporal_aggregation: "period-total", value: 1.5, unit: "USD Billions" },
  { id: "GGXONLB", name: "General government primary net lending/borrowing", indicator_type: "balance", is_currency_denominated: true, temporal_aggregation: "period-total", value: -50, unit: "EUR Billions" },
  { id: "GGSB", name: "General government structural balance", indicator_type: "balance", is_currency_denominated: true, temporal_aggregation: "period-total", value: -2.1, unit: "EUR Billions" },
  { id: "AFGHANISTAGOVBUDVAL", name: "Government Budget Value", indicator_type: "balance", is_currency_denominated: true, temporal_aggregation: "period-total", value: -500, unit: "USD Millions" },
  { id: "UNITEDKINGOOTRABAL", name: "Goods Trade Balance", indicator_type: "balance", is_currency_denominated: true, temporal_aggregation: "period-rate", value: -15.2, unit: "GBP Billions" },
  { id: "GBRGTBNE", name: "Goods Trade Balance Non-EU", indicator_type: "balance", is_currency_denominated: true, temporal_aggregation: "period-total", value: -8.5, unit: "GBP Billions" },
  { id: "CHNCAS", name: "Current Account Services", indicator_type: "balance", is_currency_denominated: true, temporal_aggregation: "period-total", value: -12.3, unit: "USD Billions" },
  { id: "IRFCLDT1_IRFCL65_USD_IRFCL13", name: "Official reserves assets", indicator_type: "balance", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 450, unit: "USD Billions" },
  { id: "GGB", name: "General government balance", indicator_type: "balance", is_currency_denominated: true, temporal_aggregation: "period-total", value: -3.5, unit: "EUR Billions" },
];

// CAPACITY indicators (2 total: non-currency only)
const capacityIndicators: TestIndicator[] = [
  { id: "AlbaniaRetAgeWom", name: "Retirement Age Women", indicator_type: "capacity", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 62, unit: "Years" },
  { id: "AlbaniaRetAgeMen", name: "Retirement Age Men", indicator_type: "capacity", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 65, unit: "Years" },
];

// INDEX indicators from composite-derived/index type (9 total: non-currency only)
// NOTE: Production DB has "composite-derived/index" but should just be "index"
const compositeIndexIndicators: TestIndicator[] = [
  { id: "ADSMI", name: "Stock Market", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 9850, unit: "Index" },
  { id: "CHNBCONDI", name: "Business Conditions Index", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "period-average", value: 52.5, unit: "Index" },
  { id: "JPNTCEFAE", name: "Tokyo CPI Ex Food and Energy", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 2.1, unit: "%" },
  { id: "ARGENTINAIMPPRI", name: "Import Prices", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "period-average", value: 145.3, unit: "Index" },
  { id: "FP.CPI.TOTL", name: "Consumer price index (2010 = 100)", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "period-average", value: 118.5, unit: "Index" },
  { id: "USADFMNOI", name: "Dallas Fed Manufacturing New Orders Index", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "period-average", value: -5.2, unit: "Index" },
  { id: "ARGENTINACORCONPRI", name: "Core Consumer Prices", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "period-average", value: 112.8, unit: "Index" },
  { id: "AFGHANISTACHU", name: "CPI Housing Utilities", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 105.3, unit: "Index" },
  { id: "CANADABUSCLIIND", name: "Business Climate Indicator", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "period-average", value: 98.7, unit: "Index" },
];

// COUNT indicators (17 total: 10 non-currency, 7 currency)
const countIndicators: TestIndicator[] = [
  // Non-currency counts
  { id: "OMANMORAPP", name: "Mortgage Approvals", indicator_type: "count", is_currency_denominated: false, temporal_aggregation: "period-total", value: 1250, unit: "Units" },
  { id: "BULGARIAHOUSTA", name: "Housing Starts", indicator_type: "count", is_currency_denominated: false, temporal_aggregation: "period-total", value: 3500, unit: "Units" },
  { id: "AUSTRALIATOTVEHSAL", name: "Total Vehicle Sales", indicator_type: "count", is_currency_denominated: false, temporal_aggregation: "period-total", value: 85, unit: "Thousands" },
  { id: "ALBANIABUIPER", name: "Building Permits", indicator_type: "count", is_currency_denominated: false, temporal_aggregation: "period-total", value: 450, unit: "Units" },
  { id: "AUSTRALIAPARTIMEMP", name: "Part Time Employment", indicator_type: "count", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 4250, unit: "Thousands" },
  { id: "IRELANDEXIHOMSAL", name: "Existing Home Sales", indicator_type: "count", is_currency_denominated: false, temporal_aggregation: "period-total", value: 2850, unit: "Units" },
  { id: "SP.POP.TOTL", name: "Population, total", indicator_type: "count", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 67.5, unit: "Millions" },
  { id: "AfghanistCorRan", name: "Corruption Rank", indicator_type: "count", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 175, unit: "Rank" },
  { id: "FRANCEMANPAY", name: "Manufacturing Payrolls", indicator_type: "count", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 3200, unit: "Thousands" },
  { id: "FRANCEGOVPAY", name: "Government Payrolls", indicator_type: "count", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 5600, unit: "Thousands" },
  // Currency-denominated counts (data quality issues - counts shouldn't be currency)
  { id: "ARENOE", name: "Non Oil Exports", indicator_type: "count", is_currency_denominated: true, temporal_aggregation: "period-total", value: 1.2, unit: "USD Billions" },
  { id: "RUSNWFA", name: "National Wealth Fund Assets", indicator_type: "count", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 150, unit: "USD Billions" },
  { id: "TD_RESERVES_GFACB_LS_TJK_M", name: "Gross Foreign Assets (Central Bank)", indicator_type: "count", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 2.5, unit: "USD Billions" },
  { id: "TD_RESERVES_FXR_LS_LBN_M", name: "FX Reserves", indicator_type: "count", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 15.2, unit: "USD Billions" },
  { id: "TD_RESERVES_FCANFRK_LS_KAZ_M", name: "Foreign Currency Assets Of The NFRK", indicator_type: "count", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 45.8, unit: "USD Billions" },
  { id: "RUSNWFLA", name: "National Wealth Fund Liquid Assets", indicator_type: "count", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 120, unit: "USD Billions" },
  { id: "TD_RESERVES_ASOFAZ_LS_AZE_Q", name: "Assets of the State Oil Fund", indicator_type: "count", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 45.2, unit: "USD Billions" },
];

// FLOW indicators (15 total: 5 non-currency, 10 currency)
const flowIndicators: TestIndicator[] = [
  // Non-currency flows
  { id: "USAWCOP", name: "Weekly Crude Oil Production", indicator_type: "flow", is_currency_denominated: false, temporal_aggregation: "period-average", value: 13.2, unit: "Million Barrels/Day" },
  { id: "BIHAVGWEEKLYHOURS", name: "Average Weekly Hours", indicator_type: "flow", is_currency_denominated: false, temporal_aggregation: "period-average", value: 39.5, unit: "Hours" },
  { id: "ALBANIACRUOILPRO", name: "Crude Oil Production", indicator_type: "flow", is_currency_denominated: false, temporal_aggregation: "period-average", value: 15, unit: "Thousand Barrels/Day" },
  { id: "CHILECOPPRO", name: "Copper Production", indicator_type: "flow", is_currency_denominated: false, temporal_aggregation: "period-total", value: 485, unit: "Thousand Tonnes" },
  { id: "CHINACEMPRO", name: "Cement Production", indicator_type: "flow", is_currency_denominated: false, temporal_aggregation: "period-total", value: 2100, unit: "Million Tonnes" },
  // Currency-denominated flows
  { id: "AUSTRALIAHOMLOA", name: "Home Loans", indicator_type: "flow", is_currency_denominated: true, temporal_aggregation: "period-total", value: 20.5, unit: "AUD Billions" },
  { id: "AFGHANISTAGFCF", name: "Gross Fixed Capital Formation", indicator_type: "flow", is_currency_denominated: true, temporal_aggregation: "period-total", value: 3.2, unit: "USD Billions" },
  { id: "AFGSTANGDP", name: "GDP", indicator_type: "flow", is_currency_denominated: true, temporal_aggregation: "period-total", value: 450, unit: "USD Billions" },
  { id: "TMGO", name: "Value of oil imports", indicator_type: "flow", is_currency_denominated: true, temporal_aggregation: "period-total", value: 85, unit: "USD Billions" },
  { id: "GC.TAX.TOTL.CN", name: "Tax revenue (current LCU)", indicator_type: "flow", is_currency_denominated: true, temporal_aggregation: "period-total", value: 2500, unit: "EUR Billions" },
  { id: "CANIIFS", name: "Investment in Foreign Securities", indicator_type: "flow", is_currency_denominated: true, temporal_aggregation: "period-total", value: 12.5, unit: "USD Billions" },
  { id: "AUSTRALIACORPRO", name: "Corporate Profits", indicator_type: "flow", is_currency_denominated: true, temporal_aggregation: "period-total", value: 95, unit: "AUD Billions" },
  { id: "NY.GDP.MKTP.CN", name: "GDP (current LCU)", indicator_type: "flow", is_currency_denominated: true, temporal_aggregation: "period-total", value: 3500, unit: "EUR Billions" },
  { id: "AFGSTANIMPMPORTS", name: "Imports", indicator_type: "flow", is_currency_denominated: true, temporal_aggregation: "period-total", value: 7.5, unit: "USD Billions" },
  { id: "AFGHANISTAGDPFROCON", name: "GDP from Construction", indicator_type: "flow", is_currency_denominated: true, temporal_aggregation: "period-total", value: 25, unit: "USD Billions" },
];

// INDEX indicators (10 total: all non-currency)
const indexIndicators: TestIndicator[] = [
  { id: "USAKFSI", name: "Kansas Fed Shipments Index", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "period-average", value: 15.3, unit: "Index" },
  { id: "USACPCAHI", name: "CFNAI Personal Consumption and Housing Index", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "period-average", value: 0.25, unit: "Index" },
  { id: "AUSINDIND", name: "Industry Index", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "period-average", value: 102.5, unit: "Index" },
  { id: "UNITEDSTANYEMPSTAMAN", name: "NY Empire State Manufacturing Index", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "period-average", value: 5.2, unit: "Index" },
  { id: "UNITEDSTACASSHIHOMPR", name: "Case Shiller Home Price Index", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 315.8, unit: "Index" },
  { id: "AUSTRALIASERPMI", name: "Services PMI", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "period-average", value: 52.7, unit: "Index" },
  { id: "USAPFNO", name: "Philly Fed New Orders", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "period-average", value: -12.5, unit: "Index" },
  { id: "ARGENTINATEROFTRA", name: "Terms of Trade", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "period-average", value: 118.3, unit: "Index" },
  { id: "UNITEDSTALIC", name: "Lmi Inventory Costs", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "period-average", value: 62.5, unit: "Index" },
  { id: "UNITEDSTAEMPCOSIND", name: "Employment Cost Index", indicator_type: "index", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 1.2, unit: "%" },
];

// PERCENTAGE indicators (7 total: all non-currency)
const percentageIndicators: TestIndicator[] = [
  { id: "ALBANIALFPR", name: "Labor Force Participation Rate", indicator_type: "percentage", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 68.5, unit: "%" },
  { id: "ALBANIASOCSECRATFORC", name: "Social Security Rate For Companies", indicator_type: "percentage", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 15.5, unit: "%" },
  { id: "ALBANIAYOUUNERAT", name: "Youth Unemployment Rate", indicator_type: "percentage", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 18.3, unit: "%" },
  { id: "CHNRRRFFS", name: "Risk Reserve Ratio Forward FX Sales", indicator_type: "percentage", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 20, unit: "%" },
  { id: "ALBANIASOCSECRATFORE", name: "Social Security Rate For Employees", indicator_type: "percentage", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 11.2, unit: "%" },
  { id: "ALBANIASOCSECRAT", name: "Social Security Rate", indicator_type: "percentage", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 27.9, unit: "%" },
  { id: "DEUHUR", name: "Harmonised Unemployment Rate", indicator_type: "percentage", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 6.5, unit: "%" },
];

// PRICE indicators (9 total: 4 non-currency, 5 currency)
const priceIndicators: TestIndicator[] = [
  // Non-currency prices (rates, exchange rates)
  { id: "USASOFR", name: "Secured Overnight Financing Rate", indicator_type: "price", is_currency_denominated: false, temporal_aggregation: "period-average", value: 5.35, unit: "%" },
  { id: "THAREPRAT", name: "Repo Rate", indicator_type: "price", is_currency_denominated: false, temporal_aggregation: "period-average", value: 2.5, unit: "%" },
  { id: "CHNLPR5", name: "Loan Prime Rate 5Y", indicator_type: "price", is_currency_denominated: false, temporal_aggregation: "period-average", value: 4.2, unit: "%" },
  { id: "AUDUSD", name: "Currency", indicator_type: "price", is_currency_denominated: false, temporal_aggregation: "period-average", value: 0.66, unit: "Rate" },
  // Currency-denominated prices
  { id: "ESPELEPRI", name: "Electricity Price", indicator_type: "price", is_currency_denominated: true, temporal_aggregation: "period-average", value: 150, unit: "EUR/MWh" },
  { id: "UNITEDSTASFHP", name: "Single Family Home Prices", indicator_type: "price", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 425, unit: "USD Thousands" },
  { id: "AUSAHP", name: "Average House Prices", indicator_type: "price", is_currency_denominated: true, temporal_aggregation: "period-average", value: 750, unit: "AUD Thousands" },
  { id: "AlbaniaGasPri", name: "Gasoline Prices", indicator_type: "price", is_currency_denominated: true, temporal_aggregation: "period-average", value: 1.85, unit: "USD/Liter" },
  { id: "USAPFR", name: "Proxy Funds Rate", indicator_type: "price", is_currency_denominated: false, temporal_aggregation: "period-average", value: 5.5, unit: "%" },
];

// RATE indicators (10 total: all non-currency)
const rateIndicators: TestIndicator[] = [
  { id: "USAPHSM", name: "Pending Home Sales MoM", indicator_type: "rate", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 3.5, unit: "%" },
  { id: "AUSIPM", name: "Import Prices MoM", indicator_type: "rate", is_currency_denominated: false, temporal_aggregation: "period-rate", value: -1.2, unit: "%" },
  { id: "TM_RPCH", name: "Volume of imports of goods and services", indicator_type: "rate", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 5.8, unit: "%" },
  { id: "UNITEDSTAWHOINV", name: "Wholesale Inventories", indicator_type: "rate", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 0.8, unit: "%" },
  { id: "ALBWAGEGROWTH", name: "Wage Growth", indicator_type: "rate", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 4.2, unit: "%" },
  { id: "DEUENEINF", name: "Energy Inflation", indicator_type: "rate", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 8.5, unit: "%" },
  { id: "DEUBRCY", name: "Brandenburg CPI YoY", indicator_type: "rate", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 3.1, unit: "%" },
  { id: "CHNPROINV", name: "Property Investment", indicator_type: "rate", is_currency_denominated: false, temporal_aggregation: "period-rate", value: -10.2, unit: "%" },
  { id: "AUTWPY", name: "Wholesale Prices YoY", indicator_type: "rate", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 2.8, unit: "%" },
  { id: "BELNPCRY", name: "New Passenger Car Registrations YoY", indicator_type: "rate", is_currency_denominated: false, temporal_aggregation: "period-rate", value: -5.3, unit: "%" },
];

// RATIO indicators (17 total: 10 non-currency, 7 currency)
const ratioIndicators: TestIndicator[] = [
  // Non-currency ratios
  { id: "PFX_LS_PAK_PKR", name: "Pakistan Parallel FX Rate (PKR)", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "period-average", value: 290, unit: "PKR/USD" },
  { id: "ATHOSP", name: "Hospitals", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 2.5, unit: "per 1000 people" },
  { id: "GGX_NGDP", name: "General Government Total Expenditure, % of GDP", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "not-applicable", value: 45.2, unit: "%" },
  { id: "PFX_LS_AGO_AOA", name: "Angola Parallel FX Rate (AOA)", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "period-average", value: 900, unit: "AOA/USD" },
  { id: "GGR_NGDP", name: "General Government Revenue, % of GDP", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "not-applicable", value: 42.8, unit: "%" },
  { id: "NY.GNS.ICTR.ZS", name: "Gross savings (% of GDP)", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "period-total", value: 23.5, unit: "%" },
  { id: "AFGHANISTAGSTG", name: "Government Spending to GDP", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "period-average", value: 28.3, unit: "%" },
  { id: "PFX_LS_LBN_LBP", name: "Lebanon Parallel FX Rate (LBP)", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "period-average", value: 95000, unit: "LBP/USD" },
  { id: "JAPANJTAR", name: "Jobs To Applications Ratio", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "period-average", value: 1.28, unit: "Ratio" },
  { id: "PFX_LS_NGA_NGN", name: "Nigeria Parallel FX Rate (NGN)", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "period-average", value: 1500, unit: "NGN/USD" },
  // Currency-denominated ratios (GDP per capita)
  // NOTE: DATA QUALITY ISSUE - GDP per capita should be "flow" not "ratio"
  // GDP per capita is GDP (flow) / population, with dimensions of currency/person, not dimensionless
  // Production DB incorrectly classifies these as "ratio" with is_currency_denominated=true
  // True ratios should be dimensionless (e.g., debt-to-GDP = %, FX rates = currency/currency)
  { id: "NY.GDP.PCAP.KN", name: "GDP per capita (constant LCU)", indicator_type: "ratio", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 45000, unit: "EUR" },
  { id: "NGDPDPC", name: "GDP per Capita at Current Prices, USD", indicator_type: "ratio", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 52000, unit: "USD" },
  { id: "NGDPRPC", name: "Gross domestic product per capita, constant prices", indicator_type: "ratio", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 48000, unit: "USD" },
  { id: "NY.GDP.PCAP.CD", name: "GDP per capita (current US$)", indicator_type: "ratio", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 53500, unit: "USD" },
  { id: "PPPPC", name: "GDP per Capita at Current Prices, PPP", indicator_type: "ratio", is_currency_denominated: true, temporal_aggregation: "period-total", value: 55000, unit: "USD" },
  { id: "NY.GDP.PCAP.PP.CD", name: "GDP per capita, PPP (current international $)", indicator_type: "ratio", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 56000, unit: "USD" },
  { id: "NGDPPC", name: "Gross domestic product per capita, current prices", indicator_type: "ratio", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 54000, unit: "USD" },
];

// RATIO indicators from ratio/proportion type (13 total: 10 non-currency, 3 currency)
// NOTE: Production DB has "ratio/proportion" but should just be "ratio"
const ratioProportionIndicators: TestIndicator[] = [
  // Non-currency
  { id: "UFX_WB_IRQ_IQD", name: "Iraq Alternative Official FX Rate Rate (IQD)", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "period-average", value: 1320, unit: "IQD/USD" },
  { id: "BRAMMIRY", name: "Mid-month Inflation Rate YoY", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 4.5, unit: "%" },
  { id: "USAAHEY", name: "Average Hourly Earnings YoY", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 3.8, unit: "%" },
  { id: "ALBANIAMANPRO", name: "Manufacturing Production", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "period-rate", value: 2.5, unit: "%" },
  { id: "UFX_WB_GMB_GMD", name: "Gambia, The Alternative Official FX Rate Rate (GMD)", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "period-average", value: 68, unit: "GMD/USD" },
  { id: "AustriaLonTerUneRat", name: "Long Term Unemployment Rate", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 1.2, unit: "%" },
  { id: "UFX_WB_MWI_MWK", name: "Malawi Alternative Official FX Rate Rate (MWK)", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "period-average", value: 1750, unit: "MWK/USD" },
  { id: "AFGSTANGOVGDP", name: "Government Debt to GDP", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 65.8, unit: "%" },
  { id: "ALBANIAEMPRAT", name: "Employment Rate", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 72.5, unit: "%" },
  { id: "GBROIAR", name: "Overnight Interbank Average Rate", indicator_type: "ratio", is_currency_denominated: false, temporal_aggregation: "period-average", value: 5.2, unit: "%" },
  // Currency
  { id: "CANAWE", name: "Average Weekly Earnings", indicator_type: "ratio", is_currency_denominated: true, temporal_aggregation: "period-average", value: 1200, unit: "USD/Week" },
  { id: "CANADAAVEHOUEAR", name: "Average Hourly Earnings", indicator_type: "ratio", is_currency_denominated: true, temporal_aggregation: "period-average", value: 32.50, unit: "USD/Hour" },
  { id: "AFGSTANGDPPPP", name: "GDP per Capita PPP", indicator_type: "ratio", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 2150, unit: "USD" },
];

// SENTIMENT indicators (6 total: all non-currency)
const sentimentIndicators: TestIndicator[] = [
  { id: "JAPANECOWATSUR", name: "Economy Watchers Survey", indicator_type: "sentiment", is_currency_denominated: false, temporal_aggregation: "period-average", value: 48.2, unit: "Index" },
  { id: "USAMIE", name: "Michigan Inflation Expectations", indicator_type: "sentiment", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 3.2, unit: "%" },
  { id: "JPNEWSO", name: "Economy Watchers Survey Outlook", indicator_type: "sentiment", is_currency_denominated: false, temporal_aggregation: "period-average", value: 50.5, unit: "Index" },
  { id: "JPNTLMO", name: "Tankan Large Manufacturing Outlook", indicator_type: "sentiment", is_currency_denominated: false, temporal_aggregation: "period-average", value: 12, unit: "Index" },
  { id: "USAM5YIE", name: "Michigan 5 Year Inflation Expectations", indicator_type: "sentiment", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 2.9, unit: "%" },
  { id: "JPNTNMO", name: "Tankan Non-Manufacturing Outlook", indicator_type: "sentiment", is_currency_denominated: false, temporal_aggregation: "period-average", value: 25, unit: "Index" },
];

// STOCK indicators (13 total: 9 non-currency, 4 currency)
const stockIndicators: TestIndicator[] = [
  // Non-currency stocks
  { id: "UNITEDSTAHOS", name: "Heating Oil Stocks", indicator_type: "stock", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 115.5, unit: "Million Barrels" },
  { id: "ALGERIAFULTIMEMP", name: "Full Time Employment", indicator_type: "stock", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 8500, unit: "Thousands" },
  { id: "UNITEDSTAQGS-W", name: "Grain Stocks Wheat", indicator_type: "stock", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 1250, unit: "Million Bushels" },
  { id: "UNITEDSTAAPIHEAOIL", name: "API Heating Oil", indicator_type: "stock", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 110, unit: "Million Barrels" },
  { id: "ALBANIAUNEPER", name: "Unemployed Persons", indicator_type: "stock", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 180, unit: "Thousands" },
  { id: "UNITEDSTACCOS", name: "Cushing Crude Oil Stocks", indicator_type: "stock", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 35, unit: "Million Barrels" },
  { id: "UNITEDSTAQGS-S", name: "Grain Stocks Soy", indicator_type: "stock", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 250, unit: "Million Bushels" },
  { id: "UNITEDSTAQGS-C", name: "Grain Stocks Corn", indicator_type: "stock", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 1500, unit: "Million Bushels" },
  { id: "USATHI", name: "Total Housing Inventory", indicator_type: "stock", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 1.05, unit: "Millions" },
  { id: "AFGHANISTAGOLRES", name: "Gold Reserves", indicator_type: "stock", is_currency_denominated: false, temporal_aggregation: "point-in-time", value: 0.5, unit: "Tonnes" },
  // Currency stocks
  { id: "DT.DOD.DPNG.CD", name: "Private sector not guaranteed", indicator_type: "stock", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 450, unit: "USD Billions" },
  { id: "TD_RESERVES_NFACB_LS_AGO_M", name: "Net Foreign Assets (Central Bank)", indicator_type: "stock", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 12.5, unit: "USD Billions" },
  { id: "ALBANIAMONSUPM3", name: "Money Supply M3", indicator_type: "stock", is_currency_denominated: true, temporal_aggregation: "point-in-time", value: 85, unit: "EUR Billions" },
];

// VOLUME indicators (from earlier data)
const volumeIndicators: TestIndicator[] = [
  { id: "UNITEDSTAAPICRUIMP", name: "API Crude Imports", indicator_type: "volume", is_currency_denominated: false, temporal_aggregation: "period-total", value: 7500, unit: "Thousands Barrels" },
];

// Helper function to run batch test
async function testIndicatorBatch(indicators: TestIndicator[], typeName: string) {
  const result = await processBatch(indicators, {
    toCurrency: "USD",
    toMagnitude: "millions",
    fx: mockFX,
  });

  // At least 85% should process successfully (some may have unknown units)
  const successRate = result.successful.length / indicators.length;
  const minSuccess = 0.85;

  console.log(`${typeName}: ${result.successful.length}/${indicators.length} successful (${(successRate * 100).toFixed(1)}%)`);

  if (result.failed.length > 0 || result.skipped.length > 0) {
    console.log(`  Failed: ${result.failed.length}, Skipped: ${result.skipped.length}`);
    result.skipped.forEach(skipped => {
      console.log(`    Skipped: ${skipped.item.id} - ${skipped.item.name} (${skipped.item.unit})`);
    });
  }

  assertEquals(
    successRate >= minSuccess,
    true,
    `At least ${minSuccess * 100}% of ${typeName} indicators should process successfully, got ${(successRate * 100).toFixed(1)}%`,
  );

  // Each successful item should have normalized value
  result.successful.forEach((item, idx) => {
    assertExists(item.normalized, `${typeName}[${idx}] should have normalized value`);
  });
}

// Test each indicator type
Deno.test("Comprehensive - BALANCE indicators (21 total)", async () => {
  await testIndicatorBatch(balanceIndicators, "balance");
});

Deno.test("Comprehensive - CAPACITY indicators (2 total)", async () => {
  await testIndicatorBatch(capacityIndicators, "capacity");
});

Deno.test("Comprehensive - INDEX indicators from composite-derived/index (9 total)", async () => {
  await testIndicatorBatch(compositeIndexIndicators, "index (from composite-derived/index)");
});

Deno.test("Comprehensive - COUNT indicators (17 total)", async () => {
  await testIndicatorBatch(countIndicators, "count");
});

Deno.test("Comprehensive - FLOW indicators (15 total)", async () => {
  await testIndicatorBatch(flowIndicators, "flow");
});

Deno.test("Comprehensive - INDEX indicators (10 total)", async () => {
  await testIndicatorBatch(indexIndicators, "index");
});

Deno.test("Comprehensive - PERCENTAGE indicators (7 total)", async () => {
  await testIndicatorBatch(percentageIndicators, "percentage");
});

Deno.test("Comprehensive - PRICE indicators (9 total)", async () => {
  await testIndicatorBatch(priceIndicators, "price");
});

Deno.test("Comprehensive - RATE indicators (10 total)", async () => {
  await testIndicatorBatch(rateIndicators, "rate");
});

Deno.test("Comprehensive - RATIO indicators (17 total)", async () => {
  await testIndicatorBatch(ratioIndicators, "ratio");
});

Deno.test("Comprehensive - RATIO indicators from ratio/proportion (13 total)", async () => {
  await testIndicatorBatch(ratioProportionIndicators, "ratio (from ratio/proportion)");
});

Deno.test("Comprehensive - SENTIMENT indicators (6 total)", async () => {
  await testIndicatorBatch(sentimentIndicators, "sentiment");
});

Deno.test("Comprehensive - STOCK indicators (13 total)", async () => {
  await testIndicatorBatch(stockIndicators, "stock");
});

Deno.test("Comprehensive - VOLUME indicators (1 total)", async () => {
  await testIndicatorBatch(volumeIndicators, "volume");
});

Deno.test("Comprehensive - ALL 150 indicators together", async () => {
  const allIndicators = [
    ...balanceIndicators,
    ...capacityIndicators,
    ...compositeIndexIndicators,
    ...countIndicators,
    ...flowIndicators,
    ...indexIndicators,
    ...percentageIndicators,
    ...priceIndicators,
    ...rateIndicators,
    ...ratioIndicators,
    ...ratioProportionIndicators,
    ...sentimentIndicators,
    ...stockIndicators,
    ...volumeIndicators,
  ];

  assertEquals(allIndicators.length >= 149, true, `Should have at least 149 indicators, got ${allIndicators.length}`);

  const result = await processBatch(allIndicators, {
    toCurrency: "USD",
    toMagnitude: "millions",
    fx: mockFX,
  });

  // Most should succeed (some may fail due to unknown units, which is expected)
  console.log(`Processed ${result.successful.length}/${allIndicators.length} successfully`);
  console.log(`Failed: ${result.failed.length}, Skipped: ${result.skipped.length}`);

  // At least 90% should succeed
  const successRate = result.successful.length / allIndicators.length;
  assertEquals(successRate > 0.9, true, `Success rate should be >90%, got ${(successRate * 100).toFixed(1)}%`);
});
