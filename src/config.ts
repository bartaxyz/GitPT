import chalk from "chalk";
import Configstore from "configstore";

const config = new Configstore("gitpt");

export interface GitPTConfig {
  provider?: "openrouter" | "local" | "apple" | "openai" | "anthropic";
  customLLMEndpoint?: string;
  model?: string;
  apiKey?: string;
  apiKeys?: Record<string, string>;
  contextWindow?: number;
}

export const getConfig = (): GitPTConfig => {
  try {
    const provider = config.get("provider");
    const customLLMEndpoint = config.get("customLLMEndpoint");
    const model = config.get("model");
    const apiKey = config.get("apiKey");
    const apiKeys = config.get("apiKeys");
    const contextWindow = config.get("contextWindow");

    return {
      provider,
      customLLMEndpoint,
      model,
      apiKey,
      apiKeys,
      contextWindow,
    };
  } catch (error) {
    console.error(chalk.red("Error reading configuration:"), error);
    return {};
  }
};

export const saveConfig = (newConfig: GitPTConfig): void => {
  if (newConfig.provider !== undefined) {
    config.set("provider", newConfig.provider);
  }

  if (newConfig.customLLMEndpoint !== undefined) {
    config.set("customLLMEndpoint", newConfig.customLLMEndpoint);
  }

  if (newConfig.model !== undefined) {
    config.set("model", newConfig.model);
  }

  if (newConfig.apiKey !== undefined) {
    config.set("apiKey", newConfig.apiKey);
  }

  if (newConfig.apiKeys !== undefined) {
    config.set("apiKeys", newConfig.apiKeys);
  }

  if (newConfig.contextWindow !== undefined) {
    config.set("contextWindow", newConfig.contextWindow);
  }
};

export const clearConfig = (): void => {
  config.clear();
};

const ACCEPTED_DEFAULT_KEY = "acceptedDefault";

export const getAcceptedDefault = (): string | undefined => {
  try {
    return config.get(ACCEPTED_DEFAULT_KEY);
  } catch {
    return undefined;
  }
};

export const setAcceptedDefault = (id: string): void => {
  config.set(ACCEPTED_DEFAULT_KEY, id);
};

export const clearAcceptedDefault = (): void => {
  config.delete(ACCEPTED_DEFAULT_KEY);
};
