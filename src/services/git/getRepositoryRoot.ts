import { execSync } from "child_process";

export const getRepositoryRoot = (): string => {
  try {
    return execSync("git rev-parse --show-toplevel").toString().trim();
  } catch (error) {
    return process.cwd();
  }
};
