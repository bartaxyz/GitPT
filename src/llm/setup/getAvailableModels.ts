import { Model } from "openai/resources/models";
import { getLLMClient } from "../index.js";

export const getAvailableModels = async (options?: {
  baseURLOverride?: string;
  apiKey?: string;
}): Promise<Model[]> => {
  const { baseURLOverride, apiKey } = options || {};

  let modelsList = await getLLMClient({ baseURLOverride, apiKey }).models.list();
  const modelsData = modelsList.data;

  while (modelsList.hasNextPage()) {
    modelsList = await modelsList.getNextPage();
    modelsData.push(...modelsList.data);
  }

  return modelsData;
};
