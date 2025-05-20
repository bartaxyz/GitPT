import chalk from "chalk";
import { execSync } from "child_process";

export const getDefaultBranch = (): string => {
  try {
    // First check for a default branch set in git config
    try {
      const defaultBranch = execSync("git config init.defaultBranch")
        .toString()
        .trim();
      if (defaultBranch) {
        return defaultBranch;
      }
    } catch (error) {
      // Continue if git config doesn't have default branch
    }

    // Next, check if GitHub CLI can tell us the default branch
    try {
      const repoInfo = execSync(
        "gh repo view --json defaultBranchRef --jq .defaultBranchRef.name"
      )
        .toString()
        .trim();
      if (repoInfo) {
        return repoInfo;
      }
    } catch (error) {
      // Continue if gh command fails
    }

    // Try to find default branch in remote branches list
    const branches = execSync("git branch -r").toString().trim().split("\n");

    // Common default branch names, in order of likelihood
    const mainPatterns = [
      /origin\/main$/,
      /origin\/master$/,
      /origin\/develop$/,
      /origin\/dev$/,
      /origin\/trunk$/,
    ];

    // Try each pattern in order
    for (const pattern of mainPatterns) {
      const defaultBranch = branches.find((b) => pattern.test(b.trim()));
      if (defaultBranch) {
        return defaultBranch.trim().replace(/^origin\//, "");
      }
    }

    // Check for a branch that has 'HEAD -> origin/' in it, indicating the default branch
    const headBranch = branches.find((b) => b.includes("HEAD -> origin/"));
    if (headBranch) {
      const match = headBranch.match(/HEAD -> origin\/([^,\s]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Fallback to 'main' as most GitHub repos use this now
    console.log(
      chalk.yellow('Could not determine default branch, using "main"')
    );
    return "main";
  } catch (error) {
    // If we can't determine, default to main
    console.log(chalk.yellow('Error detecting default branch, using "main"'));
    return "main";
  }
}
