# Econify Documentation

Welcome to the Econify documentation! This guide will help you navigate all
available documentation resources.

**Econify** is focused on **normalization and conversion** of economic data. For
**indicator classification** (determining if an indicator is a stock, flow,
ratio, etc.), see the separate
[@tellimer/classify](https://jsr.io/@tellimer/classify) package.

## 📚 Documentation Structure

### 🚀 Getting Started

Start here if you're new to Econify:

- **[Main README](../README.md)** - Package overview, installation, and quick
  start
- **[Examples](../examples/README.md)** - Comprehensive code examples for all
  features

### 📖 Guides

Step-by-step guides for common use cases:

#### Quality Control (NEW)

- **[Quality Controls Overview](./guides/quality-controls.md)** - ⭐ **NEW**
  Comprehensive overview of all quality checks
- **[Unit Type Consistency Detection](./guides/unit-type-consistency.md)** - ⭐
  **NEW** Detect semantic unit type mismatches (count vs index)
- **[Scale Outlier Detection](./guides/scale-outlier-detection.md)** - ⭐
  **NEW** Identify magnitude scale issues (100x differences)

#### Data Processing

- **[Batch Processing](./guides/batch-processing.md)** - Process multiple
  indicators with consistent normalization
- **[Per-Indicator Normalization](./guides/per-indicator-normalization.md)** -
  Understanding per-indicator vs global normalization
- **[Special Handling](./guides/special-handling.md)** - Override units and
  scales for data quality issues
- **[Time Sampling](./guides/time-sampling.md)** - Advanced time resampling and
  conversion
- **[Wages Processing](./guides/wages-processing.md)** - Specialized handling
  for wage data normalization

### 📘 Reference

Detailed technical reference documentation:

- **[Explain Metadata](./reference/explain-metadata.md)** - Complete guide to
  explain metadata structure
- **[Integration Brief](./reference/integration-brief.md)** - Integration
  overview and FX dates
- **[Implementation Instructions](./reference/implementation-instructions.md)** -
  Batch processing API implementation details

### 🔧 Development

Documentation for contributors and maintainers:

- **[Test Coverage](./development/test-coverage.md)** - Comprehensive test
  coverage overview
- **[E2E Test Findings](./development/e2e-test-findings.md)** - End-to-end test
  results and findings
- **[Known Data Issues](./development/known-data-issues.md)** - Catalog of
  real-world data quality issues

### 📊 Diagrams

Visual documentation and architecture diagrams:

- **[Diagrams Folder](./diagrams/)** - State machines, workflows, and
  architecture diagrams

## 🎯 Quick Navigation by Use Case

### I want to...

#### Classify economic indicators (stock, flow, ratio, etc.)

→ Use the [@tellimer/classify](https://jsr.io/@tellimer/classify) package

#### Normalize and convert economic data (currency, magnitude, time)

→ Start with [Main README](../README.md) and [Examples](../examples/README.md)

#### Handle multiple indicators consistently

→ Read [Batch Processing Guide](./guides/batch-processing.md)

#### Detect and handle data quality issues

→ Start with [Quality Controls Overview](./guides/quality-controls.md)

#### Fix known data quality issues in my source data

→ See [Special Handling Guide](./guides/special-handling.md)

#### Process wage data across countries

→ Check [Wages Processing Guide](./guides/wages-processing.md)

#### Convert time scales (hourly → monthly, etc.)

→ Review [Time Sampling Guide](./guides/time-sampling.md)

#### Understand the explain metadata structure

→ Read [Explain Metadata Reference](./reference/explain-metadata.md)

#### Integrate Econify into my application

→ Follow [Integration Brief](./reference/integration-brief.md)

#### Contribute to the project

→ See [Test Coverage](./development/test-coverage.md) and
[Known Data Issues](./development/known-data-issues.md)

## 📦 Package Information

- **Version**: See [CHANGELOG](../CHANGELOG.md) for version history
- **License**: MIT
- **Repository**:
  [GitHub](https://github.com/Tellimer/open-source/tree/main/packages/econify)
- **JSR Package**: [@tellimer/econify](https://jsr.io/@tellimer/econify)

## 🤝 Contributing

We welcome contributions! Please:

1. Read the [development documentation](./development/)
2. Check [known data issues](./development/known-data-issues.md) for areas
   needing improvement
3. Review [test coverage](./development/test-coverage.md) to understand testing
   requirements
4. Submit pull requests with tests and documentation

## 📝 Documentation Standards

When contributing documentation:

- **Guides**: Step-by-step tutorials with code examples
- **Reference**: Detailed technical specifications
- **Development**: Internal documentation for contributors
- Use clear headings and table of contents for long documents
- Include code examples with expected output
- Link to related documentation

## 🔗 External Resources

- [Deno Documentation](https://deno.land/manual)
- [XState Documentation](https://xstate.js.org/docs/)
- [JSR Registry](https://jsr.io/)

## 📧 Support

For questions or issues:

- Open an issue on [GitHub](https://github.com/Tellimer/open-source/issues)
- Check existing [E2E test findings](./development/e2e-test-findings.md) for
  known issues
- Review [known data issues](./development/known-data-issues.md) for data
  quality problems

---

**Last Updated**: 2025-01-XX (v1.1.8)
