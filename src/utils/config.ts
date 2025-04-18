import Configstore from 'configstore';
import chalk from 'chalk';

const config = new Configstore('gitpt');

export interface GitPTConfig {
  apiKey: string;
  model: string;
}

export function getConfig(): GitPTConfig | null {
  try {
    const apiKey = config.get('apiKey');
    const model = config.get('model');

    if (!apiKey || !model) {
      return null;
    }

    return { apiKey, model };
  } catch (error) {
    console.error(chalk.red('Error reading configuration:'), error);
    return null;
  }
}

export function saveConfig(newConfig: GitPTConfig): void {
  config.set('apiKey', newConfig.apiKey);
  config.set('model', newConfig.model);
}

export function clearConfig(): void {
  config.clear();
}