import openai from "openai";
import { getConfig } from "../config.js";
import { formatBaseURL } from "../utils/formatBaseURL.js";

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

export const getLLMClient = (options?: {
  baseURLOverride?: string;
}): openai => {
  const { baseURLOverride } = options || {};

  const { apiKey, customLLMEndpoint, provider } = getConfig();

  const localLLMEndpoint = provider === "local" ? customLLMEndpoint : undefined;

  const baseURL = formatBaseURL(
    baseURLOverride ?? localLLMEndpoint ?? OPENROUTER_API_URL
  );

  return new openai.OpenAI({
    apiKey,
    baseURL,
  });
};
