import { GitPTConfig } from "../../../config.js";
import { Model } from "../../setup/types.js";
import {
  OpenAICompatibleProvider,
  setupApiKeyProvider,
} from "../openaiCompatible.js";

const ANTHROPIC_VERSION = "2023-06-01";

// Anthropic's /v1/models uses x-api-key auth (not the OpenAI SDK's bearer token).
const listAnthropicModels = async (apiKey: string): Promise<Model[]> => {
  const response = await fetch("https://api.anthropic.com/v1/models?limit=100", {
    headers: { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }

  const data = (await response.json())?.data ?? [];
  return data.map((m: { id: string; display_name?: string }) => ({
    id: m.id,
    name: m.display_name,
  }));
};

export class AnthropicProvider extends OpenAICompatibleProvider {
  static readonly id = "anthropic";
  static readonly label = "Anthropic";
  static readonly baseURL = "https://api.anthropic.com/v1";

  static setup(existingConfig: GitPTConfig): Promise<GitPTConfig> {
    return setupApiKeyProvider(existingConfig, {
      baseURL: AnthropicProvider.baseURL,
      label: AnthropicProvider.label,
      listModels: listAnthropicModels,
    });
  }

  protected baseURL(): string {
    return AnthropicProvider.baseURL;
  }
}
