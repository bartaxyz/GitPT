import chalk from "chalk";
import inquirer from "inquirer";
import { capabilitiesMiddleware } from "../middleware/capabilitiesMiddleware/index.js";
import { setupMiddleware } from "../middleware/setupMiddleware/index.js";
import { git } from "../../services/git/index.js";
import {
  hasCommitlintConfig,
  validateCommitMessage,
} from "../../utils/commitlint.js";
import { hasStagedChangesMiddleware } from "../middleware/hasStagedChangesMiddleware.js";
import { generateCommitMessage } from "./generateCommitMessage.js";
import { prepareCommitContext } from "./summarizeDiff.js";
import { isAmend, skipsStagedGuard } from "./commitFlags.js";
import type { Command } from "commander";
import { passthroughArgs } from "../passthroughArgs.js";

interface CommitOptions {
  message?: string;
  edit?: boolean;
  dryRun?: boolean;
  [key: string]: any;
}

export const commitCommand = async (
  options: CommitOptions,
  command: Command,
): Promise<void> => {
  capabilitiesMiddleware(["git"]);
  await setupMiddleware();

  const passthrough = passthroughArgs(command);
  const amend = isAmend(passthrough);
  const noEdit = options.edit === false;

  // --amend / --allow-empty are valid without staged changes; only guard otherwise.
  if (!skipsStagedGuard(passthrough)) {
    hasStagedChangesMiddleware();
  }

  // `--amend --no-edit` (and no -m): just amend, keep the existing message — no AI.
  if (amend && noEdit && !options.message) {
    // --dry-run must win before we actually amend (otherwise it amends anyway).
    if (options.dryRun) {
      console.log(
        chalk.yellow(
          "[dry-run] Would amend the last commit (keeping its message). Nothing changed.",
        ),
      );
      return;
    }
    try {
      git.commit(null, [...passthrough, "--no-edit"]);
      console.log(chalk.green("✓ Amended (kept the original message)."));
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
    return;
  }

  let commitMessage: string;
  let context: string | undefined;

  // If message is provided, use that
  if (options.message) {
    commitMessage = options.message;
  } else {
    try {
      // For --amend, summarise the commit's content (HEAD~1 → index) so even a
      // plain reword has something to describe; otherwise the staged diff.
      const diff = amend ? git.getAmendChanges() : git.getStagedChanges();
      if (!diff.trim()) {
        console.error(
          chalk.red(
            'Error: nothing to summarise. Provide a message with -m "...".',
          ),
        );
        process.exit(1);
      }

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

      // Generate first commit message
      commitMessage = await generateCommitMessage(context);

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
    git.commit(commitMessage, passthrough);
    console.log(chalk.green("✓ Changes committed successfully"));
  } catch (error) {
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
};
