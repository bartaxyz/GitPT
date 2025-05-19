import { capabilitiesMiddleware } from "@middleware/capabilitiesMiddleware";
import { setupMiddleware } from "@middleware/setupMiddleware";
import { gh } from "@services/gh";
import { git } from "@services/git";
import chalk from "chalk";
import inquirer from "inquirer";
import { generatePRDetails } from "./generatePRDetails";

interface PullRequestOptions {
  title?: string;
  body?: string;
  draft?: boolean;
  base?: string;
  edit?: boolean;
  [key: string]: any;
}

export const prCreateCommand = async (
  options: PullRequestOptions = {}
): Promise<void> => {
  capabilitiesMiddleware(["git", "gh"]);
  await setupMiddleware();

  try {
    const baseBranch = options.base || git.getDefaultBranch();

    let title: string = options.title || "";
    let body: string = options.body || "";

    // Generate PR details if not provided
    if (!title || !body) {
      const generatedDetails = await generatePRDetails();
      title = title || generatedDetails.title;
      body = body || generatedDetails.body;

      console.log(chalk.green("✓ PR details generated"));
      console.log("");
      console.log(chalk.cyan("Title:"));
      console.log(title);
      console.log("");
      console.log(chalk.cyan("Description:"));
      console.log(body);
      console.log("");
    }

    // Allow editing PR details
    if (options.edit !== false) {
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "title",
          message: "Edit PR title:",
          default: title,
        },
        {
          type: "editor",
          name: "body",
          message: "Edit PR description:",
          default: body,
        },
        {
          type: "confirm",
          name: "draft",
          message: "Create as draft PR?",
          default: options.draft || false,
        },
      ]);

      title = answers.title;
      body = answers.body;
      const isDraft = answers.draft;

      // Create the PR
      gh.createPullRequest(title, body, baseBranch, isDraft);
    } else {
      // Create the PR without editing
      gh.createPullRequest(title, body, baseBranch, options.draft || false);
    }
  } catch (error) {
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
};
