import { execSync } from "child_process";

export const hasStagedChanges = (): boolean => {
  try {
    const output = execSync(
      'git diff --staged --quiet || echo "has-changes"'
    ).toString();
    return output.includes("has-changes");
  } catch (error) {
    return true; // Assume there are changes if we can't check
  }
};
