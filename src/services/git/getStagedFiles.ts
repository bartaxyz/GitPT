import chalk from "chalk";
import { execSync } from "child_process";

export const getStagedFiles = (): string[] => {
  try {
    const result = execSync("git diff --staged --name-only").toString();
    return result.split("\n").filter(Boolean);
  } catch (error) {
    console.error(chalk.red("Error getting staged files:"), error);
    throw new Error("Failed to get staged files");
  }
};
