import { getConfig } from "@config";
import { getLLMClient } from "src/llm";
import {
  getCommitlintRules,
  hasCommitlintConfig,
} from "../../utils/commitlint";
import { systemPrompt } from "./context/systemPrompt";
import { userPrompt } from "./context/userPrompt";

export const generateCommitMessage = async (
  diff: string,
  validationErrors?: string
): Promise<string> => {
  // Check if commitlint is configured
  const hasCommitlint = hasCommitlintConfig();
  const config = getConfig();

  // Check if we have a configured model
  if (!config.model) {
    throw new Error(
      'GitPT is not configured properly. Please run "gitpt setup" first.'
    );
  }

  const { model } = config;

  const baseRules = hasCommitlint ? getCommitlintRules() : "";

  const errorInfo = validationErrors
    ? `\n\nYOUR PREVIOUS MESSAGE FAILED VALIDATION WITH THESE ERRORS:\n${validationErrors}\n\nFIX THESE ISSUES IN YOUR NEW MESSAGE.`
    : "";

  const llmClient = getLLMClient();

  const response = await llmClient.chat.completions.create({
    model: model,
    messages: [
      {
        role: "system",
        content: [systemPrompt, baseRules, errorInfo].join("\n\n"),
      },
      {
        role: "user",
        content: userPrompt(diff),
      },
    ],
    max_tokens: 300,
  });

  const message = response.choices[0].message.content;

  if (!message) {
    throw new Error("No message returned from LLM");
  }

  return message;
};
