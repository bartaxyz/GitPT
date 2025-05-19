import { gh } from "@services/gh";
import chalk from "chalk";
import { execSync } from "child_process";

export const ghCapability = (): void => {
  if (!gh.isAvailable()) {
    console.error(
      chalk.red("GitHub CLI (gh) is not installed or available in PATH")
    );
    console.log(
      chalk.yellow("Please install GitHub CLI from https://cli.github.com/")
    );
    process.exit(1);
  }

  // Check if user is authenticated with GitHub CLI
  try {
    const authStatus = execSync(
      "gh auth status -h github.com 2>&1 || true"
    ).toString();
    if (authStatus.includes("not logged")) {
      console.error(
        chalk.red("Error: You are not authenticated with GitHub CLI.")
      );
      console.log(chalk.yellow("Please run `gh auth login` to authenticate."));
      process.exit(1);
    }
  } catch (error) {
    console.log(
      chalk.yellow("Warning: Could not verify GitHub CLI authentication.")
    );
    console.log(
      chalk.yellow("If PR creation fails, please run `gh auth login` first.")
    );
  }
};
