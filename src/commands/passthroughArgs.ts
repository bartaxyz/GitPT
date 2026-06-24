import type { Command } from "commander";

/**
 * Extra tokens the user passed to a GitPT command that aren't GitPT's own
 * options (e.g. --allow-empty, --amend) — to forward to the wrapped git command.
 * Commander leaves these in `command.args`; we drop the command's own name in
 * case it leaks in. Shared so every command forwards passthrough flags the same
 * way.
 */
export const passthroughArgs = (command: Command): string[] =>
  (command.args ?? []).filter((arg) => arg !== command.name());
