import { executeGitAdd } from "./executeGitAdd.js";
import { executeGitCommit } from "./executeGitCommit.js";
import { getChangedFiles } from "./getChangedFiles.js";
import { getCommitsSinceBaseBranch } from "./getCommitsSinceBaseBranch.js";
import { getCurrentBranch } from "./getCurrentBranch.js";
import { getDefaultBranch } from "./getDefaultBranch.js";
import { getStagedChanges } from "./getStagedChanges.js";
import { getStagedFiles } from "./getStagedFiles.js";
import { hasStagedChanges } from "./hasStagedChanges.js";
import { isAvailable } from "./isAvailable.js";
import { isGitRepository } from "./isGitRepository.js";

export const git = {
  add: executeGitAdd,
  commit: executeGitCommit,
  getChangedFiles,
  getCommitsSinceBaseBranch,
  getCurrentBranch,
  getDefaultBranch,
  hasStagedChanges,
  getStagedChanges,
  getStagedFiles,
  isAvailable,
  isGitRepository,
};
