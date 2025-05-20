import { execSync } from "child_process";

export const isAvailable = (): boolean => {
  try {
    execSync("git --version", { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
};
