import inquirer from 'inquirer';
import chalk from 'chalk';
import { isGitRepository, hasStagedChanges, getStagedChanges, executeGitCommit } from '../utils/git.js';
import { generateCommitMessage } from '../utils/api.js';
import { getConfig } from '../utils/config.js';
import { hasCommitlintConfig } from '../utils/commitlint.js';

interface CommitOptions {
  message?: string;
  edit?: boolean;
  [key: string]: any; // For any other git commit options
}

export async function commitCommand(options: CommitOptions): Promise<void> {
  if (!isGitRepository()) {
    console.error(chalk.red('Error: Not a git repository'));
    process.exit(1);
  }

  // Check if config exists
  const config = getConfig();
  if (!config) {
    console.error(chalk.red('GitPT is not configured. Please run "gitpt setup" first.'));
    process.exit(1);
  }

  // Check if there are staged changes
  if (!hasStagedChanges()) {
    console.error(chalk.yellow('No staged changes. Use "git add" or "gitpt add" to stage changes first.'));
    process.exit(1);
  }

  let commitMessage: string;

  // If message is provided, use that
  if (options.message) {
    commitMessage = options.message;
  } else {
    try {
      // Get staged changes
      const diff = getStagedChanges();
      
      console.log(chalk.blue('Generating commit message...'));
      
      // Check if commitlint is configured
      if (hasCommitlintConfig()) {
        console.log(chalk.blue('Commitlint configuration detected. Generating message according to rules...'));
      }
      
      // Generate commit message
      commitMessage = await generateCommitMessage(diff);
      
      console.log(chalk.green('✓ Commit message generated'));
      console.log('');
      console.log(chalk.cyan('Generated message:'));
      console.log(commitMessage);
      console.log('');
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  // If edit is true or not specified, prompt user to edit the message
  if (options.edit !== false) {
    const answer = await inquirer.prompt([
      {
        type: 'editor',
        name: 'message',
        message: 'Edit commit message:',
        default: commitMessage
      }
    ]);

    commitMessage = answer.message;
  }

  // Extract other git options to pass through
  const gitOptions = Object.keys(options)
    .filter(key => !['message', 'edit'].includes(key))
    .map(key => {
      if (typeof options[key] === 'boolean') {
        return options[key] ? `--${key}` : `--no-${key}`;
      }
      return `--${key}=${options[key]}`;
    });

  try {
    executeGitCommit(commitMessage, gitOptions);
    console.log(chalk.green('✓ Changes committed successfully'));
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
