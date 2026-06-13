import chalk from "chalk";
import inquirer from "inquirer";
import {
  getConfig,
  GitPTConfig,
  saveConfig,
  validateConfig,
} from "../../../config.js";
import { resolveDefaultModel } from "./defaultModels.js";
import {
  isAppleFoundationModelsSupported,
  setupApple,
} from "./setupApple.js";
import { setupLocalLLM } from "./setupLocalLLM.js";
import { setupOpenRouter } from "./setupOpenRouter.js";

export const setupMiddleware = async (options?: {
  context?: "setup" | "model" | "command";
}): Promise<GitPTConfig> => {
  const context = options?.context || "command";

  // Always get the current config, even if it's empty
  const existingConfig = getConfig();

  // If we're running a command, and the config is valid, continue with the command
  if (context === "command") {
    const isValidConfig = validateConfig();
    if (isValidConfig.isValid) {
      return getConfig();
    }

    if (!existingConfig.provider) {
      const defaultModel = resolveDefaultModel();
      if (defaultModel) {
        saveConfig(defaultModel.config);
        console.log(
          chalk.gray(
            `No model configured; using ${defaultModel.label} by default. Run 'gitpt model' to change.`
          )
        );
        return getConfig();
      }
    }
  }

  // For initial setup or model command, start by selecting the provider
  const providerChoices: Array<{
    name: string;
    value: NonNullable<GitPTConfig["provider"]>;
  }> = [
    { name: "OpenRouter (remote)", value: "openrouter" },
    ...(isAppleFoundationModelsSupported()
      ? [
          {
            name: "Apple Foundation Models (macOS 27+)",
            value: "apple" as const,
          },
        ]
      : []),
    { name: "Local LLM", value: "local" },
  ];

  const providerAnswer = await inquirer.prompt([
    {
      type: "list",
      name: "provider",
      message: "Select LLM provider:",
      choices: providerChoices,
      default: Math.max(
        providerChoices.findIndex((c) => c.value === existingConfig.provider),
        0
      ),
    },
  ]);

  // Update config based on selected provider
  existingConfig.provider = providerAnswer.provider;

  // Proceed based on selected provider
  switch (providerAnswer.provider) {
    case "local":
      return await setupLocalLLM(existingConfig);
    case "apple":
      return await setupApple(existingConfig);
    default:
      return await setupOpenRouter(existingConfig);
  }
};
