import { Model } from "openai/resources/models";
import { getLLMClient } from "../../../llm/index.js";

export const getAvailableModels = async (options?: {
  baseURLOverride?: string;
}): Promise<Model[]> => {
  const { baseURLOverride } = options || {};

  let modelsList = await getLLMClient({ baseURLOverride }).models.list();
  const modelsData = modelsList.data;

  while (modelsList.hasNextPage()) {
    modelsList = await modelsList.getNextPage();
    modelsData.push(...modelsList.data);
  }

  return modelsData;
};
