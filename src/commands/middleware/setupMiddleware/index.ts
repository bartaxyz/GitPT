import inquirer from "inquirer";
import { getConfig, GitPTConfig, validateConfig } from "../../../config.js";
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
  }

  // For initial setup or model command, start by selecting the provider
  const useLocalLLMAnswer = await inquirer.prompt([
    {
      type: "list",
      name: "useLocalLLM",
      message: "Select LLM provider:",
      choices: [
        { name: "OpenRouter (remote)", value: false },
        { name: "Local LLM", value: true },
      ],
      default: existingConfig.provider === "local" ? 1 : 0,
    },
  ]);

  // Update config based on selected provider
  existingConfig.provider = useLocalLLMAnswer.useLocalLLM
    ? "local"
    : "openrouter";

  // Proceed based on selected provider
  if (useLocalLLMAnswer.useLocalLLM) {
    return await setupLocalLLM(existingConfig);
  } else {
    return await setupOpenRouter(existingConfig);
  }
};
