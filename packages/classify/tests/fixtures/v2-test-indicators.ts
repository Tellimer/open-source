/**
 * Test Fixture: 100 Diverse Economic Indicators
 *
 * Selected to cover broad range of indicator families and types
 *
 * Generated: 2025-10-02T14:03:04.471Z
 */

export interface TestIndicatorFixture {
  id: string;
  name: string;
  units: string | null;
  periodicity: string | null;
  category_group: string | null;
  topic: string | null;
  aggregation_method: string | null;
  scale: string | null;
  currency_code: string | null;
  dataset: string | null;
  sample_values: { date: string; value: number }[];
  expectation: {
    indicator_family: string;
    indicator_type: string;
    indicator_category: string;
    temporal_aggregation: string;
    is_currency_denominated: boolean;
    heat_map_orientation: string;
  };
}

export const TEST_INDICATORS: TestIndicatorFixture[] = [
  {
    id: 'ALBANIABUSCON',
    name: 'Business Confidence',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'period-average',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2024-12-31',
        value: -2.1,
      },
      {
        date: '2025-01-31',
        value: -5.7,
      },
      {
        date: '2025-02-28',
        value: -4.1,
      },
      {
        date: '2025-03-31',
        value: -2.4,
      },
      {
        date: '2025-04-30',
        value: -8.5,
      },
      {
        date: '2025-05-31',
        value: -0.4,
      },
      {
        date: '2025-06-30',
        value: -3.3,
      },
      {
        date: '2025-07-31',
        value: -2.8,
      },
      {
        date: '2025-08-31',
        value: -6.7,
      },
      {
        date: 'last10YearsAvg',
        value: 0.678,
      },
    ],
  },
  {
    id: 'UFX_WB_GNB_XOF',
    name: 'Guinea-Bissau Alternative Official FX Rate Rate (XOF)',
    units: 'XOF',
    periodicity: 'Monthly',
    category_group: 'Markets',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: 'XOF',
    dataset: null,
    expectation: {
      indicator_family: 'price-value',
      indicator_type: 'price',
      indicator_category: 'price-value',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2024-12-01',
        value: 625.99,
      },
      {
        date: '2025-01-01',
        value: 633.55,
      },
      {
        date: '2025-02-01',
        value: 629.97,
      },
      {
        date: '2025-03-01',
        value: 606.98,
      },
      {
        date: '2025-04-01',
        value: 584.95,
      },
      {
        date: '2025-05-01',
        value: 581.62,
      },
      {
        date: '2025-06-01',
        value: 569.6,
      },
      {
        date: '2025-07-01',
        value: 561.76,
      },
      {
        date: '2025-08-01',
        value: 563.13,
      },
      {
        date: '2025-09-01',
        value: 560.46,
      },
    ],
  },
  {
    id: 'ALBANIAECOOPTIND',
    name: 'Economic Optimism Index',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Consumer',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2024-12-31',
        value: 106.6,
      },
      {
        date: '2025-01-31',
        value: 106.2,
      },
      {
        date: '2025-02-28',
        value: 107.5,
      },
      {
        date: '2025-03-31',
        value: 108.6,
      },
      {
        date: '2025-04-30',
        value: 107.9,
      },
      {
        date: '2025-05-31',
        value: 108.9,
      },
      {
        date: '2025-06-30',
        value: 106.2,
      },
      {
        date: '2025-07-31',
        value: 109.2,
      },
      {
        date: '2025-08-31',
        value: 108.4,
      },
      {
        date: 'last10YearsAvg',
        value: 113.314,
      },
    ],
  },
  {
    id: 'UFX_WB_MWI_MWK',
    name: 'Malawi Alternative Official FX Rate Rate (MWK)',
    units: 'MWK',
    periodicity: 'Monthly',
    category_group: 'Markets',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: 'MWK',
    dataset: null,
    expectation: {
      indicator_family: 'price-value',
      indicator_type: 'price',
      indicator_category: 'price-value',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2024-12-01',
        value: 1749.98,
      },
      {
        date: '2025-01-01',
        value: 1749.76,
      },
      {
        date: '2025-02-01',
        value: 1749.85,
      },
      {
        date: '2025-03-01',
        value: 1750.22,
      },
      {
        date: '2025-04-01',
        value: 1750.44,
      },
      {
        date: '2025-05-01',
        value: 1750.61,
      },
      {
        date: '2025-06-01',
        value: 1750.46,
      },
      {
        date: '2025-07-01',
        value: 1750.76,
      },
      {
        date: '2025-08-01',
        value: 1756.11,
      },
      {
        date: '2025-09-01',
        value: 1758.69,
      },
    ],
  },
  {
    id: 'ALBANIAEMPRAT',
    name: 'Employment Rate',
    units: '%',
    periodicity: 'Quarterly',
    category_group: 'Labour',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'numeric-measurement',
      indicator_type: 'percentage',
      indicator_category: 'numeric-measurement',
      temporal_aggregation: 'not-applicable',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-06-30',
        value: 68.7,
      },
      {
        date: '2023-09-30',
        value: 68.2,
      },
      {
        date: '2023-12-31',
        value: 66.8,
      },
      {
        date: '2024-03-31',
        value: 68.5,
      },
      {
        date: '2024-06-30',
        value: 69.1,
      },
      {
        date: '2024-09-30',
        value: 68.3,
      },
      {
        date: '2024-12-31',
        value: 68.3,
      },
      {
        date: '2025-03-31',
        value: 69.5,
      },
      {
        date: '2025-06-30',
        value: 69.1,
      },
      {
        date: 'last10YearsAvg',
        value: 63.81,
      },
    ],
  },
  {
    id: 'TM_RPCH',
    name: 'Volume of imports of goods and services',
    units: 'Percent change',
    periodicity: 'Biannually',
    category_group: null,
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: 'last10YearsPeerAvg',
        value: 1.946,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 2.184,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 1.889,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 1.726,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 2.571,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 2.571,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 2.571,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 1.726,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 2.386,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 1.726,
      },
    ],
  },
  {
    id: 'AUSTRALIAMANPMI',
    name: 'Manufacturing PMI',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-05-31',
        value: 48.4,
      },
      {
        date: '2023-06-30',
        value: 48.2,
      },
      {
        date: '2023-07-31',
        value: 49.6,
      },
      {
        date: '2023-08-31',
        value: 49.6,
      },
      {
        date: '2023-09-30',
        value: 48.7,
      },
      {
        date: '2023-11-30',
        value: 47.7,
      },
      {
        date: '2023-12-31',
        value: 47.8,
      },
      {
        date: '2024-01-31',
        value: 50.3,
      },
      {
        date: '2024-02-29',
        value: 47.7,
      },
      {
        date: 'last10YearsAvg',
        value: 48.74,
      },
    ],
  },
  {
    id: 'USASOFR',
    name: 'Secured Overnight Financing Rate',
    units: '%',
    periodicity: 'Daily',
    category_group: 'Money',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'price-value',
      indicator_type: 'price',
      indicator_category: 'price-value',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2023-09-20',
        value: 5.3,
      },
      {
        date: '2023-09-21',
        value: 5.3,
      },
      {
        date: '2023-09-22',
        value: 5.3,
      },
      {
        date: '2023-09-25',
        value: 5.31,
      },
      {
        date: '2023-09-26',
        value: 5.31,
      },
      {
        date: '2023-09-27',
        value: 5.32,
      },
      {
        date: '2023-09-28',
        value: 5.31,
      },
      {
        date: '2023-09-29',
        value: 5.31,
      },
      {
        date: '2023-10-02',
        value: 5.31,
      },
      {
        date: 'last10YearsAvg',
        value: 5.308,
      },
    ],
  },
  {
    id: 'FINLANDFACORD',
    name: 'Factory Orders',
    units: '%',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-02-28',
        value: -4.6,
      },
      {
        date: '2023-03-31',
        value: -4.9,
      },
      {
        date: '2023-04-30',
        value: -17,
      },
      {
        date: '2023-05-31',
        value: -1.8,
      },
      {
        date: '2023-06-30',
        value: -11.7,
      },
      {
        date: '2023-07-31',
        value: -15.1,
      },
      {
        date: '2023-10-31',
        value: -15.6,
      },
      {
        date: '2023-11-30',
        value: -18.9,
      },
      {
        date: '2023-12-31',
        value: 1.3,
      },
      {
        date: 'last10YearsAvg',
        value: -9.1,
      },
    ],
  },
  {
    id: 'AUSTRALIAPRISECCRE',
    name: 'Private Sector Credit',
    units: '%',
    periodicity: 'Monthly',
    category_group: 'Consumer',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-04-30',
        value: 0.6,
      },
      {
        date: '2023-05-31',
        value: 0.4,
      },
      {
        date: '2023-06-30',
        value: 0.3,
      },
      {
        date: '2023-07-31',
        value: 0.3,
      },
      {
        date: '2023-08-31',
        value: 0.4,
      },
      {
        date: '2023-10-31',
        value: 0.3,
      },
      {
        date: '2023-11-30',
        value: 0.4,
      },
      {
        date: '2023-12-31',
        value: 0.4,
      },
      {
        date: '2024-01-31',
        value: 0.4,
      },
      {
        date: 'last10YearsAvg',
        value: 0.37,
      },
    ],
  },
  {
    id: 'AUSTRALIAPRIINV',
    name: 'Private Investment',
    units: '%',
    periodicity: 'Quarterly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2021-12-31',
        value: 1.6,
      },
      {
        date: '2022-03-31',
        value: 0.6,
      },
      {
        date: '2022-06-30',
        value: -0.7,
      },
      {
        date: '2022-09-30',
        value: 0.9,
      },
      {
        date: '2022-12-31',
        value: 3.1,
      },
      {
        date: '2023-03-31',
        value: 3.7,
      },
      {
        date: '2023-06-30',
        value: 2.8,
      },
      {
        date: '2023-09-30',
        value: 0.6,
      },
      {
        date: '2023-12-31',
        value: 0.8,
      },
      {
        date: 'last10YearsAvg',
        value: 1.56,
      },
    ],
  },
  {
    id: 'AUSBCE',
    name: 'Building Capital Expenditure',
    units: '%',
    periodicity: 'Quarterly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2021-12-31',
        value: 2.2,
      },
      {
        date: '2022-03-31',
        value: -1.7,
      },
      {
        date: '2022-06-30',
        value: -2.5,
      },
      {
        date: '2022-09-30',
        value: 0.5,
      },
      {
        date: '2022-12-31',
        value: 3.6,
      },
      {
        date: '2023-03-31',
        value: 1.3,
      },
      {
        date: '2023-06-30',
        value: 3.5,
      },
      {
        date: '2023-09-30',
        value: 0.7,
      },
      {
        date: '2023-12-31',
        value: 1.5,
      },
      {
        date: 'last10YearsAvg',
        value: 1.2,
      },
    ],
  },
  {
    id: 'UFX_WB_MLI_XOF',
    name: 'Mali Alternative Official FX Rate Rate (XOF)',
    units: 'XOF',
    periodicity: 'Monthly',
    category_group: 'Markets',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: 'XOF',
    dataset: null,
    expectation: {
      indicator_family: 'price-value',
      indicator_type: 'price',
      indicator_category: 'price-value',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2024-12-01',
        value: 625.99,
      },
      {
        date: '2025-01-01',
        value: 633.55,
      },
      {
        date: '2025-02-01',
        value: 629.97,
      },
      {
        date: '2025-03-01',
        value: 606.98,
      },
      {
        date: '2025-04-01',
        value: 584.95,
      },
      {
        date: '2025-05-01',
        value: 581.62,
      },
      {
        date: '2025-06-01',
        value: 569.6,
      },
      {
        date: '2025-07-01',
        value: 561.76,
      },
      {
        date: '2025-08-01',
        value: 563.13,
      },
      {
        date: '2025-09-01',
        value: 560.46,
      },
    ],
  },
  {
    id: 'AUTNGI',
    name: 'Natural Gas Imports',
    units: 'Terajoule',
    periodicity: 'Monthly',
    category_group: 'Trade',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'volume',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'period-total',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2023-04-30',
        value: 56826,
      },
      {
        date: '2023-05-31',
        value: 75790,
      },
      {
        date: '2023-06-30',
        value: 60930,
      },
      {
        date: '2023-07-31',
        value: 60371,
      },
      {
        date: '2023-08-31',
        value: 47890,
      },
      {
        date: '2023-09-30',
        value: 30026,
      },
      {
        date: '2023-10-31',
        value: 43710,
      },
      {
        date: '2023-11-30',
        value: 37767,
      },
      {
        date: '2023-12-31',
        value: 43658,
      },
      {
        date: 'last10YearsAvg',
        value: 50762.4,
      },
    ],
  },
  {
    id: 'ANGOLAINTRAT',
    name: 'Interbank Rate',
    units: '%',
    periodicity: 'Monthly',
    category_group: 'Money',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'price-value',
      indicator_type: 'price',
      indicator_category: 'price-value',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2024-12-31',
        value: 20.64,
      },
      {
        date: '2025-01-31',
        value: 20.62,
      },
      {
        date: '2025-02-28',
        value: 19.47,
      },
      {
        date: '2025-03-31',
        value: 18.94,
      },
      {
        date: '2025-04-30',
        value: 19.79,
      },
      {
        date: '2025-05-31',
        value: 19.13,
      },
      {
        date: '2025-06-30',
        value: 18.94,
      },
      {
        date: '2025-07-31',
        value: 18.66,
      },
      {
        date: '2025-08-31',
        value: 18.6,
      },
      {
        date: 'last10YearsAvg',
        value: 12.865,
      },
    ],
  },
  {
    id: 'USADFSRI',
    name: 'Dallas Fed Services Revenues Index',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-01-31',
        value: 4.9,
      },
      {
        date: '2023-02-28',
        value: 6.6,
      },
      {
        date: '2023-03-31',
        value: 5.5,
      },
      {
        date: '2023-04-30',
        value: 6.9,
      },
      {
        date: '2023-05-31',
        value: 6.9,
      },
      {
        date: '2023-06-30',
        value: 3.6,
      },
      {
        date: '2023-07-31',
        value: 12.9,
      },
      {
        date: '2023-08-31',
        value: 16.2,
      },
      {
        date: '2023-09-30',
        value: 8.7,
      },
      {
        date: 'last10YearsAvg',
        value: 7.16,
      },
    ],
  },
  {
    id: 'CANCPITRI',
    name: 'CPI Trimmed-Mean',
    units: 'Percent',
    periodicity: 'Monthly',
    category_group: 'Prices',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2022-12-31',
        value: 5.3,
      },
      {
        date: '2023-01-31',
        value: 5.1,
      },
      {
        date: '2023-02-28',
        value: 4.8,
      },
      {
        date: '2023-03-31',
        value: 4.4,
      },
      {
        date: '2023-04-30',
        value: 4.2,
      },
      {
        date: '2023-05-31',
        value: 3.8,
      },
      {
        date: '2023-06-30',
        value: 3.7,
      },
      {
        date: '2023-07-31',
        value: 3.6,
      },
      {
        date: '2023-08-31',
        value: 3.9,
      },
      {
        date: 'last10YearsAvg',
        value: 4.43,
      },
    ],
  },
  {
    id: 'UNITEDSTAADPEMPCHA',
    name: 'ADP Employment Change',
    units: 'Thousand',
    periodicity: 'Monthly',
    category_group: 'Labour',
    topic: null,
    aggregation_method: null,
    scale: 'Thousands',
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'numeric-measurement',
      indicator_type: 'balance',
      indicator_category: 'numeric-measurement',
      temporal_aggregation: 'period-total',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2022-12-31',
        value: 253,
      },
      {
        date: '2023-01-31',
        value: 119,
      },
      {
        date: '2023-02-28',
        value: 261,
      },
      {
        date: '2023-03-31',
        value: 142,
      },
      {
        date: '2023-04-30',
        value: 291,
      },
      {
        date: '2023-05-31',
        value: 267,
      },
      {
        date: '2023-06-30',
        value: 455,
      },
      {
        date: '2023-07-31',
        value: 312,
      },
      {
        date: '2023-08-31',
        value: 177,
      },
      {
        date: 'last10YearsAvg',
        value: 248.9,
      },
    ],
  },
  {
    id: 'NY.GDP.PCAP.CD',
    name: 'GDP per capita (current US$)',
    units: 'Current USD',
    periodicity: 'Annual',
    category_group: null,
    topic:
      'Economic Policy & Debt: National accounts: US$ at current prices: Aggregate indicators',
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'numeric-measurement',
      indicator_type: 'ratio',
      indicator_category: 'numeric-measurement',
      temporal_aggregation: 'not-applicable',
      is_currency_denominated: true,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: 'last10YearsAvg',
        value: 57999.759,
      },
      {
        date: 'last10YearsAvg',
        value: 6826.701,
      },
      {
        date: 'last10YearsAvg',
        value: 46229.724,
      },
      {
        date: 'last10YearsAvg',
        value: 2660.619,
      },
      {
        date: 'last10YearsAvg',
        value: 5080.651,
      },
      {
        date: 'last10YearsAvg',
        value: 6108.144,
      },
      {
        date: 'last10YearsAvg',
        value: 41538.305,
      },
      {
        date: 'last10YearsAvg',
        value: 1192.022,
      },
      {
        date: 'last10YearsAvg',
        value: 12124.147,
      },
      {
        date: 'last10YearsAvg',
        value: 4494.549,
      },
    ],
  },
  {
    id: 'USANHSM',
    name: 'New Home Sales MoM',
    units: '%',
    periodicity: 'Monthly',
    category_group: 'Housing',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2022-12-31',
        value: 9.3,
      },
      {
        date: '2023-01-31',
        value: 2,
      },
      {
        date: '2023-02-28',
        value: -3.7,
      },
      {
        date: '2023-03-31',
        value: 2.4,
      },
      {
        date: '2023-04-30',
        value: 4.8,
      },
      {
        date: '2023-05-31',
        value: 3.7,
      },
      {
        date: '2023-06-30',
        value: -3.7,
      },
      {
        date: '2023-07-31',
        value: 8,
      },
      {
        date: '2023-08-31',
        value: -8.7,
      },
      {
        date: 'last10YearsAvg',
        value: 1.5,
      },
    ],
  },
  {
    id: 'SL.UEM.TOTL.ZS',
    name: 'Unemployment, total (% of total labor force) (modeled ILO estimate)',
    units: '% of total labor force',
    periodicity: 'Annual',
    category_group: null,
    topic: 'Social Protection & Labor: Unemployment',
    aggregation_method: 'Weighted average',
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'numeric-measurement',
      indicator_type: 'percentage',
      indicator_category: 'numeric-measurement',
      temporal_aggregation: 'not-applicable',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: 'last10YearsAvg',
        value: 6.674,
      },
      {
        date: 'last10YearsAvg',
        value: 23.683,
      },
      {
        date: 'last10YearsAvg',
        value: 0.843,
      },
      {
        date: 'last10YearsAvg',
        value: 3.461,
      },
      {
        date: 'last10YearsAvg',
        value: 19.21,
      },
      {
        date: 'last10YearsAvg',
        value: 3.836,
      },
      {
        date: 'last10YearsAvg',
        value: 18.212,
      },
      {
        date: 'last10YearsAvg',
        value: 17.941,
      },
      {
        date: 'last10YearsAvg',
        value: 7.979,
      },
      {
        date: 'last10YearsAvg',
        value: 8.858,
      },
    ],
  },
  {
    id: 'ALBANIARETSYOY',
    name: 'Retail Sales YoY',
    units: '%',
    periodicity: 'Monthly',
    category_group: 'Consumer',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2024-03-31',
        value: 5.8,
      },
      {
        date: '2024-04-30',
        value: 1.1,
      },
      {
        date: '2024-05-31',
        value: 7.1,
      },
      {
        date: '2024-06-30',
        value: 9.3,
      },
      {
        date: '2024-07-31',
        value: 7.1,
      },
      {
        date: '2024-08-31',
        value: 6.8,
      },
      {
        date: '2024-09-30',
        value: 5.3,
      },
      {
        date: '2024-10-31',
        value: 6.1,
      },
      {
        date: '2024-11-30',
        value: 7.9,
      },
      {
        date: 'last10YearsAvg',
        value: 5.141,
      },
    ],
  },
  {
    id: 'TD_RESERVES_TRRCEMAC_LS_CMR_M',
    name: 'Total Regional Reserves (CEMAC)',
    units: 'XAF Million',
    periodicity: 'Monthly',
    category_group: 'Reserves',
    topic: null,
    aggregation_method: null,
    scale: 'Millions',
    currency_code: 'XAF',
    dataset: null,
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'stock',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: true,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-12-31',
        value: 6885962,
      },
      {
        date: '2024-01-31',
        value: 6758376,
      },
      {
        date: '2024-02-29',
        value: 6758376,
      },
      {
        date: '2024-03-31',
        value: 6485031,
      },
      {
        date: '2024-04-30',
        value: 6625892,
      },
      {
        date: '2024-05-31',
        value: 6564866,
      },
      {
        date: '2024-06-30',
        value: 6439166,
      },
      {
        date: '2024-07-31',
        value: 6529465,
      },
      {
        date: '2024-08-31',
        value: 6482941,
      },
      {
        date: '2024-09-30',
        value: 6369808,
      },
    ],
  },
  {
    id: 'AFGSTANGOVGDP',
    name: 'Government Debt to GDP',
    units: 'percent of GDP',
    periodicity: 'Yearly',
    category_group: 'Government',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'numeric-measurement',
      indicator_type: 'ratio',
      indicator_category: 'numeric-measurement',
      temporal_aggregation: 'not-applicable',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2015-12-31',
        value: 9.2,
      },
      {
        date: '2016-12-31',
        value: 8.4,
      },
      {
        date: '2017-12-31',
        value: 8,
      },
      {
        date: '2018-12-31',
        value: 7.4,
      },
      {
        date: '2019-12-31',
        value: 6.1,
      },
      {
        date: '2020-12-31',
        value: 7.3,
      },
      {
        date: '2021-12-31',
        value: 11.1,
      },
      {
        date: '2022-12-31',
        value: 10.6,
      },
      {
        date: '2023-12-31',
        value: 8.3,
      },
      {
        date: 'last10YearsAvg',
        value: 7.642,
      },
    ],
  },
  {
    id: 'IRFCLDT1_IRFCL65_USD_IRFCL13',
    name: 'Official reserves assets',
    units: 'USD million',
    periodicity: 'Monthly',
    category_group: 'Trade',
    topic: null,
    aggregation_method: null,
    scale: 'Millions',
    currency_code: 'USD',
    dataset: null,
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'stock',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: true,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2025-08-31',
        value: 1989.032,
      },
      {
        date: '2025-08-31',
        value: 3346.598,
      },
      {
        date: '2025-08-31',
        value: 178357,
      },
      {
        date: '2025-08-31',
        value: 46035.19,
      },
      {
        date: '2025-08-31',
        value: 39986.148,
      },
      {
        date: '2025-08-31',
        value: 44208.302,
      },
      {
        date: '2025-08-31',
        value: 46797.231,
      },
      {
        date: '2025-08-31',
        value: 15249.732,
      },
      {
        date: '2025-08-31',
        value: 9388.379,
      },
      {
        date: '2025-08-31',
        value: 2512.988,
      },
    ],
  },
  {
    id: 'ESPELEPRI',
    name: 'Electricity Price',
    units: 'EUR/MWh',
    periodicity: 'Daily',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: 'EUR',
    dataset: null,
    expectation: {
      indicator_family: 'price-value',
      indicator_type: 'price',
      indicator_category: 'price-value',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: true,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2024-02-26',
        value: 3.82,
      },
      {
        date: '2024-02-27',
        value: 3.65,
      },
      {
        date: '2024-02-28',
        value: 4.8,
      },
      {
        date: '2024-02-29',
        value: 2.14,
      },
      {
        date: '2024-03-01',
        value: 4.16,
      },
      {
        date: '2024-03-04',
        value: 7.95,
      },
      {
        date: '2024-03-05',
        value: 45.97,
      },
      {
        date: '2024-03-06',
        value: 8.52,
      },
      {
        date: '2024-03-07',
        value: 1.67,
      },
      {
        date: 'last10YearsAvg',
        value: 10.774,
      },
    ],
  },
  {
    id: 'AFGHANISTAMINPRO',
    name: 'Mining Production',
    units: '%',
    periodicity: 'Yearly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2015-12-31',
        value: 10.3,
      },
      {
        date: '2016-12-31',
        value: 82.5,
      },
      {
        date: '2017-12-31',
        value: 14.6,
      },
      {
        date: '2018-12-31',
        value: 5.8,
      },
      {
        date: '2019-12-31',
        value: -6.9,
      },
      {
        date: '2020-12-31',
        value: -9.39,
      },
      {
        date: '2021-12-31',
        value: -10.3,
      },
      {
        date: '2022-12-31',
        value: 15,
      },
      {
        date: '2023-12-31',
        value: 41,
      },
      {
        date: 'last10YearsAvg',
        value: 11.191,
      },
    ],
  },
  {
    id: 'SINGAPORESERSEN',
    name: 'Services Sentiment',
    units: 'points',
    periodicity: 'Quarterly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'period-average',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2021-12-31',
        value: 14,
      },
      {
        date: '2022-03-31',
        value: 15,
      },
      {
        date: '2022-06-30',
        value: 15,
      },
      {
        date: '2022-09-30',
        value: 9,
      },
      {
        date: '2022-12-31',
        value: 3,
      },
      {
        date: '2023-03-31',
        value: 4,
      },
      {
        date: '2023-06-30',
        value: 8,
      },
      {
        date: '2023-09-30',
        value: 9,
      },
      {
        date: '2023-12-31',
        value: 5,
      },
      {
        date: 'last10YearsAvg',
        value: 10.7,
      },
    ],
  },
  {
    id: 'NEWZEALANGDTPI',
    name: 'Global Dairy Trade Price Index',
    units: '%',
    periodicity: 'Weekly',
    category_group: 'Trade',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2023-10-17',
        value: 4.3,
      },
      {
        date: '2023-11-07',
        value: -0.7,
      },
      {
        date: '2023-12-05',
        value: 1.6,
      },
      {
        date: '2023-12-19',
        value: 2.3,
      },
      {
        date: '2024-01-02',
        value: 1.2,
      },
      {
        date: '2024-01-16',
        value: 2.3,
      },
      {
        date: '2024-02-06',
        value: 4.2,
      },
      {
        date: '2024-02-20',
        value: 0.5,
      },
      {
        date: '2024-03-05',
        value: -2.3,
      },
      {
        date: 'last10YearsAvg',
        value: 2.01,
      },
    ],
  },
  {
    id: 'AUSTRALIAJOBADV',
    name: 'Job Advertisements',
    units: '%',
    periodicity: 'Monthly',
    category_group: 'Labour',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-05-31',
        value: 0.2,
      },
      {
        date: '2023-06-30',
        value: -2.6,
      },
      {
        date: '2023-07-31',
        value: 0.6,
      },
      {
        date: '2023-08-31',
        value: 1.7,
      },
      {
        date: '2023-09-30',
        value: -0.1,
      },
      {
        date: '2023-11-10',
        value: -4.6,
      },
      {
        date: '2023-12-31',
        value: 0.1,
      },
      {
        date: '2024-01-31',
        value: 1.7,
      },
      {
        date: '2024-02-29',
        value: -2.8,
      },
      {
        date: 'last10YearsAvg',
        value: -0.65,
      },
    ],
  },
  {
    id: 'ALBANIAPROPRICHA',
    name: 'Producer Prices Change',
    units: '%',
    periodicity: 'Quarterly',
    category_group: 'Prices',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2023-06-30',
        value: 6.9,
      },
      {
        date: '2023-09-30',
        value: 5.2,
      },
      {
        date: '2023-12-31',
        value: 3.1,
      },
      {
        date: '2024-03-31',
        value: 2.5,
      },
      {
        date: '2024-06-30',
        value: 1.7,
      },
      {
        date: '2024-09-30',
        value: 1.1,
      },
      {
        date: '2024-12-31',
        value: 1,
      },
      {
        date: '2025-03-31',
        value: 0.3,
      },
      {
        date: '2025-06-30',
        value: 0.3,
      },
      {
        date: 'last10YearsAvg',
        value: 10.67,
      },
    ],
  },
  {
    id: 'BRAMMIRM',
    name: 'Mid-month Inflation Rate MoM',
    units: '%',
    periodicity: 'Monthly',
    category_group: 'Prices',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2025-01-31',
        value: 0.11,
      },
      {
        date: '2025-02-28',
        value: 1.23,
      },
      {
        date: '2025-03-31',
        value: 0.64,
      },
      {
        date: '2025-04-30',
        value: 0.43,
      },
      {
        date: '2025-05-31',
        value: 0.36,
      },
      {
        date: '2025-06-30',
        value: 0.26,
      },
      {
        date: '2025-07-31',
        value: 0.33,
      },
      {
        date: '2025-08-31',
        value: -0.14,
      },
      {
        date: '2025-09-30',
        value: 0.48,
      },
      {
        date: 'last10YearsAvg',
        value: 0.293,
      },
    ],
  },
  {
    id: 'ALBANIAINDCTION',
    name: 'Industrial Production',
    units: '%',
    periodicity: 'Quarterly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-06-30',
        value: -13,
      },
      {
        date: '2023-09-30',
        value: -14.5,
      },
      {
        date: '2023-12-31',
        value: -5.9,
      },
      {
        date: '2024-03-31',
        value: -3.4,
      },
      {
        date: '2024-06-30',
        value: -5,
      },
      {
        date: '2024-09-30',
        value: -4.6,
      },
      {
        date: '2024-12-31',
        value: -13.7,
      },
      {
        date: '2025-03-31',
        value: -2.1,
      },
      {
        date: '2025-06-30',
        value: -0.5,
      },
      {
        date: 'last10YearsAvg',
        value: 9.99,
      },
    ],
  },
  {
    id: 'JPNTNMO',
    name: 'Tankan Non-Manufacturing Outlook',
    units: 'points',
    periodicity: 'Quarterly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'qualitative',
      indicator_type: 'sentiment',
      indicator_category: 'qualitative',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2021-12-31',
        value: 3,
      },
      {
        date: '2022-03-31',
        value: 8,
      },
      {
        date: '2022-06-30',
        value: 13,
      },
      {
        date: '2022-09-30',
        value: 13,
      },
      {
        date: '2022-12-31',
        value: 11,
      },
      {
        date: '2023-03-31',
        value: 11,
      },
      {
        date: '2023-06-30',
        value: 15,
      },
      {
        date: '2023-09-30',
        value: 20,
      },
      {
        date: '2023-12-31',
        value: 21,
      },
      {
        date: 'last10YearsAvg',
        value: 11.8,
      },
    ],
  },
  {
    id: 'PFX_LS_PAK_PKR',
    name: 'Pakistan Parallel FX Rate (PKR)',
    units: 'PKR',
    periodicity: 'Daily',
    category_group: 'Markets',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: 'PKR',
    dataset: null,
    expectation: {
      indicator_family: 'price-value',
      indicator_type: 'price',
      indicator_category: 'price-value',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2025-09-22',
        value: 282.588,
      },
      {
        date: '2025-09-23',
        value: 282.463,
      },
      {
        date: '2025-09-24',
        value: 282.45,
      },
      {
        date: '2025-09-25',
        value: 282.525,
      },
      {
        date: '2025-09-26',
        value: 282.438,
      },
      {
        date: '2025-09-27',
        value: 282.4,
      },
      {
        date: '2025-09-28',
        value: 282.4,
      },
      {
        date: '2025-09-29',
        value: 282.475,
      },
      {
        date: '2025-09-30',
        value: 282.388,
      },
      {
        date: '2025-10-01',
        value: 282.35,
      },
    ],
  },
  {
    id: 'UFX_WB_CAF_XAF',
    name: 'Central African Republic Alternative Official FX Rate Rate (XAF)',
    units: 'XAF',
    periodicity: 'Monthly',
    category_group: 'Markets',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: 'XAF',
    dataset: null,
    expectation: {
      indicator_family: 'price-value',
      indicator_type: 'price',
      indicator_category: 'price-value',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2024-12-01',
        value: 625.99,
      },
      {
        date: '2025-01-01',
        value: 633.55,
      },
      {
        date: '2025-02-01',
        value: 629.97,
      },
      {
        date: '2025-03-01',
        value: 606.98,
      },
      {
        date: '2025-04-01',
        value: 584.95,
      },
      {
        date: '2025-05-01',
        value: 581.62,
      },
      {
        date: '2025-06-01',
        value: 569.6,
      },
      {
        date: '2025-07-01',
        value: 561.76,
      },
      {
        date: '2025-08-01',
        value: 563.13,
      },
      {
        date: '2025-09-01',
        value: 561.55,
      },
    ],
  },
  {
    id: 'AFGSTANEXPXPORTS',
    name: 'Exports',
    units: 'USD Million',
    periodicity: 'Yearly',
    category_group: 'Trade',
    topic: null,
    aggregation_method: null,
    scale: 'Millions',
    currency_code: 'USD',
    dataset: null,
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'flow',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'period-total',
      is_currency_denominated: true,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2015-12-31',
        value: 571.405,
      },
      {
        date: '2016-12-31',
        value: 596.455,
      },
      {
        date: '2017-12-31',
        value: 831.927,
      },
      {
        date: '2018-12-31',
        value: 875.241,
      },
      {
        date: '2019-12-31',
        value: 884.902,
      },
      {
        date: '2020-12-31',
        value: 773.28,
      },
      {
        date: '2021-12-31',
        value: 1058.597,
      },
      {
        date: '2022-12-31',
        value: 1837.556,
      },
      {
        date: '2023-12-31',
        value: 1777.943,
      },
      {
        date: 'last10YearsAvg',
        value: 851.487,
      },
    ],
  },
  {
    id: 'MEXMMCIRM',
    name: 'Mid-month Core Inflation Rate MoM',
    units: '%',
    periodicity: 'Monthly',
    category_group: 'Prices',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2025-01-31',
        value: 0.28,
      },
      {
        date: '2025-02-28',
        value: 0.27,
      },
      {
        date: '2025-03-31',
        value: 0.24,
      },
      {
        date: '2025-04-30',
        value: 0.34,
      },
      {
        date: '2025-05-31',
        value: 0.16,
      },
      {
        date: '2025-06-30',
        value: 0.22,
      },
      {
        date: '2025-07-31',
        value: 0.15,
      },
      {
        date: '2025-08-31',
        value: 0.09,
      },
      {
        date: '2025-09-30',
        value: 0.22,
      },
      {
        date: 'last10YearsAvg',
        value: 0.232,
      },
    ],
  },
  {
    id: 'NGDPPC',
    name: 'Gross domestic product per capita, current prices',
    units: 'National currency',
    periodicity: 'Biannually',
    category_group: null,
    topic: null,
    aggregation_method: null,
    scale: 'Units',
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'numeric-measurement',
      indicator_type: 'ratio',
      indicator_category: 'numeric-measurement',
      temporal_aggregation: 'not-applicable',
      is_currency_denominated: true,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: 'last10YearsAvg',
        value: 16916.88,
      },
      {
        date: 'last10YearsAvg',
        value: 593390.069,
      },
      {
        date: 'last10YearsAvg',
        value: 11971.687,
      },
      {
        date: 'last10YearsAvg',
        value: 152012.717,
      },
      {
        date: 'last10YearsAvg',
        value: 44718.583,
      },
      {
        date: 'last10YearsAvg',
        value: 213423.771,
      },
      {
        date: 'last10YearsAvg',
        value: 4290511.675,
      },
      {
        date: 'last10YearsAvg',
        value: 3269505.1,
      },
      {
        date: 'last10YearsAvg',
        value: 35897.822,
      },
      {
        date: 'last10YearsAvg',
        value: 3134.244,
      },
    ],
  },
  {
    id: 'NGDP',
    name: 'Gross domestic product, current prices',
    units: 'National currency',
    periodicity: 'Biannually',
    category_group: null,
    topic: null,
    aggregation_method: null,
    scale: 'Billions',
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'flow',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'period-total',
      is_currency_denominated: true,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: 'last10YearsAvg',
        value: 4094.907,
      },
      {
        date: 'last10YearsAvg',
        value: 0.236,
      },
      {
        date: 'last10YearsAvg',
        value: 3.137,
      },
      {
        date: 'last10YearsAvg',
        value: 103.656,
      },
      {
        date: 'last10YearsAvg',
        value: 25.696,
      },
      {
        date: 'last10YearsAvg',
        value: 404.891,
      },
      {
        date: 'last10YearsAvg',
        value: 30.697,
      },
      {
        date: 'last10YearsAvg',
        value: 715.516,
      },
      {
        date: 'last10YearsAvg',
        value: 22558.147,
      },
      {
        date: 'last10YearsAvg',
        value: 4738.5,
      },
    ],
  },
  {
    id: 'DNKMPMOM',
    name: 'Manufacturing Production MoM',
    units: '%',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-05-31',
        value: -1.3,
      },
      {
        date: '2023-06-30',
        value: 6.2,
      },
      {
        date: '2023-07-31',
        value: -9.4,
      },
      {
        date: '2023-08-31',
        value: 0.3,
      },
      {
        date: '2023-09-30',
        value: 0.2,
      },
      {
        date: '2023-10-31',
        value: 1.3,
      },
      {
        date: '2023-11-30',
        value: 9.9,
      },
      {
        date: '2023-12-31',
        value: 5.7,
      },
      {
        date: '2024-01-31',
        value: -3.5,
      },
      {
        date: 'last10YearsAvg',
        value: 1.29,
      },
    ],
  },
  {
    id: 'SPEXPNOOA',
    name: 'Exports of Non-oil Domestic Exports Of',
    units: '%',
    periodicity: 'Monthly',
    category_group: 'Trade',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-05-31',
        value: -14.6,
      },
      {
        date: '2023-06-30',
        value: 5.2,
      },
      {
        date: '2023-07-31',
        value: -3.5,
      },
      {
        date: '2023-08-31',
        value: -6.6,
      },
      {
        date: '2023-09-30',
        value: 11.1,
      },
      {
        date: '2023-10-31',
        value: 3.4,
      },
      {
        date: '2023-11-30',
        value: 0.3,
      },
      {
        date: '2023-12-31',
        value: -2.8,
      },
      {
        date: '2024-01-31',
        value: 2.3,
      },
      {
        date: 'last10YearsAvg',
        value: 1.35,
      },
    ],
  },
  {
    id: 'USACPI',
    name: 'CFNAI Production Index',
    units: '%',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2022-12-31',
        value: -0.43,
      },
      {
        date: '2023-01-31',
        value: 0.04,
      },
      {
        date: '2023-02-28',
        value: -0.08,
      },
      {
        date: '2023-03-31',
        value: -0.2,
      },
      {
        date: '2023-04-30',
        value: 0.17,
      },
      {
        date: '2023-05-31',
        value: -0.21,
      },
      {
        date: '2023-06-30',
        value: -0.27,
      },
      {
        date: '2023-07-31',
        value: 0.12,
      },
      {
        date: '2023-08-31',
        value: -0.02,
      },
      {
        date: 'last10YearsAvg',
        value: -0.123,
      },
    ],
  },
  {
    id: 'AGOFYGG',
    name: 'Full Year GDP Growth',
    units: '%',
    periodicity: 'Yearly',
    category_group: 'GDP',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2016-12-31',
        value: -2.6,
      },
      {
        date: '2017-12-31',
        value: -0.1,
      },
      {
        date: '2018-12-31',
        value: -2,
      },
      {
        date: '2019-12-31',
        value: -0.7,
      },
      {
        date: '2020-12-31',
        value: -5.6,
      },
      {
        date: '2021-12-31',
        value: 1.2,
      },
      {
        date: '2022-12-31',
        value: 3,
      },
      {
        date: '2023-12-31',
        value: 1.1,
      },
      {
        date: '2024-12-31',
        value: 4.4,
      },
      {
        date: 'last10YearsAvg',
        value: 0.39,
      },
    ],
  },
  {
    id: 'AUSIIC',
    name: 'Industry Index Construction',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-04-30',
        value: -12.4,
      },
      {
        date: '2023-05-31',
        value: -6.6,
      },
      {
        date: '2023-06-30',
        value: 10.6,
      },
      {
        date: '2023-07-31',
        value: -9.2,
      },
      {
        date: '2023-08-31',
        value: -9.9,
      },
      {
        date: '2023-09-30',
        value: 7.1,
      },
      {
        date: '2023-11-30',
        value: -22.2,
      },
      {
        date: '2024-01-31',
        value: -11.5,
      },
      {
        date: '2024-02-29',
        value: -18.4,
      },
      {
        date: 'last10YearsAvg',
        value: -6.49,
      },
    ],
  },
  {
    id: 'CANADAOILEXP',
    name: 'Oil Exports',
    units: 'CAD Million',
    periodicity: 'Monthly',
    category_group: 'Trade',
    topic: null,
    aggregation_method: null,
    scale: 'Millions',
    currency_code: 'CAD',
    dataset: null,
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'flow',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'period-total',
      is_currency_denominated: true,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2022-12-31',
        value: 9777.7,
      },
      {
        date: '2023-01-31',
        value: 9641.3,
      },
      {
        date: '2023-02-28',
        value: 9293.7,
      },
      {
        date: '2023-03-31',
        value: 8596.7,
      },
      {
        date: '2023-04-30',
        value: 8938.2,
      },
      {
        date: '2023-05-31',
        value: 8799.7,
      },
      {
        date: '2023-06-30',
        value: 8493.6,
      },
      {
        date: '2023-07-31',
        value: 9061,
      },
      {
        date: '2023-08-31',
        value: 10782.2,
      },
      {
        date: 'last10YearsAvg',
        value: 9416.68,
      },
    ],
  },
  {
    id: 'CHNBCONDI',
    name: 'Business Conditions Index',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2024-11-30',
        value: 50.5,
      },
      {
        date: '2024-12-31',
        value: 48.3,
      },
      {
        date: '2025-01-31',
        value: 49.4,
      },
      {
        date: '2025-02-28',
        value: 52.8,
      },
      {
        date: '2025-03-31',
        value: 54.8,
      },
      {
        date: '2025-04-30',
        value: 50.1,
      },
      {
        date: '2025-05-31',
        value: 50.3,
      },
      {
        date: '2025-06-30',
        value: 49.3,
      },
      {
        date: '2025-07-31',
        value: 47.7,
      },
      {
        date: '2025-08-31',
        value: 46.9,
      },
    ],
  },
  {
    id: 'UNITEDSTALIC',
    name: 'Lmi Inventory Costs',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'period-average',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2022-12-31',
        value: 72.8,
      },
      {
        date: '2023-01-31',
        value: 74.2,
      },
      {
        date: '2023-02-28',
        value: 70.9,
      },
      {
        date: '2023-03-31',
        value: 66,
      },
      {
        date: '2023-04-30',
        value: 65.1,
      },
      {
        date: '2023-05-31',
        value: 64.4,
      },
      {
        date: '2023-06-30',
        value: 57.1,
      },
      {
        date: '2023-07-31',
        value: 60.5,
      },
      {
        date: '2023-08-31',
        value: 69.1,
      },
      {
        date: 'last10YearsAvg',
        value: 67.35,
      },
    ],
  },
  {
    id: 'UNITEDSTANAHHOUMARIN',
    name: 'Nahb Housing Market Index',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Housing',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-01-31',
        value: 35,
      },
      {
        date: '2023-02-28',
        value: 42,
      },
      {
        date: '2023-03-31',
        value: 44,
      },
      {
        date: '2023-04-30',
        value: 45,
      },
      {
        date: '2023-05-31',
        value: 50,
      },
      {
        date: '2023-06-30',
        value: 55,
      },
      {
        date: '2023-07-31',
        value: 56,
      },
      {
        date: '2023-08-31',
        value: 50,
      },
      {
        date: '2023-09-30',
        value: 45,
      },
      {
        date: 'last10YearsAvg',
        value: 45.3,
      },
    ],
  },
  {
    id: 'TMG_RPCH',
    name: 'Volume of Imports of goods',
    units: 'Percent change',
    periodicity: 'Biannually',
    category_group: null,
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: 'last10YearsPeerAvg',
        value: 2.795,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 1.641,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 2.302,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 4.034,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 2.302,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 2.179,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 2.231,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 2.302,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 1.627,
      },
      {
        date: 'last10YearsPeerAvg',
        value: 1.627,
      },
    ],
  },
  {
    id: 'TD_RESERVES_GFR_LS_AGO_M',
    name: 'Gross Foreign Reserves',
    units: 'USD Million',
    periodicity: 'Monthly',
    category_group: 'Reserves',
    topic: null,
    aggregation_method: null,
    scale: 'Millions',
    currency_code: 'USD',
    dataset: null,
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'stock',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: true,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2024-10-31',
        value: 14727,
      },
      {
        date: '2024-11-30',
        value: 14597,
      },
      {
        date: '2024-12-31',
        value: 15767.56,
      },
      {
        date: '2025-01-31',
        value: 15661.88,
      },
      {
        date: '2025-02-28',
        value: 15343.79,
      },
      {
        date: '2025-03-31',
        value: 15265.92,
      },
      {
        date: '2025-04-30',
        value: 15475,
      },
      {
        date: '2025-05-31',
        value: 15712.59,
      },
      {
        date: '2025-06-30',
        value: 15660.65,
      },
      {
        date: '2025-07-31',
        value: 15107.26,
      },
    ],
  },
  {
    id: 'NE.IMP.GNFS.KD.ZG',
    name: 'Imports of goods and services (annual % growth)',
    units: 'Annual % growth',
    periodicity: 'Annual',
    category_group: null,
    topic: 'Economic Policy & Debt: National accounts: Growth rates',
    aggregation_method: 'Weighed average',
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: 'last10YearsAvg',
        value: 2.351,
      },
      {
        date: 'last10YearsAvg',
        value: 1.76,
      },
      {
        date: 'last10YearsAvg',
        value: 0.592,
      },
      {
        date: 'last10YearsAvg',
        value: 0.179,
      },
      {
        date: 'last10YearsAvg',
        value: 2.308,
      },
      {
        date: 'last10YearsAvg',
        value: 7.753,
      },
      {
        date: 'last10YearsAvg',
        value: 3.561,
      },
      {
        date: 'last10YearsAvg',
        value: 1.267,
      },
      {
        date: 'last10YearsAvg',
        value: -2.424,
      },
      {
        date: 'last10YearsAvg',
        value: 3.543,
      },
    ],
  },
  {
    id: 'AFGHANISTAGSTG',
    name: 'Government Spending to GDP',
    units: 'percent of GDP',
    periodicity: 'Yearly',
    category_group: 'Government',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'numeric-measurement',
      indicator_type: 'ratio',
      indicator_category: 'numeric-measurement',
      temporal_aggregation: 'not-applicable',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2015-12-31',
        value: 12.1,
      },
      {
        date: '2016-12-31',
        value: 23,
      },
      {
        date: '2017-12-31',
        value: 21.5,
      },
      {
        date: '2018-12-31',
        value: 19.5,
      },
      {
        date: '2019-12-31',
        value: 24.1,
      },
      {
        date: '2020-12-31',
        value: 22.1,
      },
      {
        date: '2021-12-31',
        value: 21.3,
      },
      {
        date: '2022-12-31',
        value: 21.8,
      },
      {
        date: '2023-12-31',
        value: 21.2,
      },
      {
        date: 'last10YearsAvg',
        value: 18.94,
      },
    ],
  },
  {
    id: 'AFGHANISTAGDPFROMAN',
    name: 'GDP from Manufacturing',
    units: 'AFN Million',
    periodicity: 'Yearly',
    category_group: 'GDP',
    topic: null,
    aggregation_method: null,
    scale: 'Millions',
    currency_code: 'AFN',
    dataset: null,
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'flow',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'period-total',
      is_currency_denominated: true,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2015-12-31',
        value: 50964.2,
      },
      {
        date: '2016-12-31',
        value: 51524,
      },
      {
        date: '2017-12-31',
        value: 43090.23,
      },
      {
        date: '2018-12-31',
        value: 73053.77,
      },
      {
        date: '2019-12-31',
        value: 109873,
      },
      {
        date: '2020-12-31',
        value: 101936,
      },
      {
        date: '2021-12-31',
        value: 91431,
      },
      {
        date: '2022-12-31',
        value: 82304,
      },
      {
        date: '2023-12-31',
        value: 83686,
      },
      {
        date: 'last10YearsAvg',
        value: 70634.39,
      },
    ],
  },
  {
    id: 'USAKFEI',
    name: 'Kansas Fed Employment Index',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-01-31',
        value: 4,
      },
      {
        date: '2023-02-28',
        value: 11,
      },
      {
        date: '2023-03-31',
        value: 18,
      },
      {
        date: '2023-04-30',
        value: -1,
      },
      {
        date: '2023-05-31',
        value: 7,
      },
      {
        date: '2023-06-30',
        value: -12,
      },
      {
        date: '2023-07-31',
        value: 4,
      },
      {
        date: '2023-08-31',
        value: 1,
      },
      {
        date: '2023-09-30',
        value: 2,
      },
      {
        date: 'last10YearsAvg',
        value: 3.4,
      },
    ],
  },
  {
    id: 'AUSIIM',
    name: 'Industry Index Manufacturing',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-04-30',
        value: -20.2,
      },
      {
        date: '2023-05-31',
        value: -5.1,
      },
      {
        date: '2023-06-30',
        value: -19.8,
      },
      {
        date: '2023-07-31',
        value: -25.6,
      },
      {
        date: '2023-08-31',
        value: -19.8,
      },
      {
        date: '2023-09-30',
        value: -12.8,
      },
      {
        date: '2023-11-30',
        value: -25.3,
      },
      {
        date: '2024-01-01',
        value: -23.8,
      },
      {
        date: '2024-02-29',
        value: -12.6,
      },
      {
        date: 'last10YearsAvg',
        value: -15.32,
      },
    ],
  },
  {
    id: 'JAPANTERINDIND',
    name: 'Tertiary Industry Index',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-04-30',
        value: 100.6,
      },
      {
        date: '2023-05-31',
        value: 101.6,
      },
      {
        date: '2023-06-30',
        value: 100.8,
      },
      {
        date: '2023-07-31',
        value: 101.6,
      },
      {
        date: '2023-08-31',
        value: 102.3,
      },
      {
        date: '2023-09-30',
        value: 101.3,
      },
      {
        date: '2023-10-31',
        value: 100.4,
      },
      {
        date: '2023-11-30',
        value: 100.2,
      },
      {
        date: '2023-12-31',
        value: 100.2,
      },
      {
        date: 'last10YearsAvg',
        value: 101,
      },
    ],
  },
  {
    id: 'USAKFPPI',
    name: 'Kansas Fed Prices Paid Index',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'period-average',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2023-01-31',
        value: 20,
      },
      {
        date: '2023-02-28',
        value: 26,
      },
      {
        date: '2023-03-31',
        value: 30,
      },
      {
        date: '2023-04-30',
        value: 32,
      },
      {
        date: '2023-05-31',
        value: 16,
      },
      {
        date: '2023-06-30',
        value: 4,
      },
      {
        date: '2023-07-31',
        value: 9,
      },
      {
        date: '2023-08-31',
        value: 13,
      },
      {
        date: '2023-09-30',
        value: 7,
      },
      {
        date: 'last10YearsAvg',
        value: 17,
      },
    ],
  },
  {
    id: 'NGDPRPC',
    name: 'Gross domestic product per capita, constant prices',
    units: 'National currency',
    periodicity: 'Biannually',
    category_group: null,
    topic: null,
    aggregation_method: null,
    scale: 'Units',
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'numeric-measurement',
      indicator_type: 'ratio',
      indicator_category: 'numeric-measurement',
      temporal_aggregation: 'not-applicable',
      is_currency_denominated: true,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: 'last10YearsAvg',
        value: 12077.515,
      },
      {
        date: 'last10YearsAvg',
        value: 37898.852,
      },
      {
        date: 'last10YearsAvg',
        value: 4261521.001,
      },
      {
        date: 'last10YearsAvg',
        value: 3691683.306,
      },
      {
        date: 'last10YearsAvg',
        value: 984124.813,
      },
      {
        date: 'last10YearsAvg',
        value: 59966.235,
      },
      {
        date: 'last10YearsAvg',
        value: 28337130.878,
      },
      {
        date: 'last10YearsAvg',
        value: 15166.145,
      },
      {
        date: 'last10YearsAvg',
        value: 647561.671,
      },
      {
        date: 'last10YearsAvg',
        value: 687.625,
      },
    ],
  },
  {
    id: 'AUSTRALIASERPMI',
    name: 'Services PMI',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'period-average',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-05-31',
        value: 52.1,
      },
      {
        date: '2023-06-30',
        value: 50.3,
      },
      {
        date: '2023-07-31',
        value: 47.9,
      },
      {
        date: '2023-08-31',
        value: 47.8,
      },
      {
        date: '2023-09-30',
        value: 51.8,
      },
      {
        date: '2023-11-30',
        value: 46,
      },
      {
        date: '2023-12-31',
        value: 47.6,
      },
      {
        date: '2024-01-31',
        value: 47.9,
      },
      {
        date: '2024-02-29',
        value: 52.8,
      },
      {
        date: 'last10YearsAvg',
        value: 49.37,
      },
    ],
  },
  {
    id: 'DEUIFOEXP',
    name: 'Ifo Expectations',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'period-average',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-01-31',
        value: 85.9,
      },
      {
        date: '2023-02-28',
        value: 87.6,
      },
      {
        date: '2023-03-31',
        value: 90.5,
      },
      {
        date: '2023-04-30',
        value: 91.8,
      },
      {
        date: '2023-05-31',
        value: 88.5,
      },
      {
        date: '2023-06-30',
        value: 83.8,
      },
      {
        date: '2023-07-31',
        value: 83.6,
      },
      {
        date: '2023-08-31',
        value: 82.7,
      },
      {
        date: '2023-09-30',
        value: 82.9,
      },
      {
        date: 'last10YearsAvg',
        value: 86.07,
      },
    ],
  },
  {
    id: 'CANADABUSCLIIND',
    name: 'Business Climate Indicator',
    units: 'points',
    periodicity: 'Quarterly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'period-average',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2021-06-30',
        value: 3.07,
      },
      {
        date: '2021-09-30',
        value: 4.41,
      },
      {
        date: '2021-12-31',
        value: 5.92,
      },
      {
        date: '2022-03-31',
        value: 4.94,
      },
      {
        date: '2022-06-30',
        value: 4.83,
      },
      {
        date: '2022-09-30',
        value: 1.79,
      },
      {
        date: '2022-12-31',
        value: 0.08,
      },
      {
        date: '2023-03-31',
        value: -1.07,
      },
      {
        date: '2023-06-30',
        value: -2.15,
      },
      {
        date: 'last10YearsAvg',
        value: 2.35,
      },
    ],
  },
  {
    id: 'AUSIIBS',
    name: 'Industry Index Business Services',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'period-average',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-02-28',
        value: 1.7,
      },
      {
        date: '2023-03-31',
        value: -10.2,
      },
      {
        date: '2023-04-30',
        value: -24.7,
      },
      {
        date: '2023-05-31',
        value: -14.2,
      },
      {
        date: '2023-06-30',
        value: -21.7,
      },
      {
        date: '2023-07-31',
        value: -15.1,
      },
      {
        date: '2023-08-31',
        value: -10.1,
      },
      {
        date: '2023-09-30',
        value: -6.6,
      },
      {
        date: '2023-11-30',
        value: -22.4,
      },
      {
        date: 'last10YearsAvg',
        value: -12.19,
      },
    ],
  },
  {
    id: 'AURPP',
    name: 'Residential Property Prices',
    units: 'Percent',
    periodicity: 'Quarterly',
    category_group: 'Housing',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2021-06-30',
        value: 16.76,
      },
      {
        date: '2021-09-30',
        value: 21.69,
      },
      {
        date: '2021-12-31',
        value: 23.67,
      },
      {
        date: '2022-03-31',
        value: 20.64,
      },
      {
        date: '2022-06-30',
        value: 14.15,
      },
      {
        date: '2022-09-30',
        value: 5.23,
      },
      {
        date: '2022-12-31',
        value: -3.2,
      },
      {
        date: '2023-03-31',
        value: -7.71,
      },
      {
        date: '2023-09-30',
        value: 2.16,
      },
      {
        date: 'last10YearsAvg',
        value: 10.233,
      },
    ],
  },
  {
    id: 'USAPFPP',
    name: 'Philly Fed Prices Paid',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'period-average',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2023-01-31',
        value: 24.5,
      },
      {
        date: '2023-02-28',
        value: 26.5,
      },
      {
        date: '2023-03-31',
        value: 23.5,
      },
      {
        date: '2023-04-30',
        value: 8.2,
      },
      {
        date: '2023-05-31',
        value: 10.9,
      },
      {
        date: '2023-06-30',
        value: 10.5,
      },
      {
        date: '2023-07-31',
        value: 9.5,
      },
      {
        date: '2023-08-31',
        value: 20.8,
      },
      {
        date: '2023-09-30',
        value: 25.7,
      },
      {
        date: 'last10YearsAvg',
        value: 19.64,
      },
    ],
  },
  {
    id: 'DT.DOD.DLXF.CD',
    name: 'Long-term external debt',
    units: 'DOD, current USD',
    periodicity: 'Annual',
    category_group: null,
    topic: 'Economic Policy & Debt: External debt: Debt outstanding',
    aggregation_method: 'Sum',
    scale: null,
    currency_code: null,
    dataset: 'International Debt Statistics',
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'stock',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: true,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: 'last10YearsAvg',
        value: 3278696159,
      },
      {
        date: 'last10YearsAvg',
        value: 398747724.04,
      },
      {
        date: 'last10YearsAvg',
        value: 115322160.74,
      },
      {
        date: 'last10YearsAvg',
        value: 1251193277.43,
      },
      {
        date: 'last10YearsAvg',
        value: 6968061703.46,
      },
      {
        date: 'last10YearsAvg',
        value: 59546658.25,
      },
      {
        date: 'last10YearsAvg',
        value: 33041748056.49,
      },
      {
        date: 'last10YearsAvg',
        value: 5196740000,
      },
      {
        date: 'last10YearsAvg',
        value: 25677815404.55,
      },
      {
        date: 'last10YearsAvg',
        value: 390480591.7,
      },
    ],
  },
  {
    id: 'ARGENTINAEXPPRI',
    name: 'Export Prices',
    units: 'points',
    periodicity: 'Quarterly',
    category_group: 'Prices',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2023-06-30',
        value: 197.4,
      },
      {
        date: '2023-09-30',
        value: 188,
      },
      {
        date: '2023-12-31',
        value: 186.4,
      },
      {
        date: '2024-03-31',
        value: 186.7,
      },
      {
        date: '2024-06-30',
        value: 183.5,
      },
      {
        date: '2024-09-30',
        value: 178.1,
      },
      {
        date: '2024-12-31',
        value: 181.7,
      },
      {
        date: '2025-03-31',
        value: 185.5,
      },
      {
        date: '2025-06-30',
        value: 181.7,
      },
      {
        date: 'last10YearsAvg',
        value: 200.74,
      },
    ],
  },
  {
    id: 'USAIMP',
    name: 'ISM Manufacturing Prices',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'period-average',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2023-02-28',
        value: 51.3,
      },
      {
        date: '2023-03-31',
        value: 49.2,
      },
      {
        date: '2023-04-30',
        value: 53.2,
      },
      {
        date: '2023-05-30',
        value: 44.2,
      },
      {
        date: '2023-05-31',
        value: 44.2,
      },
      {
        date: '2023-06-30',
        value: 41.8,
      },
      {
        date: '2023-07-31',
        value: 42.6,
      },
      {
        date: '2023-08-31',
        value: 48.4,
      },
      {
        date: '2023-09-30',
        value: 43.8,
      },
      {
        date: 'last10YearsAvg',
        value: 46.32,
      },
    ],
  },
  {
    id: 'UNITEDKINNATHOUPRI',
    name: 'Nationwide Housing Prices',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Housing',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2023-01-31',
        value: 515.27,
      },
      {
        date: '2023-02-28',
        value: 513.5,
      },
      {
        date: '2023-03-31',
        value: 512.93,
      },
      {
        date: '2023-04-30',
        value: 519.55,
      },
      {
        date: '2023-05-31',
        value: 520.14,
      },
      {
        date: '2023-06-30',
        value: 523.14,
      },
      {
        date: '2023-07-31',
        value: 520.32,
      },
      {
        date: '2023-08-31',
        value: 516.98,
      },
      {
        date: '2023-09-30',
        value: 514.3,
      },
      {
        date: 'last10YearsAvg',
        value: 517.893,
      },
    ],
  },
  {
    id: 'ALBWAGEGROWTH',
    name: 'Wage Growth',
    units: 'percent',
    periodicity: 'Quarterly',
    category_group: 'Labour',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-03-31',
        value: 9.22,
      },
      {
        date: '2023-06-30',
        value: 16.88,
      },
      {
        date: '2023-09-30',
        value: 16.02,
      },
      {
        date: '2023-12-31',
        value: 13.65,
      },
      {
        date: '2024-03-31',
        value: 13.8,
      },
      {
        date: '2024-06-30',
        value: 5.9,
      },
      {
        date: '2024-09-30',
        value: 8.6,
      },
      {
        date: '2024-12-31',
        value: 11.2,
      },
      {
        date: '2025-03-31',
        value: 11.6,
      },
      {
        date: '2025-06-30',
        value: 10.6,
      },
    ],
  },
  {
    id: 'UNITEDKINCLACOUCHA',
    name: 'Claimant Count Change',
    units: 'Thousand',
    periodicity: 'Monthly',
    category_group: 'Labour',
    topic: null,
    aggregation_method: null,
    scale: 'Thousands',
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'numeric-measurement',
      indicator_type: 'balance',
      indicator_category: 'numeric-measurement',
      temporal_aggregation: 'period-total',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2022-12-31',
        value: 7,
      },
      {
        date: '2023-01-31',
        value: -21.5,
      },
      {
        date: '2023-02-28',
        value: -18.8,
      },
      {
        date: '2023-03-31',
        value: 26.5,
      },
      {
        date: '2023-04-30',
        value: 23.4,
      },
      {
        date: '2023-05-31',
        value: -22.5,
      },
      {
        date: '2023-06-30',
        value: 16.2,
      },
      {
        date: '2023-07-31',
        value: 7.4,
      },
      {
        date: '2023-08-31',
        value: 0.9,
      },
      {
        date: 'last10YearsAvg',
        value: 3.21,
      },
    ],
  },
  {
    id: 'UNITEDSTAPCEPRIIND',
    name: 'PCE Price Index',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Prices',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2022-12-31',
        value: 125.141,
      },
      {
        date: '2023-01-31',
        value: 125.874,
      },
      {
        date: '2023-02-28',
        value: 126.24,
      },
      {
        date: '2023-03-31',
        value: 126.385,
      },
      {
        date: '2023-04-30',
        value: 126.772,
      },
      {
        date: '2023-05-31',
        value: 120.02,
      },
      {
        date: '2023-06-30',
        value: 120.221,
      },
      {
        date: '2023-07-31',
        value: 120.478,
      },
      {
        date: '2023-08-31',
        value: 120.953,
      },
      {
        date: 'last10YearsAvg',
        value: 123.697,
      },
    ],
  },
  {
    id: 'ARGENTINACORCONPRI',
    name: 'Core Consumer Prices',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Prices',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2024-12-31',
        value: 7808.709,
      },
      {
        date: '2025-01-31',
        value: 7995.938,
      },
      {
        date: '2025-02-28',
        value: 8229.448,
      },
      {
        date: '2025-03-31',
        value: 8492.197,
      },
      {
        date: '2025-04-30',
        value: 8765.197,
      },
      {
        date: '2025-05-31',
        value: 8957.791,
      },
      {
        date: '2025-06-30',
        value: 9111.304,
      },
      {
        date: '2025-07-31',
        value: 9246.074,
      },
      {
        date: '2025-08-31',
        value: 9435.147,
      },
      {
        date: 'last10YearsAvg',
        value: 2206.447,
      },
    ],
  },
  {
    id: 'USAINMP',
    name: 'ISM Non Manufacturing Prices',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'period-average',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2022-12-31',
        value: 68.1,
      },
      {
        date: '2023-01-31',
        value: 67.8,
      },
      {
        date: '2023-02-28',
        value: 65.6,
      },
      {
        date: '2023-03-31',
        value: 59.5,
      },
      {
        date: '2023-04-30',
        value: 59.6,
      },
      {
        date: '2023-05-31',
        value: 56.2,
      },
      {
        date: '2023-06-30',
        value: 54.1,
      },
      {
        date: '2023-07-31',
        value: 56.8,
      },
      {
        date: '2023-08-31',
        value: 58.9,
      },
      {
        date: 'last10YearsAvg',
        value: 61.67,
      },
    ],
  },
  {
    id: 'AFGHANISTACONPRIINDC',
    name: 'Consumer Price Index CPI',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Prices',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2024-11-30',
        value: 126.8,
      },
      {
        date: '2024-12-31',
        value: 128.4,
      },
      {
        date: '2025-01-31',
        value: 128.4,
      },
      {
        date: '2025-02-28',
        value: 130.7,
      },
      {
        date: '2025-03-31',
        value: 131,
      },
      {
        date: '2025-04-30',
        value: 131.2,
      },
      {
        date: '2025-05-31',
        value: 130.5,
      },
      {
        date: '2025-06-30',
        value: 128.8,
      },
      {
        date: '2025-07-31',
        value: 129,
      },
      {
        date: 'last10YearsAvg',
        value: 138.7,
      },
    ],
  },
  {
    id: 'USADFMPPI',
    name: 'Dallas Fed Manufacturing Prices Paid Index',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'period-average',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2023-01-31',
        value: 20.5,
      },
      {
        date: '2023-02-28',
        value: 25.1,
      },
      {
        date: '2023-03-31',
        value: 20.3,
      },
      {
        date: '2023-04-30',
        value: 19.5,
      },
      {
        date: '2023-05-31',
        value: 13.8,
      },
      {
        date: '2023-06-30',
        value: 1.4,
      },
      {
        date: '2023-07-31',
        value: 10.5,
      },
      {
        date: '2023-08-31',
        value: 17.4,
      },
      {
        date: '2023-09-30',
        value: 25,
      },
      {
        date: 'last10YearsAvg',
        value: 17.54,
      },
    ],
  },
  {
    id: 'DT.DOD.DIMF.CD',
    name: 'Use of IMF Credit and SDR allocations',
    units: 'DOD, current USD',
    periodicity: 'Annual',
    category_group: null,
    topic: 'Economic Policy & Debt: External debt: Debt outstanding',
    aggregation_method: 'Sum',
    scale: null,
    currency_code: null,
    dataset: 'International Debt Statistics',
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'stock',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: true,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: 'last10YearsAvg',
        value: 104143862.43,
      },
      {
        date: 'last10YearsAvg',
        value: 94714319.52,
      },
      {
        date: 'last10YearsAvg',
        value: 37916777.26,
      },
      {
        date: 'last10YearsAvg',
        value: 218562792.97,
      },
      {
        date: 'last10YearsAvg',
        value: 396985968.78,
      },
      {
        date: 'last10YearsAvg',
        value: 4518279275.78,
      },
      {
        date: 'last10YearsAvg',
        value: 215139916.39,
      },
      {
        date: 'last10YearsAvg',
        value: 337146344.2,
      },
      {
        date: 'last10YearsAvg',
        value: 1757233464.09,
      },
      {
        date: 'last10YearsAvg',
        value: 155588924.25,
      },
    ],
  },
  {
    id: 'CHNFDIY',
    name: 'Foreign Direct Investment YoY',
    units: 'percent',
    periodicity: 'Monthly',
    category_group: 'Trade',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2024-11-30',
        value: -27.9,
      },
      {
        date: '2024-12-31',
        value: -27.1,
      },
      {
        date: '2025-01-31',
        value: -13.4,
      },
      {
        date: '2025-02-28',
        value: -19.9,
      },
      {
        date: '2025-03-31',
        value: -10.8,
      },
      {
        date: '2025-04-30',
        value: -10.9,
      },
      {
        date: '2025-05-31',
        value: -13.2,
      },
      {
        date: '2025-06-30',
        value: -15.2,
      },
      {
        date: '2025-07-31',
        value: -13.4,
      },
      {
        date: '2025-08-31',
        value: -12.7,
      },
    ],
  },
  {
    id: 'CHNNHSY',
    name: 'New Home Sales YoY',
    units: 'percent',
    periodicity: 'Monthly',
    category_group: 'Housing',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2024-11-30',
        value: -6.9,
      },
      {
        date: '2024-12-31',
        value: 0,
      },
      {
        date: '2025-01-31',
        value: -3.2,
      },
      {
        date: '2025-02-28',
        value: 1.2,
      },
      {
        date: '2025-03-31',
        value: -11.4,
      },
      {
        date: '2025-04-30',
        value: -8.7,
      },
      {
        date: '2025-05-31',
        value: -8.6,
      },
      {
        date: '2025-06-30',
        value: -23,
      },
      {
        date: '2025-07-31',
        value: -24,
      },
      {
        date: '2025-08-31',
        value: -17.6,
      },
    ],
  },
  {
    id: 'DT.DOD.DSTC.CD',
    name: 'Short-term external debt',
    units: 'DOD, current USD',
    periodicity: 'Annual',
    category_group: null,
    topic: 'Economic Policy & Debt: External debt: Debt outstanding',
    aggregation_method: 'Sum',
    scale: null,
    currency_code: null,
    dataset: 'International Debt Statistics',
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'stock',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: true,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: 'last10YearsAvg',
        value: 695526579.59,
      },
      {
        date: 'last10YearsAvg',
        value: 2063691102.71,
      },
      {
        date: 'last10YearsAvg',
        value: 485324099,
      },
      {
        date: 'last10YearsAvg',
        value: 20839677500,
      },
      {
        date: 'last10YearsAvg',
        value: 35953420000,
      },
      {
        date: 'last10YearsAvg',
        value: 737188392.39,
      },
      {
        date: 'last10YearsAvg',
        value: 57318700000,
      },
      {
        date: 'last10YearsAvg',
        value: 2179224011.39,
      },
      {
        date: 'last10YearsAvg',
        value: 2981840680.06,
      },
      {
        date: 'last10YearsAvg',
        value: 48996819.12,
      },
    ],
  },
  {
    id: 'POLECY',
    name: 'Employment Change YoY',
    units: 'percent',
    periodicity: 'Monthly',
    category_group: 'Labour',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2024-11-30',
        value: -0.5,
      },
      {
        date: '2024-12-31',
        value: -0.6,
      },
      {
        date: '2025-01-31',
        value: -0.9,
      },
      {
        date: '2025-02-28',
        value: -0.9,
      },
      {
        date: '2025-03-31',
        value: -0.9,
      },
      {
        date: '2025-04-30',
        value: -0.8,
      },
      {
        date: '2025-05-31',
        value: -0.8,
      },
      {
        date: '2025-06-30',
        value: -0.8,
      },
      {
        date: '2025-07-31',
        value: -0.9,
      },
      {
        date: '2025-08-31',
        value: -0.8,
      },
    ],
  },
  {
    id: 'AUSTRALIAEMPCHA',
    name: 'Employment Change',
    units: 'Persons',
    periodicity: 'Monthly',
    category_group: 'Labour',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'numeric-measurement',
      indicator_type: 'balance',
      indicator_category: 'numeric-measurement',
      temporal_aggregation: 'period-total',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-03-31',
        value: 69194,
      },
      {
        date: '2023-04-30',
        value: -7911,
      },
      {
        date: '2023-05-31',
        value: 74433,
      },
      {
        date: '2023-06-30',
        value: 27500,
      },
      {
        date: '2023-07-31',
        value: -1400,
      },
      {
        date: '2023-08-31',
        value: 64900,
      },
      {
        date: '2023-11-30',
        value: 61500,
      },
      {
        date: '2023-12-31',
        value: -65100,
      },
      {
        date: '2024-01-31',
        value: 500,
      },
      {
        date: 'last10YearsAvg',
        value: 29825.8,
      },
    ],
  },
  {
    id: 'ALGERIACHAININV',
    name: 'Changes in Inventories',
    units: 'DZD Million',
    periodicity: 'Yearly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: 'Millions',
    currency_code: 'DZD',
    dataset: null,
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'balance',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'period-total',
      is_currency_denominated: true,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2023-03-31',
        value: 241028.2,
      },
      {
        date: '2023-06-30',
        value: 581093.9,
      },
      {
        date: '2023-09-30',
        value: 1011631.2,
      },
      {
        date: '2023-12-31',
        value: -182236.3,
      },
      {
        date: '2024-03-31',
        value: 455605.8,
      },
      {
        date: '2024-06-30',
        value: 353888.9,
      },
      {
        date: '2024-09-30',
        value: 1276382.8,
      },
      {
        date: '2024-12-31',
        value: -122573.3,
      },
      {
        date: '2025-03-31',
        value: 723115.8,
      },
      {
        date: 'last10YearsAvg',
        value: 1187337.67,
      },
    ],
  },
  {
    id: 'JPNHSY',
    name: 'Housing Starts YoY',
    units: 'Percent',
    periodicity: 'Monthly',
    category_group: 'Housing',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-05-31',
        value: 3.5,
      },
      {
        date: '2023-06-30',
        value: -4.8,
      },
      {
        date: '2023-07-31',
        value: -6.7,
      },
      {
        date: '2023-08-31',
        value: -9.4,
      },
      {
        date: '2023-09-30',
        value: -6.8,
      },
      {
        date: '2023-10-31',
        value: -6.3,
      },
      {
        date: '2023-11-30',
        value: -8.5,
      },
      {
        date: '2023-12-31',
        value: -4,
      },
      {
        date: '2024-01-31',
        value: -7.5,
      },
      {
        date: 'last10YearsAvg',
        value: -5.81,
      },
    ],
  },
  {
    id: 'JPNEWSO',
    name: 'Economy Watchers Survey Outlook',
    units: 'points',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'qualitative',
      indicator_type: 'sentiment',
      indicator_category: 'qualitative',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-06-30',
        value: 52.8,
      },
      {
        date: '2023-07-31',
        value: 54.1,
      },
      {
        date: '2023-08-31',
        value: 51.4,
      },
      {
        date: '2023-09-30',
        value: 49.5,
      },
      {
        date: '2023-10-31',
        value: 48.4,
      },
      {
        date: '2023-11-30',
        value: 49.4,
      },
      {
        date: '2023-12-31',
        value: 49.1,
      },
      {
        date: '2024-01-31',
        value: 52.5,
      },
      {
        date: '2024-02-29',
        value: 53,
      },
      {
        date: 'last10YearsAvg',
        value: 51.73,
      },
    ],
  },
  {
    id: 'JPNTLMO',
    name: 'Tankan Large Manufacturing Outlook',
    units: 'points',
    periodicity: 'Quarterly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'qualitative',
      indicator_type: 'sentiment',
      indicator_category: 'qualitative',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2021-12-31',
        value: 13,
      },
      {
        date: '2022-03-31',
        value: 9,
      },
      {
        date: '2022-06-30',
        value: 10,
      },
      {
        date: '2022-09-30',
        value: 9,
      },
      {
        date: '2022-12-31',
        value: 6,
      },
      {
        date: '2023-03-31',
        value: 3,
      },
      {
        date: '2023-06-30',
        value: 9,
      },
      {
        date: '2023-09-30',
        value: 9,
      },
      {
        date: '2023-12-31',
        value: 10,
      },
      {
        date: 'last10YearsAvg',
        value: 9.1,
      },
    ],
  },
  {
    id: 'ARGENTINATEROFTRA',
    name: 'Terms of Trade',
    units: 'points',
    periodicity: 'Quarterly',
    category_group: 'Trade',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'composite-derived',
      indicator_type: 'index',
      indicator_category: 'composite-derived',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-06-30',
        value: 132.6,
      },
      {
        date: '2023-09-30',
        value: 136.8,
      },
      {
        date: '2023-12-31',
        value: 140.3,
      },
      {
        date: '2024-03-31',
        value: 138.4,
      },
      {
        date: '2024-06-30',
        value: 129.7,
      },
      {
        date: '2024-09-30',
        value: 131.3,
      },
      {
        date: '2024-12-31',
        value: 142.1,
      },
      {
        date: '2025-03-31',
        value: 148.3,
      },
      {
        date: '2025-06-30',
        value: 138.4,
      },
      {
        date: 'last10YearsAvg',
        value: 142.27,
      },
    ],
  },
  {
    id: 'DT.AMT.DLXF.CD',
    name: 'Principal repayments on external debt, long-term',
    units: 'AMT, current US$',
    periodicity: 'Annual',
    category_group: null,
    topic: 'Economic Policy & Debt: External debt: Amortization',
    aggregation_method: null,
    scale: null,
    currency_code: 'USD',
    dataset: 'International Debt Statistics',
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'flow',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'period-total',
      is_currency_denominated: true,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2031',
        value: 725004782.1,
      },
      {
        date: '2031',
        value: 6369291555.6,
      },
      {
        date: '2031',
        value: 35775364947.1,
      },
      {
        date: '2031',
        value: 2071452578.9,
      },
      {
        date: '2031',
        value: 150448909,
      },
      {
        date: '2031',
        value: 269863643.3,
      },
      {
        date: '2031',
        value: 1149103485.6,
      },
      {
        date: '2031',
        value: 4855715672.7,
      },
      {
        date: '2031',
        value: 38997990.6,
      },
      {
        date: '2031',
        value: 1207609279.7,
      },
    ],
  },
  {
    id: 'UNITEDSTANETLONTICFL',
    name: 'Net Long-term TIC Flows',
    units: 'USD Million',
    periodicity: 'Monthly',
    category_group: 'Trade',
    topic: null,
    aggregation_method: null,
    scale: 'Millions',
    currency_code: 'USD',
    dataset: null,
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'balance',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'period-total',
      is_currency_denominated: true,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2022-11-30',
        value: 171516,
      },
      {
        date: '2022-12-31',
        value: 152755,
      },
      {
        date: '2023-01-31',
        value: 30791,
      },
      {
        date: '2023-02-28',
        value: 92230,
      },
      {
        date: '2023-03-31',
        value: 207156,
      },
      {
        date: '2023-04-30',
        value: 127064,
      },
      {
        date: '2023-05-31',
        value: 19217,
      },
      {
        date: '2023-06-30',
        value: 185990,
      },
      {
        date: '2023-07-31',
        value: 8777,
      },
      {
        date: 'last10YearsAvg',
        value: 106333.4,
      },
    ],
  },
  {
    id: 'ALBANIAGOVDEB',
    name: 'Government Debt',
    units: 'ALL Million',
    periodicity: 'Quarterly',
    category_group: 'Government',
    topic: null,
    aggregation_method: null,
    scale: 'Millions',
    currency_code: 'ALL',
    dataset: null,
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'stock',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: true,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2023-06-30',
        value: 1363955,
      },
      {
        date: '2023-09-30',
        value: 1348500,
      },
      {
        date: '2023-12-31',
        value: 1327645,
      },
      {
        date: '2024-03-31',
        value: 1317299,
      },
      {
        date: '2024-06-30',
        value: 1319965,
      },
      {
        date: '2024-09-30',
        value: 1314141,
      },
      {
        date: '2024-12-31',
        value: 1331395,
      },
      {
        date: '2025-03-31',
        value: 1387264,
      },
      {
        date: '2025-06-30',
        value: 1384321,
      },
      {
        date: 'last10YearsAvg',
        value: 1315890.9,
      },
    ],
  },
  {
    id: 'CHNDIL',
    name: 'Direct Investment Liabilities',
    units: 'USD Hundred Million',
    periodicity: 'Quarterly',
    category_group: 'Trade',
    topic: null,
    aggregation_method: null,
    scale: 'Millions',
    currency_code: 'USD',
    dataset: null,
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'stock',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: true,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2022-12-31',
        value: 300.502,
      },
      {
        date: '2023-03-31',
        value: 270.095,
      },
      {
        date: '2023-06-30',
        value: 146.903,
      },
      {
        date: '2023-09-30',
        value: -108.498,
      },
      {
        date: '2023-12-31',
        value: 204.882,
      },
      {
        date: '2024-03-31',
        value: 110.965,
      },
      {
        date: '2024-06-30',
        value: -149.726,
      },
      {
        date: '2024-09-30',
        value: -116.241,
      },
      {
        date: '2024-12-31',
        value: 340.563,
      },
      {
        date: '2025-03-31',
        value: 145.219,
      },
    ],
  },
  {
    id: 'UNITEDSTAJC4A',
    name: 'Jobless Claims 4-week Average',
    units: 'Thousand',
    periodicity: 'Weekly',
    category_group: 'Labour',
    topic: null,
    aggregation_method: null,
    scale: 'Thousands',
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'numeric-measurement',
      indicator_type: 'count',
      indicator_category: 'numeric-measurement',
      temporal_aggregation: 'period-average',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2023-07-29',
        value: 228.25,
      },
      {
        date: '2023-08-05',
        value: 231.5,
      },
      {
        date: '2023-08-12',
        value: 234.5,
      },
      {
        date: '2023-08-19',
        value: 237.25,
      },
      {
        date: '2023-08-26',
        value: 237.75,
      },
      {
        date: '2023-09-02',
        value: 229.5,
      },
      {
        date: '2023-09-09',
        value: 224.75,
      },
      {
        date: '2023-09-16',
        value: 217.25,
      },
      {
        date: '2023-09-23',
        value: 211,
      },
      {
        date: 'last10YearsAvg',
        value: 228.55,
      },
    ],
  },
  {
    id: 'AUNURS',
    name: 'Nurses',
    units: 'per 1000 people',
    periodicity: 'Yearly',
    category_group: 'Health',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'numeric-measurement',
      indicator_type: 'ratio',
      indicator_category: 'numeric-measurement',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2012-12-31',
        value: 12.76,
      },
      {
        date: '2013-12-31',
        value: 12.66,
      },
      {
        date: '2014-12-31',
        value: 12.67,
      },
      {
        date: '2015-12-31',
        value: 12.74,
      },
      {
        date: '2016-12-31',
        value: 12.89,
      },
      {
        date: '2017-12-31',
        value: 12.98,
      },
      {
        date: '2018-12-31',
        value: 13.2,
      },
      {
        date: '2019-12-31',
        value: 13.41,
      },
      {
        date: '2020-12-31',
        value: 13.41,
      },
      {
        date: 'last10YearsAvg',
        value: 12.955,
      },
    ],
  },
  {
    id: 'AUPHYS',
    name: 'Medical Doctors',
    units: 'per 1000 people',
    periodicity: 'Yearly',
    category_group: 'Health',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'numeric-measurement',
      indicator_type: 'ratio',
      indicator_category: 'numeric-measurement',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2012-12-31',
        value: 3.5,
      },
      {
        date: '2013-12-31',
        value: 3.56,
      },
      {
        date: '2014-12-31',
        value: 3.64,
      },
      {
        date: '2015-12-31',
        value: 3.69,
      },
      {
        date: '2016-12-31',
        value: 3.78,
      },
      {
        date: '2017-12-31',
        value: 3.87,
      },
      {
        date: '2018-12-31',
        value: 3.94,
      },
      {
        date: '2019-12-31',
        value: 4.01,
      },
      {
        date: '2020-12-31',
        value: 4.1,
      },
      {
        date: 'last10YearsAvg',
        value: 3.762,
      },
    ],
  },
  {
    id: 'IDNMOTSAL',
    name: 'Motorbike Sales',
    units: 'Units',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'volume',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'period-total',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2024-12-31',
        value: 403480,
      },
      {
        date: '2025-01-31',
        value: 560301,
      },
      {
        date: '2025-02-28',
        value: 581277,
      },
      {
        date: '2025-03-31',
        value: 541684,
      },
      {
        date: '2025-04-30',
        value: 406691,
      },
      {
        date: '2025-05-31',
        value: 505350,
      },
      {
        date: '2025-06-30',
        value: 509326,
      },
      {
        date: '2025-07-31',
        value: 587048,
      },
      {
        date: '2025-08-31',
        value: 578041,
      },
      {
        date: 'last10YearsAvg',
        value: 504604.4,
      },
    ],
  },
  {
    id: 'AUSTRALIATOTVEHSAL',
    name: 'Total Vehicle Sales',
    units: 'Units',
    periodicity: 'Monthly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'volume',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'period-total',
      is_currency_denominated: false,
      heat_map_orientation: 'higher-is-positive',
    },
    sample_values: [
      {
        date: '2023-05-31',
        value: 105694,
      },
      {
        date: '2023-06-30',
        value: 124926,
      },
      {
        date: '2023-07-31',
        value: 96859,
      },
      {
        date: '2023-08-31',
        value: 109966,
      },
      {
        date: '2023-09-30',
        value: 110702,
      },
      {
        date: '2023-10-31',
        value: 106809,
      },
      {
        date: '2023-11-30',
        value: 112141,
      },
      {
        date: '2023-12-31',
        value: 98544,
      },
      {
        date: '2024-01-31',
        value: 89782,
      },
      {
        date: 'last10YearsAvg',
        value: 104502.9,
      },
    ],
  },
  {
    id: 'AFGHANISTACORINFRAT',
    name: 'Core Inflation Rate',
    units: '%',
    periodicity: 'Monthly',
    category_group: 'Prices',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2024-11-30',
        value: -0.3,
      },
      {
        date: '2024-12-31',
        value: 1,
      },
      {
        date: '2025-01-31',
        value: 1.3,
      },
      {
        date: '2025-02-28',
        value: 1.6,
      },
      {
        date: '2025-03-31',
        value: 1.6,
      },
      {
        date: '2025-04-30',
        value: 0.9,
      },
      {
        date: '2025-05-31',
        value: 2.7,
      },
      {
        date: '2025-06-30',
        value: 2.6,
      },
      {
        date: '2025-07-31',
        value: 3.9,
      },
      {
        date: 'last10YearsAvg',
        value: 0.3,
      },
    ],
  },
  {
    id: 'UFX_WB_LKA_LKR',
    name: 'Sri Lanka Alternative Official FX Rate Rate (LKR)',
    units: 'LKR',
    periodicity: 'Monthly',
    category_group: 'Markets',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: 'LKR',
    dataset: null,
    expectation: {
      indicator_family: 'price-value',
      indicator_type: 'price',
      indicator_category: 'price-value',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2024-12-01',
        value: 291.79,
      },
      {
        date: '2025-01-01',
        value: 296.06,
      },
      {
        date: '2025-02-01',
        value: 296.63,
      },
      {
        date: '2025-03-01',
        value: 295.83,
      },
      {
        date: '2025-04-01',
        value: 296.66,
      },
      {
        date: '2025-05-01',
        value: 297.71,
      },
      {
        date: '2025-06-01',
        value: 299.71,
      },
      {
        date: '2025-07-01',
        value: 301.06,
      },
      {
        date: '2025-08-01',
        value: 301.31,
      },
      {
        date: '2025-09-01',
        value: 303.48,
      },
    ],
  },
  {
    id: 'UNITEDSTAAPICUSNUM',
    name: 'API Cushing Number',
    units: 'BBL/1Million',
    periodicity: 'Weekly',
    category_group: 'Business',
    topic: null,
    aggregation_method: null,
    scale: 'Millions',
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'physical-fundamental',
      indicator_type: 'stock',
      indicator_category: 'physical-fundamental',
      temporal_aggregation: 'point-in-time',
      is_currency_denominated: false,
      heat_map_orientation: 'neutral',
    },
    sample_values: [
      {
        date: '2023-07-28',
        value: -1.762,
      },
      {
        date: '2023-08-04',
        value: -0.112,
      },
      {
        date: '2023-08-11',
        value: -1.028,
      },
      {
        date: '2023-08-18',
        value: -2.123,
      },
      {
        date: '2023-08-25',
        value: -2.235,
      },
      {
        date: '2023-09-01',
        value: -1.353,
      },
      {
        date: '2023-09-08',
        value: -2.417,
      },
      {
        date: '2023-09-15',
        value: -2.564,
      },
      {
        date: '2023-09-22',
        value: -0.828,
      },
      {
        date: 'last10YearsAvg',
        value: -1.676,
      },
    ],
  },
  {
    id: 'AUSIPM',
    name: 'Import Prices MoM',
    units: '%',
    periodicity: 'Quarterly',
    category_group: 'Prices',
    topic: null,
    aggregation_method: null,
    scale: null,
    currency_code: null,
    dataset: null,
    expectation: {
      indicator_family: 'change-movement',
      indicator_type: 'rate',
      indicator_category: 'change-movement',
      temporal_aggregation: 'period-rate',
      is_currency_denominated: false,
      heat_map_orientation: 'lower-is-positive',
    },
    sample_values: [
      {
        date: '2021-09-30',
        value: 5.4,
      },
      {
        date: '2021-12-31',
        value: 5.8,
      },
      {
        date: '2022-03-31',
        value: 5.1,
      },
      {
        date: '2022-06-30',
        value: 4.3,
      },
      {
        date: '2022-09-30',
        value: 3,
      },
      {
        date: '2022-12-31',
        value: 1.8,
      },
      {
        date: '2023-03-31',
        value: -4.2,
      },
      {
        date: '2023-06-30',
        value: -0.8,
      },
      {
        date: '2023-12-31',
        value: 1.1,
      },
      {
        date: 'last10YearsAvg',
        value: 2.25,
      },
    ],
  },
];
