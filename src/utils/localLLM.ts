import fetch from "node-fetch";
import { getConfig } from "./config.js";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LocalLLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function generateWithLocalLLM(
  messages: Message[],
  maxTokens: number = 300
): Promise<string> {
  const config = getConfig();

  if (!config) {
    throw new Error('GitPT is not configured. Please run "gitpt setup" first.');
  }

  if (!config.useLocalLLM || !config.localLLMEndpoint) {
    throw new Error(
      'Local LLM is not configured. Please run "gitpt model --local" first.'
    );
  }

  try {
    // Use the OpenAI-compatible chat completions endpoint
    const endpoint = new URL(
      "/v1/chat/completions",
      config.localLLMEndpoint
    ).toString();

    // Assuming OpenAI-compatible API for local LLM
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Local LLM API request failed: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const data = (await response.json()) as LocalLLMResponse;

    // Extract just the first line and remove any backticks to ensure a clean single-line message
    let message = data.choices[0].message.content.trim();

    // Remove markdown code block formatting if present
    message = message.replace(/```[a-z]*\n|\n```/g, "");

    // Split by newlines and just take the first line
    return message.split("\n")[0].trim();
  } catch (error) {
    console.error("Error using local LLM:", error);
    throw new Error("Failed to generate response with local LLM");
  }
}

// Helper function to check if local LLM is accessible
export async function checkLocalLLMConnection(): Promise<boolean> {
  const config = getConfig();

  if (!config || !config.useLocalLLM || !config.localLLMEndpoint) {
    return false;
  }

  try {
    // Check the models endpoint for health check which most OpenAI-compatible APIs support
    const endpoint = new URL("/v1/models", config.localLLMEndpoint).toString();

    // Use AbortController for timeout functionality since node-fetch doesn't have a timeout option
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}
