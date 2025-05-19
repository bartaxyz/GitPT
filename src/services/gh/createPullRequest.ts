import chalk from "chalk";
import { execSync } from "child_process";

export const createPullRequest = (
  title: string,
  body: string,
  baseBranch: string,
  draft: boolean
): void => {
  const draftFlag = draft ? "--draft" : "";

  try {
    console.log(chalk.blue(`Creating pull request to ${baseBranch}...`));

    // Create a temporary file for the PR body to avoid issues with escaping
    const tempFilePath = `/tmp/gitpt-pr-body-${Date.now()}.md`;
    try {
      // Write the body to a temporary file
      execSync(`cat > "${tempFilePath}" << 'GITPT_EOF'
  ${body}
  GITPT_EOF`);

      // Try to get the remote repo URL if available
      let repoUrlArg = "";
      try {
        const repoUrl = execSync("git config --get remote.origin.url")
          .toString()
          .trim();
        if (repoUrl) {
          repoUrlArg = `--repo "${repoUrl}"`;
        }
      } catch (e) {
        // Proceed without repo URL
      }

      // Use the file for the body
      const command = `gh pr create --title "${title.replace(
        /"/g,
        '\\"'
      )}" --body-file "${tempFilePath}" --base "${baseBranch}" ${draftFlag} ${repoUrlArg}`;

      // Set a timeout to avoid hanging indefinitely
      console.log(chalk.gray("Running GitHub PR creation command..."));
      console.log(chalk.gray(`Using base branch: ${baseBranch}`));

      // Add debugging output
      console.log(chalk.gray("Executing command with 60s timeout:"));

      // Execute the command with a timeout
      const result = execSync(command, {
        stdio: "pipe",
        timeout: 60000, // 60-second timeout
      }).toString();

      console.log(result);
      console.log(chalk.green("✓ Pull request created successfully"));
    } finally {
      // Clean up temporary file
      try {
        execSync(`rm -f "${tempFilePath}"`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("timeout")) {
      console.error(
        chalk.red("Error: GitHub CLI command timed out after 60 seconds.")
      );
      console.log(
        chalk.yellow("You may need to create the PR manually using:")
      );
      console.log(
        chalk.yellow(
          `gh pr create --title "${title}" --base "${baseBranch}" ${draftFlag}`
        )
      );
    } else {
      console.error(chalk.red("Error creating pull request:"), error);
    }
    throw new Error("Failed to create pull request");
  }
};
