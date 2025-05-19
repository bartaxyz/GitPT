import fetch from "node-fetch";
import { getConfig } from "./config.js";
import { hasCommitlintConfig, getCommitlintRules } from "./commitlint.js";
import { generateWithLocalLLM, checkLocalLLMConnection } from "./localLLM.js";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function generateCommitMessage(diff: string, validationErrors?: string): Promise<string> {
  // Check if commitlint is configured
  const hasCommitlint = hasCommitlintConfig();
  const config = getConfig();

  if (!config) {
    throw new Error('GitPT is not configured. Please run "gitpt setup" first.');
  }

  const { apiKey, model, useLocalLLM } = config;

  const messages: Message[] = [
    {
      role: "system",
      content: `You are a helpful assistant that generates concise, informative Git commit messages.
      Follow these strict rules:
      ${hasCommitlint ? getCommitlintRules() : `1. Use conventional commit format: type: description
      2. Types are: feat, fix, docs, style, refactor, test, chore
      3. NO scopes in parentheses - do not use feat(scope)
      4. Keep the entire message under 100 characters
      5. Use present tense (e.g., "add feature" not "added feature")
      6. Be brief but descriptive about WHAT changed
      7. Do not include detailed explanations
      8. Examples:
         - feat: add user authentication
         - fix: resolve null pointer in login
         - chore: update dependencies
         - style: format css files`}${validationErrors ? `\n\nYOUR PREVIOUS MESSAGE FAILED VALIDATION WITH THESE ERRORS:\n${validationErrors}\n\nFIX THESE ISSUES IN YOUR NEW MESSAGE.` : ''}`,
    },
    {
      role: "user",
      content: `Generate a commit message for the following git diff:\n\n${diff}`,
    },
  ];

  // Determine whether to use local LLM or OpenRouter based on config
  if (useLocalLLM) {
    return await generateWithLocalLLM(messages);
  } else {
    return await generateWithOpenRouter(messages, apiKey, model);
  }
}

async function generateWithOpenRouter(messages: Message[], apiKey: string, model: string): Promise<string> {
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/bartaxyz/GitPT",
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const data = (await response.json()) as LLMResponse;
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating with OpenRouter:", error);
    throw new Error("Failed to generate commit message with OpenRouter");
  }
}

// Add fallback functionality if needed
export async function attemptFallbackIfNeeded(generator: () => Promise<string>): Promise<string> {
  const config = getConfig();
  if (!config) {
    throw new Error('GitPT is not configured. Please run "gitpt setup" first.');
  }

  try {
    // Try the primary generator function
    return await generator();
  } catch (error) {
    // If using local LLM and it fails, try falling back to OpenRouter
    if (config.useLocalLLM) {
      console.warn("Local LLM failed, attempting fallback to OpenRouter...");
      
      // Check if we have valid OpenRouter credentials
      if (config.apiKey) {
        const isLocalAvailable = await checkLocalLLMConnection();
        
        if (!isLocalAvailable) {
          // Temporarily override config for this request
          const tempConfig = { ...config, useLocalLLM: false };
          
          // Pass modified config to the original function
          return await generator();
        }
      }
    }
    
    // If no fallback available or fallback also failed, rethrow
    throw error;
  }
}