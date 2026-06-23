import chalk from "chalk";
import inquirer from "inquirer";
import {
  clearAcceptedDefault,
  getAcceptedDefault,
  getConfig,
  GitPTConfig,
  saveConfig,
  setAcceptedDefault,
  unsetConfigKey,
} from "../../../config.js";
import {
  getProviderClass,
  PROVIDERS,
  validateConfig,
} from "../../../llm/registry.js";
import { DefaultModel, resolveDefaultModel } from "./defaultModels.js";

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

  const providerChoices = PROVIDERS.filter((p) => p.isAvailable()).map((p) => ({
    name: p.label,
    value: p.id,
  }));

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

  existingConfig.provider = providerAnswer.provider as NonNullable<
    GitPTConfig["provider"]
  >;

  // Only the local provider manages a context window. Clear any stale value
  // carried over from a previous provider when switching to another one.
  if (existingConfig.provider !== "local") {
    delete existingConfig.contextWindow;
    unsetConfigKey("contextWindow");
  }

  const spec = getProviderClass(existingConfig.provider);

  if (!spec) {
    throw new Error(
      `Unknown provider: ${existingConfig.provider ?? "(none)"}.`
    );
  }

  return spec.setup(existingConfig);
};
