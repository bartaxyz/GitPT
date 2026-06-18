import openai from "openai";
import { formatBaseURL } from "../utils/formatBaseURL.js";
import type { LLMClient } from "./client.js";

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

export const getLLMClient = (options?: {
  baseURLOverride?: string;
  apiKey?: string;
}): LLMClient => {
  const baseURL = formatBaseURL(options?.baseURLOverride ?? OPENROUTER_API_URL);
  // The OpenAI SDK requires a non-empty key even when the server ignores it.
  const apiKey = options?.apiKey || "not-needed";

  return new openai.OpenAI({ apiKey, baseURL });
};
