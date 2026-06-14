import {
  getCommitlintRules,
  hasCommitlintConfig,
} from "../../../utils/commitlint.js";
import { systemPrompt } from "./systemPrompt.js";
import { userPrompt } from "./userPrompt.js";

export const buildCommitPrompt = (
  diff: string,
  validationErrors?: string
): { system: string; user: string } => {
  const baseRules = hasCommitlintConfig() ? getCommitlintRules() : "";

  const errorInfo = validationErrors
    ? `\n\nYOUR PREVIOUS MESSAGE FAILED VALIDATION WITH THESE ERRORS:\n${validationErrors}\n\nFIX THESE ISSUES IN YOUR NEW MESSAGE.`
    : "";

  return {
    system: [systemPrompt, baseRules, errorInfo].join("\n\n"),
    user: userPrompt(diff),
  };
};
