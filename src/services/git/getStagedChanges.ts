import chalk from "chalk";
import { execSync } from "child_process";

export const getStagedChanges = (): string => {
  try {
    return execSync("git diff --staged").toString();
  } catch (error) {
    console.error(chalk.red("Error getting staged changes:"), error);
    throw new Error("Failed to get staged changes");
  }
};
