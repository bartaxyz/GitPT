import { spawnSync } from "child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
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

const CONVENTIONAL =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?!?: .+/;

/**
 * Shared commit-message benchmark — the same hard/soft checks for ANY model.
 * Apple and local runners both call this, so there's no per-model copy-paste.
 * `config` is applied with withConfig (provider + model); `label` names the run.
 * Returns true when there were no hard failures.
 */
export const runBenchmark = async ({ label, config }) => {
  const { prepareCommitContext } = await importDist(
    "commands/commit/summarizeDiff.js",
  );
  const { generateCommitMessage } = await importDist(
    "commands/commit/generateCommitMessage.js",
  );
  const { countTokens, getContextWindow, RESERVED_OUTPUT_TOKENS } =
    await importDist("llm/tokenCount.js");
  const { systemPrompt } = await importDist(
    "commands/commit/context/systemPrompt.js",
  );
  const { userPrompt } = await importDist(
    "commands/commit/context/userPrompt.js",
  );

  const report = createReporter();

  return withConfig(config, async () => {
    const contextWindow = await getContextWindow();
    const promptBudget = Math.floor((contextWindow - RESERVED_OUTPUT_TOKENS) * 0.9);
    const promptTokens = (context) =>
      countTokens(`${systemPrompt}\n\n${userPrompt(context)}`);

    console.log(chalk.bold(`\n${label} — commit message benchmark`));

    report.section("Unit: token counting and context window");
    report.hard(contextWindow > 0, `context window is positive (${contextWindow})`);
    report.hard(
      countTokens("hello world") > 0,
      "countTokens is positive for non-empty input",
    );
    report.hard(
      countTokens("x".repeat(2000)) > countTokens("x".repeat(100)),
      "countTokens grows with input length",
    );

    const checkFixture = async (file, expected) => {
      report.section(`Fixture: ${file}`);
      if (expected) {
        report.info("origin", expected.origin);
        report.info("reference message", expected.reference);
        report.info("should mention", expected.shouldMention);
      }

      const diff = readFileSync(join(fixturesDir, file), "utf-8");
      const diffTokens = countTokens(diff);
      const overBudget = promptTokens(diff) > promptBudget;
      report.info("diff tokens", diffTokens);
      report.info("over budget", overBudget);

      const context = await prepareCommitContext(diff);

      if (overBudget) {
        const contextTokens = promptTokens(context);
        report.hard(
          contextTokens <= promptBudget,
          `summarized prompt fits the window (${contextTokens} <= ${promptBudget})`,
        );
        report.hard(
          countTokens(context) < diffTokens,
          "summarized context is smaller than the diff",
        );
      } else {
        report.hard(context === diff, "diff fits, so context is returned unchanged");
      }

      if (diff.includes("package-lock.json")) {
        report.hard(
          context.includes("dependency lockfile updated"),
          "lockfile condensed to a one-line note",
        );
        report.hard(
          !context.includes('"resolved": "https'),
          "raw lockfile entries not enumerated",
        );
      }

      const message = (await generateCommitMessage(context)).trim();
      report.info("commit message", chalk.cyan(message));
      report.soft(
        message.length > 0 &&
          !message.includes("\n") &&
          CONVENTIONAL.test(message) &&
          message.length <= 72,
        "guardrail: valid conventional subject (<=72, single line)",
      );

      const type = (message.match(/^(\w+)(\(.+\))?!?:/) || [])[1];
      if (expected?.type) {
        const accepted = Array.isArray(expected.type)
          ? expected.type
          : [expected.type];
        report.soft(
          accepted.includes(type),
          `type is one of [${accepted.join(", ")}] (got '${type ?? "?"}')`,
        );
      }
      if (expected?.mentions) {
        const lower = message.toLowerCase();
        report.soft(
          expected.mentions.some((m) => lower.includes(m)),
          `mentions one of [${expected.mentions.join(", ")}]`,
        );
      }
    };

    const expPath = join(fixturesDir, "expectations.json");
    const expectations = existsSync(expPath)
      ? JSON.parse(readFileSync(expPath, "utf-8"))
      : {};
    const filter = process.env.BENCH_FILTER || "";
    const fixtures = readdirSync(fixturesDir)
      .filter((file) => file.endsWith(".patch") && file.includes(filter))
      .sort();

    for (const file of fixtures) {
      try {
        await checkFixture(file, expectations[file]);
      } catch (error) {
        report.hard(
          false,
          `${file} threw: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return report.summary();
  });
};
