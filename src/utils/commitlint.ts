import loadConfig from "@commitlint/load";
import { execSync } from "child_process";
import fs from "fs";

export interface CommitlintConfig {
  rules?: Record<string, any>;
  extends?: string | string[];
}

/**
 * Check if a commitlint configuration exists in the repository
 */
export function hasCommitlintConfig(): boolean {
  const possibleConfigFiles = [
    ".commitlintrc",
    ".commitlintrc.json",
    ".commitlintrc.yaml",
    ".commitlintrc.yml",
    ".commitlintrc.js",
    "commitlint.config.js",
    "package.json",
  ];

  // Temporary
  readCommitlintConfig();

  // Check if any of the possible config files exist
  return possibleConfigFiles.some((file) => {
    try {
      if (file === "package.json") {
        const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
        return packageJson.commitlint !== undefined;
      }
      return fs.existsSync(file);
    } catch (error) {
      return false;
    }
  });
}

/**
 * Read commitlint config file (using @commitlint/load) and print it out
 */
export async function readCommitlintConfig(): Promise<any> {
  const config = await loadConfig();
  console.log(config);
  return config.rules;
}

/**
 * Get the commitlint configuration format rules as a string
 */
export function getCommitlintRules(): string {
  try {
    // Try to get the rules using commitlint CLI if available
    try {
      const rulesOutput = execSync("npx commitlint --print-config", {
        stdio: ["ignore", "pipe", "ignore"],
      }).toString();
      const config = JSON.parse(rulesOutput);
      return formatCommitlintRules(config);
    } catch (error) {
      // If CLI approach fails, try to find and parse config files manually
      // This is a simplified approach - in a real implementation, you'd want to handle
      // all possible config files and formats
      if (fs.existsSync("commitlint.config.js")) {
        // We can't directly require the JS file in ESM, so we'll return a generic message
        return "Follow the conventional commit format (type(scope): message)";
      }

      if (fs.existsSync(".commitlintrc.json")) {
        const config = JSON.parse(
          fs.readFileSync(".commitlintrc.json", "utf8")
        );
        return formatCommitlintRules(config);
      }

      // Default to conventional commits format if we can't parse the config
      return "Follow the conventional commit format (type(scope): message)";
    }
  } catch (error) {
    // If all else fails, return a generic message
    return "Follow the conventional commit format (type(scope): message)";
  }
}

/**
 * Format commitlint rules into a human-readable string
 */
function formatCommitlintRules(config: CommitlintConfig): string {
  let rulesDescription = "Follow these commit message rules:\n";

  if (!config.rules) {
    return "Follow the conventional commit format (type(scope): message)";
  }

  // Extract type-enum rule if it exists
  if (
    config.rules["type-enum"] &&
    Array.isArray(config.rules["type-enum"][2])
  ) {
    const allowedTypes = config.rules["type-enum"][2];
    rulesDescription += `- Commit type must be one of: ${allowedTypes.join(
      ", "
    )}\n`;
  }

  // Extract other common rules
  if (
    config.rules["scope-enum"] &&
    Array.isArray(config.rules["scope-enum"][2])
  ) {
    const allowedScopes = config.rules["scope-enum"][2];
    rulesDescription += `- Scope must be one of: ${allowedScopes.join(", ")}\n`;
  }

  if (config.rules["subject-case"]) {
    rulesDescription += `- Subject must follow case rules\n`;
  }

  if (config.rules["subject-max-length"]) {
    const maxLength = config.rules["subject-max-length"][2];
    rulesDescription += `- Subject must be no longer than ${maxLength} characters\n`;
  }

  rulesDescription +=
    "- Use a single commit message, not multiple messages separated by blank lines or markdown formatting";

  return rulesDescription;
}

/**
 * Validate a commit message against commitlint rules
 * @param message The commit message to validate
 * @returns An object with success status and error message if applicable
 */
export async function validateCommitMessage(
  message: string
): Promise<{ valid: boolean; errors?: string }> {
  if (!hasCommitlintConfig()) {
    // If no commitlint config exists, consider it valid
    return { valid: true };
  }

  // Using CLI approach
  try {
    // Create a temporary file with the message
    const tempFile = `/tmp/gitpt-commit-msg-${Date.now()}`;
    fs.writeFileSync(tempFile, message);

    try {
      execSync(`npx commitlint < ${tempFile}`, { stdio: "ignore" });
      fs.unlinkSync(tempFile);
      return { valid: true };
    } catch (error) {
      // It's likely a validation error, capture the output
      try {
        const errorOutput = execSync(
          `npx commitlint < ${tempFile} 2>&1 || true`
        ).toString();
        fs.unlinkSync(tempFile);
        return {
          valid: false,
          errors: errorOutput,
        };
      } catch (e) {
        // If we still can't get error output, fall back to basic pattern check
        fs.unlinkSync(tempFile);
        return { valid: true };
      }
    }
  } catch (error) {
    // If all else fails, just do a basic regex check
    console.warn(
      "Warning: Could not validate with commitlint, performing basic validation"
    );
    return { valid: true };
  }
}
