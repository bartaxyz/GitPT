import { execSync } from "child_process";
import chalk from "chalk";

export function isGitRepository(): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
}

export function getStagedChanges(): string {
  try {
    return execSync("git diff --staged").toString();
  } catch (error) {
    console.error(chalk.red("Error getting staged changes:"), error);
    throw new Error("Failed to get staged changes");
  }
}

export function getStagedFiles(): string[] {
  try {
    const result = execSync("git diff --staged --name-only").toString();
    return result.split("\n").filter(Boolean);
  } catch (error) {
    console.error(chalk.red("Error getting staged files:"), error);
    throw new Error("Failed to get staged files");
  }
}

export function hasStagedChanges(): boolean {
  try {
    const output = execSync(
      'git diff --staged --quiet || echo "has-changes"'
    ).toString();
    return output.includes("has-changes");
  } catch (error) {
    return true; // Assume there are changes if we can't check
  }
}

export function executeGitAdd(files: string[]): void {
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
}

export function executeGitCommit(
  message: string,
  additionalArgs: string[] = []
): void {
  try {
    const args = additionalArgs.join(" ");
    execSync(`git commit -m "${message}" ${args}`, { stdio: "inherit" });
  } catch (error) {
    console.error(chalk.red("Error committing changes:"), error);
    throw new Error("Failed to commit changes");
  }
}
