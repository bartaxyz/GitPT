import chalk from "chalk";
import { setupMiddleware } from "./middleware/setupMiddleware/index.js";

export const modelCommand = async (): Promise<void> => {
  console.log(chalk.blue("GitPT Model Selection"));

  await setupMiddleware();
};
