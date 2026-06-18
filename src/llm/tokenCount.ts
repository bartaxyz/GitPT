import { getProvider } from "./registry.js";

export const RESERVED_OUTPUT_TOKENS = 1024;

export const countTokens = (text: string): number =>
  getProvider().countTokens(text);

export const getContextWindow = (): Promise<number> =>
  getProvider().getContextWindow();
