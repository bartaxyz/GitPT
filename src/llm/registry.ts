import { getConfig } from "../config.js";
import { AnthropicProvider } from "./providers/anthropic/index.js";
import { getApiKey } from "./providers/apiKey.js";
import { AppleProvider } from "./providers/apple/index.js";
import type { Provider, ProviderClass } from "./providers/base.js";
import { LocalProvider } from "./providers/local/index.js";
import { OpenAIProvider } from "./providers/openai/index.js";
import { OpenRouterProvider } from "./providers/openrouter/index.js";

export const PROVIDERS: ProviderClass[] = [
  AppleProvider,
  OpenRouterProvider,
  OpenAIProvider,
  AnthropicProvider,
  LocalProvider,
];

export const getProviderClass = (
  id: string | undefined
): ProviderClass | undefined => PROVIDERS.find((p) => p.id === id);

export const getProvider = (): Provider => {
  const { provider, model } = getConfig();
  const ProviderImpl = getProviderClass(provider);

  if (!ProviderImpl) {
    throw new Error(
      `Unknown provider: ${provider ?? "(none)"}. Run "gitpt setup".`
    );
  }

  return new ProviderImpl(model ?? "");
};

export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const { provider, customLLMEndpoint, model } = getConfig();
  const errors: string[] = [];
  const spec = getProviderClass(provider);

  if (!spec) {
    errors.push("No provider configured. Run 'gitpt setup'.");
  } else {
    if (spec.requiresApiKey && !getApiKey()) {
      errors.push(`API key is required for ${spec.label}.`);
    }
    if (spec.requiresEndpoint && !customLLMEndpoint) {
      errors.push(`Custom endpoint is required for ${spec.label}.`);
    }
  }

  if (!model) {
    errors.push("Model is required.");
  }

  return { isValid: errors.length === 0, errors };
};
