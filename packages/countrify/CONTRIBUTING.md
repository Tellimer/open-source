# Contributing to @tellimer/countrify

Thank you for your interest in contributing to @tellimer/countrify! This
document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of
Conduct, which is to treat all contributors with respect and maintain a
harassment-free experience for everyone.

## Getting Started

1. Fork the repository and clone it locally
2. Install Deno if you haven't already
   (https://deno.land/manual/getting_started/installation)
3. Navigate to the project directory
4. Run tests to ensure everything is working:
   ```bash
   deno task test
   ```

## Development Process

1. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Run the formatting tool:
   ```bash
   deno task fmt
   ```

4. Run the linter:
   ```bash
   deno task lint
   ```

5. Run the tests:
   ```bash
   deno task test
   ```

6. Commit your changes:
   ```bash
   git commit -m "feat: add your feature description"
   ```

   Please follow [Conventional Commits](https://www.conventionalcommits.org/)
   for commit messages.

## Pull Request Process

1. Update the README.md with details of changes if needed
2. Update the CHANGELOG.md following the existing format
3. The PR will be merged once you have the sign-off of at least one maintainer

## Adding New Countries or Updating Data

1. If you're adding new countries or updating country data, modify
   `src/data/data.json`
2. Run the code3 update script if needed:
   ```bash
   deno task update-code3
   ```
3. Add corresponding tests in `src/main_test.ts`

## Running Tests

```bash
# Run all tests
deno task test

# Run specific test file
deno test src/main_test.ts
```

## Style Guide

- Use TypeScript
- Follow the existing code style
- Use 2 spaces for indentation
- Maximum line length is 80 characters
- Use double quotes for strings
- Add JSDoc comments for public APIs

## Questions or Problems?

Feel free to open an issue in the repository if you have any questions or
problems.

## License

By contributing to @tellimer/countrify, you agree that your contributions will
be licensed under its MIT license.
