# GitPT

Git Prompt Tool is a CLI tool that helps you write commit messages using AI through [OpenRouter](https://openrouter.ai/).

## Features

- Generate commit messages with AI based on your code changes
- Compatible with all regular git commit options (you can treat it as an alias)
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

### Adding Files

Add files to the staging area using either git directly or the GitPT wrapper:

```bash
# Standard git command
git add .

# Or using GitPT wrapper
gitpt add .
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

### Options

You can use any standard git commit options with the `gitpt commit` command:

```bash
# Skip editing the message
gitpt commit --no-edit

# Provide your own message instead of generating one
gitpt commit -m "Your message here"

# Pass any other git commit options
gitpt commit --amend
```

## How It Works

GitPT sends a diff of your staged changes to the configured AI model via OpenRouter, which generates a contextual commit message following best practices.

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