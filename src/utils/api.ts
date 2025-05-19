import fetch from "node-fetch";
import { getCommitlintRules, hasCommitlintConfig } from "./commitlint.js";
import { getConfig } from "./config.js";
import { checkLocalLLMConnection, generateWithLocalLLM } from "./localLLM.js";

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

export async function generateCommitMessage(
  diff: string,
  validationErrors?: string
): Promise<string> {
  // Check if commitlint is configured
  const hasCommitlint = hasCommitlintConfig();
  const config = getConfig();

  if (!config) {
    throw new Error('GitPT is not configured. Please run "gitpt setup" first.');
  }

  const { apiKey, model, useLocalLLM } = config;

  const baseRules = hasCommitlint
    ? getCommitlintRules()
    : `1. Use conventional commit format: type: description
  2. Types are: feat, fix, docs, style, refactor, test, chore
  3. NO scopes in parentheses - do not use feat(scope)
  4. Keep the entire message under 100 characters
  5. Use present tense (e.g., "add feature" not "added feature")
  6. Be brief but descriptive about WHAT changed
  7. Do not include detailed explanations`;

  const criticalRules = `
  CRITICAL RULES:
  - Return a SINGLE LINE commit message only, with no additional explanations or paragraphs
  - Do NOT include any markdown formatting like backticks or code blocks
  - Do NOT include a detailed message body section, just the commit title line
  - Do NOT use multiple lines, even for a single message`;

  const examples = `
  EXAMPLES OF GOOD COMMIT MESSAGES:
  - feat: add user authentication system
  - fix: resolve crash when opening settings menu
  - refactor: simplify data processing pipeline
  - docs: update installation instructions in README
  - chore: update npm dependencies to latest versions
  - style: fix indentation in CSS files
  - test: add unit tests for payment processing
  - perf: optimize database queries for faster loading
  - build: update webpack configuration
  - ci: fix GitHub Actions workflow
  
  EXAMPLES OF BAD COMMIT MESSAGES:
  - added login screen                    ❌ (missing type prefix)
  - feat(auth): implement OAuth login     ❌ (using scope parentheses)
  - This is a really long commit message that exceeds the limit and contains too much information ❌ (too long)
  - feat: Adding user auth
    
    This implements the login page...     ❌ (contains multiple lines)
  - "fix: update styling"                 ❌ (includes quotes)`;

  const errorInfo = validationErrors
    ? `\n\nYOUR PREVIOUS MESSAGE FAILED VALIDATION WITH THESE ERRORS:\n${validationErrors}\n\nFIX THESE ISSUES IN YOUR NEW MESSAGE.`
    : "";

  const messages: Message[] = [
    {
      role: "system",
      content: `You are a helpful assistant that generates concise, informative Git commit messages.
      Follow these strict rules:
      ${baseRules}
      ${criticalRules}
      ${examples}
      ${errorInfo}`,
    },
    {
      role: "user",
      content: `Generate a single-line commit message for the following git diff:\n\n${diff}`,
    },
  ];

  // Determine whether to use local LLM or OpenRouter based on config
  if (useLocalLLM) {
    return await generateWithLocalLLM(messages);
  } else {
    return await generateWithOpenRouter(messages, apiKey, model);
  }
}

async function generateWithOpenRouter(
  messages: Message[],
  apiKey: string,
  model: string
): Promise<string> {
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

    // Extract just the first line and remove any backticks to ensure a clean single-line message
    let message = data.choices[0].message.content.trim();

    // Remove markdown code block formatting if present
    message = message.replace(/```[a-z]*\n|\n```/g, "");

    // Split by newlines and just take the first line
    return message.split("\n")[0].trim();
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