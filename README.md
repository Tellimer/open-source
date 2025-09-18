<p align="center">
  <img src="assets/tellimer-logo.avif" alt="Tellimer" width="" />
</p>

# Tellimer Open Source Monorepo

[![codecov](https://codecov.io/gh/Tellimer/open-source/branch/main/graph/badge.svg)](https://codecov.io/gh/Tellimer/open-source)

This monorepo contains various packages and applications maintained by Tellimer.

## Structure

```
monorepo/
├── packages/          # Open source libraries
│   ├── econify/       # Economic data processing toolkit (201 tests)
│   └── countrify/     # Country flag emoji utilities
│
└── apps/              # Applications (e.g. demos)
```

## Packages

### [@tellimer/countrify](packages/countrify)

[![JSR Score](https://jsr.io/badges/@tellimer/countrify/score)](https://jsr.io/@tellimer/countrify)
[![JSR Version](https://jsr.io/badges/@tellimer/countrify/version)](https://jsr.io/@tellimer/countrify)

A comprehensive library for working with country flag emojis in Deno. Provides
utilities for:

- Getting country by slug (lowercase, hyphen-separated)
- Searching countries by slug
- Supporting ISO 3166-1 alpha-2 and alpha-3 codes
- Including country dial codes

[View Package →](packages/countrify)

### [@tellimer/econify](packages/econify)

[![JSR](https://jsr.io/badges/@tellimer/econify)](https://jsr.io/@tellimer/econify)
[![Test Coverage](https://img.shields.io/badge/tests-201%20passing-brightgreen)](https://github.com/Tellimer/open-source)
[![Quality](https://img.shields.io/badge/quality-production%20ready-blue)](https://github.com/Tellimer/open-source)

A comprehensive Deno/TypeScript package for **economic data processing** with
advanced features for classification, normalization, quality assessment, and
analysis. Features:

- 🔍 **Smart Classification** — Automatically detect indicator types (stock,
  flow, rate, currency)
- 🌍 **150+ Currency Support** — Convert values between currencies using FX
  tables
- 📊 **Magnitude Scaling** — Seamlessly convert between trillions, billions,
  millions, thousands
- ⏱️ **Time Normalization** — Transform flows across time periods (annual ↔
  quarterly ↔ monthly ↔ daily)
- 💼 **Wages Data Processing** — Specialized handling for mixed wage/salary data
- 🚫 **Normalization Exemptions** — Skip normalization for specific indicators
  or categories
- 🌊 **XState Pipeline** — Robust data processing pipeline with quality
  assessment
- 🧪 **Production Ready** — 201 tests passing, zero linting issues,
  comprehensive examples

[View Package →](packages/econify)

## Apps

### Countrify Demo

A demo web application showcasing the @tellimer/countrify package capabilities -
coming soon!

## Development

This is a Deno workspace using Deno 2.0+ workspace features.

### Getting Started

```bash
# Run tests for specific packages
deno task test:countrify
deno task test:econify

# Development mode for packages
deno task dev:countrify
deno task dev:econify

# Run all tests
cd packages/econify && deno test --allow-all
cd packages/countrify && deno test

# Format and lint code
deno fmt
deno lint
```

### Available Tasks

- `dev:countrify` - Run countrify in development mode with watch
- `dev:econify` - Run econify in development mode with watch
- `test:countrify` - Run countrify tests
- `test:econify` - Run econify tests

## Contributing

Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of
conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.
