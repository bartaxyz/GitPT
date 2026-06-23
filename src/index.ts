#!/usr/bin/env node --experimental-specifier-resolution=node

import chalk from "chalk";
import { spawnSync } from "child_process";
import { Command } from "commander";
import packageJSON from "../package.json" with { type: "json" };
import { commitCommand } from "./commands/commit/index.js";
import { configCommand } from "./commands/config.js";
import {
  hookInstallCommand,
  hookRunCommand,
  hookUninstallCommand,
} from "./commands/hook/index.js";
import { modelCommand } from "./commands/model.js";
import { prCreateCommand } from "./commands/pr/index.js";
import { resetCommand } from "./commands/reset.js";
import { setupCommand } from "./commands/setup.js";

const program = new Command();

program
  .name("gitpt")
  .description("Git Prompt Tool helps you write commit messages using AI")
  .version(packageJSON.version);

// GitPT-specific commands
program
  .command("setup")
  .description(
    "Configure GitPT with your OpenRouter API key and model selection",
  )
  .option("--provider <id>", "Provider id (local, openrouter, openai, anthropic, apple)")
  .option("--model <id>", "Model id")
  .option("--endpoint <url>", "Custom LLM endpoint (for local)")
  .option("--api-key <key>", "API key (for providers that need one)")
  .action(setupCommand);

program
  .command("config")
  .description(
    "Configure GitPT with your OpenRouter API key and model selection",
  )
  .action(configCommand);

program
  .command("model")
  .description("Change the AI model used for generating commit messages")
  .action(modelCommand);

program
  .command("reset")
  .description(
    "Reset GitPT configuration (clears provider, model, and API key)",
  )
  .option("-y, --yes", "Skip the confirmation prompt")
  .action(resetCommand);

// Enhanced git commands
program
  .command("commit")
  .description("Generate AI-powered commit message based on staged changes")
  .option(
    "-m, --message <message>",
    "use provided message instead of generating one",
  )
  .option("-e, --edit", "edit the message after generation")
  .option("--no-edit", "do not edit the message after generation")
  .option("--dry-run", "generate and print the message but do not commit")
  .allowUnknownOption(true) // pass through git flags like --allow-empty, --amend
  .allowExcessArguments(true) // ...so bare passthrough flags don't error
  .action(commitCommand);

program
  .command("pr create")
  .description("Create a pull request with AI-generated title and description")
  .option("-t, --title <title>", "Custom pull request title")
  .option("-b, --body <body>", "Custom pull request description")
  .option("-d, --draft", "Create as draft pull request")
  .option("-B, --base <branch>", "Base branch to create PR against")
  .option("-e, --edit", "Edit PR details before submission", true)
  .option("--no-edit", "Skip editing PR details")
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .action(prCreateCommand);

const hook = program
  .command("hook")
  .description("Manage the GitPT prepare-commit-msg git hook");

hook
  .command("install")
  .description("Install the hook so `git commit` prefills an AI message")
  .option("-f, --force", "Overwrite an existing prepare-commit-msg hook")
  .action(hookInstallCommand);

hook
  .command("uninstall")
  .description("Remove the GitPT prepare-commit-msg hook")
  .action(hookUninstallCommand);

hook
  .command("run <msgFile> [source] [sha]")
  .description("(internal) called by the installed hook")
  .action(hookRunCommand);

// Handle unknown commands by passing them to git
program.on("command:*", () => {
  // Get all arguments passed to the original command
  const args = process.argv.slice(2);

  // Pass them straight to git
  const result = spawnSync("git", args, { stdio: "inherit" });

  // Propagate git's exit code.
  process.exit(result.status ?? 1);
});

// Main logic
async function main() {
  try {
    await program.parseAsync();
  } catch (error) {
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

main();
