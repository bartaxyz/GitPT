import { spawnSync } from "child_process";
import { platform } from "os";
import chalk from "chalk";
import { GitPTConfig, saveConfig } from "../../../config.js";
import type { LLMClient } from "../../client.js";
import { selectModel } from "../../setup/selectModel.js";
import { Provider } from "../base.js";
import { getAppleFoundationClient } from "./client.js";
import { CANDIDATE_MODELS, probeModel } from "./models.js";

const MIN_MACOS_MAJOR = 27;

export class AppleProvider extends Provider {
  static readonly id = "apple";
  static readonly label = "Apple Foundation Models (macOS 27+)";

  static override isAvailable(): boolean {
    if (platform() !== "darwin") return false;

    const result = spawnSync("sw_vers", ["-productVersion"], {
      encoding: "utf-8",
    });
    if (result.error || !result.stdout) return false;

    const major = parseInt(result.stdout.trim().split(".")[0], 10);
    return Number.isFinite(major) && major >= MIN_MACOS_MAJOR;
  }

  static async setup(existingConfig: GitPTConfig): Promise<GitPTConfig> {
    console.log(chalk.blue("Apple Foundation Models Setup"));

    const probes = CANDIDATE_MODELS.map((model) => ({
      model,
      ...probeModel(model.id),
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
  }

  constructor(model: string) {
    super(model || "system");
  }

  override getContextWindow(): number {
    // The Apple Foundation Model CLI does not provide a way to get the context window size.
    // `fm` only enables `system` model for programmatic use, the context window is always 4096 tokens.
    return 4096;
  }

  override countTokens(text: string): number {
    const result = spawnSync("fm", ["token-count", "-q"], {
      input: text,
      encoding: "utf-8",
    });

    if (!result.error && result.stdout) {
      const tokens = parseInt(result.stdout.replace(/[^0-9]/g, ""), 10);
      if (Number.isFinite(tokens)) return tokens;
    }

    return super.countTokens(text);
  }

  protected getClient(): LLMClient {
    return getAppleFoundationClient();
  }
}
