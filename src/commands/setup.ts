import chalk from "chalk";
import { clearConfig } from "../config.js";
import { setupMiddleware } from "./middleware/setupMiddleware/index.js";

export const setupCommand = async (
  options: { clearConfig?: boolean } = {}
): Promise<void> => {
  console.log(chalk.blue("GitPT Setup"));
  console.log(
    "This will configure GitPT to use an LLM for generating commit messages."
  );
  console.log("You can use either OpenRouter (remote service) or a local LLM.");
  console.log("");

  if (options.clearConfig) {
    clearConfig();
  }

  await setupMiddleware();

  console.log("");
  console.log(
    `Use ${chalk.cyan(
      "gitpt commit"
    )} to create commits with AI-generated messages.`
  );
};
