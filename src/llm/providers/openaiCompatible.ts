import chalk from "chalk";
import inquirer from "inquirer";
import { GitPTConfig, saveConfig } from "../../config.js";
import type { LLMClient } from "../client.js";
import { getLLMClient } from "../index.js";
import { getAvailableModels } from "../setup/getAvailableModels.js";
import { selectModel } from "../setup/selectModel.js";
import { getApiKey, promptApiKey, saveApiKey } from "./apiKey.js";
import { Provider } from "./base.js";

export abstract class OpenAICompatibleProvider extends Provider {
  static readonly requiresApiKey: boolean = true;

  // Headroom for reasoning models, which spend output tokens "thinking"
  // before emitting the answer.
  override readonly maxOutputTokens = 2048;

  protected abstract baseURL(): string;

  protected getClient(): LLMClient {
    return getLLMClient({
      baseURLOverride: this.baseURL(),
      apiKey: getApiKey(),
    });
  }
}

export const setupApiKeyProvider = async (
  existingConfig: GitPTConfig,
  opts: { baseURL: string; label: string }
): Promise<GitPTConfig> => {
  const { baseURL, label } = opts;
  const providerId = existingConfig.provider ?? "";

  const existingKey =
    existingConfig.apiKeys?.[providerId] ?? existingConfig.apiKey;
  const apiKey = await promptApiKey(existingKey, label);

  if (!apiKey) {
    console.error(chalk.red(`API key is required for ${label}.`));
    process.exit(1);
  }

  if (existingConfig.model) {
    console.log("Current model:", chalk.yellow(existingConfig.model));
    console.log("");
  }

  let selectedModel: string;

  try {
    console.log(chalk.gray(`Fetching available models from ${label}...`));

    const models = await getAvailableModels({
      baseURLOverride: baseURL,
      apiKey,
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
          `No models found from ${label}. Please specify a model manually.`
        )
      );
    }

    selectedModel = await selectModel(models, existingConfig.model);
  } catch (error) {
    console.error(chalk.yellow(`Error fetching models: ${error}`));

    const modelAnswer = await inquirer.prompt([
      {
        type: "input",
        name: "model",
        message: "Enter model identifier:",
        validate: (input: string) =>
          input ? true : "Model identifier is required",
      },
    ]);

    selectedModel = modelAnswer.model;
  }

  saveApiKey(providerId, apiKey);
  const finalConfig: GitPTConfig = {
    ...existingConfig,
    model: selectedModel,
    apiKeys: { ...existingConfig.apiKeys, [providerId]: apiKey },
  };
  saveConfig(finalConfig);

  console.log(chalk.green(`✓ Model set to: ${chalk.yellow(selectedModel)}`));

  return finalConfig;
};
