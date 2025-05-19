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
    throw new Error('Local LLM is not configured. Please run "gitpt model --local" first.');
  }

  try {
    // Assuming OpenAI-compatible API for local LLM
    const response = await fetch(config.localLLMEndpoint, {
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
    return data.choices[0].message.content.trim();
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
    // Simple health check request to the endpoint
    const response = await fetch(config.localLLMEndpoint, {
      method: "GET"
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}