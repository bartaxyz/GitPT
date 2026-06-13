import { spawnSync } from "child_process";
import { platform } from "os";
import chalk from "chalk";
import { GitPTConfig, saveConfig } from "../../../config.js";
import { selectModel } from "./selectModel.js";

const MIN_MACOS_MAJOR = 27;

export const isAppleFoundationModelsSupported = (): boolean => {
  if (platform() !== "darwin") return false;

  const result = spawnSync("sw_vers", ["-productVersion"], {
    encoding: "utf-8",
  });
  if (result.error || !result.stdout) return false;

  const major = parseInt(result.stdout.trim().split(".")[0], 10);
  return Number.isFinite(major) && major >= MIN_MACOS_MAJOR;
};

const CANDIDATE_MODELS = [
  {
    id: "system",
    name: "Apple On-Device Foundation Model",
    context_length: 4096, // may change across OS versions; verify periodically
  },
  { id: "pcc", name: "Private Cloud Compute (PCC)" },
];

const isModelAvailable = (
  modelId: string
): { available: boolean; reason?: string } => {
  const result = spawnSync("fm", ["available", "--model", modelId], {
    encoding: "utf-8",
  });

  if (result.error) {
    return { available: false, reason: "fm-missing" };
  }

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const available = /available/i.test(output) && !/not available|error/i.test(output);

  return { available, reason: output.trim() };
};

export const setupApple = async (
  existingConfig: GitPTConfig
): Promise<GitPTConfig> => {
  console.log(chalk.blue("Apple Foundation Models Setup"));

  const probes = CANDIDATE_MODELS.map((model) => ({
    model,
    ...isModelAvailable(model.id),
  }));

  if (probes.every((p) => p.reason === "fm-missing")) {
    console.error(
      chalk.red(
        "The Apple Foundation Models CLI ('fm') was not found. It ships with macOS 27 and later."
      )
    );
    process.exit(1);
  }

  const availableModels = probes
    .filter((p) => p.available)
    .map((p) => p.model);

  if (availableModels.length === 0) {
    console.error(
      chalk.red(
        "No Apple Foundation Models are available in this context. Make sure Apple Intelligence is enabled in System Settings."
      )
    );
    process.exit(1);
  }

  const notes = probes
    .filter((p) => !p.available)
    .map(
      (p) =>
        `Note: Apple doesn't allow ${p.model.name} access from command-line tools.`
    );

  const selectedModel = await selectModel(
    availableModels,
    existingConfig.model,
    notes
  );

  const updatedConfig: GitPTConfig = {
    ...existingConfig,
    provider: "apple",
    model: selectedModel,
  };

  saveConfig(updatedConfig);

  console.log(chalk.green(`✓ Model set to: ${chalk.yellow(selectedModel)}`));

  return updatedConfig;
};
