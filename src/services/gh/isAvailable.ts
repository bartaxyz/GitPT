import { execSync } from "child_process";

export const isAvailable = (): boolean => {
  try {
    execSync("gh --version", { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
};
