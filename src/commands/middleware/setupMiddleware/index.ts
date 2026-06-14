import chalk from "chalk";
import inquirer from "inquirer";
import {
  clearAcceptedDefault,
  getAcceptedDefault,
  getConfig,
  GitPTConfig,
  saveConfig,
  setAcceptedDefault,
  validateConfig,
} from "../../../config.js";
import { DefaultModel, resolveDefaultModel } from "./defaultModels.js";
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

  const defaultModel = resolveDefaultModel();
  const acceptedDefault = getAcceptedDefault();
  const interactive = Boolean(process.stdin.isTTY);

  const applyDefault = (model: DefaultModel): GitPTConfig => {
    saveConfig(model.config);
    setAcceptedDefault(model.id);
    return getConfig();
  };

  const confirmDefault = async (message: string): Promise<boolean> => {
    const { useDefault } = await inquirer.prompt([
      { type: "confirm", name: "useDefault", message, default: true },
    ]);
    return useDefault;
  };

  if (context === "command") {
    if (validateConfig().isValid) {
      if (!acceptedDefault) return getConfig();
      if (!defaultModel || defaultModel.id === acceptedDefault) {
        return getConfig();
      }
      if (
        !interactive ||
        (await confirmDefault(
          `The recommended default changed to ${defaultModel.label}. Use it?`
        ))
      ) {
        const result = applyDefault(defaultModel);
        if (interactive) {
          console.log(chalk.green(`✓ Now using ${defaultModel.label}.`));
        }
        return result;
      }
      return getConfig();
    }

    if (!existingConfig.provider && defaultModel) {
      if (!interactive) return applyDefault(defaultModel);
      if (
        await confirmDefault(
          `No model configured. Use ${defaultModel.label} by default?`
        )
      ) {
        const result = applyDefault(defaultModel);
        console.log(
          chalk.green(
            `✓ Using ${defaultModel.label}. Run 'gitpt model' to change.`
          )
        );
        return result;
      }
    } else if (!interactive) {
      throw new Error(
        "GitPT is not configured. Run 'gitpt setup' in an interactive terminal."
      );
    }
  }

  clearAcceptedDefault();

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
