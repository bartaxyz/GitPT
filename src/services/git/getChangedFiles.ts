import chalk from "chalk";
import { execSync } from "child_process";

export const getChangedFiles = (baseBranch: string): string[] => {
  // Try several methods to get changed files

  // Method 1: Compare with origin/baseBranch using three dots
  try {
    const changedFiles = execSync(
      `git diff --name-only origin/${baseBranch}...HEAD`
    )
      .toString()
      .trim();
    if (changedFiles) {
      return changedFiles.split("\n").filter(Boolean);
    }
  } catch (error) {
    // Continue to next method
  }

  // Method 2: Compare with local baseBranch using three dots
  try {
    const changedFiles = execSync(`git diff --name-only ${baseBranch}...HEAD`)
      .toString()
      .trim();
    if (changedFiles) {
      return changedFiles.split("\n").filter(Boolean);
    }
  } catch (error) {
    // Continue to next method
  }

  // Method 3: Direct comparison with two dots
  try {
    const changedFiles = execSync(`git diff --name-only ${baseBranch}..HEAD`)
      .toString()
      .trim();
    if (changedFiles) {
      return changedFiles.split("\n").filter(Boolean);
    }
  } catch (error) {
    // Continue to next method
  }

  // Method 4: Get recently modified files
  try {
    console.log(
      chalk.yellow(
        `Could not determine changed files relative to ${baseBranch}, using recently modified files...`
      )
    );
    const changedFiles = execSync(
      "git ls-files --modified --others --exclude-standard"
    )
      .toString()
      .trim();
    if (changedFiles) {
      return changedFiles.split("\n").filter(Boolean);
    }
  } catch (error) {
    // Last resort
  }

  // Method 5: List all files in the repo as a last resort
  try {
    console.log(chalk.yellow("Using all tracked files as fallback..."));
    const allFiles = execSync("git ls-files").toString().trim();
    return allFiles.split("\n").filter(Boolean).slice(0, 50); // Limit to first 50 files
  } catch (error) {
    console.error(chalk.red("Could not determine changed files."));
    return [];
  }
};
