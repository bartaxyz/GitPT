import type OpenAI from "openai";

export type ChatCompletionCreateParams =
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

export interface LLMChatCompletion {
  choices: Array<{ message: { content: string | null } }>;
}

export interface LLMModelsPage {
  data: OpenAI.Models.Model[];
  hasNextPage(): boolean;
  getNextPage(): Promise<LLMModelsPage>;
}

export interface LLMClient {
  chat: {
    completions: {
      create(body: ChatCompletionCreateParams): Promise<LLMChatCompletion>;
    };
  };
  models: {
    list(): Promise<LLMModelsPage>;
  };
}
