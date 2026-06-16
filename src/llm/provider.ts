import type { LLMClient } from "./appleFoundationClient.js";

/** A single, provider-agnostic generation request. */
export interface CompletionRequest {
  system: string;
  user: string;
  maxTokens: number;
}

/**
 * The unified surface every provider exposes. App code talks to this and never
 * branches on the provider name. New providers (or per-provider behaviour like
 * context windows and tokenizers) are added in the registry, not here.
 */
export interface LLMProvider {
  readonly id: string;
  readonly model: string;
  /** Token budget of the model, or Infinity when unknown (no chunking). */
  getContextWindow(): number;
  /** Token count for this provider's tokenizer. */
  countTokens(text: string): number;
  /** Run a single completion and return its text (empty string if none). */
  complete(req: CompletionRequest): Promise<string>;
}

/** Everything that distinguishes one provider from another, as plain data. */
export interface ProviderConfig {
  id: string;
  model: string;
  contextWindow: number;
  countTokens: (text: string) => number;
  /** Lazily created so token/window calls never spin up a client. */
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
