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
    // First check for a default branch set in git config
    try {
      const defaultBranch = execSync('git config init.defaultBranch').toString().trim();
      if (defaultBranch) {
        return defaultBranch;
      }
    } catch (error) {
      // Continue if git config doesn't have default branch
    }
    
    // Next, check if GitHub CLI can tell us the default branch
    try {
      const repoInfo = execSync('gh repo view --json defaultBranchRef --jq .defaultBranchRef.name').toString().trim();
      if (repoInfo) {
        return repoInfo;
      }
    } catch (error) {
      // Continue if gh command fails
    }
    
    // Try to find default branch in remote branches list
    const branches = execSync('git branch -r').toString().trim().split('\n');
    
    // Common default branch names, in order of likelihood
    const mainPatterns = [
      /origin\/main$/,
      /origin\/master$/,
      /origin\/develop$/,
      /origin\/dev$/,
      /origin\/trunk$/
    ];
    
    // Try each pattern in order
    for (const pattern of mainPatterns) {
      const defaultBranch = branches.find(b => pattern.test(b.trim()));
      if (defaultBranch) {
        return defaultBranch.trim().replace(/^origin\//, '');
      }
    }
    
    // Check for a branch that has 'HEAD -> origin/' in it, indicating the default branch
    const headBranch = branches.find(b => b.includes('HEAD -> origin/'));
    if (headBranch) {
      const match = headBranch.match(/HEAD -> origin\/([^,\s]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Fallback to 'main' as most GitHub repos use this now
    console.log(chalk.yellow('Could not determine default branch, using "main"'));
    return 'main';
  } catch (error) {
    // If we can't determine, default to main
    console.log(chalk.yellow('Error detecting default branch, using "main"'));
    return 'main';
  }
}

function getCommitsSinceBaseBranch(baseBranch: string): string[] {
  try {
    // Try first with origin/baseBranch
    try {
      const mergeBase = execSync(`git merge-base HEAD origin/${baseBranch}`).toString().trim();
      const commitMessages = execSync(`git log --pretty=format:"%s" ${mergeBase}..HEAD`).toString().trim();
      
      if (commitMessages) {
        return commitMessages.split('\n').filter(Boolean);
      }
    } catch (error) {
      // If origin/baseBranch doesn't exist, try with just baseBranch
      console.log(chalk.yellow(`No origin/${baseBranch} found, trying with local ${baseBranch} branch...`));
    }
    
    // Try with local branch
    try {
      const mergeBase = execSync(`git merge-base HEAD ${baseBranch}`).toString().trim();
      const commitMessages = execSync(`git log --pretty=format:"%s" ${mergeBase}..HEAD`).toString().trim();
      
      if (commitMessages) {
        return commitMessages.split('\n').filter(Boolean);
      }
    } catch (error) {
      // If that fails too, fallback to simple branch comparison
      console.log(chalk.yellow(`Merge base with ${baseBranch} not found, comparing branches directly...`));
    }
    
    // Direct branch comparison
    try {
      const commitMessages = execSync(`git log --pretty=format:"%s" ${baseBranch}..HEAD`).toString().trim();
      
      if (commitMessages) {
        return commitMessages.split('\n').filter(Boolean);
      }
    } catch (error) {
      console.log(chalk.yellow(`Could not compare with ${baseBranch}, using recent commits...`));
    }
    
    // Last resort: get most recent commits
    const commitMessages = execSync('git log --pretty=format:"%s" -n 10').toString().trim();
    return commitMessages.split('\n').filter(Boolean);
  } catch (error) {
    console.error(chalk.yellow('Could not get commits. Using empty list.'));
    return [];
  }
}

function getChangedFiles(baseBranch: string): string[] {
  // Try several methods to get changed files
  
  // Method 1: Compare with origin/baseBranch using three dots
  try {
    const changedFiles = execSync(`git diff --name-only origin/${baseBranch}...HEAD`).toString().trim();
    if (changedFiles) {
      return changedFiles.split('\n').filter(Boolean);
    }
  } catch (error) {
    // Continue to next method
  }
  
  // Method 2: Compare with local baseBranch using three dots
  try {
    const changedFiles = execSync(`git diff --name-only ${baseBranch}...HEAD`).toString().trim();
    if (changedFiles) {
      return changedFiles.split('\n').filter(Boolean);
    }
  } catch (error) {
    // Continue to next method
  }
  
  // Method 3: Direct comparison with two dots
  try {
    const changedFiles = execSync(`git diff --name-only ${baseBranch}..HEAD`).toString().trim();
    if (changedFiles) {
      return changedFiles.split('\n').filter(Boolean);
    }
  } catch (error) {
    // Continue to next method
  }
  
  // Method 4: Get recently modified files
  try {
    console.log(chalk.yellow(`Could not determine changed files relative to ${baseBranch}, using recently modified files...`));
    const changedFiles = execSync('git ls-files --modified --others --exclude-standard').toString().trim();
    if (changedFiles) {
      return changedFiles.split('\n').filter(Boolean);
    }
  } catch (error) {
    // Last resort
  }
  
  // Method 5: List all files in the repo as a last resort
  try {
    console.log(chalk.yellow('Using all tracked files as fallback...'));
    const allFiles = execSync('git ls-files').toString().trim();
    return allFiles.split('\n').filter(Boolean).slice(0, 50); // Limit to first 50 files
  } catch (error) {
    console.error(chalk.red('Could not determine changed files.'));
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
  
  // Check if we have any content to work with
  if (commitMessages.length === 0 && changedFiles.length === 0) {
    console.log(chalk.yellow('No commits or changed files detected.'));
    console.log(chalk.yellow('Will attempt to generate PR details using branch name and repository context.'));
  }
  
  // Get additional context from repository
  let repoName = "";
  let repoDescription = "";
  
  try {
    // Try to get repo information from GitHub CLI
    const repoInfo = JSON.parse(execSync('gh repo view --json name,description').toString().trim());
    repoName = repoInfo.name || "";
    repoDescription = repoInfo.description || "";
  } catch (error) {
    // Continue without this info
  }
  
  console.log(chalk.blue('Generating PR title and description...'));
  
  // Build a rich context for the AI
  let contextSections = [
    `Branch: ${currentBranch}`,
    `Base branch: ${baseBranch}`
  ];
  
  // Add repository info if available
  if (repoName) {
    contextSections.push(`Repository: ${repoName}`);
  }
  
  if (repoDescription) {
    contextSections.push(`Repository description: ${repoDescription}`);
  }
  
  // Add commit messages if available
  if (commitMessages.length > 0) {
    contextSections.push(
      'Commit messages in this branch:',
      commitMessages.map(msg => `- ${msg}`).join('\n')
    );
  } else {
    contextSections.push('No commit messages available.');
    
    // Try to extract intent from branch name if no commits
    if (currentBranch.includes('/')) {
      const branchParts = currentBranch.split('/');
      const branchType = branchParts[0]; // e.g., "feature", "fix", "chore"
      const branchDescription = branchParts.slice(1).join('/').replace(/-/g, ' ');
      
      contextSections.push(
        'Branch name analysis:',
        `Type: ${branchType}`,
        `Description: ${branchDescription}`
      );
    }
  }
  
  // Add changed files if available
  if (changedFiles.length > 0) {
    contextSections.push(
      'Files changed in this branch:',
      changedFiles.map(file => `- ${file}`).join('\n')
    );
  } else {
    contextSections.push('No file changes detected.');
  }
  
  // Create the final context
  const context = contextSections.join('\n\n');
  
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
    
    // Create a temporary file for the PR body to avoid issues with escaping
    const tempFilePath = `/tmp/gitpt-pr-body-${Date.now()}.md`;
    try {
      // Write the body to a temporary file
      execSync(`cat > "${tempFilePath}" << 'GITPT_EOF'
${body}
GITPT_EOF`);
      
      // Try to get the remote repo URL if available
      let repoUrlArg = '';
      try {
        const repoUrl = execSync('git config --get remote.origin.url').toString().trim();
        if (repoUrl) {
          repoUrlArg = `--repo "${repoUrl}"`;
        }
      } catch (e) {
        // Proceed without repo URL
      }
      
      // Use the file for the body
      const command = `gh pr create --title "${title.replace(/"/g, '\\"')}" --body-file "${tempFilePath}" --base "${baseBranch}" ${draftFlag} ${repoUrlArg}`;
      
      // Set a timeout to avoid hanging indefinitely
      console.log(chalk.gray('Running GitHub PR creation command...'));
      console.log(chalk.gray(`Using base branch: ${baseBranch}`));
      
      // Add debugging output
      console.log(chalk.gray('Executing command with 60s timeout:'));
      
      // Execute the command with a timeout
      const result = execSync(command, { 
        stdio: 'pipe', 
        timeout: 60000 // 60-second timeout 
      }).toString();
      
      console.log(result);
      console.log(chalk.green('✓ Pull request created successfully'));
    } finally {
      // Clean up temporary file
      try {
        execSync(`rm -f "${tempFilePath}"`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      console.error(chalk.red('Error: GitHub CLI command timed out after 60 seconds.'));
      console.log(chalk.yellow('You may need to create the PR manually using:'));
      console.log(chalk.yellow(`gh pr create --title "${title}" --base "${baseBranch}" ${draftFlag}`));
    } else {
      console.error(chalk.red('Error creating pull request:'), error);
    }
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
    const authStatus = execSync('gh auth status -h github.com 2>&1 || true').toString();
    if (authStatus.includes('not logged')) {
      console.error(chalk.red('Error: You are not authenticated with GitHub CLI.'));
      console.log(chalk.yellow('Please run `gh auth login` to authenticate.'));
      process.exit(1);
    }
  } catch (error) {
    console.log(chalk.yellow('Warning: Could not verify GitHub CLI authentication.'));
    console.log(chalk.yellow('If PR creation fails, please run `gh auth login` first.'));
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