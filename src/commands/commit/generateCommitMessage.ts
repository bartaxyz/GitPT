import { getConfig } from "../../config.js";
import { getLLMClient } from "../../llm/index.js";
import { buildCommitPrompt } from "./context/buildPrompt.js";

export const generateCommitMessage = async (
  diff: string,
  validationErrors?: string
): Promise<string> => {
  const config = getConfig();

  // Check if we have a configured model
  if (!config.model) {
    throw new Error(
      'GitPT is not configured properly. Please run "gitpt setup" first.'
    );
  }

  const { model } = config;

  const { system, user } = buildCommitPrompt(diff, validationErrors);

  const llmClient = getLLMClient();

  const response = await llmClient.chat.completions.create({
    model: model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 300,
  });

  const message = response.choices[0].message.content;

  if (!message) {
    throw new Error("No message returned from LLM");
  }

  return message;
};
