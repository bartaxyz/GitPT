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
    let display: string;
    if (key === "apiKeys" && value && typeof value === "object") {
      // apiKeys is a Record<provider, key>: list each provider with a masked key.
      const masked = Object.entries(value).map(
        ([provider, k]) => `${provider}: ${maskApiKey(k)}`,
      );
      display = masked.length ? masked.join(", ") : chalk.gray("—");
    } else {
      // Show empty / unset values as a dash instead of "undefined".
      display =
        value === undefined || value === "" ? chalk.gray("—") : String(value);
    }
    console.log(`  ${chalk.cyan(key.padEnd(labelWidth))}  ${display}`);
  }
};
