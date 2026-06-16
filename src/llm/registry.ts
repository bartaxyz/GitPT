import { getConfig } from "../config.js";
import { getAppleFoundationClient } from "./appleFoundationClient.js";
import { getLLMClient } from "./index.js";
import { createProvider, LLMProvider } from "./provider.js";
import { estimateTokens, fmTokenCount } from "./tokenizers.js";

/** Apple's on-device model context window. */
export const APPLE_CONTEXT_WINDOW = 4096;

/**
 * Build the active provider from config. This is the single place that maps a
 * provider id to its client, context window and tokenizer — add providers or
 * change per-provider behaviour here, not in the app logic.
 */
export const getProvider = (): LLMProvider => {
  const { provider, model } = getConfig();

  if (provider === "apple") {
    return createProvider({
      id: "apple",
      model: model || "system",
      contextWindow: APPLE_CONTEXT_WINDOW,
      countTokens: fmTokenCount,
      createClient: getAppleFoundationClient,
    });
  }

  // OpenRouter / local OpenAI-compatible endpoints. Context window is unknown
  // today, so we don't chunk (see follow-up issue for local windows).
  return createProvider({
    id: provider ?? "openrouter",
    model: model ?? "",
    contextWindow: Number.POSITIVE_INFINITY,
    countTokens: estimateTokens,
    createClient: () => getLLMClient(),
  });
};
