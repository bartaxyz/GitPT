export interface Model {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
}

export interface ModelResponse {
  data: Model[];
  object?: string;
}
