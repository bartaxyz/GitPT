import { GitPTConfig } from "../../../config.js";
import {
  OpenAICompatibleProvider,
  setupApiKeyProvider,
} from "../openaiCompatible.js";

export class OpenAIProvider extends OpenAICompatibleProvider {
  static readonly id = "openai";
  static readonly label = "OpenAI";
  static readonly baseURL = "https://api.openai.com/v1";

  static setup(existingConfig: GitPTConfig): Promise<GitPTConfig> {
    return setupApiKeyProvider(existingConfig, {
      baseURL: OpenAIProvider.baseURL,
      label: OpenAIProvider.label,
    });
  }

  protected baseURL(): string {
    return OpenAIProvider.baseURL;
  }
}
