import openai from "openai";
import { getConfig } from "../config";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

export const getLLMClient = (): openai => {
  const { apiKey, customLLMEndpoint } = getConfig();

  const baseURL = customLLMEndpoint
    ? `${customLLMEndpoint}/v1`
    : OPENROUTER_API_URL;

  return new openai.OpenAI({
    apiKey,
    baseURL,
  });
};
