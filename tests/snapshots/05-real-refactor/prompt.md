## System


You are a helpful assistant that generates concise, informative Git commit messages.

Follow these strict rules:
1. Use conventional commit format: type: description
2. Types are: feat, fix, docs, style, refactor, test, chore
3. NO scopes in parentheses - do not use feat(scope)
4. Keep the entire message under 100 characters
5. Use present tense (e.g., "add feature" not "added feature")
6. Be brief but descriptive about WHAT changed
7. Do not include detailed explanations

Critical Rules:
- Return a SINGLE LINE commit message only, with no additional explanations or paragraphs
- Do NOT include a detailed message body section, just the commit title line
- Do NOT use multiple lines, even for a single message

Examples of Good Commit Messages:
- feat: add user authentication system
- fix: resolve crash when opening settings menu
- refactor: simplify data processing pipeline
- docs: update installation instructions in README
- chore: update npm dependencies to latest versions
- style: fix indentation in CSS files
- test: add unit tests for payment processing
- perf: optimize database queries for faster loading
- build: update webpack configuration
- ci: fix GitHub Actions workflow

Examples of Bad Commit Messages:
- added login screen                    ❌ (missing type prefix)
- feat(auth): implement OAuth login     ❌ (using scope parentheses)
- This is a really long commit message that exceeds the limit and contains too much information ❌ (too long)
- feat: Adding user auth
  
  This implements the login page...     ❌ (contains multiple lines)
- "fix: update styling"                 ❌ (includes quotes)


Follow the conventional commit format (type(scope): message)



## User


Generate a single-line commit message for the following git diff:

diff --git a/src/commands/model.ts b/src/commands/model.ts
index 42a6f22..08df331 100644
--- a/src/commands/model.ts
+++ b/src/commands/model.ts
@@ -1,331 +1,257 @@
-import chalk from 'chalk';
-import inquirer from 'inquirer';
-import fetch from 'node-fetch';
-import { getConfig, saveConfig } from '../utils/config.js';
-import { checkLocalLLMConnection } from '../utils/localLLM.js';
+import chalk from "chalk";
+import inquirer from "inquirer";
+import fetch from "node-fetch";
+import { getConfig, saveConfig } from "../utils/config.js";
+import { checkLocalLLMConnection } from "../utils/localLLM.js";
 
-// List of popular models available on OpenRouter
-const POPULAR_MODELS = [
-  { name: 'Claude 3 Opus - Anthropic', value: 'anthropic/claude-3-opus:beta' },
-  { name: 'Claude 3 Sonnet - Anthropic', value: 'anthropic/claude-3-sonnet:beta' },
-  { name: 'Claude 3 Haiku - Anthropic', value: 'anthropic/claude-3-haiku:beta' },
-  { name: 'GPT-4o - OpenAI', value: 'openai/gpt-4o' },
-  { name: 'GPT-4 Turbo - OpenAI', value: 'openai/gpt-4-turbo' },
-  { name: 'GPT-3.5 Turbo - OpenAI', value: 'openai/gpt-3.5-turbo' },
-  { name: 'Other (specify model identifier)', value: 'custom' }
-];
-
-interface OpenRouterModel {
+interface Model {
   id: string;
-  name: string;
-  context_length: number;
-  pricing: {
+  name?: string;
+  context_length?: number;
+  pricing?: {
     prompt: number;
     completion: number;
   };
 }
 
-// Interface for local models from OpenAI-compatible APIs
-interface LocalModel {
-  id: string;
-  object?: string;
-  created?: number;
-  owned_by?: string;
-}
-
-// Interface for local LLM response format
-interface LocalModelsResponse {
-  data: LocalModel[];
+interface ModelResponse {
+  data: Model[];
   object?: string;
 }
 
-async function fetchAvailableModels(apiKey: string): Promise<OpenRouterModel[]> {
+async function fetchModels(
+  endpoint: string,
+  apiKey?: string
+): Promise<Model[]> {
   try {
-    const response = await fetch('https://openrouter.ai/api/v1/models', {
-      headers: {
-        'Authorization': `Bearer ${apiKey}`,
-        'HTTP-Referer': 'https://github.com/bartaxyz/GitPT',
-      }
-    });
-
-    if (!response.ok) {
-      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
+    const headers: Record<string, string> = {
+      "HTTP-Referer": "https://github.com/bartaxyz/GitPT",
+    };
+    if (apiKey) {
+      headers.Authorization = `Bearer ${apiKey}`;
     }
 
-    const data = await response.json() as { data: OpenRouterModel[] };
-    return data.data;
-  } catch (error) {
-    console.error(chalk.red('Error fetching models:'), error);
-    return [];
-  }
-}
-
-// Function to fetch models from a local LLM server
-async function fetchLocalModels(endpointUrl: string): Promise<LocalModel[]> {
-  try {
-    const endpoint = new URL('/v1/models', endpointUrl).toString();
-    
     const controller = new AbortController();
-    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
-    
+    const timeoutId = setTimeout(() => controller.abort(), 5000);
+
     const response = await fetch(endpoint, {
-      method: "GET",
-      signal: controller.signal
+      headers,
+      signal: controller.signal,
     });
-    
+
     clearTimeout(timeoutId);
 
     if (!response.ok) {
-      throw new Error(`Failed to fetch local models: ${response.status} ${response.statusText}`);
+      throw new Error(
+        `Failed to fetch models: ${response.status} ${response.statusText}`
+      );
     }
 
-    const data = await response.json() as LocalModelsResponse;
-    
-    // Handle various response formats from different LLM servers
-    if (data.data && Array.isArray(data.data)) {
-      return data.data;
-    } else if (Array.isArray(data)) {
-      // Some servers might return an array directly
-      return data as unknown as LocalModel[];
-    }
-    
-    return [];
+    const data = (await response.json()) as ModelResponse;
+    return Array.isArray(data.data) ? data.data : [];
   } catch (error) {
-    console.error(chalk.yellow(`Could not fetch models from local LLM server: ${error}`));
+    console.error(chalk.yellow(`Error fetching models: ${error}`));
     return [];
   }
 }
 
-export async function modelCommand(modelId?: string, options?: { local?: boolean }): Promise<void> {
-  console.log(chalk.blue('GitPT Model Selection'));
-  
-  // Check if config exists
+async function selectModel(
+  models: Model[],
+  existingModel?: string
+): Promise<string> {
+  const modelChoices = models.map((model) => ({
+    name: model.name
+      ? `${model.name} (Context: ${model.context_length})`
+      : model.id,
+    value: model.id,
+  }));
+
+  modelChoices.push({
+    name: "Other (specify model identifier)",
+    value: "custom",
+  });
+
+  const answers = await inquirer.prompt([
+    {
+      type: "list",
+      name: "modelChoice",
+      message: "Select an AI model:",
+      choices: modelChoices,
+      default: () => {
+        const currentIndex = modelChoices.findIndex(
+          (choice) => choice.value === existingModel
+        );
+        return currentIndex >= 0 ? currentIndex : 0;
+      },
+    },
+    {
+      type: "input",
+      name: "customModel",
+      message: "Enter model identifier:",
+      when: (answers) => answers.modelChoice === "custom",
+      validate: (input: string) =>
+        input ? true : "Model identifier is required",
+    },
+  ]);
+
+  return answers.modelChoice === "custom"
+    ? answers.customModel
+    : answers.modelChoice;
+}
+
+export async function modelCommand(
+  modelId?: string,
+  options?: { local?: boolean }
+): Promise<void> {
+  console.log(chalk.blue("GitPT Model Selection"));
+
   const existingConfig = getConfig();
-  
   if (!existingConfig) {
-    console.error(chalk.red('GitPT is not configured. Please run "gitpt setup" first.'));
+    console.error(
+      chalk.red('GitPT is not configured. Please run "gitpt setup" first.')
+    );
     process.exit(1);
   }
-  
-  // Handle local LLM setup if --local flag is provided
-  if (options?.local) {
-    await setupLocalLLM(existingConfig);
-    return;
-  }
-  
-  let selectedModel: string;
-  
-  // If a model ID is provided directly, use it
+
   if (modelId) {
-    selectedModel = modelId;
-    
-    // Update config with the new model while keeping other settings
-    saveConfig({
-      ...existingConfig,
-      model: selectedModel
-    });
-    
-    console.log(chalk.green(`✓ Model set to: ${chalk.yellow(selectedModel)}`));
+    saveConfig({ ...existingConfig, model: modelId });
+    console.log(chalk.green(`✓ Model set to: ${chalk.yellow(modelId)}`));
     return;
   }
-  
-  // First determine if we're using local or remote LLM
+
   const useLocalLLMAnswer = await inquirer.prompt([
     {
-      type: 'list',
-      name: 'useLocalLLM',
-      message: 'Select LLM provider:',
+      type: "list",
+      name: "useLocalLLM",
+      message: "Select LLM provider:",
       choices: [
-        { name: 'OpenRouter (remote)', value: false },
-        { name: 'Local LLM', value: true }
+        { name: "OpenRouter (remote)", value: false },
+        { name: "Local LLM", value: true },
       ],
-      default: existingConfig.useLocalLLM === true ? 1 : 0
-    }
+      default: existingConfig.useLocalLLM === true ? 1 : 0,
+    },
   ]);
-  
-  const useLocalLLM = useLocalLLMAnswer.useLocalLLM;
-  
-  if (useLocalLLM) {
+
+  if (useLocalLLMAnswer.useLocalLLM) {
     await setupLocalLLM(existingConfig);
     return;
   }
-  
-  // Otherwise, show interactive remote model selection
-  console.log('Current model:', chalk.yellow(existingConfig.model));
-  console.log('');
-  
+
+  console.log("Current model:", chalk.yellow(existingConfig.model));
+  console.log("");
+
   try {
-    // Try to fetch available models from OpenRouter
-    console.log(chalk.gray('Fetching available models from OpenRouter...'));
-    const availableModels = await fetchAvailableModels(existingConfig.apiKey);
-    
-    let modelChoices;
-    
-    if (availableModels.length > 0) {
-      // Convert available models to choices format
-      modelChoices = availableModels.map(model => ({
-        name: `${model.name} (Context: ${model.context_length})`,
-        value: model.id
-      }));
-      
-      // Add custom option at the end
-      modelChoices.push({ name: 'Other (specify model identifier)', value: 'custom' });
-      
-      console.log(chalk.green(`✓ Found ${availableModels.length} models available with your API key`));
+    console.log(chalk.gray("Fetching available models from OpenRouter..."));
+    const models = await fetchModels(
+      "https://openrouter.ai/api/v1/models",
+      existingConfig.apiKey
+    );
+
+    if (models.length > 0) {
+      console.log(
+        chalk.green(
+          `✓ Found ${models.length} models available with your API key`
+        )
+      );
     } else {
-      // Fallback to predefined list if API call fails
-      console.log(chalk.yellow('Could not fetch models from OpenRouter, using predefined list'));
-      modelChoices = POPULAR_MODELS;
+      console.log(
+        chalk.yellow(
+          "No models found from OpenRouter. You can specify a custom model."
+        )
+      );
     }
-    
-    const answers = await inquirer.prompt([
-      {
-        type: 'list',
-        name: 'modelChoice',
-        message: 'Select an AI model:',
-        choices: modelChoices,
-        default: () => {
-          // Try to find current model in the list to set as default
-          const currentIndex = modelChoices.findIndex(choice => choice.value === existingConfig.model);
-          return currentIndex >= 0 ? currentIndex : 0;
-        }
-      },
-      {
-        type: 'input',
-        name: 'customModel',
-        message: 'Enter model identifier:',
-        when: (answers) => answers.modelChoice === 'custom',
-        validate: (input: string) => {
-          if (!input) return 'Model identifier is required';
-          return true;
-        }
-      }
-    ]);
-    
-    // Get the selected model
-    selectedModel = answers.modelChoice === 'custom' ? answers.customModel : answers.modelChoice;
-    
-    // Save the updated configuration with useLocalLLM set to false
-    saveConfig({
-      ...existingConfig,
-      model: selectedModel,
-      useLocalLLM: false
-    });
-    
-    console.log(chalk.green(`✓ Model updated to: ${chalk.yellow(selectedModel)}`));
-    
+
+    const selectedModel = await selectModel(models, existingConfig.model);
+    saveConfig({ ...existingConfig, model: selectedModel, useLocalLLM: false });
+    console.log(
+      chalk.green(`✓ Model updated to: ${chalk.yellow(selectedModel)}`)
+    );
   } catch (error) {
-    console.error(chalk.red('Error updating model:'), error);
+    console.error(chalk.red("Error updating model:"), error);
     process.exit(1);
   }
 }
 
 async function setupLocalLLM(existingConfig: any): Promise<void> {
-  console.log(chalk.blue('Local LLM Setup'));
-  
-  // First ask for the endpoint URL
+  console.log(chalk.blue("Local LLM Setup"));
+
   const endpointAnswer = await inquirer.prompt([
     {
-      type: 'input',
-      name: 'localLLMEndpoint',
-      message: 'Enter local LLM API endpoint (e.g., http://127.0.0.1:1234):',
-      default: existingConfig.localLLMEndpoint || 'http://127.0.0.1:1234',
+      type: "input",
+      name: "localLLMEndpoint",
+      message: "Enter local LLM API endpoint (e.g., http://127.0.0.1:1234):",
+      default: existingConfig.localLLMEndpoint || "http://127.0.0.1:1234",
       validate: (input: string) => {
-        if (!input) return 'API endpoint is required';
-        if (!input.startsWith('http://') && !input.startsWith('https://')) {
-          return 'Must be a valid URL starting with http:// or https://';
+        if (!input) return "API endpoint is required";
+        if (!input.startsWith("http://") && !input.startsWith("https://")) {
+          return "Must be a valid URL starting with http:// or https://";
         }
         return true;
-      }
-    }
-  ]);
-  
-  const localLLMEndpoint = endpointAnswer.localLLMEndpoint;
-  
-  // Try to fetch available models from the local server
-  console.log(chalk.gray('Trying to fetch available models from local LLM server...'));
-  const localModels = await fetchLocalModels(localLLMEndpoint);
-  
-  let selectedModel: string;
-  
-  if (localModels.length > 0) {
-    console.log(chalk.green(`✓ Found ${localModels.length} models available on your local LLM server`));
-    
-    // Let the user select from available models
-    const modelChoices = localModels.map(model => ({
-      name: model.id,
-      value: model.id
-    }));
-    
-    // Add custom option
-    modelChoices.push({ name: 'Other (specify model identifier)', value: 'custom' });
-    
-    const modelAnswer = await inquirer.prompt([
-      {
-        type: 'list',
-        name: 'modelChoice',
-        message: 'Select a model from your local LLM server:',
-        choices: modelChoices,
-        default: () => {
-          // Try to find current model in the list to set as default
-          const currentIndex = modelChoices.findIndex(choice => choice.value === existingConfig.model);
-          return currentIndex >= 0 ? currentIndex : 0;
-        }
       },
-      {
-        type: 'input',
-        name: 'customModel',
-        message: 'Enter model identifier:',
-        when: (answers) => answers.modelChoice === 'custom',
-        validate: (input: string) => {
-          if (!input) return 'Model identifier is required';
-          return true;
-        }
-      }
-    ]);
-    
-    selectedModel = modelAnswer.modelChoice === 'custom' 
-      ? modelAnswer.customModel 
-      : modelAnswer.modelChoice;
+    },
+  ]);
+
+  const localLLMEndpoint = endpointAnswer.localLLMEndpoint;
+  console.log(
+    chalk.gray("Trying to fetch available models from local LLM server...")
+  );
+
+  const models = await fetchModels(
+    new URL("/v1/models", localLLMEndpoint).toString()
+  );
+  let selectedModel: string;
+
+  if (models.length > 0) {
+    console.log(
+      chalk.green(
+        `✓ Found ${models.length} models available on your local LLM server`
+      )
+    );
+    selectedModel = await selectModel(models, existingConfig.model);
   } else {
-    console.log(chalk.yellow('Could not fetch models from local LLM server, please enter model name manually'));
-    
-    // Ask for model name manually
+    console.log(
+      chalk.yellow(
+        "Could not fetch models from local LLM server, please enter model name manually"
+      )
+    );
     const modelAnswer = await inquirer.prompt([
       {
-        type: 'input',
-        name: 'model',
-        message: 'Enter model name to use with local endpoint:',
-        default: existingConfig.model || 'gpt-3.5-turbo',
-        validate: (input: string) => {
-          if (!input) return 'Model name is required';
-          return true;
-        }
-      }
+        type: "input",
+        name: "model",
+        message: "Enter model name to use with local endpoint:",
+        default: existingConfig.model || "gpt-3.5-turbo",
+        validate: (input: string) => (input ? true : "Model name is required"),
+      },
     ]);
-    
     selectedModel = modelAnswer.model;
   }
-  
-  // Save local LLM configuration
+
   saveConfig({
     ...existingConfig,
     useLocalLLM: true,
-    localLLMEndpoint: localLLMEndpoint,
-    model: selectedModel
+    localLLMEndpoint,
+    model: selectedModel,
   });
-  
-  console.log(chalk.green('✓ Local LLM configuration saved'));
-  
-  // Test connection to local LLM
-  console.log(chalk.gray('Testing connection to local LLM...'));
+
+  console.log(chalk.green("✓ Local LLM configuration saved"));
+  console.log(chalk.gray("Testing connection to local LLM..."));
+
   const isConnected = await checkLocalLLMConnection();
-  
   if (isConnected) {
-    console.log(chalk.green('✓ Successfully connected to local LLM'));
+    console.log(chalk.green("✓ Successfully connected to local LLM"));
   } else {
-    console.log(chalk.yellow('⚠ Could not connect to local LLM at the specified endpoint.'));
-    console.log(chalk.yellow('  Make sure your local LLM is running and the endpoint is correct.'));
-    console.log(chalk.yellow('  You can update this later with "gitpt model --local"'));
+    console.log(
+      chalk.yellow(
+        "⚠ Could not connect to local LLM at the specified endpoint."
+      )
+    );
+    console.log(
+      chalk.yellow(
+        "  Make sure your local LLM is running and the endpoint is correct."
+      )
+    );
+    console.log(
+      chalk.yellow('  You can update this later with "gitpt model --local"')
+    );
   }
-}
\ No newline at end of file
+}
diff --git a/src/utils/commitlint.ts b/src/utils/commitlint.ts
index db75118..dd4c79a 100644
--- a/src/utils/commitlint.ts
+++ b/src/utils/commitlint.ts
@@ -43,7 +43,7 @@ export function hasCommitlintConfig(): boolean {
  */
 export async function readCommitlintConfig(): Promise<any> {
   const config = await loadConfig();
-  console.log(config);
+  // console.log(config);
   return config.rules;
 }
 


