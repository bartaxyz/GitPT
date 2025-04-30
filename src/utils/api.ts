import fetch from "node-fetch";
import { getConfig } from "./config.js";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function generateCommitMessage(diff: string): Promise<string> {
  const config = getConfig();

  if (!config) {
    throw new Error('GitPT is not configured. Please run "gitpt setup" first.');
  }

  const { apiKey, model } = config;

  const messages: Message[] = [
    {
      role: "system",
      content: `You are a helpful assistant that generates concise, informative Git commit messages.
      Follow these strict rules:
      1. Use conventional commit format: type: description
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
         - style: format css files`,
    },
    {
      role: "user",
      content: `Generate a commit message for the following git diff:\n\n${diff}`,
    },
  ];

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

    const data = (await response.json()) as OpenRouterResponse;
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating commit message:", error);
    throw new Error("Failed to generate commit message");
  }
}
