import chalk from "chalk";
import { getConfig } from "../config.js";
import { maskApiKey } from "../utils/maskApiKey.js";

export const configCommand = async (): Promise<void> => {
  console.log(chalk.blue("GitPT Configuration"));

  const { apiKey, ...config } = getConfig();

  console.log({
    apiKey: apiKey ? maskApiKey(apiKey) : undefined,
    ...config,
  });
};
