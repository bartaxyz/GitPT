import { execSync } from "child_process";

export const isAvailable = (): boolean => {
  try {
    execSync("glab --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
