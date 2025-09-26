/**
 * Comprehensive Synthetic Test Fixtures
 *
 * Generated synthetic data covering all domains, unit combinations,
 * edge cases, and boundary conditions for thorough V2 testing.
 *
 * Organized by:
 * 1. Monetary indicators (stocks vs flows)
 * 2. Physical domain indicators
 * 3. Abstract domain indicators
 * 4. Edge cases and unusual formats
 * 5. Stress test datasets (large scale)
 */

import type { ParsedData } from "../shared/types.ts";
import { FixtureData } from "./indicators-organized.ts";

// ============================================================================
// SECTION 1: MONETARY DOMAIN SYNTHETIC DATA
// ============================================================================

/**
 * Comprehensive monetary stock indicators
 * Testing: GDP, debt, reserves, market caps, asset values
 */
export const syntheticMonetaryStocks: FixtureData[] = [
  // Major currencies with all magnitude combinations
  {
    id: "gdp_usd_k",
    value: 25000000,
    unit: "USD Thousand",
    name: "GDP (Small Economy)",
    category_group: "Economic Output",
  },
  {
    id: "gdp_usd_m",
    value: 25000,
    unit: "USD Million",
    name: "GDP (Medium Economy)",
    category_group: "Economic Output",
  },
  {
    id: "gdp_usd_b",
    value: 25,
    unit: "USD Billion",
    name: "GDP (Large Economy)",
    category_group: "Economic Output",
  },
  {
    id: "gdp_usd_t",
    value: 0.025,
    unit: "USD Trillion",
    name: "GDP (Superpower)",
    category_group: "Economic Output",
  },

  {
    id: "debt_eur_k",
    value: 5000000,
    unit: "EUR Thousand",
    name: "National Debt (Small)",
    currency_code: "EUR",
  },
  {
    id: "debt_eur_m",
    value: 5000,
    unit: "EUR Million",
    name: "National Debt (Medium)",
    currency_code: "EUR",
  },
  {
    id: "debt_eur_b",
    value: 5,
    unit: "EUR Billion",
    name: "National Debt (Large)",
    currency_code: "EUR",
  },

  {
    id: "reserves_gbp_m",
    value: 1500,
    unit: "GBP Million",
    name: "Foreign Reserves",
    currency_code: "GBP",
  },
  {
    id: "reserves_jpy_b",
    value: 120,
    unit: "JPY Billion",
    name: "Central Bank Reserves",
    currency_code: "JPY",
  },

  // Emerging market currencies
  {
    id: "budget_ngn_b",
    value: 15,
    unit: "NGN Billion",
    name: "Government Budget",
    currency_code: "NGN",
  },
  {
    id: "budget_kes_m",
    value: 850,
    unit: "KES Million",
    name: "Annual Budget",
    currency_code: "KES",
  },
  {
    id: "budget_zar_b",
    value: 2.5,
    unit: "ZAR Billion",
    name: "Fiscal Budget",
    currency_code: "ZAR",
  },
  {
    id: "budget_brl_m",
    value: 1200,
    unit: "BRL Million",
    name: "Public Spending",
    currency_code: "BRL",
  },
  {
    id: "budget_inr_b",
    value: 45,
    unit: "INR Billion",
    name: "Union Budget",
    currency_code: "INR",
  },

  // Asian currencies
  {
    id: "market_cap_cny_b",
    value: 85,
    unit: "CNY Billion",
    name: "Stock Market Cap",
    currency_code: "CNY",
  },
  {
    id: "market_cap_krw_t",
    value: 0.15,
    unit: "KRW Trillion",
    name: "Total Market Value",
    currency_code: "KRW",
  },
  {
    id: "market_cap_hkd_b",
    value: 3.2,
    unit: "HKD Billion",
    name: "Exchange Market Cap",
    currency_code: "HKD",
  },

  // Alternative formats and edge cases
  {
    id: "assets_usd_mil_cap",
    value: 750,
    unit: "USD Million",
    name: "Total Assets",
    category_group: "Financial Assets",
  },
  {
    id: "liabilities_eur_thou",
    value: 450000,
    unit: "EUR Thousand",
    name: "Total Liabilities",
    currency_code: "EUR",
  },
  {
    id: "equity_chf_m",
    value: 320,
    unit: "CHF Million",
    name: "Shareholders Equity",
    currency_code: "CHF",
  },
];

/**
 * Comprehensive monetary flow indicators
 * Testing: Wages, income, revenue, expenditure (with time periods)
 */
export const syntheticMonetaryFlows: FixtureData[] = [
  // Wages in all time periods and currencies
  {
    id: "wage_usd_hour",
    value: 25,
    unit: "USD per hour",
    name: "Hourly Wage",
    periodicity: "Daily",
  },
  {
    id: "wage_usd_day",
    value: 200,
    unit: "USD per day",
    name: "Daily Wage",
    periodicity: "Daily",
  },
  {
    id: "wage_usd_week",
    value: 1000,
    unit: "USD per week",
    name: "Weekly Wage",
    periodicity: "Weekly",
  },
  {
    id: "wage_usd_month",
    value: 4500,
    unit: "USD per month",
    name: "Monthly Salary",
    periodicity: "Monthly",
  },
  {
    id: "wage_usd_quarter",
    value: 13500,
    unit: "USD per quarter",
    name: "Quarterly Compensation",
    periodicity: "Quarterly",
  },
  {
    id: "wage_usd_year",
    value: 54000,
    unit: "USD per year",
    name: "Annual Salary",
    periodicity: "Yearly",
  },

  {
    id: "wage_eur_hour",
    value: 22,
    unit: "EUR per hour",
    name: "European Wage",
    currency_code: "EUR",
  },
  {
    id: "wage_eur_week",
    value: 880,
    unit: "EUR per week",
    name: "Weekly Salary (EUR)",
    currency_code: "EUR",
  },
  {
    id: "wage_eur_month",
    value: 3800,
    unit: "EUR per month",
    name: "Monthly Salary (EUR)",
    currency_code: "EUR",
  },

  {
    id: "wage_gbp_day",
    value: 160,
    unit: "GBP per day",
    name: "Daily Rate (GBP)",
    currency_code: "GBP",
  },
  {
    id: "wage_gbp_month",
    value: 3500,
    unit: "GBP per month",
    name: "UK Salary",
    currency_code: "GBP",
  },

  // Asian wage patterns
  {
    id: "wage_jpy_hour",
    value: 1500,
    unit: "JPY per hour",
    name: "Japanese Hourly Rate",
    currency_code: "JPY",
  },
  {
    id: "wage_jpy_month",
    value: 280000,
    unit: "JPY per month",
    name: "Japanese Monthly Salary",
    currency_code: "JPY",
  },
  {
    id: "wage_cny_month",
    value: 8500,
    unit: "CNY per month",
    name: "Chinese Monthly Wage",
    currency_code: "CNY",
  },
  {
    id: "wage_krw_month",
    value: 3200000,
    unit: "KRW per month",
    name: "Korean Monthly Salary",
    currency_code: "KRW",
  },

  // Emerging market wages
  {
    id: "wage_ngn_month",
    value: 125000,
    unit: "NGN per month",
    name: "Nigerian Monthly Wage",
    currency_code: "NGN",
  },
  {
    id: "wage_kes_month",
    value: 55000,
    unit: "KES per month",
    name: "Kenyan Monthly Salary",
    currency_code: "KES",
  },
  {
    id: "wage_zar_month",
    value: 18500,
    unit: "ZAR per month",
    name: "South African Wage",
    currency_code: "ZAR",
  },
  {
    id: "wage_brl_month",
    value: 2200,
    unit: "BRL per month",
    name: "Brazilian Monthly Salary",
    currency_code: "BRL",
  },
  {
    id: "wage_inr_month",
    value: 35000,
    unit: "INR per month",
    name: "Indian Monthly Wage",
    currency_code: "INR",
  },

  // Revenue streams with magnitudes
  {
    id: "revenue_usd_mil_year",
    value: 150,
    unit: "USD Million per year",
    name: "Annual Revenue",
    scale: "Millions",
  },
  {
    id: "revenue_eur_bil_quarter",
    value: 2.5,
    unit: "EUR Billion per quarter",
    name: "Quarterly Revenue",
    currency_code: "EUR",
    scale: "Billions",
  },
  {
    id: "income_gbp_k_month",
    value: 850,
    unit: "GBP Thousand per month",
    name: "Monthly Income",
    currency_code: "GBP",
    scale: "Thousands",
  },

  // Government spending flows
  {
    id: "spending_usd_bil_year",
    value: 12.5,
    unit: "USD Billion per year",
    name: "Government Spending",
    scale: "Billions",
  },
  {
    id: "expenditure_eur_m_quarter",
    value: 450,
    unit: "EUR Million per quarter",
    name: "Public Expenditure",
    currency_code: "EUR",
    scale: "Millions",
  },

  // Investment flows
  {
    id: "investment_jpy_bil_year",
    value: 0.85,
    unit: "JPY Billion per year",
    name: "Foreign Investment",
    currency_code: "JPY",
    scale: "Billions",
  },
  {
    id: "funding_cny_m_month",
    value: 125,
    unit: "CNY Million per month",
    name: "Development Funding",
    currency_code: "CNY",
    scale: "Millions",
  },
];

// ============================================================================
// SECTION 2: COUNTS DOMAIN SYNTHETIC DATA
// ============================================================================

export const syntheticCounts: FixtureData[] = [
  // Population counts
  {
    id: "pop_total",
    value: 50000000,
    unit: "persons",
    name: "Total Population",
    category_group: "Demographics",
  },
  {
    id: "pop_urban",
    value: 32000000,
    unit: "people",
    name: "Urban Population",
    category_group: "Demographics",
  },
  {
    id: "pop_rural",
    value: 18000000,
    unit: "individuals",
    name: "Rural Population",
    category_group: "Demographics",
  },

  // Households and housing
  {
    id: "households_total",
    value: 15000000,
    unit: "households",
    name: "Total Households",
    category_group: "Housing",
  },
  {
    id: "houses_built",
    value: 125000,
    unit: "units",
    name: "Houses Built",
    category_group: "Construction",
  },
  {
    id: "apartments",
    value: 85000,
    unit: "dwellings",
    name: "Apartment Units",
    category_group: "Housing",
  },

  // Vehicles and transport
  {
    id: "cars_registered",
    value: 8500000,
    unit: "vehicles",
    name: "Registered Cars",
    category_group: "Transport",
  },
  {
    id: "trucks_commercial",
    value: 450000,
    unit: "trucks",
    name: "Commercial Trucks",
    category_group: "Transport",
  },
  {
    id: "motorcycles",
    value: 2100000,
    unit: "motorbikes",
    name: "Registered Motorcycles",
    category_group: "Transport",
  },

  // Employment and workforce
  {
    id: "workers_total",
    value: 28000000,
    unit: "workers",
    name: "Total Workforce",
    category_group: "Employment",
  },
  {
    id: "unemployed",
    value: 2100000,
    unit: "persons",
    name: "Unemployed Persons",
    category_group: "Employment",
  },
  {
    id: "students_enrolled",
    value: 12000000,
    unit: "students",
    name: "Enrolled Students",
    category_group: "Education",
  },

  // Healthcare counts
  {
    id: "doctors_total",
    value: 85000,
    unit: "doctors",
    name: "Medical Doctors",
    category_group: "Healthcare",
  },
  {
    id: "nurses_registered",
    value: 245000,
    unit: "nurses",
    name: "Registered Nurses",
    category_group: "Healthcare",
  },
  {
    id: "hospitals",
    value: 1250,
    unit: "facilities",
    name: "Hospital Facilities",
    category_group: "Healthcare",
  },

  // Infrastructure counts
  {
    id: "schools_primary",
    value: 15000,
    unit: "schools",
    name: "Primary Schools",
    category_group: "Education",
  },
  {
    id: "schools_secondary",
    value: 8500,
    unit: "institutions",
    name: "Secondary Schools",
    category_group: "Education",
  },
  {
    id: "universities",
    value: 450,
    unit: "universities",
    name: "Higher Education Institutions",
    category_group: "Education",
  },

  // Business and enterprise
  {
    id: "companies_registered",
    value: 125000,
    unit: "companies",
    name: "Registered Companies",
    category_group: "Business",
  },
  {
    id: "startups_new",
    value: 8500,
    unit: "startups",
    name: "New Startups",
    category_group: "Business",
  },
  {
    id: "factories_operational",
    value: 2800,
    unit: "factories",
    name: "Operating Factories",
    category_group: "Industry",
  },

  // Technology and digital
  {
    id: "internet_users",
    value: 42000000,
    unit: "users",
    name: "Internet Users",
    category_group: "Technology",
  },
  {
    id: "mobile_subscribers",
    value: 55000000,
    unit: "subscribers",
    name: "Mobile Subscribers",
    category_group: "Technology",
  },
  {
    id: "broadband_connections",
    value: 18000000,
    unit: "connections",
    name: "Broadband Connections",
    category_group: "Technology",
  },

  // Agricultural counts
  {
    id: "farms_total",
    value: 850000,
    unit: "farms",
    name: "Agricultural Farms",
    category_group: "Agriculture",
  },
  {
    id: "livestock_cattle",
    value: 12500000,
    unit: "cattle",
    name: "Cattle Population",
    category_group: "Livestock",
  },
  {
    id: "livestock_sheep",
    value: 8500000,
    unit: "sheep",
    name: "Sheep Population",
    category_group: "Livestock",
  },

  // With magnitude scaling
  {
    id: "items_million",
    value: 2.5,
    unit: "Million items",
    name: "Mass Produced Items",
    scale: "Millions",
  },
  {
    id: "components_thousand",
    value: 850,
    unit: "Thousand components",
    name: "Electronic Components",
    scale: "Thousands",
  },
  {
    id: "units_billion",
    value: 1.2,
    unit: "Billion units",
    name: "Consumer Units",
    scale: "Billions",
  },
];

// ============================================================================
// SECTION 3: PERCENTAGES DOMAIN SYNTHETIC DATA
// ============================================================================

export const syntheticPercentages: FixtureData[] = [
  // Standard percentages
  {
    id: "unemployment_rate",
    value: 5.2,
    unit: "percent",
    name: "Unemployment Rate",
    category_group: "Labor Market",
  },
  {
    id: "inflation_rate",
    value: 3.1,
    unit: "%",
    name: "Inflation Rate",
    category_group: "Economic Indicators",
  },
  {
    id: "gdp_growth",
    value: 2.8,
    unit: "percentage",
    name: "GDP Growth Rate",
    category_group: "Economic Growth",
  },

  // Percentage points
  {
    id: "interest_change",
    value: 0.75,
    unit: "percentage points",
    name: "Interest Rate Change",
    category_group: "Monetary Policy",
  },
  {
    id: "policy_adjustment",
    value: -0.25,
    unit: "pp",
    name: "Policy Rate Adjustment",
    category_group: "Monetary Policy",
  },
  {
    id: "spread_change",
    value: 1.2,
    unit: "percentage points",
    name: "Yield Spread Change",
    category_group: "Financial Markets",
  },

  // Basis points
  {
    id: "bond_yield_change",
    value: 25,
    unit: "basis points",
    name: "Bond Yield Change",
    category_group: "Fixed Income",
  },
  {
    id: "credit_spread",
    value: 150,
    unit: "bps",
    name: "Credit Spread",
    category_group: "Credit Markets",
  },
  {
    id: "fx_volatility",
    value: 75,
    unit: "basis points",
    name: "FX Volatility",
    category_group: "Currency Markets",
  },

  // Relative percentages
  {
    id: "debt_to_gdp",
    value: 65.5,
    unit: "percent of GDP",
    name: "Debt-to-GDP Ratio",
    category_group: "Fiscal Indicators",
  },
  {
    id: "tax_revenue_gdp",
    value: 18.2,
    unit: "% of GDP",
    name: "Tax Revenue as % GDP",
    category_group: "Fiscal Indicators",
  },
  {
    id: "exports_gdp",
    value: 22.8,
    unit: "percentage of GDP",
    name: "Exports as % GDP",
    category_group: "Trade",
  },

  // Population percentages
  {
    id: "literacy_rate",
    value: 94.5,
    unit: "percent",
    name: "Adult Literacy Rate",
    category_group: "Education",
  },
  {
    id: "urbanization",
    value: 68.2,
    unit: "%",
    name: "Urbanization Rate",
    category_group: "Demographics",
  },
  {
    id: "poverty_rate",
    value: 12.1,
    unit: "percent",
    name: "Poverty Rate",
    category_group: "Social Indicators",
  },

  // Market percentages
  {
    id: "market_share",
    value: 15.8,
    unit: "percent",
    name: "Market Share",
    category_group: "Business",
  },
  {
    id: "profit_margin",
    value: 8.5,
    unit: "%",
    name: "Profit Margin",
    category_group: "Financial Performance",
  },
  {
    id: "roe",
    value: 12.3,
    unit: "percent",
    name: "Return on Equity",
    category_group: "Financial Ratios",
  },

  // Health and social percentages
  {
    id: "vaccination_rate",
    value: 85.6,
    unit: "percent",
    name: "Vaccination Coverage",
    category_group: "Public Health",
  },
  {
    id: "insurance_coverage",
    value: 91.2,
    unit: "%",
    name: "Health Insurance Coverage",
    category_group: "Healthcare",
  },
  {
    id: "enrollment_rate",
    value: 98.7,
    unit: "percent",
    name: "School Enrollment Rate",
    category_group: "Education",
  },

  // Environmental percentages
  {
    id: "renewable_energy",
    value: 35.2,
    unit: "percent",
    name: "Renewable Energy Share",
    category_group: "Energy",
  },
  {
    id: "recycling_rate",
    value: 42.8,
    unit: "%",
    name: "Recycling Rate",
    category_group: "Environment",
  },
  {
    id: "forest_cover",
    value: 31.5,
    unit: "percentage",
    name: "Forest Cover",
    category_group: "Environment",
  },
];

// ============================================================================
// SECTION 4: INDICES DOMAIN SYNTHETIC DATA
// ============================================================================

export const syntheticIndices: FixtureData[] = [
  // Stock market indices
  {
    id: "stock_index_main",
    value: 2850.5,
    unit: "points",
    name: "Main Stock Index",
    category_group: "Financial Markets",
  },
  {
    id: "stock_index_tech",
    value: 4250.8,
    unit: "Points",
    name: "Technology Index",
    category_group: "Sector Indices",
  },
  {
    id: "stock_index_small",
    value: 1650.2,
    unit: "index points",
    name: "Small Cap Index",
    category_group: "Market Indices",
  },

  // Economic indices
  {
    id: "consumer_confidence",
    value: 105.2,
    unit: "index",
    name: "Consumer Confidence Index",
    category_group: "Economic Sentiment",
  },
  {
    id: "business_sentiment",
    value: 98.7,
    unit: "Index",
    name: "Business Sentiment Index",
    category_group: "Business Confidence",
  },
  {
    id: "leading_indicators",
    value: 112.5,
    unit: "composite index",
    name: "Leading Economic Indicators",
    category_group: "Economic Forecasting",
  },

  // Price indices (CPI variants)
  {
    id: "cpi_all_items",
    value: 285.6,
    unit: "index",
    name: "Consumer Price Index",
    category_group: "Price Indices",
  },
  {
    id: "cpi_core",
    value: 278.2,
    unit: "Index",
    name: "Core CPI",
    category_group: "Price Indices",
  },
  {
    id: "ppi_finished",
    value: 195.8,
    unit: "index points",
    name: "Producer Price Index",
    category_group: "Wholesale Prices",
  },

  // Commodity indices
  {
    id: "commodity_index_broad",
    value: 145.2,
    unit: "points",
    name: "Broad Commodity Index",
    category_group: "Commodity Markets",
  },
  {
    id: "energy_index",
    value: 165.8,
    unit: "Index",
    name: "Energy Price Index",
    category_group: "Energy Markets",
  },
  {
    id: "metals_index",
    value: 125.5,
    unit: "index",
    name: "Metals Price Index",
    category_group: "Metals Markets",
  },

  // Housing indices
  {
    id: "house_price_index",
    value: 325.6,
    unit: "index",
    name: "House Price Index",
    category_group: "Real Estate",
  },
  {
    id: "rent_index",
    value: 185.2,
    unit: "Index",
    name: "Rental Price Index",
    category_group: "Housing Costs",
  },
  {
    id: "construction_cost",
    value: 245.8,
    unit: "points",
    name: "Construction Cost Index",
    category_group: "Construction",
  },

  // Labor market indices
  {
    id: "wage_index",
    value: 135.2,
    unit: "index",
    name: "Average Wage Index",
    category_group: "Labor Costs",
  },
  {
    id: "employment_index",
    value: 98.5,
    unit: "Index",
    name: "Employment Conditions Index",
    category_group: "Employment",
  },
  {
    id: "productivity_index",
    value: 118.7,
    unit: "points",
    name: "Labor Productivity Index",
    category_group: "Productivity",
  },

  // International competitiveness
  {
    id: "competitiveness_index",
    value: 75.2,
    unit: "index",
    name: "Global Competitiveness Index",
    category_group: "International Rankings",
  },
  {
    id: "corruption_index",
    value: 45.8,
    unit: "Index",
    name: "Corruption Perceptions Index",
    category_group: "Governance",
  },
  {
    id: "innovation_index",
    value: 68.5,
    unit: "points",
    name: "Innovation Index",
    category_group: "Technology",
  },

  // Alternative index formats
  {
    id: "volatility_vix",
    value: 18.5,
    unit: "VIX points",
    name: "Volatility Index",
    category_group: "Risk Measures",
  },
  {
    id: "dollar_index",
    value: 102.8,
    unit: "DXY",
    name: "US Dollar Index",
    category_group: "Currency Indices",
  },
];

// ============================================================================
// SECTION 5: PHYSICAL DOMAINS SYNTHETIC DATA
// ============================================================================

export const syntheticPhysical: FixtureData[] = [
  // Energy domain
  {
    id: "electricity_gwh",
    value: 150.5,
    unit: "GWh",
    name: "Electricity Generation",
    category_group: "Energy Production",
  },
  {
    id: "electricity_long",
    value: 150.5,
    unit: "Gigawatt-hour",
    name: "Power Generation",
    category_group: "Energy",
  },
  {
    id: "electricity_mwh",
    value: 150500,
    unit: "MWh",
    name: "Monthly Generation",
    category_group: "Power",
  },
  {
    id: "gas_consumption",
    value: 25.8,
    unit: "Bcf",
    name: "Natural Gas Consumption",
    category_group: "Energy Consumption",
  },
  {
    id: "oil_reserves",
    value: 125.5,
    unit: "million barrels",
    name: "Oil Reserves",
    category_group: "Energy Resources",
  },
  {
    id: "renewable_capacity",
    value: 85.2,
    unit: "GW",
    name: "Renewable Capacity",
    category_group: "Clean Energy",
  },
  {
    id: "coal_production",
    value: 450.8,
    unit: "million tons",
    name: "Coal Production",
    category_group: "Fossil Fuels",
  },

  // Commodities domain
  {
    id: "oil_production",
    value: 2.5,
    unit: "million barrels per day",
    name: "Oil Production",
    category_group: "Oil & Gas",
  },
  {
    id: "oil_short",
    value: 2500,
    unit: "BBL/D/1K",
    name: "Daily Oil Output",
    category_group: "Energy Production",
  },
  {
    id: "gas_reserves",
    value: 85.2,
    unit: "Tcf",
    name: "Natural Gas Reserves",
    category_group: "Gas Resources",
  },
  {
    id: "lng_exports",
    value: 15.8,
    unit: "MTPA",
    name: "LNG Export Capacity",
    category_group: "Gas Trade",
  },

  // Agriculture domain
  {
    id: "wheat_production",
    value: 850.5,
    unit: "thousand tonnes",
    name: "Wheat Production",
    category_group: "Grain Production",
  },
  {
    id: "rice_harvest",
    value: 1250.8,
    unit: "Tonnes",
    name: "Rice Harvest",
    category_group: "Food Production",
  },
  {
    id: "corn_yield",
    value: 2150.2,
    unit: "tons",
    name: "Corn Yield",
    category_group: "Crop Production",
  },
  {
    id: "coffee_exports",
    value: 125.5,
    unit: "thousand bags",
    name: "Coffee Exports",
    category_group: "Agricultural Trade",
  },
  {
    id: "sugar_production",
    value: 85.8,
    unit: "million tons",
    name: "Sugar Production",
    category_group: "Food Processing",
  },
  {
    id: "farmland_area",
    value: 15250,
    unit: "hectares",
    name: "Agricultural Land",
    category_group: "Land Use",
  },
  {
    id: "cattle_inventory",
    value: 2.5,
    unit: "million head",
    name: "Cattle Inventory",
    category_group: "Livestock",
  },

  // Metals domain
  {
    id: "gold_production",
    value: 125.5,
    unit: "tonnes",
    name: "Gold Production",
    category_group: "Precious Metals",
  },
  {
    id: "silver_output",
    value: 850.2,
    unit: "tons",
    name: "Silver Output",
    category_group: "Precious Metals",
  },
  {
    id: "copper_mining",
    value: 1250.8,
    unit: "thousand tonnes",
    name: "Copper Mining",
    category_group: "Industrial Metals",
  },
  {
    id: "iron_ore",
    value: 2500.5,
    unit: "million tons",
    name: "Iron Ore Production",
    category_group: "Steel Industry",
  },
  {
    id: "aluminum_smelting",
    value: 450.2,
    unit: "thousand tons",
    name: "Aluminum Smelting",
    category_group: "Non-ferrous Metals",
  },
  {
    id: "zinc_production",
    value: 85.8,
    unit: "tonnes",
    name: "Zinc Production",
    category_group: "Base Metals",
  },

  // Environmental and emissions
  {
    id: "co2_emissions",
    value: 125.5,
    unit: "million tons CO2",
    name: "Carbon Emissions",
    category_group: "Climate",
  },
  {
    id: "co2_short",
    value: 125500,
    unit: "KT",
    name: "CO2 Emissions",
    category_group: "Environment",
  },
  {
    id: "waste_generated",
    value: 85.2,
    unit: "million tons",
    name: "Waste Generation",
    category_group: "Waste Management",
  },
  {
    id: "water_consumption",
    value: 1250.8,
    unit: "billion liters",
    name: "Water Consumption",
    category_group: "Water Resources",
  },

  // Infrastructure physical
  {
    id: "roads_total",
    value: 125000,
    unit: "km",
    name: "Total Road Network",
    category_group: "Transport Infrastructure",
  },
  {
    id: "railways",
    value: 8500,
    unit: "kilometers",
    name: "Railway Network",
    category_group: "Rail Infrastructure",
  },
  {
    id: "airports",
    value: 125,
    unit: "facilities",
    name: "Airport Facilities",
    category_group: "Aviation Infrastructure",
  },
  {
    id: "ports_capacity",
    value: 85.5,
    unit: "million TEU",
    name: "Port Capacity",
    category_group: "Maritime Infrastructure",
  },
];

// ============================================================================
// SECTION 6: RATES AND RATIOS SYNTHETIC DATA
// ============================================================================

export const syntheticRates: FixtureData[] = [
  // Price rates (currency per unit)
  {
    id: "oil_price",
    value: 85.50,
    unit: "USD per barrel",
    name: "Crude Oil Price",
    category_group: "Commodity Prices",
  },
  {
    id: "gas_price",
    value: 3.25,
    unit: "USD per gallon",
    name: "Gasoline Price",
    category_group: "Fuel Prices",
  },
  {
    id: "gold_price",
    value: 1950.25,
    unit: "USD per ounce",
    name: "Gold Price",
    category_group: "Precious Metal Prices",
  },
  {
    id: "wheat_price",
    value: 250.80,
    unit: "USD per ton",
    name: "Wheat Price",
    category_group: "Agricultural Prices",
  },

  // Exchange rates and financial rates
  {
    id: "fx_rate_eur",
    value: 1.08,
    unit: "USD per EUR",
    name: "EUR/USD Exchange Rate",
    category_group: "Foreign Exchange",
  },
  {
    id: "fx_rate_gbp",
    value: 1.25,
    unit: "USD per GBP",
    name: "GBP/USD Exchange Rate",
    category_group: "Currency Markets",
  },
  {
    id: "bond_yield_10y",
    value: 4.25,
    unit: "percent",
    name: "10-Year Bond Yield",
    category_group: "Fixed Income",
  },
  {
    id: "mortgage_rate",
    value: 6.75,
    unit: "%",
    name: "30-Year Mortgage Rate",
    category_group: "Credit Markets",
  },

  // Usage and consumption rates
  {
    id: "internet_speed",
    value: 125.5,
    unit: "Mbps",
    name: "Average Internet Speed",
    category_group: "Digital Infrastructure",
  },
  {
    id: "data_usage",
    value: 25.8,
    unit: "GB per month",
    name: "Mobile Data Usage",
    category_group: "Telecommunications",
  },
  {
    id: "fuel_efficiency",
    value: 35.2,
    unit: "miles per gallon",
    name: "Vehicle Fuel Efficiency",
    category_group: "Transportation",
  },

  // Demographic rates
  {
    id: "birth_rate",
    value: 12.5,
    unit: "per 1000 people",
    name: "Birth Rate",
    category_group: "Demographics",
  },
  {
    id: "death_rate",
    value: 8.2,
    unit: "per 1000 population",
    name: "Death Rate",
    category_group: "Vital Statistics",
  },
  {
    id: "vaccination_coverage",
    value: 850,
    unit: "doses per 100 people",
    name: "Vaccination Rate",
    category_group: "Public Health",
  },
  {
    id: "hospital_beds",
    value: 2.5,
    unit: "per 1000 inhabitants",
    name: "Hospital Bed Ratio",
    category_group: "Healthcare Infrastructure",
  },

  // Economic ratios
  {
    id: "price_earnings",
    value: 18.5,
    unit: "ratio",
    name: "Price-to-Earnings Ratio",
    category_group: "Valuation Metrics",
  },
  {
    id: "debt_equity",
    value: 0.65,
    unit: "ratio",
    name: "Debt-to-Equity Ratio",
    category_group: "Financial Ratios",
  },
  {
    id: "current_ratio",
    value: 1.85,
    unit: "times",
    name: "Current Ratio",
    category_group: "Liquidity Ratios",
  },

  // Alternative rate formats
  {
    id: "wage_hourly_eur",
    value: 22.50,
    unit: "EUR/hour",
    name: "Hourly Wage Rate",
    currency_code: "EUR",
  },
  {
    id: "rent_monthly",
    value: 1250,
    unit: "USD/month",
    name: "Average Monthly Rent",
    category_group: "Housing Costs",
  },
  {
    id: "tax_rate_corp",
    value: 25.0,
    unit: "percent",
    name: "Corporate Tax Rate",
    category_group: "Fiscal Policy",
  },
];

// ============================================================================
// SECTION 7: CRYPTO DOMAIN SYNTHETIC DATA
// ============================================================================

export const syntheticCrypto: FixtureData[] = [
  // Major cryptocurrencies
  {
    id: "bitcoin_price",
    value: 42500.50,
    unit: "USD",
    name: "Bitcoin Price",
    category_group: "Cryptocurrency Prices",
  },
  {
    id: "ethereum_price",
    value: 2850.25,
    unit: "USD",
    name: "Ethereum Price",
    category_group: "Crypto Markets",
  },
  {
    id: "bnb_price",
    value: 285.80,
    unit: "USD",
    name: "Binance Coin Price",
    category_group: "Exchange Tokens",
  },

  // Crypto market metrics
  {
    id: "btc_market_cap",
    value: 850.5,
    unit: "USD Billion",
    name: "Bitcoin Market Cap",
    scale: "Billions",
  },
  {
    id: "eth_market_cap",
    value: 325.2,
    unit: "USD Billion",
    name: "Ethereum Market Cap",
    scale: "Billions",
  },
  {
    id: "total_crypto_cap",
    value: 1650.8,
    unit: "USD Billion",
    name: "Total Crypto Market Cap",
    scale: "Billions",
  },

  // DeFi and staking
  {
    id: "eth_staked",
    value: 25.5,
    unit: "Million ETH",
    name: "Ethereum Staked",
    category_group: "Proof of Stake",
  },
  {
    id: "defi_tvl",
    value: 45.2,
    unit: "USD Billion",
    name: "DeFi Total Value Locked",
    scale: "Billions",
  },
  {
    id: "yield_farming_apy",
    value: 8.5,
    unit: "percent",
    name: "DeFi Yield Farming APY",
    category_group: "DeFi Yields",
  },

  // Mining and network metrics
  {
    id: "btc_hashrate",
    value: 450.2,
    unit: "EH/s",
    name: "Bitcoin Hash Rate",
    category_group: "Mining",
  },
  {
    id: "btc_difficulty",
    value: 65.8,
    unit: "T",
    name: "Bitcoin Mining Difficulty",
    category_group: "Network Security",
  },
  {
    id: "eth_gas_price",
    value: 25.5,
    unit: "gwei",
    name: "Ethereum Gas Price",
    category_group: "Transaction Costs",
  },

  // Alternative cryptocurrencies
  {
    id: "ada_price",
    value: 0.485,
    unit: "USD",
    name: "Cardano Price",
    category_group: "Altcoins",
  },
  {
    id: "sol_price",
    value: 85.25,
    unit: "USD",
    name: "Solana Price",
    category_group: "Smart Contract Platforms",
  },
  {
    id: "matic_price",
    value: 0.825,
    unit: "USD",
    name: "Polygon Price",
    category_group: "Layer 2 Solutions",
  },

  // Crypto trading volumes
  {
    id: "btc_volume_24h",
    value: 15.5,
    unit: "USD Billion",
    name: "Bitcoin 24h Volume",
    scale: "Billions",
  },
  {
    id: "crypto_volume_total",
    value: 85.2,
    unit: "USD Billion",
    name: "Total Crypto Volume",
    scale: "Billions",
  },
];

// ============================================================================
// SECTION 8: EDGE CASES AND UNUSUAL FORMATS
// ============================================================================

export const syntheticEdgeCases: FixtureData[] = [
  // Unusual unit formats
  {
    id: "mixed_case",
    value: 125.5,
    unit: "UsD MiLlIoN",
    name: "Mixed Case Currency",
    category_group: "Edge Cases",
  },
  {
    id: "extra_spaces",
    value: 85.2,
    unit: "  EUR   Billion  ",
    name: "Extra Spaces Unit",
    currency_code: "EUR",
  },
  {
    id: "hyphenated",
    value: 45.8,
    unit: "GBP-Million",
    name: "Hyphenated Currency",
    currency_code: "GBP",
  },

  // Complex composite units
  {
    id: "composite_complex",
    value: 25.5,
    unit: "USD per barrel per day",
    name: "Complex Rate",
    category_group: "Composite Units",
  },
  {
    id: "multi_ratio",
    value: 12.8,
    unit: "tons per hectare per year",
    name: "Agricultural Productivity",
    category_group: "Productivity Metrics",
  },
  {
    id: "efficiency_metric",
    value: 35.2,
    unit: "miles per gallon per vehicle",
    name: "Fleet Efficiency",
    category_group: "Transport Efficiency",
  },

  // Unusual scales and magnifications
  {
    id: "tiny_scale",
    value: 0.000125,
    unit: "USD Billion",
    name: "Very Small Scale",
    scale: "Billions",
  },
  {
    id: "huge_number",
    value: 125000000,
    unit: "units",
    name: "Huge Count",
    category_group: "Large Scale",
  },
  {
    id: "scientific_notation",
    value: 1.25e8,
    unit: "particles",
    name: "Scientific Notation",
    category_group: "Science",
  },

  // Ambiguous classifications
  {
    id: "ambiguous_stock_flow",
    value: 85.5,
    unit: "USD Million",
    name: "Ambiguous Indicator",
    category_group: "Unclear Classification",
  },
  {
    id: "could_be_rate",
    value: 2.5,
    unit: "percent",
    name: "Could Be Rate or Stock",
    category_group: "Classification Challenge",
  },

  // Historical and deprecated units
  {
    id: "old_currency",
    value: 1250000,
    unit: "ITL Million",
    name: "Italian Lira (Historical)",
    currency_code: "ITL",
  },
  {
    id: "deutsche_mark",
    value: 250.5,
    unit: "DEM Thousand",
    name: "Deutsche Mark (Deprecated)",
    currency_code: "DEM",
  },

  // Special numeric cases
  {
    id: "zero_value",
    value: 0,
    unit: "USD Million",
    name: "Zero Value Test",
    category_group: "Special Cases",
  },
  {
    id: "negative_value",
    value: -125.5,
    unit: "EUR Billion",
    name: "Negative Value",
    currency_code: "EUR",
  },
  {
    id: "very_small",
    value: 0.001,
    unit: "percent",
    name: "Very Small Percentage",
    category_group: "Precision Tests",
  },
  {
    id: "very_large",
    value: 999999.99,
    unit: "points",
    name: "Very Large Index",
    category_group: "Boundary Tests",
  },

  // Unicode and special characters
  {
    id: "unicode_currency",
    value: 125.5,
    unit: "€ Million",
    name: "Unicode Euro Symbol",
    currency_code: "EUR",
  },
  {
    id: "special_chars",
    value: 85.2,
    unit: "USD/€ rate",
    name: "Special Character Unit",
    category_group: "Character Tests",
  },

  // Incomplete or malformed units
  {
    id: "partial_unit",
    value: 45.8,
    unit: "Million",
    name: "Partial Unit",
    category_group: "Incomplete Data",
  },
  {
    id: "just_currency",
    value: 125.5,
    unit: "USD",
    name: "Just Currency Code",
    category_group: "Minimal Units",
  },
  {
    id: "empty_unit",
    value: 85.2,
    unit: "",
    name: "Empty Unit String",
    category_group: "Missing Data",
  },
];

// ============================================================================
// SECTION 9: STRESS TEST DATASETS
// ============================================================================

/**
 * Large-scale stress test dataset with many indicators
 * For testing performance and memory usage under load
 */
export const syntheticStressTest: FixtureData[] = [];

// Generate 1000 synthetic indicators for stress testing
for (let i = 0; i < 1000; i++) {
  const currencies = [
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "CNY",
    "INR",
    "BRL",
    "ZAR",
    "NGN",
    "KES",
  ];
  const magnitudes = ["Thousand", "Million", "Billion"];
  const timeScales = ["hour", "day", "week", "month", "quarter", "year"];
  const domains = [
    "Economic",
    "Financial",
    "Social",
    "Environmental",
    "Technical",
  ];

  const currency = currencies[i % currencies.length];
  const magnitude = magnitudes[i % magnitudes.length];
  const timeScale = timeScales[i % timeScales.length];
  const domain = domains[i % domains.length];

  // Create different types based on index
  if (i % 4 === 0) {
    // Monetary stock
    syntheticStressTest.push({
      id: `stress_stock_${i}`,
      value: 100 + (i * 1.5) % 10000,
      unit: `${currency} ${magnitude}`,
      name: `${domain} Stock Indicator ${i}`,
      currency_code: currency,
      scale: magnitude as any,
      category_group: `Stress Test ${domain}`,
    });
  } else if (i % 4 === 1) {
    // Monetary flow
    syntheticStressTest.push({
      id: `stress_flow_${i}`,
      value: 50 + (i * 0.8) % 5000,
      unit: `${currency} ${magnitude} per ${timeScale}`,
      name: `${domain} Flow Indicator ${i}`,
      currency_code: currency,
      scale: magnitude as any,
      periodicity: timeScale === "month"
        ? "Monthly"
        : timeScale === "year"
        ? "Yearly"
        : "Quarterly",
      category_group: `Stress Test ${domain}`,
    });
  } else if (i % 4 === 2) {
    // Percentage
    syntheticStressTest.push({
      id: `stress_pct_${i}`,
      value: (i * 0.1) % 100,
      unit: "percent",
      name: `${domain} Percentage ${i}`,
      category_group: `Stress Test ${domain}`,
    });
  } else {
    // Count
    syntheticStressTest.push({
      id: `stress_count_${i}`,
      value: 1000 + (i * 50) % 100000,
      unit: "units",
      name: `${domain} Count ${i}`,
      category_group: `Stress Test ${domain}`,
    });
  }
}

// ============================================================================
// COMBINED SYNTHETIC DATASETS
// ============================================================================

/**
 * All synthetic data combined for comprehensive testing
 */
export const allSyntheticData: FixtureData[] = [
  ...syntheticMonetaryStocks,
  ...syntheticMonetaryFlows,
  ...syntheticCounts,
  ...syntheticPercentages,
  ...syntheticIndices,
  ...syntheticPhysical,
  ...syntheticRates,
  ...syntheticCrypto,
  ...syntheticEdgeCases,
];

/**
 * Domain-specific collections for focused testing
 */
export const syntheticCollections = {
  monetary: [...syntheticMonetaryStocks, ...syntheticMonetaryFlows],
  abstract: [...syntheticCounts, ...syntheticPercentages, ...syntheticIndices],
  physical: [...syntheticPhysical],
  financial: [...syntheticRates, ...syntheticCrypto],
  edgeCases: [...syntheticEdgeCases],
  stressTest: [...syntheticStressTest],
};

/**
 * Curated test suites for different scenarios
 */
export const syntheticTestSuites = {
  // Quick smoke test
  smoke: [
    ...syntheticMonetaryStocks.slice(0, 3),
    ...syntheticMonetaryFlows.slice(0, 3),
    ...syntheticCounts.slice(0, 2),
    ...syntheticPercentages.slice(0, 2),
    ...syntheticIndices.slice(0, 2),
    ...syntheticPhysical.slice(0, 2),
  ],

  // Comprehensive but manageable
  comprehensive: [
    ...syntheticMonetaryStocks.slice(0, 10),
    ...syntheticMonetaryFlows.slice(0, 15),
    ...syntheticCounts.slice(0, 8),
    ...syntheticPercentages.slice(0, 8),
    ...syntheticIndices.slice(0, 6),
    ...syntheticPhysical.slice(0, 10),
    ...syntheticRates.slice(0, 6),
    ...syntheticCrypto.slice(0, 5),
    ...syntheticEdgeCases.slice(0, 5),
  ],

  // Focus on currency conversion complexity
  currencyFocus: [
    ...syntheticMonetaryStocks,
    ...syntheticMonetaryFlows,
    ...syntheticRates.filter((r) => r.unit.includes("USD") || r.currency_code),
    ...syntheticCrypto,
  ],

  // Focus on classification challenges
  classificationFocus: [
    ...syntheticEdgeCases,
    ...syntheticRates,
    ...syntheticCounts.slice(0, 5),
    ...syntheticPercentages.slice(0, 5),
  ],
};
