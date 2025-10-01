# Contributing to @tellimer/classify

Thank you for your interest in contributing to @tellimer/classify! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/open-source.git`
3. Navigate to the classify package: `cd open-source/packages/classify`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- [Deno](https://deno.land/) 2.0 or later

### Running Tests

```bash
# Run all tests
deno task test

# Run tests in watch mode
deno task test:watch

# Run tests with coverage
deno task test:cov
deno task cov:lcov
```

### Running Examples

```bash
# Run basic usage example
deno task dev

# Run specific examples
deno run --allow-net --allow-env examples/basic_usage.ts
deno run --allow-net --allow-env examples/advanced_usage.ts
```

### Code Quality

```bash
# Format code
deno task fmt

# Lint code
deno task lint
```

## Project Structure

```
packages/classify/
├── src/
│   ├── classify.ts          # Main classification functions
│   ├── types.ts              # Type definitions
│   ├── providers/
│   │   ├── base.ts           # Base provider utilities
│   │   ├── openai.ts         # OpenAI provider
│   │   ├── anthropic.ts      # Anthropic provider
│   │   ├── gemini.ts         # Google Gemini provider
│   │   └── index.ts          # Provider exports
│   └── *_test.ts             # Test files
├── examples/                 # Usage examples
├── mod.ts                    # Package entry point
├── deno.json                 # Deno configuration
└── README.md                 # Documentation
```

## Adding a New LLM Provider

To add support for a new LLM provider:

1. Create a new file in `src/providers/` (e.g., `src/providers/newprovider.ts`)
2. Implement the `LLMProviderInterface`:

```typescript
import type { LLMProviderInterface, ClassifiedMetadata, Indicator, LLMConfig } from "../types.ts";

export class NewProvider implements LLMProviderInterface {
  readonly name = "newprovider" as const;

  validateConfig(config: LLMConfig): void {
    // Validate configuration
  }

  async classify(indicators: Indicator[], config: LLMConfig): Promise<ClassifiedMetadata[]> {
    // Implement classification logic
  }
}
```

3. Update `src/types.ts` to include the new provider in the `LLMProvider` type
4. Export the provider in `src/providers/index.ts`
5. Update `getProvider()` function to handle the new provider
6. Add tests in `src/providers/providers_test.ts`
7. Add usage examples in `examples/`
8. Update README.md with configuration examples

## Testing Guidelines

- Write tests for all new features
- Maintain or improve code coverage
- Use descriptive test names
- Test both success and error cases
- Mock external API calls in unit tests

Example test structure:

```typescript
Deno.test("Feature - should do something", () => {
  // Arrange
  const input = ...;
  
  // Act
  const result = ...;
  
  // Assert
  assertEquals(result, expected);
});
```

## Code Style

- Follow the existing code style
- Use TypeScript for all code
- Add JSDoc comments for public APIs
- Use meaningful variable and function names
- Keep functions small and focused
- Use async/await for asynchronous code

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test additions or changes
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

Examples:
```
feat: add support for Azure OpenAI
fix: handle timeout errors correctly
docs: update README with new examples
test: add tests for batch processing
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Create a pull request with a clear description
6. Link any related issues

## Questions or Issues?

- Open an issue on GitHub
- Check existing issues and discussions
- Review the README and examples

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

