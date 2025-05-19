import inquirer from 'inquirer';
import chalk from 'chalk';
import { isGitRepository, hasStagedChanges, getStagedChanges, executeGitCommit } from '../utils/git.js';
import { generateCommitMessage } from '../utils/api.js';
import { getConfig } from '../utils/config.js';
import { hasCommitlintConfig, validateCommitMessage } from '../utils/commitlint.js';

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
      let hasCommitlint = false;
      try {
        hasCommitlint = hasCommitlintConfig();
        if (hasCommitlint) {
          console.log(chalk.blue('Commitlint configuration detected. Generating message according to rules...'));
        }
      } catch (error) {
        console.warn(chalk.yellow('Warning: Error detecting commitlint config, proceeding without commitlint validation.'));
      }
      
      // Generate first commit message
      commitMessage = await generateCommitMessage(diff);
      
      // If commitlint is configured, try to validate and regenerate up to 3 times
      if (hasCommitlint) {
        try {
          console.log(chalk.blue('Validating commit message against commitlint rules...'));
          
          // Try up to 3 times to get a valid message
          let validMessage = false;
          let attempts = 0;
          const MAX_ATTEMPTS = 3;
          let validationErrors: string | undefined;
          
          while (!validMessage && attempts < MAX_ATTEMPTS) {
            const validation = await validateCommitMessage(commitMessage);
            
            if (validation.valid) {
              console.log(chalk.green('✓ Commit message passed validation'));
              validMessage = true;
              break;
            } else {
              attempts++;
              console.log(chalk.yellow(`Commit message failed validation. ${attempts < MAX_ATTEMPTS ? 'Regenerating...' : 'Max attempts reached.'}`));
              
              if (validation.errors) {
                console.log(chalk.gray(validation.errors));
                validationErrors = validation.errors;
              }
              
              if (attempts < MAX_ATTEMPTS) {
                // Try regenerating with validation errors
                try {
                  commitMessage = await generateCommitMessage(diff, validationErrors);
                } catch (error) {
                  console.warn(chalk.yellow('Error regenerating message, breaking validation loop.'));
                  break;
                }
              } else {
                // Ask user what to do after max attempts
                const { action } = await inquirer.prompt([
                  {
                    type: 'list',
                    name: 'action',
                    message: 'Failed to generate a valid commit message after 3 attempts. What would you like to do?',
                    choices: [
                      { name: 'Proceed with invalid message', value: 'proceed' },
                      { name: 'Edit message manually', value: 'edit' },
                      { name: 'Abort commit', value: 'abort' }
                    ]
                  }
                ]);
                
                if (action === 'abort') {
                  console.log(chalk.red('Commit aborted due to validation failures.'));
                  process.exit(1);
                } else if (action === 'edit') {
                  options.edit = true; // Force editor to open
                } else {
                  console.log(chalk.yellow('Proceeding with invalid message...'));
                }
                break;
              }
            }
          }
        } catch (error) {
          // If there's an error with commitlint validation, continue without it
          console.warn(chalk.yellow('Warning: Error during commitlint validation, proceeding without validation.'));
          console.warn(chalk.gray('This may be due to an ESM module cycle conflict or missing commitlint dependencies.'));
        }
      }
      
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
    
    // Validate the edited message once
    try {
      const hasCommitlint = hasCommitlintConfig();
      if (hasCommitlint) {
        console.log(chalk.blue('Validating edited commit message...'));
        const validation = await validateCommitMessage(commitMessage);
        if (!validation.valid) {
          console.log(chalk.yellow('Warning: Edited message still has validation issues.'));
          if (validation.errors) {
            console.log(chalk.gray(validation.errors));
          }
          
          // Ask if user wants to proceed anyway
          const { proceed } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'proceed',
              message: 'Proceed with invalid commit message?',
              default: false
            }
          ]);
          
          if (!proceed) {
            console.log(chalk.red('Commit aborted by user.'));
            process.exit(1);
          }
        } else {
          console.log(chalk.green('✓ Edited message passed validation'));
        }
      }
    } catch (error) {
      // If validation fails, just warn and continue
      console.warn(chalk.yellow('Could not validate edited message, proceeding anyway.'));
    }
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