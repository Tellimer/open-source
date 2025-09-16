# Econify Examples

This directory contains comprehensive examples demonstrating all aspects of the
Econify economic data processing library.

## 🚀 Quick Start

### Basic Usage

```bash
deno run --allow-all examples/quickstart.ts
```

Simple API usage with currency conversion and magnitude scaling.

### Simple Consumer API

```bash
deno run --allow-all examples/simple_consumer.ts
```

Real-world integration patterns with progress tracking and validation.

## 📊 Specialized Examples

### Wages Processing

```bash
deno run --allow-all examples/wages_processing_example.ts
```

Demonstrates automatic wages detection, currency conversion, and exemptions
handling.

**Features shown:**

- Automatic wages data detection
- Mixed currency processing (ARS, VEF, USD)
- Index value exclusion (points data)
- Fallback FX rates
- Progress tracking

### Exemptions System

```bash
deno run --allow-all examples/exemptions_example.ts
```

Shows how to exempt specific indicators from normalization.

**Features shown:**

- Exempt by indicator ID
- Exempt by category group
- Exempt by name patterns
- Multiple exemption strategies

### Explicit Metadata Fields (🆕 v0.2.2+)

```bash
deno run --allow-all examples/explicit_metadata_example.ts
```

Demonstrates the new explicit metadata fields feature for cleaner, more reliable data processing.

**Features shown:**

- Pass `periodicity`, `scale`, `currency_code` as separate fields
- Smart fallback to unit string parsing
- Mixed explicit and parsed metadata
- Higher accuracy and better performance
- Database schema compatibility

### Time Resampling

```bash
deno run --allow-all examples/time_resampling_example.ts
```

Standardize mixed time periods (quarterly, annual, weekly, daily) to consistent
reporting periods.

**Features shown:**

- Mixed time period normalization
- Automatic conversion factors
- Monthly standardization
- Real-world use cases

## 🔧 Advanced Features

### Advanced Usage

```bash
deno run --allow-all examples/advanced_usage.ts
```

Comprehensive demonstration of all advanced features.

**Features shown:**

- Live FX rates fetching
- Historical data & inflation adjustment
- Smart unit inference
- Data quality assessment
- Batch processing
- Custom units registration
- Statistical aggregations
- Unit algebra operations
- Import/export functionality
- Seasonal adjustment

### Time Sampling (Advanced)

```bash
deno run --allow-all examples/time_sampling_advanced.ts
```

Deep dive into time conversion and sampling techniques.

**Features shown:**

- Simple vs enhanced wage conversions
- Time series upsampling/downsampling
- Mixed frequency processing
- Different sampling methods
- Practical use cases

## 📁 Example Structure

```
examples/
├── README.md                      # This file
├── quickstart.ts                 # Basic API usage
├── simple_consumer.ts            # Real-world integration
├── explicit_metadata_example.ts  # 🆕 Explicit metadata fields (v0.2.2+)
├── wages_processing_example.ts   # Wages-specific processing
├── exemptions_example.ts         # Exemptions system
├── time_resampling_example.ts    # Time period standardization
├── advanced_usage.ts             # All advanced features
└── time_sampling_advanced.ts     # Advanced time sampling
```

## 🎯 Use Case Guide

### For Basic Users

1. Start with `quickstart.ts` - learn the basic API
2. Try `simple_consumer.ts` - see real-world patterns
3. Use `exemptions_example.ts` - handle mixed data types

### For Wages Processing

1. Run `wages_processing_example.ts` - see automatic detection
2. Check `time_resampling_example.ts` - standardize time periods
3. Review `time_sampling_advanced.ts` - advanced conversions

### For Advanced Users

1. Explore `advanced_usage.ts` - see all capabilities
2. Study the source code for implementation details
3. Adapt patterns to your specific use cases

## 🔄 Running All Examples

```bash
# Run all basic examples
for file in examples/{quickstart,simple_consumer,exemptions_example}.ts; do
  echo "Running $file..."
  deno run --allow-all "$file"
  echo "---"
done

# Run all advanced examples
for file in examples/{wages_processing_example,time_resampling_example,advanced_usage,time_sampling_advanced}.ts; do
  echo "Running $file..."
  deno run --allow-all "$file"
  echo "---"
done
```

## 📚 Documentation

- **Main README**: `../README.md` - Library overview
- **API Documentation**: Generated from source code
- **Integration Guide**: `../src/wages/INTEGRATION_GUIDE.md` - Detailed
  integration patterns

## 🧪 Testing Examples

All examples are tested as part of the main test suite to ensure they remain
up-to-date and functional.

```bash
# Test that examples can be imported without errors
deno test --allow-all
```

## 💡 Contributing

When adding new examples:

1. **Follow naming convention**: `feature_name_example.ts`
2. **Include comprehensive comments**: Explain what each section does
3. **Show real-world data**: Use realistic economic indicators
4. **Demonstrate error handling**: Show how to handle edge cases
5. **Update this README**: Add your example to the appropriate section

## 🎉 Next Steps

After running these examples:

1. **Integrate into your project**: Use the patterns shown
2. **Customize for your data**: Adapt the configurations
3. **Explore the source**: Understand the implementation
4. **Contribute back**: Share improvements and new use cases

Happy processing! 🚀
