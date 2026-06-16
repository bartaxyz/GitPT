import { getProvider } from "./registry.js";

/** Tokens reserved for the model's response when sizing the prompt budget. */
export const RESERVED_OUTPUT_TOKENS = 512;

export const countTokens = (text: string): number =>
  getProvider().countTokens(text);

export const getContextWindow = (): number =>
  getProvider().getContextWindow();
