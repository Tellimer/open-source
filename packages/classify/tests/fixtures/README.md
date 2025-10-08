# Classification Test Fixtures

This directory contains test fixtures for the indicator classification system.
The fixtures include both synthetic and real-world data from the Tellimer
staging database.

## Overview

**Total Real Indicators**: 23 indicators from World Bank data **Countries
Covered**: 24 countries across 6 regions **Data Sources**: World Bank, commodity
markets (synthetic)

## Fixture Files

### 1. change_movement.json

**Category**: Change/Movement indicators (rate, volatility, gap)

**Real Data Indicators** (5):

- `FP.CPI.TOTL.ZG` - Inflation rate (Brazil)
- `NY.GDP.MKTP.KD.ZG` - GDP growth (Egypt)
- `BN.CAB.XOKA.GD.ZS` - Current account balance (Argentina)
- `NE.EXP.GNFS.KD.ZG` - Export growth (Vietnam)
- `NE.IMP.GNFS.KD.ZG` - Import growth (Philippines)

**Key Features**:

- Negative values (export/import growth, current account)
- COVID-19 impact (Philippines imports -16.1% in 2020)
- Volatile patterns

### 2. numeric_measurement.json

**Category**: Numeric/Measurement indicators (count, percentage, ratio, spread,
share)

**Real Data Indicators** (2):

- `SL.UEM.TOTL.ZS` - Unemployment rate (South Africa, 26-34%)
- `NY.GDP.PCAP.CD` - GDP per capita (Luxembourg, $105k-$134k)

**Key Features**:

- High unemployment showing structural challenges
- Very high GDP per capita (developed market outlier)
- Monetary ratio indicator

### 3. price_value.json

**Category**: Price/Value indicators (price, yield)

**Real Data Indicators** (3):

- `FP.CPI.TOTL` - Consumer Price Index (Ghana, Kenya, Nigeria)

**Commodity Indicators** (4 synthetic):

- `crude_oil_brent` - Brent crude oil ($72-89/barrel)
- `gold_price_spot` - Gold spot price ($2,039-2,734/oz)
- `copper_price_lme` - Copper LME price ($8,456-10,127/ton)
- `wheat_price_cbot` - Wheat CBOT price ($5.51-6.45/bushel)

**Key Features**:

- Commodity prices with realistic 2024 patterns
- All USD-denominated (is_monetary: true)
- Neutral heat map orientation
- Different volatility profiles

### 4. physical_fundamental.json

**Category**: Physical/Fundamental indicators (stock, flow, balance, capacity,
volume)

**Real Data Indicators** (9):

- `SP.POP.TOTL` - Population (Bangladesh, Indonesia, Pakistan)
- `NY.GNS.ICTR.ZS` - Gross savings (China, 43-46% of GDP)
- `GC.TAX.TOTL.CN` - Tax revenue (Turkey, hyperinflation impact)
- `DT.DOD.DECT.CD` - External debt stocks (Turkey, $400-500B)
- `GC.NLD.TOTL.GD.ZS` - Fiscal balance (Brazil, persistent deficits)
- `GC.REV.XGRT.GD.ZS` - Government revenue (Turkey, 26-31% of GDP)
- `GC.XPN.TOTL.GD.ZS` - Government expense (Brazil, 32-38% of GDP)

**Key Features**:

- Complete fiscal picture (revenue + expense = balance)
- Stock vs flow distinction
- Hyperinflation example (Turkey tax revenue 10x increase)
- COVID-19 impact (Brazil deficit -12.5% in 2020)

## Geographic Coverage

### By Region:

- **Latin America**: Argentina, Brazil (2)
- **Middle East/North Africa**: Egypt (1)
- **Sub-Saharan Africa**: Ghana, Kenya, Nigeria, South Africa (4)
- **South Asia**: Bangladesh, Pakistan (2)
- **Southeast Asia**: Indonesia, Philippines, Vietnam (3)
- **East Asia**: China (1)
- **Europe**: Luxembourg, Turkey (2)

### By Economic Profile:

- **Emerging Markets**: 21 countries
- **Developed Markets**: Luxembourg (1)
- **High Income**: Luxembourg, Turkey
- **Upper Middle Income**: Argentina, Brazil, China, Mexico, South Africa,
  Turkey
- **Lower Middle Income**: Bangladesh, Egypt, Ghana, India, Indonesia, Kenya,
  Nigeria, Pakistan, Philippines, Vietnam

## Indicator Type Distribution

### By Category:

- **Change/Movement**: 5 real + 3 synthetic = 8 indicators
- **Numeric/Measurement**: 2 real + 5 synthetic = 7 indicators
- **Price/Value**: 3 real + 4 commodity + 3 synthetic = 10 indicators
- **Physical/Fundamental**: 9 real + 7 synthetic = 16 indicators

### By Type:

- **Rate**: 6 indicators (inflation, GDP growth, export/import growth)
- **Stock**: 5 indicators (population, debt, external debt)
- **Flow**: 7 indicators (GDP, savings, tax revenue, government revenue/expense)
- **Price**: 7 indicators (CPI, commodities)
- **Balance**: 2 indicators (trade balance, fiscal balance)
- **Percentage**: 1 indicator (unemployment)
- **Ratio**: 1 indicator (GDP per capita)
- **Gap**: 1 indicator (current account)

### By Temporal Aggregation:

- **Point-in-time**: 13 indicators
- **Period-rate**: 11 indicators
- **Period-total**: 6 indicators
- **Period-cumulative**: 1 indicator

### By Monetary Status:

- **Monetary**: 11 indicators (GDP, debt, commodities, tax revenue)
- **Non-monetary**: 12 indicators (ratios, percentages, growth rates)

## Edge Cases and Special Patterns

### 1. Negative Values

- Export/import growth can be negative
- Current account balance (Argentina)
- Fiscal balance (Brazil, always negative)
- Philippines import growth -16.1% (2020 COVID-19)

### 2. Extreme Values

- South Africa unemployment >30%
- Luxembourg GDP per capita >$100k
- Turkey tax revenue 10x increase (hyperinflation)
- Gold price +29% in 2024

### 3. Crisis Impacts

- **COVID-19 (2020)**:
  - Brazil fiscal deficit -12.5%
  - Brazil government expense 38.5%
  - Philippines imports -16.1%

### 4. Structural Issues

- South Africa persistent high unemployment
- Brazil persistent fiscal deficits
- Turkey external debt vulnerability

### 5. Economic Phenomena

- **Hyperinflation**: Turkey nominal values explosion
- **High Savings**: China 43-46% of GDP
- **Commodity Volatility**: Oil, gold, copper price swings
- **Safe Haven**: Gold rally during uncertainty

## Data Quality

### Real Data (World Bank):

- ✅ Actual values from Tellimer staging database
- ✅ Covers 2015-2024 period
- ✅ Annual periodicity
- ✅ Verified against production data

### Commodity Data (Synthetic):

- ✅ Realistic 2024 price patterns
- ✅ Based on actual market movements
- ✅ Monthly periodicity
- ✅ Appropriate volatility levels

### All Indicators:

- ✅ Proper sample_values format: `[{date, value}]`
- ✅ Complete metadata (id, name, units, periodicity, source, description)
- ✅ Expected classification for testing
- ✅ Contextual notes explaining patterns

## Usage

These fixtures are used to test the indicator classification system's ability
to:

1. **Distinguish indicator categories**: Change/movement vs price/value vs
   physical/fundamental
2. **Identify indicator types**: Rate, stock, flow, price, balance, etc.
3. **Determine temporal aggregation**: Point-in-time, period-rate, period-total,
   period-cumulative
4. **Classify monetary status**: Monetary vs non-monetary indicators
5. **Assign heat map orientation**: Higher/lower-is-positive, neutral
6. **Handle edge cases**: Negative values, extreme values, crisis impacts
7. **Process real-world patterns**: Volatility, trends, structural issues

## Key Testing Scenarios

### 1. Stock vs Flow Distinction

- **Stock**: Population, debt (point-in-time snapshots)
- **Flow**: GDP, savings, tax revenue (period throughput)
- **Balance**: Trade balance, fiscal balance (net positions)

### 2. Price vs Index

- **Price**: Commodities (absolute values in USD)
- **Index**: CPI (relative to base year)

### 3. Temporal Aggregation

- **Point-in-time**: Debt, reserves, population
- **Period-rate**: Growth rates, savings rate
- **Period-total**: Tax revenue, fiscal balance
- **Period-cumulative**: YTD production

### 4. Heat Map Orientation

- **Higher-is-positive**: GDP growth, savings, revenue
- **Lower-is-positive**: Unemployment, inflation, debt
- **Neutral**: Commodities, government expense, trade balance

### 5. Crisis Detection

- COVID-19 impacts visible in 2020 data
- Hyperinflation patterns in Turkey
- Structural unemployment in South Africa

## Maintenance

When adding new indicators:

1. **Query staging database** for real World Bank data
2. **Select diverse countries** across regions and income levels
3. **Include edge cases** (negative values, extreme values, crises)
4. **Verify data quality** (no nulls, proper date format)
5. **Add contextual notes** explaining patterns
6. **Update this README** with new indicators

## Data Sources

- **World Bank**: Macroeconomic indicators via Tellimer staging database
- **Commodity Markets**: Synthetic data based on 2024 market patterns
  - ICE Futures Europe (Brent crude)
  - London Bullion Market (Gold)
  - London Metal Exchange (Copper)
  - Chicago Board of Trade (Wheat)
