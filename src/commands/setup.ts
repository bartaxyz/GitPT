import chalk from "chalk";
import { clearConfig, saveConfig, type GitPTConfig } from "../config.js";
import { getApiKey, saveApiKey } from "../llm/providers/apiKey.js";
import { getProviderClass } from "../llm/registry.js";
import { setupMiddleware } from "./middleware/setupMiddleware/index.js";

interface SetupOptions {
  clearConfig?: boolean;
  provider?: string;
  model?: string;
  endpoint?: string;
  apiKey?: string;
}

// Print an error and exit non-zero. Returns `never`, so TypeScript knows the
// code after a fail() call is unreachable (lets us narrow `spec` below).
const fail = (message: string): never => {
  console.error(chalk.red(`Error: ${message}`));
  process.exit(1);
};

// Non-interactive setup: configure straight from flags, no prompts.
const headlessSetup = (options: SetupOptions): void => {
  const spec = getProviderClass(options.provider);
  if (!spec) {
    return fail(
      `Unknown provider "${options.provider}". Valid: local, openrouter, openai, anthropic, apple.`,
    );
  }
  if (!options.model) {
    fail("--model is required.");
  }
  if (spec.requiresEndpoint && !options.endpoint) {
    fail(`Provider "${spec.id}" requires --endpoint.`);
  }
  if (spec.requiresApiKey && !options.apiKey && !getApiKey()) {
    fail(`Provider "${spec.id}" requires --api-key.`);
  }

  const config: GitPTConfig = {
    provider: spec.id as GitPTConfig["provider"],
    model: options.model,
  };
  if (options.endpoint) config.customLLMEndpoint = options.endpoint;
  saveConfig(config);
  if (options.apiKey) saveApiKey(spec.id, options.apiKey);

  console.log(
    chalk.green(`✓ Configured ${spec.label} with model ${options.model}.`),
  );
};

export const setupCommand = async (
  options: SetupOptions = {},
): Promise<void> => {
  // Flags present → headless path, skip the interactive prompts.
  if (options.provider) {
    headlessSetup(options);
    return;
  }

  console.log(chalk.blue("GitPT Setup"));
  console.log(
    "This will configure GitPT to use an LLM for generating commit messages.",
  );
  console.log("");

  if (options.clearConfig) {
    clearConfig();
  }

  await setupMiddleware({ context: "setup" });

  console.log("");
  console.log(
    `Use ${chalk.cyan(
      "gitpt commit",
    )} to create commits with AI-generated messages.`,
  );
};
