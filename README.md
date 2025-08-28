<p align="center">
  <img src="assets/tellimer-logo.avif" alt="Tellimer" width="" />
</p>

# Tellimer Open Source Monorepo

This monorepo contains various packages and applications maintained by Tellimer.

## Structure

```
monorepo/
├── packages/          # Open source libraries
│   ├── econify/       # Economic indicator classification & normalization
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

A Deno/TypeScript package for classifying economic indicators and normalizing
values across magnitudes, time bases, and currencies. Features:

- Classification of economic indicators (stock, flow, rate, currency)
- Currency normalization with FX tables
- Magnitude scaling (billions, millions, thousands)
- Time rescaling for flows (monthly → yearly, etc.)
- Composable normalization functions

[View Package →](packages/econify)

## Apps

### Countrify Demo

A demo web application showcasing the @tellimer/countrify package capabilities -
coming soon!

## Development

This is a Deno workspace using Deno 2.0+ workspace features.

### Getting Started

```bash
# Initialize and cache dependencies
deno task init

# Run tests for specific packages
deno task test:countrify
deno task test:econify

# Development mode for packages
deno task dev:countrify
deno task dev:econify

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
