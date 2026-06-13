import { spawnSync } from "child_process";
import { getConfig } from "../config.js";

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

export const countTokens = (text: string): number => {
  const { provider } = getConfig();

  if (provider === "apple") {
    const result = spawnSync("fm", ["token-count", "-q"], {
      input: text,
      encoding: "utf-8",
    });
    if (!result.error && result.stdout) {
      const tokens = parseInt(result.stdout.replace(/[^0-9]/g, ""), 10);
      if (Number.isFinite(tokens)) return tokens;
    }
  }

  return estimateTokens(text);
};

export const getContextWindow = (): number => {
  const { provider } = getConfig();

  if (provider === "apple") return 4096;

  return Number.POSITIVE_INFINITY;
};

export const RESERVED_OUTPUT_TOKENS = 512;
