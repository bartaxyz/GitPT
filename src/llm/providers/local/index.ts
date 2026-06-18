import chalk from "chalk";
import inquirer from "inquirer";
import { getConfig, GitPTConfig, saveConfig } from "../../../config.js";
import { getAvailableModels } from "../../setup/getAvailableModels.js";
import { selectModel } from "../../setup/selectModel.js";
import { OpenAICompatibleProvider } from "../openaiCompatible.js";

const DEFAULT_CONTEXT_WINDOW = 4096;

const detectContextWindow = async (
  endpoint: string,
  modelId: string
): Promise<number | undefined> => {
  try {
    const origin = new URL(endpoint).origin;
    const response = await fetch(`${origin}/api/v0/models`);
    if (!response.ok) return undefined;

    const models = (await response.json())?.data ?? [];
    const model =
      models.find((m: { id?: string }) => m.id === modelId) ??
      models.find((m: { state?: string }) => m.state === "loaded");

    const window = model?.loaded_context_length ?? model?.max_context_length;
    return typeof window === "number" && window > 0 ? window : undefined;
  } catch {
    return undefined;
  }
};

export class LocalProvider extends OpenAICompatibleProvider {
  static readonly id = "local";
  static readonly label = "Local LLM";
  static override readonly requiresApiKey = false;
  static override readonly requiresEndpoint = true;

  static async setup(existingConfig: GitPTConfig): Promise<GitPTConfig> {
    console.log(chalk.blue("Local LLM Setup"));

    const endpointAnswer = await inquirer.prompt([
      {
        type: "input",
        name: "localLLMEndpoint",
        message: "Enter local LLM API endpoint (e.g., http://127.0.0.1:1234):",
        default: existingConfig.customLLMEndpoint || "http://127.0.0.1:1234",
        validate: (input: string) => {
          if (!input) return "API endpoint is required";
          if (!input.startsWith("http://") && !input.startsWith("https://")) {
            return "Must be a valid URL starting with http:// or https://";
          }
          return true;
        },
      },
    ]);

    const endpoint = endpointAnswer.localLLMEndpoint;

    console.log(
      chalk.gray("Trying to fetch available models from local LLM server...")
    );

    const models = await getAvailableModels({ baseURLOverride: endpoint });

    let selectedModel: string;

    if (models.length > 0) {
      console.log(
        chalk.green(
          `✓ Found ${models.length} models available on your local LLM server`
        )
      );
      selectedModel = await selectModel(models, existingConfig.model);
    } else {
      console.log(
        chalk.yellow(
          "Could not fetch models from local LLM server, please enter model name manually"
        )
      );
      const modelAnswer = await inquirer.prompt([
        {
          type: "input",
          name: "model",
          message: "Enter model name to use with local endpoint:",
          default: existingConfig.model,
          validate: (input: string) =>
            input ? true : "Model name is required",
        },
      ]);
      selectedModel = modelAnswer.model;
    }

    const contextWindow =
      (await detectContextWindow(endpoint, selectedModel)) ??
      DEFAULT_CONTEXT_WINDOW;

    console.log(
      chalk.gray(`Using a context window of ${contextWindow} tokens.`)
    );

    const updatedConfig: GitPTConfig = {
      ...existingConfig,
      provider: "local",
      model: selectedModel,
      customLLMEndpoint: endpoint,
      contextWindow,
    };

    saveConfig(updatedConfig);
    console.log(chalk.green("✓ Local LLM configuration saved"));

    return updatedConfig;
  }

  override async getContextWindow(): Promise<number> {
    const { contextWindow, customLLMEndpoint, model } = getConfig();
    if (contextWindow) return contextWindow;

    const detected = await detectContextWindow(
      customLLMEndpoint ?? "",
      model ?? ""
    );
    if (detected) {
      saveConfig({ contextWindow: detected });
      return detected;
    }

    return DEFAULT_CONTEXT_WINDOW;
  }

  protected baseURL(): string {
    return getConfig().customLLMEndpoint ?? "";
  }
}
