import { executeGitAdd } from "./executeGitAdd";
import { executeGitCommit } from "./executeGitCommit";
import { getChangedFiles } from "./getChangedFiles";
import { getCommitsSinceBaseBranch } from "./getCommitsSinceBaseBranch";
import { getCurrentBranch } from "./getCurrentBranch";
import { getDefaultBranch } from "./getDefaultBranch";
import { getStagedChanges } from "./getStagedChanges";
import { getStagedFiles } from "./getStagedFiles";
import { hasStagedChanges } from "./hasStagedChanges";
import { isAvailable } from "./isAvailable";
import { isGitRepository } from "./isGitRepository";

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
