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

5. **Push your branch and create a pull request using GitPT**:
   ```bash
   git push origin feature/your-feature-name
   gitpt pr create
   ```
   Using `gitpt pr create` is recommended as it will automatically generate an appropriate PR title and description based on your changes, following the project's standards.

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

GitPT uses GitHub Releases to trigger the publishing workflow.

### Release Process

1. **Create a new GitHub Release**:
   - Go to the repository on GitHub
   - Navigate to "Releases" 
   - Click "Draft a new release"
   - Create a new tag (e.g., `v1.0.1`)
   - Add a title and description for the release
   - Click "Publish release"

2. **GitHub Actions** will automatically:
   - Update package.json with the release version
   - Build the package
   - Publish to npm
   - Commit the updated package.json back to the repository

The workflow is triggered when a GitHub Release is published. This ensures a clean, consistent release process that's easy to track through GitHub's UI.

## Code Style

- Use TypeScript for all new code
- Follow existing code style patterns
- Include appropriate error handling
- Add comments for complex logic

Thank you for contributing to GitPT!