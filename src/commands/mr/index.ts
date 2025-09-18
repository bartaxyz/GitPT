import chalk from "chalk";
import inquirer from "inquirer";
import { git } from "../../services/git/index.js";
import { glab } from "../../services/gitlab/index.js";
import { capabilitiesMiddleware } from "../middleware/capabilitiesMiddleware/index.js";
import { setupMiddleware } from "../middleware/setupMiddleware/index.js";
import { generatePRDetails } from "../pr/generatePRDetails.js";
import { Host } from "../pr/types.js";

interface MergeRequestOptions {
  title?: string;
  body?: string;
  draft?: boolean;
  base?: string;
  edit?: boolean;
  [key: string]: any;
}

export const mrCreateCommand = async (
  options: MergeRequestOptions = {}
): Promise<void> => {
  capabilitiesMiddleware(["git", "glab"]);
  await setupMiddleware();

  try {
    const baseBranch = options.base || git.getDefaultBranch();

    let title: string = options.title || "";
    let body: string = options.body || "";

    // Generate MR details if not provided
    if (!title || !body) {
      const generatedDetails = await generatePRDetails(Host.GITLAB);
      title = title || generatedDetails.title;
      body = body || generatedDetails.body;

      console.log(chalk.green("✓ MR details generated"));
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
          message: "Edit MR title:",
          default: title,
        },
        {
          type: "editor",
          name: "body",
          message: "Edit MR description:",
          default: body,
        },
        {
          type: "confirm",
          name: "draft",
          message: "Create as draft MR?",
          default: options.draft || false,
        },
      ]);

      title = answers.title;
      body = answers.body;
      const isDraft = answers.draft;

      // Create the MR
      glab.createMergeRequest(title, body, baseBranch, isDraft);
    } else {
      // Create the MR without editing
      glab.createMergeRequest(title, body, baseBranch, options.draft || false);
    }
  } catch (error) {
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
};
