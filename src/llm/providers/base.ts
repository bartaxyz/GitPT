import type { GitPTConfig } from "../../config.js";
import type { LLMClient } from "../client.js";

export interface CompletionRequest {
  system: string;
  user: string;
  maxTokens: number;
}

export abstract class Provider {
  static readonly requiresApiKey: boolean = false;
  static readonly requiresEndpoint: boolean = false;

  static isAvailable(): boolean {
    return true;
  }

  readonly maxOutputTokens: number = 1024;

  constructor(public readonly model: string) {}

  async getContextWindow(): Promise<number> {
    return Number.POSITIVE_INFINITY;
  }

  countTokens(text: string): number {
    // Conservative estimate (code tokenizes higher than the usual ~4 chars/token),
    // so chunks stay under the real context window when no exact tokenizer exists.
    return Math.ceil(text.length / 3);
  }

  protected abstract getClient(): LLMClient;

  async complete(req: CompletionRequest): Promise<string> {
    const response = await this.getClient().chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      max_tokens: req.maxTokens,
    });

    return response.choices[0].message.content ?? "";
  }
}

export type ProviderClass = {
  new (model: string): Provider;
  readonly id: string;
  readonly label: string;
  readonly requiresApiKey: boolean;
  readonly requiresEndpoint: boolean;
  readonly baseURL?: string;
  isAvailable(): boolean;
  setup(existingConfig: GitPTConfig): Promise<GitPTConfig>;
};
