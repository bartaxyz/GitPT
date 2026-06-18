import { GitPTConfig } from "../../../config.js";
import { AppleProvider } from "../../../llm/providers/apple/index.js";
import { isAppleModelAvailable } from "../../../llm/providers/apple/models.js";

export interface DefaultModel {
  id: string;
  label: string;
  isAvailable: () => boolean;
  config: GitPTConfig;
}

const DEFAULT_MODELS: DefaultModel[] = [
  {
    id: "apple-foundation-models",
    label: "Apple Foundation Models (on-device)",
    isAvailable: () =>
      AppleProvider.isAvailable() && isAppleModelAvailable("system"),
    config: { provider: "apple", model: "system" },
  },
];

export const resolveDefaultModel = (): DefaultModel | undefined =>
  DEFAULT_MODELS.find((model) => model.isAvailable());
