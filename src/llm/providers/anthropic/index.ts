import { GitPTConfig } from "../../../config.js";
import {
  OpenAICompatibleProvider,
  setupApiKeyProvider,
} from "../openaiCompatible.js";

export class AnthropicProvider extends OpenAICompatibleProvider {
  static readonly id = "anthropic";
  static readonly label = "Anthropic";
  static readonly baseURL = "https://api.anthropic.com/v1";

  static setup(existingConfig: GitPTConfig): Promise<GitPTConfig> {
    return setupApiKeyProvider(existingConfig, {
      baseURL: AnthropicProvider.baseURL,
      label: AnthropicProvider.label,
    });
  }

  protected baseURL(): string {
    return AnthropicProvider.baseURL;
  }
}
