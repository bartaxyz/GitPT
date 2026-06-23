import chalk from "chalk";
import { execSync } from "child_process";

/**
 * The content of the commit being amended: the staged tree compared to the
 * commit before HEAD — so a plain reword still has a diff (even with nothing
 * staged), and any new staged changes are folded in. Falls back to the staged
 * diff when there is no previous commit (amending the very first commit).
 */
export const getAmendChanges = (): string => {
  try {
    return execSync("git diff --staged --function-context HEAD~1").toString();
  } catch {
    try {
      return execSync("git diff --staged --function-context").toString();
    } catch (error) {
      console.error(chalk.red("Error getting amend changes:"), error);
      throw new Error("Failed to get amend changes");
    }
  }
};
