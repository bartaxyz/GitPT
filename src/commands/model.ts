import inquirer from 'inquirer';
import chalk from 'chalk';
import fetch from 'node-fetch';
import { getConfig, saveConfig } from '../utils/config.js';

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

export async function modelCommand(modelId?: string): Promise<void> {
  console.log(chalk.blue('GitPT Model Selection'));
  
  // Check if config exists
  const existingConfig = getConfig();
  
  if (!existingConfig) {
    console.error(chalk.red('GitPT is not configured. Please run "gitpt setup" first.'));
    process.exit(1);
  }
  
  let selectedModel: string;
  
  // If a model ID is provided directly, use it
  if (modelId) {
    selectedModel = modelId;
    
    // Update config with the new model while keeping the existing API key
    saveConfig({
      apiKey: existingConfig.apiKey,
      model: selectedModel
    });
    
    console.log(chalk.green(`✓ Model set to: ${chalk.yellow(selectedModel)}`));
    return;
  }
  
  // Otherwise, show interactive selection
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
    
    // Save the updated configuration
    saveConfig({
      apiKey: existingConfig.apiKey,
      model: selectedModel
    });
    
    console.log(chalk.green(`✓ Model updated to: ${chalk.yellow(selectedModel)}`));
    
  } catch (error) {
    console.error(chalk.red('Error updating model:'), error);
    process.exit(1);
  }
}