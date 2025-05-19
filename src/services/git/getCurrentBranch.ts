import chalk from "chalk";
import { execSync } from "child_process";

export const getCurrentBranch = (): string => {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
  } catch (error) {
    console.error(chalk.red("Error getting current branch:"), error);
    throw new Error("Failed to get current branch");
  }
};
