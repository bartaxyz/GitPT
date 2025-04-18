import chalk from 'chalk';
import { isGitRepository, executeGitAdd } from '../utils/git.js';

export function addCommand(files: string[]): void {
  if (!isGitRepository()) {
    console.error(chalk.red('Error: Not a git repository'));
    process.exit(1);
  }

  try {
    executeGitAdd(files);
    console.log(chalk.green('Files added to staging area'));
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}