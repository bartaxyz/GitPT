import chalk from "chalk";
import inquirer from "inquirer";
import { capabilitiesMiddleware } from "../middleware/capabilitiesMiddleware/index.js";
import { setupMiddleware } from "../middleware/setupMiddleware/index.js";
import { git } from "../../services/git/index.js";
import { isDebug } from "../../config.js";
import {
  hasCommitlintConfig,
  validateCommitMessage,
} from "../../utils/commitlint.js";
import { hasStagedChangesMiddleware } from "../middleware/hasStagedChangesMiddleware.js";
import { generateCommitMessage } from "./generateCommitMessage.js";
import { prepareCommitContext } from "./summarizeDiff.js";
import type { Command } from "commander";
import { passthroughArgs } from "../passthroughArgs.js";

interface CommitOptions {
  message?: string;
  edit?: boolean;
  dryRun?: boolean;
  debug?: boolean;
  [key: string]: any;
}

export const commitCommand = async (
  options: CommitOptions,
  command: Command,
): Promise<void> => {
  // --debug zapne diagnostiku pro tento běh (isDebug() pak čte GITPT_DEBUG).
  if (options.debug) process.env.GITPT_DEBUG = "1";
  capabilitiesMiddleware(["git"]);
  await setupMiddleware();

  // Git flags the user passed through (e.g. --allow-empty), forwarded to git.
  const args = passthroughArgs(command);

  // --allow-empty is valid even with nothing staged.
  if (!args.includes("--allow-empty")) {
    hasStagedChangesMiddleware();
  }

  let commitMessage: string;
  let context: string | undefined;

  // If message is provided, use that
  if (options.message) {
    commitMessage = options.message;
  } else {
    try {
      // Get staged changes
      const diff = git.getStagedChanges();

      context = await prepareCommitContext(diff);

      console.log(chalk.blue("Generating commit message..."));

      // Check if commitlint is configured
      let hasCommitlint = false;
      try {
        hasCommitlint = hasCommitlintConfig();
        if (hasCommitlint) {
          console.log(
            chalk.blue(
              "Commitlint configuration detected. Generating message according to rules...",
            ),
          );
        }
      } catch (error) {
        console.warn(
          chalk.yellow(
            "Warning: Error detecting commitlint config, proceeding without commitlint validation.",
          ),
        );
      }

      // Generate first commit message (timed for the debug diagnostic).
      const startedAt = Date.now();
      commitMessage = await generateCommitMessage(context);
      if (isDebug()) {
        console.log(
          chalk.gray(
            `⚙ debug · ~${Math.ceil(context.length / 3)} context tokens · generated in ${Date.now() - startedAt}ms`,
          ),
        );
      }

      // If commitlint is configured, try to validate and regenerate up to 3 times
      if (hasCommitlint) {
        try {
          console.log(
            chalk.blue("Validating commit message against commitlint rules..."),
          );

          // Try up to 3 times to get a valid message
          let validMessage = false;
          let attempts = 0;
          const MAX_ATTEMPTS = 3;
          let validationErrors: string | undefined;

          while (!validMessage && attempts < MAX_ATTEMPTS) {
            const validation = await validateCommitMessage(commitMessage);

            if (validation.valid) {
              console.log(chalk.green("✓ Commit message passed validation"));
              validMessage = true;
              break;
            } else {
              attempts++;
              console.log(
                chalk.yellow(
                  `Commit message failed validation. ${
                    attempts < MAX_ATTEMPTS
                      ? "Regenerating..."
                      : "Max attempts reached."
                  }`,
                ),
              );

              if (validation.errors) {
                console.log(chalk.gray(validation.errors));
                validationErrors = validation.errors;
              }

              if (attempts < MAX_ATTEMPTS) {
                // Try regenerating with validation errors
                try {
                  commitMessage = await generateCommitMessage(
                    context,
                    validationErrors,
                  );
                } catch (error) {
                  console.warn(
                    chalk.yellow(
                      "Error regenerating message, breaking validation loop.",
                    ),
                  );
                  break;
                }
              } else {
                // Ask user what to do after max attempts
                const { action } = await inquirer.prompt([
                  {
                    type: "list",
                    name: "action",
                    message:
                      "Failed to generate a valid commit message after 3 attempts. What would you like to do?",
                    choices: [
                      {
                        name: "Proceed with invalid message",
                        value: "proceed",
                      },
                      { name: "Edit message manually", value: "edit" },
                      { name: "Abort commit", value: "abort" },
                    ],
                  },
                ]);

                if (action === "abort") {
                  console.log(
                    chalk.red("Commit aborted due to validation failures."),
                  );
                  process.exit(1);
                } else if (action === "edit") {
                  options.edit = true; // Force editor to open
                } else {
                  console.log(
                    chalk.yellow("Proceeding with invalid message..."),
                  );
                }
                break;
              }
            }
          }
        } catch (error) {
          // If there's an error with commitlint validation, continue without it
          console.warn(
            chalk.yellow(
              "Warning: Error during commitlint validation, proceeding without validation.",
            ),
          );
          console.warn(
            chalk.gray(
              "This may be due to an ESM module cycle conflict or missing commitlint dependencies.",
            ),
          );
        }
      }

      console.log(chalk.green("✓ Commit message generated"));
      console.log("");
      console.log(chalk.cyan("Generated message:"));
      console.log(commitMessage);
      console.log("");
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  }

  if (options.dryRun) {
    return;
  }

  // Interactive: confirm the message, regenerate a different one, edit, or
  // cancel — one menu, looping until the user settles. Skipped for --no-edit
  // (take the generated message) and -m (the user's own message).
  if (options.edit !== false && !options.message && context !== undefined) {
    let confirmed = false;
    while (!confirmed) {
      const { action } = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "Use this commit message?",
          choices: [
            { name: "Confirm and commit", value: "confirm" },
            { name: "Generate another (different wording)", value: "another" },
            { name: "Edit manually", value: "edit" },
            { name: "Cancel", value: "cancel" },
          ],
        },
      ]);

      if (action === "confirm") {
        confirmed = true;
      } else if (action === "another") {
        commitMessage = (
          await generateCommitMessage(
            `${context}\n\nWrite a noticeably different commit message — a fresh wording or angle, not the same as before.`,
          )
        ).trim();
        console.log("");
        console.log(chalk.cyan("Generated message:"));
        console.log(commitMessage);
        console.log("");
      } else if (action === "edit") {
        const answer = await inquirer.prompt([
          {
            type: "editor",
            name: "message",
            message: "Edit commit message:",
            default: commitMessage,
          },
        ]);
        commitMessage = answer.message;
        confirmed = true;
      } else {
        console.log(chalk.gray("Commit cancelled."));
        process.exit(0);
      }
    }

    // Validate the final message; warn (never block) if it fails commitlint.
    try {
      if (hasCommitlintConfig()) {
        const validation = await validateCommitMessage(commitMessage);
        if (!validation.valid) {
          console.log(
            chalk.yellow(
              "Warning: Edited message still has validation issues.",
            ),
          );
          if (validation.errors) console.log(chalk.gray(validation.errors));
        }
      }
    } catch (error) {
      // If validation fails, just warn and continue
      console.warn(
        chalk.yellow("Could not validate edited message, proceeding anyway."),
      );
    }
  }

  try {
    git.commit(commitMessage, args);
    console.log(chalk.green("✓ Changes committed successfully"));
  } catch (error) {
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
};
