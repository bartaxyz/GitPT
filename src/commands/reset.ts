import chalk from "chalk";
import inquirer from "inquirer";
import { clearConfig, getConfig } from "../config.js";

export const resetCommand = async (
  options: { yes?: boolean } = {}
): Promise<void> => {
  const hasConfig = Object.values(getConfig()).some(
    (value) => value !== undefined
  );

  if (!hasConfig) {
    console.log(chalk.gray("GitPT has no saved configuration to reset."));
    return;
  }

  if (!options.yes) {
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message:
          "Reset GitPT? This clears the saved provider, model, and API key.",
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.gray("Reset cancelled."));
      return;
    }
  }

  clearConfig();
  console.log(
    chalk.green("✓ GitPT configuration reset. Run 'gitpt setup' to reconfigure.")
  );
};
