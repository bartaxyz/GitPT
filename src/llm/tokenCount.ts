import { getProvider } from "./registry.js";

export const RESERVED_OUTPUT_TOKENS = 512;

export const countTokens = (text: string): number =>
  getProvider().countTokens(text);

export const getContextWindow = (): number =>
  getProvider().getContextWindow();
