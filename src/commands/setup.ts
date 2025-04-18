import inquirer from 'inquirer';
import chalk from 'chalk';
import { saveConfig, clearConfig } from '../utils/config.js';

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

export async function setupCommand(): Promise<void> {
  console.log(chalk.blue('GitPT Setup'));
  console.log('This will configure GitPT to use OpenRouter for generating commit messages.');
  console.log('If you don\'t have an OpenRouter account yet, sign up at https://openrouter.ai');
  console.log('');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiKey',
      message: 'Enter your OpenRouter API key:',
      validate: (input: string) => {
        if (!input) return 'API key is required';
        return true;
      }
    },
    {
      type: 'list',
      name: 'modelChoice',
      message: 'Select an AI model:',
      choices: POPULAR_MODELS
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

  // Clear existing config before saving new one
  clearConfig();

  // Save the new configuration
  const model = answers.modelChoice === 'custom' ? answers.customModel : answers.modelChoice;
  
  saveConfig({
    apiKey: answers.apiKey,
    model: model
  });

  console.log(chalk.green('✓ GitPT configuration saved successfully'));
  console.log(`Model set to: ${chalk.yellow(model)}`);
  console.log('');
  console.log(`Use ${chalk.cyan('gitpt commit')} to create commits with AI-generated messages.`);
}