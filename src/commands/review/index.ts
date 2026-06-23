import chalk from "chalk";
import { getProvider } from "../../llm/registry.js";
import { git } from "../../services/git/index.js";
import { capabilitiesMiddleware } from "../middleware/capabilitiesMiddleware/index.js";
import { setupMiddleware } from "../middleware/setupMiddleware/index.js";

const REVIEW_SYSTEM = `You are a concise senior code reviewer. You are given a git diff of staged changes.
Respond with:
- one short sentence summarising what changed,
- then up to 5 brief bullet points flagging real risks, likely bugs, or concrete suggestions (drop a bullet if there's nothing worth saying).
Be specific. Skip praise and preamble.`;

export const reviewCommand = async (): Promise<void> => {
  capabilitiesMiddleware(["git"]);
  await setupMiddleware();

  const diff = git.getStagedChanges();
  if (!diff || !diff.trim()) {
    console.log(
      chalk.yellow("No staged changes to review. Stage some with `git add` first."),
    );
    return;
  }

  console.log(chalk.blue("Reviewing staged changes..."));

  const provider = getProvider();
  const review = await provider.complete({
    system: REVIEW_SYSTEM,
    user: diff,
    maxTokens: provider.maxOutputTokens,
  });

  console.log("");
  console.log(review.trim());
};
