import type { LLMClient } from "./appleFoundationClient.js";

export interface CompletionRequest {
  system: string;
  user: string;
  maxTokens: number;
}

export interface LLMProvider {
  readonly id: string;
  readonly model: string;
  getContextWindow(): number;
  countTokens(text: string): number;
  complete(req: CompletionRequest): Promise<string>;
}

export interface ProviderConfig {
  id: string;
  model: string;
  contextWindow: number;
  countTokens: (text: string) => number;
  createClient: () => LLMClient;
}

export const createProvider = (config: ProviderConfig): LLMProvider => ({
  id: config.id,
  model: config.model,
  getContextWindow: () => config.contextWindow,
  countTokens: config.countTokens,
  complete: async (req: CompletionRequest): Promise<string> => {
    const response = await config.createClient().chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      max_tokens: req.maxTokens,
    });

    return response.choices[0].message.content ?? "";
  },
});
