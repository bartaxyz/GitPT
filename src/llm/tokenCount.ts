import { getProvider } from "./registry.js";

export const countTokens = (text: string): number =>
  getProvider().countTokens(text);

export const getContextWindow = (): Promise<number> =>
  getProvider().getContextWindow();
