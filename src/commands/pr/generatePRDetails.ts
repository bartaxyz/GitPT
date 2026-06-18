import chalk from "chalk";
import { getProvider } from "../../llm/registry.js";
import { systemPrompt } from "./context/systemPrompt.js";
import { userPrompt } from "./context/userPrompt.js";
import { getPRContext } from "./getPRContext.js";

export const generatePRDetails = async (): Promise<{
  title: string;
  body: string;
}> => {
  const context = getPRContext().join("\n\n");

  try {
    const result = (
      await getProvider().complete({
        system: systemPrompt,
        user: userPrompt(context),
        maxTokens: 1000,
      })
    ).trim();

    if (!result) {
      throw new Error("No response from LLM");
    }

    const titleMatch = result.match(/Title:\s*(.+?)(?:\n|$)/);
    const descMatch = result.match(/Description:\s*\n([\s\S]+)$/);

    const title = titleMatch ? titleMatch[1].trim() : "";
    const body = descMatch ? descMatch[1].trim() : result;

    return { title, body };
  } catch (error) {
    console.error(chalk.red("Error generating PR details:"), error);
    throw new Error("Failed to generate PR details");
  }
};
