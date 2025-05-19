import chalk from "chalk";
import { execSync } from "child_process";

export const executeGitCommit = (
  message: string,
  additionalArgs: string[] = []
): void => {
  try {
    const args = additionalArgs.join(" ");
    execSync(`git commit -m "${message}" ${args}`, { stdio: "inherit" });
  } catch (error) {
    console.error(chalk.red("Error committing changes:"), error);
    throw new Error("Failed to commit changes");
  }
};
