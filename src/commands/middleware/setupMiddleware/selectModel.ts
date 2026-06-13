import chalk from "chalk";
import inquirer from "inquirer";
import { Model } from "./types.js";

/**
 * Show a list of models to select from
 */
export const selectModel = async (
  models: Model[],
  existingModel?: string,
  notes?: string[]
): Promise<string> => {
  const modelChoices = models.map((model) => ({
    name: model.name
      ? model.context_length
        ? `${model.name} (Context: ${model.context_length})`
        : model.name
      : model.id,
    value: model.id,
  }));

  modelChoices.push({
    name: "Other (specify model identifier)",
    value: "custom",
  });

  const choices: Array<
    { name: string; value: string } | InstanceType<typeof inquirer.Separator>
  > = [...modelChoices];

  if (notes && notes.length > 0) {
    choices.push(new inquirer.Separator(" "));
    for (const note of notes) {
      choices.push(new inquirer.Separator(chalk.gray(note)));
    }
  }

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "modelChoice",
      message: "Select an AI model:",
      choices,
      default: () => {
        const currentIndex = modelChoices.findIndex(
          (choice) => choice.value === existingModel
        );
        return currentIndex >= 0 ? currentIndex : 0;
      },
    },
    {
      type: "input",
      name: "customModel",
      message: "Enter model identifier:",
      when: (answers) => answers.modelChoice === "custom",
      validate: (input: string) =>
        input ? true : "Model identifier is required",
    },
  ]);

  return answers.modelChoice === "custom"
    ? answers.customModel
    : answers.modelChoice;
};
