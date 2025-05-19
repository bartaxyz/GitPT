import Configstore from 'configstore';
import chalk from 'chalk';

const config = new Configstore('gitpt');

export interface GitPTConfig {
  apiKey: string;
  model: string;
  useLocalLLM?: boolean;
  localLLMEndpoint?: string;
}

export function getConfig(): GitPTConfig | null {
  try {
    const apiKey = config.get('apiKey');
    const model = config.get('model');
    const useLocalLLM = config.get('useLocalLLM');
    const localLLMEndpoint = config.get('localLLMEndpoint');

    if (!apiKey || !model) {
      return null;
    }

    return { 
      apiKey, 
      model,
      useLocalLLM,
      localLLMEndpoint
    };
  } catch (error) {
    console.error(chalk.red('Error reading configuration:'), error);
    return null;
  }
}

export function saveConfig(newConfig: GitPTConfig): void {
  config.set('apiKey', newConfig.apiKey);
  config.set('model', newConfig.model);
  
  if (newConfig.useLocalLLM !== undefined) {
    config.set('useLocalLLM', newConfig.useLocalLLM);
  }
  
  if (newConfig.localLLMEndpoint !== undefined) {
    config.set('localLLMEndpoint', newConfig.localLLMEndpoint);
  }
}

export function clearConfig(): void {
  config.clear();
}