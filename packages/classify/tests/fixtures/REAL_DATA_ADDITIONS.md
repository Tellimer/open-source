# Real Data Additions to Test Fixtures

This document tracks the real indicators added from the Tellimer staging database to the classify test fixtures.

## Summary

Added **13 real indicators** from World Bank data across **4 fixture files**, covering **21 countries** total.

## Data Source

- **Database**: Tellimer Staging PostgreSQL
- **Tables**: `indicators`, `country_indicators`
- **Source**: World Bank (via staging database)
- **Exclusions**: IMFWEO dataset (as requested)

## Additions by File

### 1. change_movement.json

Added 5 indicators representing rate and gap types:

#### FP.CPI.TOTL.ZG - Inflation, consumer prices (annual %)
- **Countries**: Brazil (BRA)
- **Type**: rate
- **Periodicity**: annual
- **Sample Period**: 2017-2024
- **Description**: Annual percentage change in consumer price index
- **Heat Map**: lower-is-positive

#### NY.GDP.MKTP.KD.ZG - GDP growth (annual %)
- **Countries**: Egypt (EGY)
- **Type**: rate
- **Periodicity**: annual
- **Sample Period**: 2016-2023
- **Description**: Annual percentage growth rate of GDP at market prices
- **Heat Map**: higher-is-positive

#### BN.CAB.XOKA.GD.ZS - Current account balance (% of GDP)
- **Countries**: Argentina (ARG)
- **Type**: gap
- **Periodicity**: annual
- **Sample Period**: 2016-2023
- **Description**: Current account balance as percentage of GDP
- **Heat Map**: neutral
- **Note**: Can be positive or negative

#### NE.EXP.GNFS.KD.ZG - Exports of goods and services (annual % growth)
- **Countries**: Vietnam (VNM)
- **Type**: rate
- **Periodicity**: annual
- **Sample Period**: 2016-2023
- **Description**: Annual growth rate of exports based on constant local currency
- **Heat Map**: higher-is-positive
- **Note**: Shows trade dynamics, can be negative during downturns

#### NE.IMP.GNFS.KD.ZG - Imports of goods and services (annual % growth)
- **Countries**: Philippines (PHL)
- **Type**: rate
- **Periodicity**: annual
- **Sample Period**: 2016-2023
- **Description**: Annual growth rate of imports based on constant local currency
- **Heat Map**: neutral
- **Note**: Reflects domestic demand, sharply negative during COVID-19 (2020: -16.143%)

### 2. price_value.json

Added 3 indicators representing price indices:

#### FP.CPI.TOTL - Consumer price index (2010 = 100)
- **Countries**: Ghana (GHA), Kenya (KEN), Nigeria (NGA)
- **Type**: price
- **Periodicity**: annual
- **Sample Period**: 2015-2024 (varies by country)
- **Description**: Consumer price index measuring cost of living changes
- **Heat Map**: neutral
- **Note**: Shows significant price increases in African economies

### 3. numeric_measurement.json

Added 2 indicators representing percentages and ratios:

#### SL.UEM.TOTL.ZS - Unemployment, total (% of total labor force)
- **Countries**: South Africa (ZAF)
- **Type**: percentage
- **Periodicity**: annual
- **Sample Period**: 2017-2024
- **Description**: Share of labor force without work but available for and seeking employment
- **Heat Map**: lower-is-positive
- **Note**: High unemployment rate (>30%) showing structural challenges

#### NY.GDP.PCAP.CD - GDP per capita (current US$)
- **Countries**: Luxembourg (LUX)
- **Type**: ratio
- **Periodicity**: annual
- **Sample Period**: 2015-2022
- **Description**: GDP divided by midyear population
- **Heat Map**: higher-is-positive
- **Note**: Ratio indicator showing economic output per person, Luxembourg has highest GDP per capita

### 4. physical_fundamental.json

Added 3 indicators representing population stocks:

#### SP.POP.TOTL - Population, total
- **Countries**: Bangladesh (BGD), Indonesia (IDN), Pakistan (PAK)
- **Type**: stock
- **Periodicity**: annual
- **Sample Period**: 2016-2023
- **Description**: Total population based on de facto definition
- **Heat Map**: neutral
- **Note**: Large population countries showing steady growth

## Data Characteristics

### Geographic Coverage
- **Latin America**: Argentina, Brazil
- **Middle East/North Africa**: Egypt
- **Sub-Saharan Africa**: Ghana, Kenya, Nigeria, South Africa
- **South Asia**: Bangladesh, Pakistan
- **Southeast Asia**: Indonesia, Philippines, Vietnam
- **Europe**: Luxembourg

### Indicator Types Covered
- **Rate**: Inflation rate, GDP growth rate, export growth, import growth
- **Gap**: Current account balance
- **Price**: Consumer price index
- **Stock**: Population
- **Percentage**: Unemployment rate
- **Ratio**: GDP per capita

### Temporal Coverage
- All indicators use annual periodicity
- Data ranges from 2015-2024 depending on indicator
- 8 data points per indicator on average

## Sample Values Format

All sample values follow the required format with date and value properties:

```json
{
  "date": "2023",
  "value": 171466990
}
```

This enables temporal pattern detection as specified in the classify package requirements.

## Expected Classifications

All indicators include expected classification metadata:
- `indicator_category`: Matches fixture file category
- `indicator_type`: Specific type within category
- `temporal_aggregation`: How values aggregate over time
- `is_monetary`: Whether indicator represents monetary values
- `heat_map_orientation`: Interpretation direction (higher/lower/neutral is positive)

## Testing Impact

These additions provide:
1. **Real-world data** from production database
2. **Diverse geographic coverage** across emerging and developed markets
3. **Multiple indicator types** within each category
4. **Actual temporal patterns** for classification testing
5. **Edge cases** including:
   - Negative values (current account balance, export/import growth)
   - Very high values (South Africa unemployment >30%)
   - Sharp drops (Philippines imports -16% in 2020)
   - High-income outliers (Luxembourg GDP per capita >$100k)

## Key Insights from Real Data

1. **COVID-19 Impact**: Philippines import growth dropped to -16.143% in 2020
2. **Structural Issues**: South Africa unemployment consistently above 25%
3. **Trade Dynamics**: Vietnam exports can turn negative (-1.3% in 2023)
4. **Income Inequality**: Luxembourg GDP per capita ($126k) vs emerging markets
5. **Price Volatility**: African CPI indices show rapid increases (Nigeria, Ghana)

## Next Steps

Consider adding:
- Monthly/quarterly indicators (currently all annual)
- More diverse sources beyond World Bank
- Indicators with different scales (millions, billions, etc.)
- Financial market indicators (interest rates, exchange rates)
- Commodity-related indicators (oil, metals, agriculture)

