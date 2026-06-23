import { spawnSync } from "child_process";

export const executeGitCommit = (
  message: string | null,
  additionalArgs: string[] = [],
): void => {
  // message === null → no -m (e.g. `--amend --no-edit` keeps the existing one).
  // Pass args as an array (no shell) so spaces/quotes are never mis-escaped.
  const messageArgs = message === null ? [] : ["-m", message];
  const result = spawnSync(
    "git",
    ["commit", ...messageArgs, ...additionalArgs],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error("Failed to commit changes");
  }
};
