import { spawnSync } from "child_process";

/** Cheap, provider-agnostic fallback: ~4 characters per token. */
export const estimateTokens = (text: string): number =>
  Math.ceil(text.length / 4);

/** Exact count from the Apple Foundation Models CLI, with a safe fallback. */
export const fmTokenCount = (text: string): number => {
  const result = spawnSync("fm", ["token-count", "-q"], {
    input: text,
    encoding: "utf-8",
  });

  if (!result.error && result.stdout) {
    const tokens = parseInt(result.stdout.replace(/[^0-9]/g, ""), 10);
    if (Number.isFinite(tokens)) return tokens;
  }

  return estimateTokens(text);
};
