import openai from "openai";
import { getConfig } from "../config.js";
import { formatBaseURL } from "../utils/formatBaseURL.js";
import { getAppleFoundationClient, LLMClient } from "./appleFoundationClient.js";

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

export const getLLMClient = (options?: {
  baseURLOverride?: string;
}): LLMClient => {
  const { baseURLOverride } = options || {};

  const { apiKey, customLLMEndpoint, provider } = getConfig();

  if (provider === "apple" && !baseURLOverride) {
    return getAppleFoundationClient();
  }

  const localLLMEndpoint = provider === "local" ? customLLMEndpoint : undefined;

  const baseURL = formatBaseURL(
    baseURLOverride ?? localLLMEndpoint ?? OPENROUTER_API_URL
  );

  return new openai.OpenAI({
    apiKey,
    baseURL,
  });
};
