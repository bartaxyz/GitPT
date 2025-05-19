import { Model } from "openai/resources/models";
import { getLLMClient } from "src/llm";

export const getAvailableModels = async (): Promise<Model[]> => {
  let modelsList = await getLLMClient().models.list();
  const modelsData = modelsList.data;

  while (modelsList.hasNextPage()) {
    modelsList = await modelsList.getNextPage();
    modelsData.push(...modelsList.data);
  }

  return modelsData;
};
