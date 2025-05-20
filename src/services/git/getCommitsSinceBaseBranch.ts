import chalk from "chalk";
import { execSync } from "child_process";

export const getCommitsSinceBaseBranch = (baseBranch: string): string[] => {
  try {
    // Try first with origin/baseBranch
    try {
      const mergeBase = execSync(`git merge-base HEAD origin/${baseBranch}`)
        .toString()
        .trim();
      const commitMessages = execSync(
        `git log --pretty=format:"%s" ${mergeBase}..HEAD`
      )
        .toString()
        .trim();

      if (commitMessages) {
        return commitMessages.split("\n").filter(Boolean);
      }
    } catch (error) {
      // If origin/baseBranch doesn't exist, try with just baseBranch
      console.log(
        chalk.yellow(
          `No origin/${baseBranch} found, trying with local ${baseBranch} branch...`
        )
      );
    }

    // Try with local branch
    try {
      const mergeBase = execSync(`git merge-base HEAD ${baseBranch}`)
        .toString()
        .trim();
      const commitMessages = execSync(
        `git log --pretty=format:"%s" ${mergeBase}..HEAD`
      )
        .toString()
        .trim();

      if (commitMessages) {
        return commitMessages.split("\n").filter(Boolean);
      }
    } catch (error) {
      // If that fails too, fallback to simple branch comparison
      console.log(
        chalk.yellow(
          `Merge base with ${baseBranch} not found, comparing branches directly...`
        )
      );
    }

    // Direct branch comparison
    try {
      const commitMessages = execSync(
        `git log --pretty=format:"%s" ${baseBranch}..HEAD`
      )
        .toString()
        .trim();

      if (commitMessages) {
        return commitMessages.split("\n").filter(Boolean);
      }
    } catch (error) {
      console.log(
        chalk.yellow(
          `Could not compare with ${baseBranch}, using recent commits...`
        )
      );
    }

    // Last resort: get most recent commits
    const commitMessages = execSync('git log --pretty=format:"%s" -n 10')
      .toString()
      .trim();
    return commitMessages.split("\n").filter(Boolean);
  } catch (error) {
    console.error(chalk.yellow("Could not get commits. Using empty list."));
    return [];
  }
};
