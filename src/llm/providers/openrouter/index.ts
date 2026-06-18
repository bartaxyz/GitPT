import { GitPTConfig } from "../../../config.js";
import { OPENROUTER_API_URL } from "../../index.js";
import {
  OpenAICompatibleProvider,
  setupApiKeyProvider,
} from "../openaiCompatible.js";

export class OpenRouterProvider extends OpenAICompatibleProvider {
  static readonly id = "openrouter";
  static readonly label = "OpenRouter (remote)";
  static readonly baseURL = OPENROUTER_API_URL;

  static setup(existingConfig: GitPTConfig): Promise<GitPTConfig> {
    return setupApiKeyProvider(existingConfig, {
      baseURL: OpenRouterProvider.baseURL,
      label: OpenRouterProvider.label,
    });
  }

  protected baseURL(): string {
    return OpenRouterProvider.baseURL;
  }
}
