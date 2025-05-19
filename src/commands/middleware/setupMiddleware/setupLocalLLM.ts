import chalk from "chalk";
import inquirer from "inquirer";
import { GitPTConfig, saveConfig } from "../../../config.js";
import { getAvailableModels } from "./getAvailableModels.js";
import { selectModel } from "./selectModel.js";

/**
 * Set up a local LLM configuration
 */
export const setupLocalLLM = async (
  existingConfig: GitPTConfig
): Promise<GitPTConfig> => {
  console.log(chalk.blue("Local LLM Setup"));

  const endpointAnswer = await inquirer.prompt([
    {
      type: "input",
      name: "localLLMEndpoint",
      message: "Enter local LLM API endpoint (e.g., http://127.0.0.1:1234):",
      default: existingConfig.customLLMEndpoint || "http://127.0.0.1:1234",
      validate: (input: string) => {
        if (!input) return "API endpoint is required";
        if (!input.startsWith("http://") && !input.startsWith("https://")) {
          return "Must be a valid URL starting with http:// or https://";
        }
        return true;
      },
    },
  ]);

  const localLLMEndpoint = endpointAnswer.localLLMEndpoint;
  console.log(
    chalk.gray("Trying to fetch available models from local LLM server...")
  );

  const models = await getAvailableModels();
  let selectedModel: string;

  if (models.length > 0) {
    console.log(
      chalk.green(
        `✓ Found ${models.length} models available on your local LLM server`
      )
    );
    selectedModel = await selectModel(models, existingConfig.model);
  } else {
    console.log(
      chalk.yellow(
        "Could not fetch models from local LLM server, please enter model name manually"
      )
    );
    const modelAnswer = await inquirer.prompt([
      {
        type: "input",
        name: "model",
        message: "Enter model name to use with local endpoint:",
        default: existingConfig.model,
        validate: (input: string) => (input ? true : "Model name is required"),
      },
    ]);
    selectedModel = modelAnswer.model;
  }

  const updatedConfig = {
    ...existingConfig,
    useLocalLLM: true,
    localLLMEndpoint,
    model: selectedModel,
  };

  // Save the config
  saveConfig(updatedConfig);

  console.log(chalk.green("✓ Local LLM configuration saved"));
  console.log(chalk.gray("Testing connection to local LLM..."));

  return updatedConfig;
};
