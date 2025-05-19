#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { setupCommand } from './commands/setup.js';
import { commitCommand } from './commands/commit.js';
import { addCommand } from './commands/add.js';
import { modelCommand } from './commands/model.js';
import { prCreateCommand } from './commands/pr.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isGitRepository } from './utils/git.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const version = packageJson.version;

const program = new Command();

program
  .name('gitpt')
  .description('Git Prompt Tool helps you write commit messages using AI')
  .version(version);

// GitPT-specific commands
program
  .command('setup')
  .description('Configure GitPT with your OpenRouter API key and model selection')
  .action(setupCommand);

program
  .command('model [model-id]')
  .description('Change the AI model used for generating commit messages')
  .option('--local', 'Configure a local LLM endpoint instead of OpenRouter')
  .action((modelId, options) => modelCommand(modelId, options));

// Enhanced git commands
program
  .command('add [files...]')
  .description('Add files to git staging area (pass-through to git add)')
  .allowUnknownOption(true) // Pass through other git add options
  .action(addCommand);

program
  .command('commit')
  .description('Generate AI-powered commit message based on staged changes')
  .option('-m, --message <message>', 'use provided message instead of generating one')
  .option('-e, --edit', 'edit the message after generation')
  .option('--no-edit', 'do not edit the message after generation')
  .allowUnknownOption(true) // Pass through other git commit options
  .action(commitCommand);

program
  .command('pr create')
  .description('Create a pull request with AI-generated title and description')
  .option('-t, --title <title>', 'Custom pull request title')
  .option('-b, --body <body>', 'Custom pull request description')
  .option('-d, --draft', 'Create as draft pull request')
  .option('-B, --base <branch>', 'Base branch to create PR against')
  .option('-e, --edit', 'Edit PR details before submission', true)
  .option('--no-edit', 'Skip editing PR details')
  .allowUnknownOption(true)
  .action(prCreateCommand);

// Handle unknown commands by passing them to git
program.on('command:*', (operands) => {
  if (!isGitRepository()) {
    console.error(chalk.red('Error: Not a git repository'));
    process.exit(1);
  }
  
  try {
    // Get all arguments passed to the original command
    const args = process.argv.slice(2);
    
    // Execute git with all arguments
    execSync(`git ${args.join(' ')}`, { stdio: 'inherit' });
  } catch (error) {
    // Git will handle its own error output through stdio: 'inherit'
    process.exit(1);
  }
});

// Main logic
async function main() {
  try {
    await program.parseAsync();
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();