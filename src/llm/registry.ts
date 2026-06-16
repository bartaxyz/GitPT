import { getConfig } from "../config.js";
import { getAppleFoundationClient } from "./appleFoundationClient.js";
import { getLLMClient } from "./index.js";
import { createProvider, LLMProvider } from "./provider.js";
import { estimateTokens, fmTokenCount } from "./tokenizers.js";

export const APPLE_CONTEXT_WINDOW = 4096;

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

  return createProvider({
    id: provider ?? "openrouter",
    model: model ?? "",
    contextWindow: Number.POSITIVE_INFINITY,
    countTokens: estimateTokens,
    createClient: () => getLLMClient(),
  });
};
