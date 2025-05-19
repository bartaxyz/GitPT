import inquirer from 'inquirer';
import chalk from 'chalk';
import fetch from 'node-fetch';
import { getConfig, saveConfig } from '../utils/config.js';
import { checkLocalLLMConnection } from '../utils/localLLM.js';

// List of popular models available on OpenRouter
const POPULAR_MODELS = [
  { name: 'Claude 3 Opus - Anthropic', value: 'anthropic/claude-3-opus:beta' },
  { name: 'Claude 3 Sonnet - Anthropic', value: 'anthropic/claude-3-sonnet:beta' },
  { name: 'Claude 3 Haiku - Anthropic', value: 'anthropic/claude-3-haiku:beta' },
  { name: 'GPT-4o - OpenAI', value: 'openai/gpt-4o' },
  { name: 'GPT-4 Turbo - OpenAI', value: 'openai/gpt-4-turbo' },
  { name: 'GPT-3.5 Turbo - OpenAI', value: 'openai/gpt-3.5-turbo' },
  { name: 'Other (specify model identifier)', value: 'custom' }
];

interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: number;
    completion: number;
  };
}

async function fetchAvailableModels(apiKey: string): Promise<OpenRouterModel[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/bartaxyz/GitPT',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { data: OpenRouterModel[] };
    return data.data;
  } catch (error) {
    console.error(chalk.red('Error fetching models:'), error);
    return [];
  }
}

export async function modelCommand(modelId?: string, options?: { local?: boolean }): Promise<void> {
  console.log(chalk.blue('GitPT Model Selection'));
  
  // Check if config exists
  const existingConfig = getConfig();
  
  if (!existingConfig) {
    console.error(chalk.red('GitPT is not configured. Please run "gitpt setup" first.'));
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
      model: selectedModel
    });
    
    console.log(chalk.green(`✓ Model set to: ${chalk.yellow(selectedModel)}`));
    return;
  }
  
  // First determine if we're using local or remote LLM
  const useLocalLLMAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'useLocalLLM',
      message: 'Select LLM provider:',
      choices: [
        { name: 'OpenRouter (remote)', value: false },
        { name: 'Local LLM', value: true }
      ],
      default: existingConfig.useLocalLLM === true ? 1 : 0
    }
  ]);
  
  const useLocalLLM = useLocalLLMAnswer.useLocalLLM;
  
  if (useLocalLLM) {
    await setupLocalLLM(existingConfig);
    return;
  }
  
  // Otherwise, show interactive remote model selection
  console.log('Current model:', chalk.yellow(existingConfig.model));
  console.log('');
  
  try {
    // Try to fetch available models from OpenRouter
    console.log(chalk.gray('Fetching available models from OpenRouter...'));
    const availableModels = await fetchAvailableModels(existingConfig.apiKey);
    
    let modelChoices;
    
    if (availableModels.length > 0) {
      // Convert available models to choices format
      modelChoices = availableModels.map(model => ({
        name: `${model.name} (Context: ${model.context_length})`,
        value: model.id
      }));
      
      // Add custom option at the end
      modelChoices.push({ name: 'Other (specify model identifier)', value: 'custom' });
      
      console.log(chalk.green(`✓ Found ${availableModels.length} models available with your API key`));
    } else {
      // Fallback to predefined list if API call fails
      console.log(chalk.yellow('Could not fetch models from OpenRouter, using predefined list'));
      modelChoices = POPULAR_MODELS;
    }
    
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'modelChoice',
        message: 'Select an AI model:',
        choices: modelChoices,
        default: () => {
          // Try to find current model in the list to set as default
          const currentIndex = modelChoices.findIndex(choice => choice.value === existingConfig.model);
          return currentIndex >= 0 ? currentIndex : 0;
        }
      },
      {
        type: 'input',
        name: 'customModel',
        message: 'Enter model identifier:',
        when: (answers) => answers.modelChoice === 'custom',
        validate: (input: string) => {
          if (!input) return 'Model identifier is required';
          return true;
        }
      }
    ]);
    
    // Get the selected model
    selectedModel = answers.modelChoice === 'custom' ? answers.customModel : answers.modelChoice;
    
    // Save the updated configuration with useLocalLLM set to false
    saveConfig({
      ...existingConfig,
      model: selectedModel,
      useLocalLLM: false
    });
    
    console.log(chalk.green(`✓ Model updated to: ${chalk.yellow(selectedModel)}`));
    
  } catch (error) {
    console.error(chalk.red('Error updating model:'), error);
    process.exit(1);
  }
}

async function setupLocalLLM(existingConfig: any): Promise<void> {
  console.log(chalk.blue('Local LLM Setup'));
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'localLLMEndpoint',
      message: 'Enter local LLM API endpoint (e.g., http://127.0.0.1:1234):',
      default: existingConfig.localLLMEndpoint || 'http://127.0.0.1:1234',
      validate: (input: string) => {
        if (!input) return 'API endpoint is required';
        if (!input.startsWith('http://') && !input.startsWith('https://')) {
          return 'Must be a valid URL starting with http:// or https://';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'model',
      message: 'Enter model name to use with local endpoint:',
      default: existingConfig.model,
      validate: (input: string) => {
        if (!input) return 'Model name is required';
        return true;
      }
    }
  ]);
  
  // Save local LLM configuration
  saveConfig({
    ...existingConfig,
    useLocalLLM: true,
    localLLMEndpoint: answers.localLLMEndpoint,
    model: answers.model
  });
  
  console.log(chalk.green('✓ Local LLM configuration saved'));
  
  // Test connection to local LLM
  console.log(chalk.gray('Testing connection to local LLM...'));
  const isConnected = await checkLocalLLMConnection();
  
  if (isConnected) {
    console.log(chalk.green('✓ Successfully connected to local LLM'));
  } else {
    console.log(chalk.yellow('⚠ Could not connect to local LLM at the specified endpoint.'));
    console.log(chalk.yellow('  Make sure your local LLM is running and the endpoint is correct.'));
    console.log(chalk.yellow('  You can update this later with "gitpt model --local"'));
  }
}