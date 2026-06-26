// Small pure helpers for reading git passthrough flags — the unknown tokens
// Commander collects in command.args (e.g. --amend, --allow-empty). Pure and
// silent on purpose, so they're easy to unit-test later.

export const hasFlag = (args: string[], flag: string): boolean =>
  args.some((arg) => arg === flag || arg.startsWith(`${flag}=`));

export const isAmend = (args: string[]): boolean => hasFlag(args, "--amend");

export const isAllowEmpty = (args: string[]): boolean =>
  hasFlag(args, "--allow-empty");

// --amend and --allow-empty are valid even with nothing staged.
export const skipsStagedGuard = (args: string[]): boolean =>
  isAmend(args) || isAllowEmpty(args);
