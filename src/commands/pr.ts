import inquirer from 'inquirer';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { isGitRepository } from '../utils/git.js';
import { getConfig } from '../utils/config.js';
import fetch from 'node-fetch';

interface PullRequestOptions {
  title?: string;
  body?: string;
  draft?: boolean;
  base?: string;
  edit?: boolean;
  [key: string]: any; // For any other options
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  } catch (error) {
    console.error(chalk.red('Error getting current branch:'), error);
    throw new Error('Failed to get current branch');
  }
}

function getDefaultBaseBranch(): string {
  try {
    // Try to find default branch - first check for main, then master
    const branches = execSync('git branch -r').toString().trim().split('\n');
    
    // Look for main branch patterns in remote branches
    const mainPattern = /origin\/(main|master|develop|dev)/;
    const defaultBranch = branches.find(b => mainPattern.test(b.trim()));
    
    if (defaultBranch) {
      return defaultBranch.trim().replace(/^origin\//, '');
    }
    
    // Fallback to 'main'
    return 'main';
  } catch (error) {
    // If we can't determine, default to main
    return 'main';
  }
}

function getCommitsSinceBaseBranch(baseBranch: string): string[] {
  try {
    // Get commit messages since branching from base
    const mergeBase = execSync(`git merge-base HEAD origin/${baseBranch}`).toString().trim();
    const commitMessages = execSync(`git log --pretty=format:"%s" ${mergeBase}..HEAD`).toString().trim();
    
    return commitMessages.split('\n').filter(Boolean);
  } catch (error) {
    console.error(chalk.yellow('Could not get commits since base branch. Using all commits in the current branch.'));
    // Fallback: just get commits on this branch
    try {
      const commitMessages = execSync('git log --pretty=format:"%s" HEAD~10..HEAD').toString().trim();
      return commitMessages.split('\n').filter(Boolean);
    } catch (e) {
      return [];
    }
  }
}

function getChangedFiles(baseBranch: string): string[] {
  try {
    // Get files changed since branching from base
    const changedFiles = execSync(`git diff --name-only origin/${baseBranch}...HEAD`).toString().trim();
    return changedFiles.split('\n').filter(Boolean);
  } catch (error) {
    console.error(chalk.yellow('Could not get changed files since base branch.'));
    return [];
  }
}

async function generatePRDetails(baseBranch: string, currentBranch: string): Promise<{ title: string, body: string }> {
  const config = getConfig();
  
  if (!config) {
    throw new Error('GitPT is not configured. Please run "gitpt setup" first.');
  }

  const { apiKey, model } = config;
  
  // Get context for PR
  const commitMessages = getCommitsSinceBaseBranch(baseBranch);
  const changedFiles = getChangedFiles(baseBranch);
  
  console.log(chalk.blue('Generating PR title and description...'));
  
  // Create context for the AI
  const context = `
Branch: ${currentBranch}
Base branch: ${baseBranch}

Commit messages in this branch:
${commitMessages.map(msg => `- ${msg}`).join('\n')}

Files changed in this branch:
${changedFiles.map(file => `- ${file}`).join('\n')}
  `.trim();
  
  const systemPrompt = `You are a helpful assistant that generates clear, informative GitHub pull request titles and descriptions.
For the title:
- Keep it concise (under 80 characters)
- Start with a verb in present tense (e.g., "Add", "Fix", "Update")
- Clearly summarize the main purpose of the changes

For the description:
- Start with a brief summary (1-2 sentences) of what the PR accomplishes
- Include a more detailed explanation of changes if needed
- List key changes as bullet points if there are multiple components
- Include any relevant context that reviewers should know
- End with any testing instructions if applicable

Format the description in Markdown with sections.
Do not include "PR" or "Pull Request" in the title.`;

  const userPrompt = `Generate a pull request title and description for the following changes:

${context}

Format your response exactly like this example:
Title: Add user authentication with JWT
Description: 
## Summary
This PR adds user authentication using JWT tokens.

## Changes
- Implement login and registration endpoints
- Add JWT generation and validation
- Update user model with password hashing
- Add authorization middleware

## How to test
1. Register a new user with \`/api/register\`
2. Login with the new user credentials
3. Use the returned token to access protected endpoints`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/bartaxyz/GitPT',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json() as OpenRouterResponse;
    const result = data.choices[0].message.content.trim();
    
    // Parse title and description from AI response
    const titleMatch = result.match(/Title:\s*(.+?)(?:\n|$)/);
    const descMatch = result.match(/Description:\s*\n([\s\S]+)$/);
    
    const title = titleMatch ? titleMatch[1].trim() : '';
    const body = descMatch ? descMatch[1].trim() : result; // Fallback to full response if parsing fails
    
    return { title, body };
  } catch (error) {
    console.error(chalk.red('Error generating PR details:'), error);
    throw new Error('Failed to generate PR details');
  }
}

function checkGitHubCLIAvailability(): boolean {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function createPullRequest(title: string, body: string, baseBranch: string, draft: boolean): void {
  const draftFlag = draft ? '--draft' : '';
  
  try {
    console.log(chalk.blue(`Creating pull request to ${baseBranch}...`));
    
    // Use template literal to preserve line breaks in the body
    const command = `gh pr create --title "${title}" --body "${body.replace(/"/g, '\\"')}" --base "${baseBranch}" ${draftFlag}`;
    
    execSync(command, { stdio: 'inherit' });
    
    console.log(chalk.green('✓ Pull request created successfully'));
  } catch (error) {
    console.error(chalk.red('Error creating pull request:'), error);
    throw new Error('Failed to create pull request');
  }
}

export async function prCreateCommand(options: PullRequestOptions = {}): Promise<void> {
  if (!isGitRepository()) {
    console.error(chalk.red('Error: Not a git repository'));
    process.exit(1);
  }

  // Check if GitHub CLI is available
  if (!checkGitHubCLIAvailability()) {
    console.error(chalk.red('Error: GitHub CLI (gh) is not installed or not available in PATH.'));
    console.log(chalk.yellow('Please install GitHub CLI from https://cli.github.com/'));
    process.exit(1);
  }
  
  // Check if user is authenticated with GitHub CLI
  try {
    execSync('gh auth status', { stdio: 'ignore' });
  } catch (error) {
    console.error(chalk.red('Error: You are not authenticated with GitHub CLI.'));
    console.log(chalk.yellow('Please run `gh auth login` to authenticate.'));
    process.exit(1);
  }

  // Get configuration
  const config = getConfig();
  if (!config) {
    console.error(chalk.red('GitPT is not configured. Please run "gitpt setup" first.'));
    process.exit(1);
  }

  try {
    const currentBranch = getCurrentBranch();
    const baseBranch = options.base || getDefaultBaseBranch();
    
    let title: string = options.title || '';
    let body: string = options.body || '';
    
    // Generate PR details if not provided
    if (!title || !body) {
      const generatedDetails = await generatePRDetails(baseBranch, currentBranch);
      title = title || generatedDetails.title;
      body = body || generatedDetails.body;
      
      console.log(chalk.green('✓ PR details generated'));
      console.log('');
      console.log(chalk.cyan('Generated title:'));
      console.log(title);
      console.log('');
      console.log(chalk.cyan('Generated description:'));
      console.log(body);
      console.log('');
    }
    
    // Allow editing PR details
    if (options.edit !== false) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'title',
          message: 'Edit PR title:',
          default: title
        },
        {
          type: 'editor',
          name: 'body',
          message: 'Edit PR description:',
          default: body
        },
        {
          type: 'confirm',
          name: 'draft',
          message: 'Create as draft PR?',
          default: options.draft || false
        }
      ]);
      
      title = answers.title;
      body = answers.body;
      const isDraft = answers.draft;
      
      // Create the PR
      createPullRequest(title, body, baseBranch, isDraft);
    } else {
      // Create the PR without editing
      createPullRequest(title, body, baseBranch, options.draft || false);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}