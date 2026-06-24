import { spawnSync } from "child_process";

export const executeGitCommit = (
  message: string,
  additionalArgs: string[] = [],
): void => {
  // Pass args as an array (no shell) so messages or flags with spaces/quotes
  // are never re-split or mis-escaped.
  const result = spawnSync(
    "git",
    ["commit", "-m", message, ...additionalArgs],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error("Failed to commit changes");
  }
};
