import chalk from "chalk";
import { git } from "../../../services/git/index.js";

export const gitCapability = (): void => {
  if (!git.isAvailable()) {
    console.error(
      chalk.red(
        "Git command is not available, install it from https://git-scm.com/"
      )
    );
    process.exit(1);
  }

  if (!git.isGitRepository()) {
    console.error(chalk.red("Not a git repository"));
    process.exit(1);
  }
};
