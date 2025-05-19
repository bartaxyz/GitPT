import chalk from "chalk";
import { git } from "../../services/git";

export const hasStagedChangesMiddleware = (): void => {
  if (!git.hasStagedChanges()) {
    console.error(chalk.red("Error: No staged changes"));
    process.exit(1);
  }
};
