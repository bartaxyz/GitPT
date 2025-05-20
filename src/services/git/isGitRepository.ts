import { execSync } from "child_process";

export const isGitRepository = (): boolean => {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
};
