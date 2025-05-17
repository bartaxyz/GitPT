# GitPT

Git Prompt Tool is a CLI tool that helps you write commit messages using AI through [OpenRouter](https://openrouter.ai/). It acts as a complete git wrapper, enhancing specific commands with AI while passing through all other git commands directly.

## Features

- Acts as a complete git replacement - all git commands are supported
- Generate commit messages with AI based on your code changes

  `gitpt commit`
- Create pull requests with AI-generated titles and descriptions

  `gitpt pr create`
- Compatible with all regular git options (flags, arguments, etc.)
- Edit suggested messages before committing
- Works with various AI models via OpenRouter
- [Commitlint](https://commitlint.js.org/) support - read directly from your repository

## Installation

```bash
# Install globally
npm install -g gitpt

# Or use npx
npx gitpt
```

## Set up

To configure GitPT with your OpenRouter API key and select a model:

```bash
gitpt setup
```

This will guide you through:
1. Entering your OpenRouter API key
2. Selecting an AI model from popular options or specifying a custom one

You'll need an [OpenRouter](https://openrouter.ai/) account to get an API key.

## Usage

### Using GitPT as a Complete Git Replacement

GitPT can be used as a direct replacement for git - any git command can be run through GitPT:

```bash
# Standard git commands work exactly the same
gitpt status
gitpt log
gitpt branch
gitpt checkout -b new-feature
gitpt push origin main

# GitPT passes all arguments and options to git
gitpt log --oneline --graph
gitpt merge --no-ff feature-branch
```

### Adding Files

Add files to the staging area just like you would with git:

```bash
# Same as git add . (supports all the regular git add options)
gitpt add .
```

### Creating Commits

Generate an AI-powered commit message based on your staged changes:

```bash
gitpt commit

# Or supply -m argument, if you want to avoid gitpt generating the message
gitpt commit -m "feat: file hash validation"

# Pass any other git commit options
gitpt commit --amend
```

The tool will:
1. Analyze your staged changes
2. Generate a commit message using the configured AI model
3. Validate against commitlint rules (if configured)
4. Regenerate the message if it fails validation
5. Show you the suggested message
6. Let you edit the message before committing
7. Create the commit with your approved message

### Changing Models

You can change the AI model at any time without re-entering your API key:

```bash
# Select model interactively (fetches available models from OpenRouter)
gitpt model

# Specify model directly
gitpt model openai/gpt-4o

# Switch to a different Claude model
gitpt model anthropic/claude-3-haiku
```

## GitHub Usage

If you have GitHub CLI (`gh`) installed, you can use GitPT to interact with GitHub (e.g. generate full pull requests).

### Creating Pull Requests

Generate AI-powered pull request titles and descriptions based on your changes:

```bash
gitpt pr create
```

The tool will:
1. Analyze the commits and files changed since branching from the base branch
2. Generate a suitable PR title and detailed description
3. Show you the suggested content
4. Let you edit the title and description before submission
5. Create the pull request with your approved content

#### Pull Request Options

```bash
# Create a draft PR
gitpt pr create --draft

# Specify a custom base branch
gitpt pr create --base develop

# Skip editing the PR details
gitpt pr create --no-edit

# Provide your own title instead of generating one
gitpt pr create --title "Your PR title here"
```

## How It Works

GitPT leverages AI via OpenRouter to enhance your Git workflow while acting as a complete git wrapper:

- **Command Handling:** GitPT intelligently routes commands - enhanced commands (commit, pr) use AI capabilities while all other git commands are passed directly to git.

- **For commits:** Sends a diff of your staged changes to the AI, which generates a contextual commit message following best practices.

- **Commitlint Integration:** Automatically detects commitlint configuration files and validates generated commit messages against your project's commit conventions. If validation fails, it regenerates a compliant message.

- **For pull requests:** Analyzes the commits and file changes between your branch and the base branch, then generates a suitable title and detailed description for your PR.

- **For other git commands:** Passes them through directly to git with all arguments and options preserved, ensuring complete compatibility with your existing git workflow.

## Development

```bash
# Clone the repository
git clone https://github.com/bartaxyz/GitPT.git
cd GitPT

# Install dependencies
npm install

# Build the project
npm run build

# Link for local development
npm link
```

## Commitlint Integration

GitPT automatically detects and integrates with [commitlint](https://commitlint.js.org/) if it's configured in your repository:

- **Automatic Detection:** GitPT checks for common commitlint configuration files (commitlint.config.js, .commitlintrc.*, etc.)

- **Rule-Aware Generation:** When commitlint is detected, GitPT instructs the AI to generate messages that follow your specific commit conventions

- **Validation & Regeneration:** Generated messages are validated against your commitlint rules before committing. If validation fails, GitPT automatically regenerates a compliant message

- **Error Feedback:** Validation errors are sent to the AI to help it understand how to fix the message

This integration ensures that all AI-generated commit messages follow your team's established commit conventions without requiring manual corrections.

## License

MIT
