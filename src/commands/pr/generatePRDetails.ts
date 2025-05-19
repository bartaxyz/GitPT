import { getConfig } from "@config";
import chalk from "chalk";
import { getLLMClient } from "src/llm";
import { systemPrompt } from "./context/systemPrompt";
import { userPrompt } from "./context/userPrompt";
import { getPRContext } from "./getPRContext";

export const generatePRDetails = async (): Promise<{
  title: string;
  body: string;
}> => {
  const { model } = getConfig();

  const context = getPRContext().join("\n\n");
  const userPromptWithContext = [userPrompt, context].join("\n\n");

  const llmClient = getLLMClient();

  try {
    const response = await llmClient.chat.completions.create({
      model: model!,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPromptWithContext },
      ],
      max_completion_tokens: 1000,
    });

    const result = response.choices[0].message?.content?.trim();

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
