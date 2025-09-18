import chalk from "chalk";
import { execSync } from "child_process";
import { isAvailable } from "../../../services/gitlab/isAvailable.js";

export const glabCapability = (): void => {
  if (!isAvailable()) {
    console.error(
      chalk.red("GitLab CLI (glab) is not installed or available in PATH")
    );
    console.log(
      chalk.yellow("Please install GitLab CLI from https://gitlab.com/gitlab-org/cli")
    );
    process.exit(1);
  }

  // Check if user is authenticated with GitLab CLI
  try {
    const authStatus = execSync(
      "glab auth status 2>&1 || true"
    ).toString();
    if (authStatus.includes("not logged") || authStatus.includes("No accounts found")) {
      console.error(
        chalk.red("Error: You are not authenticated with GitLab CLI.")
      );
      console.log(chalk.yellow("Please run `glab auth login` to authenticate."));
      process.exit(1);
    }
  } catch (error) {
    console.log(
      chalk.yellow("Warning: Could not verify GitLab CLI authentication.")
    );
    console.log(
      chalk.yellow("If MR creation fails, please run `glab auth login` first.")
    );
  }
};
