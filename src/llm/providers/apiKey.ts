import inquirer from "inquirer";
import { getConfig, saveConfig } from "../../config.js";
import { maskApiKey } from "../../utils/maskApiKey.js";

export const getApiKey = (): string | undefined => {
  const { provider, apiKeys, apiKey } = getConfig();
  return (provider && apiKeys?.[provider]) || apiKey;
};

export const saveApiKey = (providerId: string, key: string): void => {
  const { apiKeys } = getConfig();
  saveConfig({ apiKeys: { ...apiKeys, [providerId]: key } });
};

export const promptApiKey = async (
  existingKey?: string,
  label = "the provider"
): Promise<string> => {
  if (existingKey) {
    const { useExistingKey } = await inquirer.prompt([
      {
        type: "list",
        name: "useExistingKey",
        message: `${label} API key:`,
        choices: [
          {
            name: `Use existing key (${maskApiKey(existingKey)})`,
            value: true,
          },
          { name: "Enter a new API key", value: false },
        ],
      },
    ]);

    if (useExistingKey) return existingKey;
  }

  const { apiKey } = await inquirer.prompt([
    {
      type: "input",
      name: "apiKey",
      message: `Enter your ${label} API key:`,
      validate: (input: string) => (input ? true : "API key is required"),
    },
  ]);

  return apiKey;
};
