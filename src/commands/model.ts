import chalk from "chalk";
import inquirer from "inquirer";
import fetch from "node-fetch";
import { getConfig, saveConfig } from "../utils/config.js";
import { checkLocalLLMConnection } from "../utils/localLLM.js";

interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: number;
    completion: number;
  };
}

// Interface for local models from OpenAI-compatible APIs
interface LocalModel {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

// Interface for local LLM response format
interface LocalModelsResponse {
  data: LocalModel[];
  object?: string;
}

async function fetchAvailableModels(
  apiKey: string
): Promise<OpenRouterModel[]> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/bartaxyz/GitPT",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch models: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as { data: OpenRouterModel[] };
    return data.data;
  } catch (error) {
    console.error(chalk.red("Error fetching models:"), error);
    return [];
  }
}

// Function to fetch models from a local LLM server
async function fetchLocalModels(endpointUrl: string): Promise<LocalModel[]> {
  try {
    const endpoint = new URL("/v1/models", endpointUrl).toString();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch local models: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as LocalModelsResponse;

    // Handle various response formats from different LLM servers
    if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else if (Array.isArray(data)) {
      // Some servers might return an array directly
      return data as unknown as LocalModel[];
    }

    return [];
  } catch (error) {
    console.error(
      chalk.yellow(`Could not fetch models from local LLM server: ${error}`)
    );
    return [];
  }
}

export async function modelCommand(
  modelId?: string,
  options?: { local?: boolean }
): Promise<void> {
  console.log(chalk.blue("GitPT Model Selection"));

  // Check if config exists
  const existingConfig = getConfig();

  if (!existingConfig) {
    console.error(
      chalk.red('GitPT is not configured. Please run "gitpt setup" first.')
    );
    process.exit(1);
  }

  // Handle local LLM setup if --local flag is provided
  if (options?.local) {
    await setupLocalLLM(existingConfig);
    return;
  }

  let selectedModel: string;

  // If a model ID is provided directly, use it
  if (modelId) {
    selectedModel = modelId;

    // Update config with the new model while keeping other settings
    saveConfig({
      ...existingConfig,
      model: selectedModel,
    });

    console.log(chalk.green(`✓ Model set to: ${chalk.yellow(selectedModel)}`));
    return;
  }

  // First determine if we're using local or remote LLM
  const useLocalLLMAnswer = await inquirer.prompt([
    {
      type: "list",
      name: "useLocalLLM",
      message: "Select LLM provider:",
      choices: [
        { name: "OpenRouter (remote)", value: false },
        { name: "Local LLM", value: true },
      ],
      default: existingConfig.useLocalLLM === true ? 1 : 0,
    },
  ]);

  const useLocalLLM = useLocalLLMAnswer.useLocalLLM;

  if (useLocalLLM) {
    await setupLocalLLM(existingConfig);
    return;
  }

  // Otherwise, show interactive remote model selection
  console.log("Current model:", chalk.yellow(existingConfig.model));
  console.log("");

  try {
    // Try to fetch available models from OpenRouter
    console.log(chalk.gray("Fetching available models from OpenRouter..."));
    const availableModels = await fetchAvailableModels(existingConfig.apiKey);

    let modelChoices;

    if (availableModels.length > 0) {
      // Convert available models to choices format
      modelChoices = availableModels.map((model) => ({
        name: `${model.name} (Context: ${model.context_length})`,
        value: model.id,
      }));

      // Add custom option at the end
      modelChoices.push({
        name: "Other (specify model identifier)",
        value: "custom",
      });

      console.log(
        chalk.green(
          `✓ Found ${availableModels.length} models available with your API key`
        )
      );
    } else {
      console.log(
        chalk.yellow(
          "No models found from OpenRouter. You can specify a custom model."
        )
      );
      modelChoices = [
        { name: "Specify custom model identifier", value: "custom" },
      ];
    }

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "modelChoice",
        message: "Select an AI model:",
        choices: modelChoices,
        default: () => {
          // Try to find current model in the list to set as default
          const currentIndex = modelChoices.findIndex(
            (choice) => choice.value === existingConfig.model
          );
          return currentIndex >= 0 ? currentIndex : 0;
        },
      },
      {
        type: "input",
        name: "customModel",
        message: "Enter model identifier:",
        when: (answers) => answers.modelChoice === "custom",
        validate: (input: string) => {
          if (!input) return "Model identifier is required";
          return true;
        },
      },
    ]);

    // Get the selected model
    selectedModel =
      answers.modelChoice === "custom"
        ? answers.customModel
        : answers.modelChoice;

    // Save the updated configuration with useLocalLLM set to false
    saveConfig({
      ...existingConfig,
      model: selectedModel,
      useLocalLLM: false,
    });

    console.log(
      chalk.green(`✓ Model updated to: ${chalk.yellow(selectedModel)}`)
    );
  } catch (error) {
    console.error(chalk.red("Error updating model:"), error);
    process.exit(1);
  }
}

async function setupLocalLLM(existingConfig: any): Promise<void> {
  console.log(chalk.blue("Local LLM Setup"));

  // First ask for the endpoint URL
  const endpointAnswer = await inquirer.prompt([
    {
      type: "input",
      name: "localLLMEndpoint",
      message: "Enter local LLM API endpoint (e.g., http://127.0.0.1:1234):",
      default: existingConfig.localLLMEndpoint || "http://127.0.0.1:1234",
      validate: (input: string) => {
        if (!input) return "API endpoint is required";
        if (!input.startsWith("http://") && !input.startsWith("https://")) {
          return "Must be a valid URL starting with http:// or https://";
        }
        return true;
      },
    },
  ]);

  const localLLMEndpoint = endpointAnswer.localLLMEndpoint;

  // Try to fetch available models from the local server
  console.log(
    chalk.gray("Trying to fetch available models from local LLM server...")
  );
  const localModels = await fetchLocalModels(localLLMEndpoint);

  let selectedModel: string;

  if (localModels.length > 0) {
    console.log(
      chalk.green(
        `✓ Found ${localModels.length} models available on your local LLM server`
      )
    );

    // Let the user select from available models
    const modelChoices = localModels.map((model) => ({
      name: model.id,
      value: model.id,
    }));

    // Add custom option
    modelChoices.push({
      name: "Other (specify model identifier)",
      value: "custom",
    });

    const modelAnswer = await inquirer.prompt([
      {
        type: "list",
        name: "modelChoice",
        message: "Select a model from your local LLM server:",
        choices: modelChoices,
        default: () => {
          // Try to find current model in the list to set as default
          const currentIndex = modelChoices.findIndex(
            (choice) => choice.value === existingConfig.model
          );
          return currentIndex >= 0 ? currentIndex : 0;
        },
      },
      {
        type: "input",
        name: "customModel",
        message: "Enter model identifier:",
        when: (answers) => answers.modelChoice === "custom",
        validate: (input: string) => {
          if (!input) return "Model identifier is required";
          return true;
        },
      },
    ]);

    selectedModel =
      modelAnswer.modelChoice === "custom"
        ? modelAnswer.customModel
        : modelAnswer.modelChoice;
  } else {
    console.log(
      chalk.yellow(
        "Could not fetch models from local LLM server, please enter model name manually"
      )
    );

    // Ask for model name manually
    const modelAnswer = await inquirer.prompt([
      {
        type: "input",
        name: "model",
        message: "Enter model name to use with local endpoint:",
        default: existingConfig.model || "gpt-3.5-turbo",
        validate: (input: string) => {
          if (!input) return "Model name is required";
          return true;
        },
      },
    ]);

    selectedModel = modelAnswer.model;
  }

  // Save local LLM configuration
  saveConfig({
    ...existingConfig,
    useLocalLLM: true,
    localLLMEndpoint: localLLMEndpoint,
    model: selectedModel,
  });

  console.log(chalk.green("✓ Local LLM configuration saved"));

  // Test connection to local LLM
  console.log(chalk.gray("Testing connection to local LLM..."));
  const isConnected = await checkLocalLLMConnection();

  if (isConnected) {
    console.log(chalk.green("✓ Successfully connected to local LLM"));
  } else {
    console.log(
      chalk.yellow(
        "⚠ Could not connect to local LLM at the specified endpoint."
      )
    );
    console.log(
      chalk.yellow(
        "  Make sure your local LLM is running and the endpoint is correct."
      )
    );
    console.log(
      chalk.yellow('  You can update this later with "gitpt model --local"')
    );
  }
}
