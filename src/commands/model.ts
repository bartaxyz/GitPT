import chalk from "chalk";
import inquirer from "inquirer";
import fetch from "node-fetch";
import { getConfig, saveConfig } from "../utils/config.js";
import { checkLocalLLMConnection } from "../utils/localLLM.js";

interface Model {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
}

interface ModelResponse {
  data: Model[];
  object?: string;
}

async function fetchModels(
  endpoint: string,
  apiKey?: string
): Promise<Model[]> {
  try {
    const headers: Record<string, string> = {
      "HTTP-Referer": "https://github.com/bartaxyz/GitPT",
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(endpoint, {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch models: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as ModelResponse;
    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    console.error(chalk.yellow(`Error fetching models: ${error}`));
    return [];
  }
}

async function selectModel(
  models: Model[],
  existingModel?: string
): Promise<string> {
  const modelChoices = models.map((model) => ({
    name: model.name
      ? `${model.name} (Context: ${model.context_length})`
      : model.id,
    value: model.id,
  }));

  modelChoices.push({
    name: "Other (specify model identifier)",
    value: "custom",
  });

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "modelChoice",
      message: "Select an AI model:",
      choices: modelChoices,
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
}

export async function modelCommand(
  modelId?: string,
  options?: { local?: boolean }
): Promise<void> {
  console.log(chalk.blue("GitPT Model Selection"));

  const existingConfig = getConfig();
  if (!existingConfig) {
    console.error(
      chalk.red('GitPT is not configured. Please run "gitpt setup" first.')
    );
    process.exit(1);
  }

  if (modelId) {
    saveConfig({ ...existingConfig, model: modelId });
    console.log(chalk.green(`✓ Model set to: ${chalk.yellow(modelId)}`));
    return;
  }

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

  if (useLocalLLMAnswer.useLocalLLM) {
    await setupLocalLLM(existingConfig);
    return;
  }

  console.log("Current model:", chalk.yellow(existingConfig.model));
  console.log("");

  try {
    console.log(chalk.gray("Fetching available models from OpenRouter..."));
    const models = await fetchModels(
      "https://openrouter.ai/api/v1/models",
      existingConfig.apiKey
    );

    if (models.length > 0) {
      console.log(
        chalk.green(
          `✓ Found ${models.length} models available with your API key`
        )
      );
    } else {
      console.log(
        chalk.yellow(
          "No models found from OpenRouter. You can specify a custom model."
        )
      );
    }

    const selectedModel = await selectModel(models, existingConfig.model);
    saveConfig({ ...existingConfig, model: selectedModel, useLocalLLM: false });
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
  console.log(
    chalk.gray("Trying to fetch available models from local LLM server...")
  );

  const models = await fetchModels(
    new URL("/v1/models", localLLMEndpoint).toString()
  );
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
        default: existingConfig.model || "gpt-3.5-turbo",
        validate: (input: string) => (input ? true : "Model name is required"),
      },
    ]);
    selectedModel = modelAnswer.model;
  }

  saveConfig({
    ...existingConfig,
    useLocalLLM: true,
    localLLMEndpoint,
    model: selectedModel,
  });

  console.log(chalk.green("✓ Local LLM configuration saved"));
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
