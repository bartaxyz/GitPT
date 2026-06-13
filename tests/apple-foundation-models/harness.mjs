import { spawnSync } from "child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { homedir, platform } from "os";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import chalk from "chalk";

const here = dirname(fileURLToPath(import.meta.url));

export const distDir = join(here, "..", "..", "dist");
export const fixturesDir = join(here, "..", "fixtures");

/** True when the on-device Apple model is usable (macOS 27+ with the `fm` CLI). */
export const isSupported = () => {
  if (platform() !== "darwin") return false;
  const result = spawnSync("fm", ["available", "--model", "system"], {
    encoding: "utf-8",
  });
  if (result.error) return false;
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return /available/i.test(out) && !/not available|error/i.test(out);
};

/** Dynamically import a built module from dist/ by its relative path. */
export const importDist = (relativePath) =>
  import(pathToFileURL(join(distDir, relativePath)).href);

/** Run `fn` with the GitPT config temporarily set, restoring the original after. */
export const withConfig = async (config, fn) => {
  const { saveConfig } = await importDist("config.js");
  const configPath = join(homedir(), ".config", "configstore", "gitpt.json");
  const original = existsSync(configPath)
    ? readFileSync(configPath, "utf-8")
    : null;

  try {
    saveConfig(config);
    return await fn();
  } finally {
    if (original !== null) writeFileSync(configPath, original);
    else rmSync(configPath, { force: true });
  }
};

/**
 * Minimal pass/fail reporter.
 * `hard` checks fail the suite; `soft` checks are advisory (non-deterministic
 * model output) and only warn.
 */
export const createReporter = () => {
  const tally = { hardPass: 0, hardFail: 0, softPass: 0, softFail: 0 };
  const failures = [];

  return {
    section: (title) => console.log("\n" + chalk.bold.underline(title)),
    info: (label, value) => console.log(chalk.gray(`  . ${label}: `) + value),

    hard(condition, label) {
      if (condition) {
        tally.hardPass++;
        console.log("  " + chalk.green("PASS [hard] ") + label);
      } else {
        tally.hardFail++;
        failures.push(label);
        console.log("  " + chalk.red("FAIL [hard] ") + label);
      }
    },

    soft(condition, label) {
      if (condition) {
        tally.softPass++;
        console.log("  " + chalk.green("PASS [soft] ") + label);
      } else {
        tally.softFail++;
        console.log("  " + chalk.yellow("WARN [soft] ") + label);
      }
    },

    /** Print totals and return true when there were no hard failures. */
    summary() {
      this.section("Summary");
      console.log(
        `  hard: ${chalk.green(`${tally.hardPass} passed`)}, ` +
          (tally.hardFail ? chalk.red(`${tally.hardFail} failed`) : "0 failed")
      );
      console.log(
        `  soft: ${chalk.green(`${tally.softPass} passed`)}, ` +
          (tally.softFail ? chalk.yellow(`${tally.softFail} warned`) : "0 warned") +
          " " +
          chalk.gray("(quality, non-deterministic - review manually)")
      );
      if (failures.length) {
        console.log(chalk.red("\nHard failures:"));
        for (const failure of failures) console.log(chalk.red(`  - ${failure}`));
      }
      return tally.hardFail === 0;
    },
  };
};
