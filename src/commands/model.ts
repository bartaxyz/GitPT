import { setupMiddleware } from "@middleware/setupMiddleware";
import chalk from "chalk";

export const modelCommand = async (): Promise<void> => {
  console.log(chalk.blue("GitPT Model Selection"));

  await setupMiddleware();
};
