import chalk from "chalk";
import inquirer from "inquirer";
import { OPENROUTER_API_URL } from "../../../llm/index.js";
import { GitPTConfig, saveConfig } from "../../../config.js";
import { getAvailableModels } from "./getAvailableModels.js";
import { getOrUpdateApiKey } from "./getOrUpdateApiKey.js";
import { selectModel } from "./selectModel.js";

export const setupOpenRouter = async (
  existingConfig: GitPTConfig
): Promise<GitPTConfig> => {
  // Get API key - either the existing one or a new one
  const apiKey = await getOrUpdateApiKey(existingConfig.apiKey);

  if (!apiKey) {
    console.error(chalk.red("API key is required for OpenRouter."));
    process.exit(1);
  }

  // Update the config with the potentially new API key
  const updatedConfig = { ...existingConfig, apiKey };

  // Display current model if any
  if (updatedConfig.model) {
    console.log("Current model:", chalk.yellow(updatedConfig.model));
    console.log("");
  }

  try {
    console.log(chalk.gray("Fetching available models from OpenRouter..."));

    const models = await getAvailableModels({
      baseURLOverride: OPENROUTER_API_URL,
    });

    if (models.length > 0) {
      console.log(
        chalk.green(
          `✓ Found ${models.length} models available with your API key`
        )
      );
    } else {
      console.log(
        chalk.yellow(
          "No models found from OpenRouter. Please specify a model manually."
        )
      );
    }

    const selectedModel = await selectModel(models, updatedConfig.model);

    const finalConfig = {
      ...updatedConfig,
      model: selectedModel,
      useLocalLLM: false,
    };

    // Save the config
    saveConfig(finalConfig);

    console.log(chalk.green(`✓ Model set to: ${chalk.yellow(selectedModel)}`));

    return finalConfig;
  } catch (error) {
    console.error(chalk.yellow(`Error fetching models: ${error}`));

    // Fallback to manual input if API call fails
    const modelAnswer = await inquirer.prompt([
      {
        type: "input",
        name: "model",
        message: "Enter model identifier:",
        validate: (input: string) =>
          input ? true : "Model identifier is required",
      },
    ]);

    const selectedModel = modelAnswer.model;
    const finalConfig = {
      ...updatedConfig,
      model: selectedModel,
      useLocalLLM: false,
    };

    // Save the config
    saveConfig(finalConfig);

    console.log(chalk.green(`✓ Model set to: ${chalk.yellow(selectedModel)}`));

    return finalConfig;
  }
};
