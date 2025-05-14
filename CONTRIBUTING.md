# Contributing to GitPT

Thank you for your interest in contributing to GitPT! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Local Testing](#local-testing)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Release Process](#release-process)
- [Code Style](#code-style)

## Development Environment Setup

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/yourusername/GitPT.git
   cd GitPT
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Link for local development**:
   ```bash
   npm link
   ```
   This makes the `gitpt` command available globally on your machine, pointing to your development version.

## Local Testing

1. **Running in development mode**:
   ```bash
   npm run dev
   ```

2. **Testing the CLI**:
   After linking the package with `npm link`, you can test the CLI by running:
   ```bash
   gitpt status
   gitpt commit
   gitpt pr create
   ```

3. **Unlink when finished**:
   ```bash
   npm unlink -g gitpt
   ```

## Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   Implement your feature or bug fix.

3. **Test your changes**:
   Make sure your changes work as expected and don't break existing functionality.

4. **Commit your changes**:
   Follow the [Commit Message Guidelines](#commit-message-guidelines).

5. **Push your branch and create a pull request**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Code review**:
   Wait for maintainers to review your PR. Make any requested changes.

## Commit Message Guidelines

GitPT uses conventional commits to automate versioning and release notes. Please follow these guidelines:

- **Format**: `<type>: <description>`
- **Types**:
  - `feat`: A new feature
  - `fix`: A bug fix
  - `docs`: Documentation changes
  - `style`: Code style changes (formatting, etc)
  - `refactor`: Code changes that neither fix bugs nor add features
  - `test`: Adding or updating tests
  - `chore`: Changes to the build process or auxiliary tools

- **Breaking Changes**:
  - Use `!` after the type for breaking changes: `feat!: breaking change`

- **Examples**:
  ```
  feat: add user authentication
  fix: resolve null pointer in login
  docs: update README with new commands
  chore: update dependencies
  ```

## Release Process

GitPT uses GitHub Actions and semantic-release for automated versioning and publishing.

### Automated Release Process

1. **Merge to main**:
   When changes are merged to the `main` branch, the GitHub Actions workflow automatically:
   - Analyzes commit messages
   - Determines the appropriate version bump
   - Updates package.json
   - Creates a git tag
   - Publishes to npm
   - Creates a GitHub release with notes

### Manual Release Process

For manual releases:

1. **Update version**:
   ```bash
   npm version patch|minor|major
   ```

2. **Push with tags**:
   ```bash
   git push --follow-tags
   ```

3. **GitHub Actions** will automatically publish packages pushed with version tags (format: `v*`)

### Version Determination

Semantic-release determines version bumps based on commit messages:
- `fix:` → Patch release (1.0.0 → 1.0.1)
- `feat:` → Minor release (1.0.0 → 1.1.0)
- `feat!:`, `fix!:` or commits with `BREAKING CHANGE:` → Major release (1.0.0 → 2.0.0)

## Code Style

- Use TypeScript for all new code
- Follow existing code style patterns
- Include appropriate error handling
- Add comments for complex logic

Thank you for contributing to GitPT!