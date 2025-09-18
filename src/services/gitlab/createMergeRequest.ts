import chalk from "chalk";
import { execSync } from "child_process";

export const createMergeRequest = (
  title: string,
  body: string,
  baseBranch: string,
  draft: boolean
): void => {
  const draftFlag = draft ? "--draft" : "";

  // HEAD -> origin/master to master
  const formattedBaseBranch = baseBranch.replace(/HEAD -> origin\//, "");

  try {
    console.log(chalk.blue(`Creating merge request to ${formattedBaseBranch}...`));

    // Try to get the remote repo URL if available
    let repoUrlArg = "";
    try {
      const repoUrl = execSync("git config --get remote.origin.url")
        .toString()
        .trim();
      if (repoUrl) {
        repoUrlArg = `--repo \"${repoUrl}\"`;
      }
    } catch (e) {
      // Proceed without repo URL
    }

    // Use the body string directly since glab does not support --description-file
    // Escape double quotes and newlines for shell safety
    const safeBody = body.replace(/"/g, '\"').replace(/\n/g, "\\n");
    const command = `glab mr create --title "${title.replace(/"/g, '\\"')}" --description "${safeBody}" --target-branch "${formattedBaseBranch}" ${draftFlag} ${repoUrlArg}`;

    // Set a timeout to avoid hanging indefinitely
    console.log(chalk.gray("Running GitLab MR creation command..."));
    console.log(chalk.gray(`Using base branch: ${formattedBaseBranch}`));
    console.log(chalk.gray("Executing command with 60s timeout:"));

    // Execute the command with a timeout
    const result = execSync(command, {
      stdio: "pipe",
      timeout: 60000, // 60-second timeout
    }).toString();

    console.log(result);
    console.log(chalk.green("✓ Merge request created successfully"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("timeout")) {
      console.error(
        chalk.red("Error: GitLab CLI command timed out after 60 seconds.")
      );
      console.log(
        chalk.yellow("You may need to create the MR manually using:")
      );
      console.log(
        chalk.yellow(
          `glab mr create --title \"${title}\" --target-branch \"${formattedBaseBranch}\" ${draftFlag}`
        )
      );
    } else {
      console.error(chalk.red("Error creating merge request:"), error);
    }
    throw new Error("Failed to create merge request");
  }
};
