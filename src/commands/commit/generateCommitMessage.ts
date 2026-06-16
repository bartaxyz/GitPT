import { getConfig } from "../../config.js";
import { getProvider } from "../../llm/registry.js";
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

  const { system, user } = buildCommitPrompt(diff, validationErrors);

  const message = await getProvider().complete({ system, user, maxTokens: 300 });

  if (!message) {
    throw new Error("No message returned from LLM");
  }

  return message;
};
