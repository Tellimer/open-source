# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-06-02

### Changed

- Updated `slug` for Democratic Republic of the Congo from `congo` to
  `republic-of-congo` for accuracy.
- Corrected the `name` for Democratic Republic of the Congo to `DR Congo`.
- Update test cases to test searchByName and searchBySlug against dr congo and
  congo

## [1.0.0] - 2024-06-07

### Fixed

- Vietnam naming fix from Viet Nam to Vietnam

### ADDED

- Country name slugs

## [0.1.4] - 2024-03-20

### Fixed

- Node.js compatibility issue with JSON imports
- Removed unused `data.json` file

### Changed

- Enhanced README.md with clearer installation instructions
- Improved API documentation and examples
- Added badges for package status and metrics

## [0.1.3] - 2024-03-20

### Added

- JSR badges in README.md
- Additional usage examples

### Changed

- Improved documentation formatting
- Updated package description

## [0.1.2] - 2024-03-19

### Added

- CONTRIBUTING.md guidelines
- Comprehensive CHANGELOG.md
- Additional documentation in README.md

### Changed

- Updated package metadata in deno.json
- Improved publish configuration

## [0.1.1] - 2024-03-18

### Fixed

- Package export configuration
- Runtime compatibility declarations

### Added

- Multi-runtime support (Deno, Node.js, Cloudflare Workers, Bun)
- Repository and bug tracker information

## [0.1.0] - 2024-03-17

### Added

- Initial release
- Support for all country flags (251 countries/territories)
- Conversion between country codes and flag emojis
- Search countries by name
- Support for both ISO 3166-1 alpha-2 and alpha-3 codes
- Country dial codes
- Full TypeScript support
- 100% test coverage
- Zero dependencies

### Features

- `countryCode()` method to get country data by ISO code
- `searchByName()` method to search countries by name
- Getters for emojis, codes, names, and unicode representations
- Complete country data including:
  - ISO 3166-1 alpha-2 codes
  - ISO 3166-1 alpha-3 codes
  - Flag emojis
  - Unicode representations
  - Country names
  - Flag titles
  - International dial codes
