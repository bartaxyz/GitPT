import chalk from "chalk";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
import { git } from "../../services/git/index.js";

const TEMPLATE_DIRS = ["", ".github", "docs"];
const TEMPLATE_FILE_PATTERN = /^pull_request_template(\.md|\.markdown|\.txt)?$/i;

export const getPRTemplate = (): string | null => {
  const root = git.getRepositoryRoot();

  for (const dir of TEMPLATE_DIRS) {
    const base = dir ? join(root, dir) : root;

    let entries: string[];
    try {
      entries = readdirSync(base);
    } catch (error) {
      continue;
    }

    const match = entries.find((entry) => TEMPLATE_FILE_PATTERN.test(entry));
    if (!match) {
      continue;
    }

    const filePath = join(base, match);
    try {
      if (!statSync(filePath).isFile()) {
        continue;
      }
      const content = readFileSync(filePath, "utf-8").trim();
      if (content) {
        console.log(
          chalk.blue(`Using PR template: ${relative(root, filePath)}`)
        );
        return content;
      }
    } catch (error) {
      continue;
    }
  }

  return null;
};
