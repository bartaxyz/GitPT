import chalk from "chalk";
import { execSync } from "child_process";
import { git } from "../../services/git/index.js";
import { Host, requestTermShort } from "./types.js";

export const getPRContext = (host: Host): string[] => {
  const requestTerm = requestTermShort[host];

  const currentBranch = git.getCurrentBranch();
  const baseBranch = git.getDefaultBranch(host);

  // Get context for PR
  const commitMessages = git.getCommitsSinceBaseBranch(baseBranch);
  const changedFiles = git.getChangedFiles(baseBranch);

  // Check if we have any content to work with
  if (commitMessages.length === 0 && changedFiles.length === 0) {
    console.log(chalk.yellow("No commits or changed files detected."));
    console.log(
      chalk.yellow(
        `Will attempt to generate ${requestTerm} details using branch name and repository context.`
      )
    );
  }

  // Get additional context from repository
  let repoName = "";
  let repoDescription = "";

  if (host === Host.GITHUB) {
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
  } else if (host === Host.GITLAB) {
    try {
      // Get repo name and description from glab CLI output
      const repoViewOutput = execSync("glab repo view").toString();
      // The first line is usually the repo name (e.g. group/project)
      // The description is usually after a blank line
      const lines = repoViewOutput.split("\n");
      repoName = lines[0]?.trim() || "";
      // Find the first non-empty line after the first blank line
      let foundBlank = false;
      for (const line of lines.slice(1)) {
        if (!foundBlank && line.trim() === "") {
          foundBlank = true;
          continue;
        }
        if (foundBlank && line.trim() !== "") {
          repoDescription = line.trim();
          break;
        }
      }
    } catch (error) {
      // Continue without this info
    }
  }

  console.log(chalk.blue(`Generating ${requestTerm} title and description...`));

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
