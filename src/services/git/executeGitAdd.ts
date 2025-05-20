import chalk from "chalk";
import { execSync } from "child_process";

export const executeGitAdd = (files: string[]): void => {
  try {
    if (files.length === 0) {
      throw new Error("No files specified");
    }

    const fileArgs = files.join(" ");
    execSync(`git add ${fileArgs}`, { stdio: "inherit" });
  } catch (error) {
    console.error(chalk.red("Error adding files:"), error);
    throw new Error("Failed to add files to git");
  }
};
