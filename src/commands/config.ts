import chalk from "chalk";
import { getConfig } from "../config.js";
import { maskApiKey } from "../utils/maskApiKey.js";

export const configCommand = async (): Promise<void> => {
  console.log(chalk.blue("GitPT Configuration"));

  const { apiKey, ...config } = getConfig();

  const entries = {
    apiKey: apiKey ? maskApiKey(apiKey) : undefined,
    ...config,
  };

  // Align values: pad every key to the width of the longest one.
  const labelWidth = Math.max(...Object.keys(entries).map((key) => key.length));

  for (const [key, value] of Object.entries(entries)) {
    // Show empty / unset values as a dash instead of "undefined".
    const display =
      value === undefined || value === "" ? chalk.gray("—") : value;
    console.log(`  ${chalk.cyan(key.padEnd(labelWidth))}  ${display}`);
  }
};
