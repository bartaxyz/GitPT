import inquirer from "inquirer";
import { getConfig, GitPTConfig } from "../../../config.js";
import { setupLocalLLM } from "./setupLocalLLM.js";
import { setupOpenRouter } from "./setupOpenRouter.js";

export const setupMiddleware = async (): Promise<GitPTConfig> => {
  // Always get the current config, even if it's empty
  const existingConfig = getConfig();

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

  // Proceed based on selected provider
  if (useLocalLLMAnswer.useLocalLLM) {
    return await setupLocalLLM(existingConfig);
  } else {
    return await setupOpenRouter(existingConfig);
  }
};
