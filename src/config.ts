import chalk from "chalk";
import Configstore from "configstore";

const config = new Configstore("gitpt");

export interface GitPTConfig {
  provider?: "openrouter" | "local";
  customLLMEndpoint?: string;
  model?: string;
  apiKey?: string;
}

export const getConfig = (): GitPTConfig => {
  try {
    const provider = config.get("provider");
    const customLLMEndpoint = config.get("customLLMEndpoint");
    const model = config.get("model");
    const apiKey = config.get("apiKey");

    return {
      provider,
      customLLMEndpoint,
      model,
      apiKey,
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
};

export enum ConfigErrors {
  CustomLLMEndpointRequired = "Custom LLM endpoint is required for local LLM provider.",
  APIKeyRequired = "API key is required for OpenRouter provider.",
  ModelRequired = "Model is required.",
}

export const validateConfig = (): { isValid: boolean; errors?: string[] } => {
  const { provider, customLLMEndpoint, apiKey, model } = getConfig();

  const errors: string[] = [];

  if (provider === "local" && !customLLMEndpoint) {
    errors.push(ConfigErrors.CustomLLMEndpointRequired);
  }

  if (provider === "openrouter" && !apiKey) {
    errors.push(ConfigErrors.APIKeyRequired);
  }

  if (!model) {
    errors.push(ConfigErrors.ModelRequired);
  }

  return { isValid: errors.length === 0, errors };
};

export const clearConfig = (): void => {
  config.clear();
};
