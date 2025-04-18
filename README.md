# GitPT

Git Prompt Tool is a CLI tool helps you write commit messages & pull request descriptions.

## Installation

```bash
npm install -g gitpt
```

## Set up

To initiate the setup or reset the previous configuration, use the setup command:

```bash
gitpt setup
```

This will allow you to select your own model on [OpenRouter](https://openrouter.ai/), and provide you API key.

## Usage

Add your changes using regular git command (or, you can use `gitpt` alias, too)

```bash
# Add your changes using git
git add .

# Or using gitpt command directly to only use the tool 
gitpt add .
```

Commit your changes using GitPT

```bash
gitpt commit
```

GitPT will prompt you with a suggested commit message that you can edit & then confirm. You can use any of the usual git commit arguments. They'll automatically be passed.


