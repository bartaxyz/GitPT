import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import { git } from "../../services/git/index.js";
import { generateCommitMessage } from "../commit/generateCommitMessage.js";
import { prepareCommitContext } from "../commit/summarizeDiff.js";

// Marker line so uninstall only ever removes a hook we installed.
const HOOK_MARKER = "gitpt-hook";

export const HOOK_SCRIPT = `#!/bin/sh
# ${HOOK_MARKER} (prepare-commit-msg) — managed by GitPT. Remove: gitpt hook uninstall
command -v gitpt >/dev/null 2>&1 && gitpt hook run "$1" "$2" || true
`;

// Resolve the hooks dir via git so we honour core.hooksPath and worktrees,
// instead of hard-coding .git/hooks.
const resolveHooksDir = (): string => {
  const result = spawnSync("git", ["rev-parse", "--git-path", "hooks"], {
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error("Not a git repository.");
  }
  return result.stdout.trim();
};

export const hookInstallCommand = async (
  options: { force?: boolean } = {},
): Promise<void> => {
  const hookPath = join(resolveHooksDir(), "prepare-commit-msg");

  if (existsSync(hookPath)) {
    const existing = readFileSync(hookPath, "utf-8");
    if (!existing.includes(HOOK_MARKER) && !options.force) {
      console.error(
        chalk.red(`A prepare-commit-msg hook already exists at ${hookPath}.`),
      );
      console.error(
        chalk.gray(
          "Remove it, or re-run with --force, to install the GitPT hook.",
        ),
      );
      process.exit(1);
    }
  }

  mkdirSync(join(hookPath, ".."), { recursive: true });
  writeFileSync(hookPath, HOOK_SCRIPT, { mode: 0o755 });
  console.log(chalk.green(`✓ Installed GitPT hook at ${hookPath}.`));
  console.log(
    chalk.gray("`git commit` (without -m) now prefills an AI-generated message."),
  );
};

export const hookUninstallCommand = async (): Promise<void> => {
  const hookPath = join(resolveHooksDir(), "prepare-commit-msg");

  if (!existsSync(hookPath)) {
    console.log(chalk.gray("No prepare-commit-msg hook to remove."));
    return;
  }
  if (!readFileSync(hookPath, "utf-8").includes(HOOK_MARKER)) {
    console.error(
      chalk.red(
        "The prepare-commit-msg hook isn't managed by GitPT — leaving it untouched.",
      ),
    );
    process.exit(1);
  }
  rmSync(hookPath);
  console.log(chalk.green("✓ Removed GitPT prepare-commit-msg hook."));
};

// Sources where the user already has a message or it's not a plain commit:
// -m (message), a merge, a squash, or an amend (commit). Never overwrite those.
const SKIP_SOURCES = new Set(["message", "merge", "squash", "commit"]);

export const hookRunCommand = async (
  msgFile?: string,
  source?: string,
): Promise<void> => {
  try {
    if (!msgFile) return;
    if (source && SKIP_SOURCES.has(source)) return;

    const diff = git.getStagedChanges();
    if (!diff || !diff.trim()) return;

    const message = (await generateCommitMessage(await prepareCommitContext(diff))).trim();
    if (!message) return;

    // Keep git's template/comments below the generated message.
    const existing = existsSync(msgFile) ? readFileSync(msgFile, "utf-8") : "";
    writeFileSync(msgFile, `${message}\n\n${existing}`);
  } catch {
    // Degrade gracefully — a hook must never block the commit.
  }
};
