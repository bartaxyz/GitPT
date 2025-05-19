import { git } from "@services/git";
import chalk from "chalk";
import { execSync } from "child_process";

export const getPRContext = (): string[] => {
  const currentBranch = git.getCurrentBranch();
  const baseBranch = git.getDefaultBranch();

  // Get context for PR
  const commitMessages = git.getCommitsSinceBaseBranch(baseBranch);
  const changedFiles = git.getChangedFiles(baseBranch);

  // Check if we have any content to work with
  if (commitMessages.length === 0 && changedFiles.length === 0) {
    console.log(chalk.yellow("No commits or changed files detected."));
    console.log(
      chalk.yellow(
        "Will attempt to generate PR details using branch name and repository context."
      )
    );
  }

  // Get additional context from repository
  let repoName = "";
  let repoDescription = "";

  try {
    // Try to get repo information from GitHub CLI
    const repoInfo = JSON.parse(
      execSync("gh repo view --json name,description").toString().trim()
    );
    repoName = repoInfo.name || "";
    repoDescription = repoInfo.description || "";
  } catch (error) {
    // Continue without this info
  }

  console.log(chalk.blue("Generating PR title and description..."));

  // Build a rich context for the AI
  let contextSections = [
    `Branch: ${currentBranch}`,
    `Base branch: ${baseBranch}`,
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
      "Commit messages in this branch:",
      commitMessages.map((msg) => `- ${msg}`).join("\n")
    );
  } else {
    contextSections.push("No commit messages available.");

    // Try to extract intent from branch name if no commits
    if (currentBranch.includes("/")) {
      const branchParts = currentBranch.split("/");
      const branchType = branchParts[0]; // e.g., "feature", "fix", "chore"
      const branchDescription = branchParts
        .slice(1)
        .join("/")
        .replace(/-/g, " ");

      contextSections.push(
        "Branch name analysis:",
        `Type: ${branchType}`,
        `Description: ${branchDescription}`
      );
    }
  }

  // Add changed files if available
  if (changedFiles.length > 0) {
    contextSections.push(
      "Files changed in this branch:",
      changedFiles.map((file) => `- ${file}`).join("\n")
    );
  } else {
    contextSections.push("No file changes detected.");
  }

  return contextSections;
};
