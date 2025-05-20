import inquirer from "inquirer";
import { maskApiKey } from "../../../utils/maskApiKey.js";

export const getOrUpdateApiKey = async (
  existingApiKey?: string
): Promise<string> => {
  // For setup command, handle API key selection
  if (existingApiKey) {
    // If we have an existing API key, ask if the user wants to keep it or use a new one
    const useExistingKeyAnswer = await inquirer.prompt([
      {
        type: "list",
        name: "useExistingKey",
        message: "OpenRouter API key:",
        choices: [
          {
            name: `Use existing key (${maskApiKey(existingApiKey)})`,
            value: true,
          },
          { name: "Enter a new API key", value: false },
        ],
      },
    ]);

    if (useExistingKeyAnswer.useExistingKey) {
      return existingApiKey;
    }
  }

  // If no existing key or user wants a new one, prompt for a new API key
  const apiKeyAnswer = await inquirer.prompt([
    {
      type: "input",
      name: "apiKey",
      message: "Enter your OpenRouter API key:",
      validate: (input: string) => {
        if (!input) return "API key is required";
        return true;
      },
    },
  ]);

  return apiKeyAnswer.apiKey;
};
