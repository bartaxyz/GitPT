# GitPT

Git Prompt Tool is a CLI tool that helps you write commit messages using AI through [OpenRouter](https://openrouter.ai/). It acts as a complete git wrapper, enhancing specific commands with AI while passing through all other git commands directly.

## Features

- Acts as a complete git replacement - all git commands are supported
- Generate commit messages with AI based on your code changes
- Create pull requests with AI-generated titles and descriptions
- Compatible with all regular git options (flags, arguments, etc.)
- Edit suggested messages before committing
- Works with various AI models via OpenRouter

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
# Same as git add .
gitpt add .

# Same as git add -p
gitpt add -p

# Same as git add src/*.ts
gitpt add src/*.ts
```

### Creating Commits

Generate an AI-powered commit message based on your staged changes:

```bash
gitpt commit
```

The tool will:
1. Analyze your staged changes
2. Generate a commit message using the configured AI model
3. Show you the suggested message
4. Let you edit the message before committing
5. Create the commit with your approved message

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

### Commit Options

You can use any standard git commit options with the `gitpt commit` command:

```bash
# Skip editing the message
gitpt commit --no-edit

# Provide your own message instead of generating one
gitpt commit -m "Your message here"

# Pass any other git commit options
gitpt commit --amend
```

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

> **Note:** This command requires GitHub CLI (`gh`) to be installed and authenticated.

## How It Works

GitPT leverages AI via OpenRouter to enhance your Git workflow while acting as a complete git wrapper:

- **Command Handling:** GitPT intelligently routes commands - enhanced commands (commit, pr) use AI capabilities while all other git commands are passed directly to git.

- **For commits:** Sends a diff of your staged changes to the AI, which generates a contextual commit message following best practices.

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

## License

MIT