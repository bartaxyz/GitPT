import { spawnSync } from "child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import { homedir, platform } from "os";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import chalk from "chalk";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const dist = join(root, "dist");
const fixturesDir = join(here, "..", "fixtures");

const load = (rel) => import(pathToFileURL(join(dist, rel)).href);

const fmAvailable = () => {
  if (platform() !== "darwin") return false;
  const result = spawnSync("fm", ["available", "--model", "system"], {
    encoding: "utf-8",
  });
  if (result.error) return false;
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return /available/i.test(out) && !/not available|error/i.test(out);
};

if (!fmAvailable()) {
  console.log(
    chalk.yellow(
      "SKIPPED: this suite needs the Apple Foundation Models CLI ('fm') on macOS 27+.\n" +
        "It is intentionally not run in CI (no macOS 27 runners) and exits 0 here."
    )
  );
  process.exit(0);
}

if (!existsSync(join(dist, "config.js"))) {
  console.error(chalk.red("dist/ not built. Run `npm run build` first (or `npm run test:quality`)."));
  process.exit(1);
}

const { saveConfig } = await load("config.js");
const { prepareCommitContext } = await load("commands/commit/summarizeDiff.js");
const { generateCommitMessage } = await load("commands/commit/generateCommitMessage.js");
const { countTokens, getContextWindow, RESERVED_OUTPUT_TOKENS } = await load(
  "llm/tokenCount.js"
);
const { systemPrompt } = await load("commands/commit/context/systemPrompt.js");
const { userPrompt } = await load("commands/commit/context/userPrompt.js");

const window = getContextWindow();
const hardBudget = window - RESERVED_OUTPUT_TOKENS;
const finalTokens = (ctx) => countTokens(`${systemPrompt}\n\n${userPrompt(ctx)}`);
const conventional = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?!?: .+/;

let hardPass = 0;
let hardFail = 0;
let softPass = 0;
let softFail = 0;
const failures = [];

const section = (s) => console.log("\n" + chalk.bold.underline(s));
const hard = (cond, label) => {
  if (cond) {
    hardPass++;
    console.log("  " + chalk.green("PASS [hard] ") + label);
  } else {
    hardFail++;
    failures.push(label);
    console.log("  " + chalk.red("FAIL [hard] ") + label);
  }
};
const soft = (cond, label) => {
  if (cond) {
    softPass++;
    console.log("  " + chalk.green("PASS [soft] ") + label);
  } else {
    softFail++;
    console.log("  " + chalk.yellow("WARN [soft] ") + label);
  }
};
const info = (label, value) =>
  console.log("  " + chalk.gray(`. ${label}: `) + value);

const cfgPath = join(homedir(), ".config", "configstore", "gitpt.json");
const originalConfig = existsSync(cfgPath) ? readFileSync(cfgPath, "utf-8") : null;

try {
  saveConfig({ provider: "apple", model: "system" });

  section("Unit: token counting and context window");
  hard(window === 4096, "Apple on-device context window is 4096");
  hard(countTokens("hello world") > 0, "countTokens is positive for non-empty input");
  hard(
    countTokens("x".repeat(2000)) > countTokens("x".repeat(100)),
    "countTokens grows with input length"
  );

  const fixtures = readdirSync(fixturesDir)
    .filter((f) => f.endsWith(".patch"))
    .sort();

  for (const file of fixtures) {
    section(`Fixture: ${file}`);
    const diff = readFileSync(join(fixturesDir, file), "utf-8");

    try {
      const diffTokens = countTokens(diff);
      const overBudget = finalTokens(diff) > hardBudget;
      info("diff tokens", diffTokens);
      info("over budget", overBudget);

      const context = await prepareCommitContext(diff);

      if (!overBudget) {
        hard(context === diff, "fits already -> context returned unchanged");
      } else {
        const ctxTokens = finalTokens(context);
        hard(
          ctxTokens <= hardBudget,
          `summarized prompt fits window (${ctxTokens} <= ${hardBudget})`
        );
        hard(
          countTokens(context) < diffTokens,
          "summarized context is smaller than the original diff"
        );
      }

      if (/package-lock\.json/.test(diff)) {
        hard(
          context.includes("dependency lockfile updated"),
          "lockfile condensed to a one-line note"
        );
        hard(
          !context.includes('"resolved": "https'),
          "raw lockfile entries not enumerated in context"
        );
      }

      const message = (await generateCommitMessage(context)).trim();
      info("commit message", chalk.cyan(message));
      soft(message.length > 0, "message is non-empty");
      soft(!message.includes("\n"), "message is a single line");
      soft(conventional.test(message), "message uses conventional-commit format");
    } catch (error) {
      hard(false, `threw: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} finally {
  if (originalConfig !== null) writeFileSync(cfgPath, originalConfig);
  else rmSync(cfgPath, { force: true });
}

section("Summary");
console.log(
  `  hard: ${chalk.green(`${hardPass} passed`)}, ${
    hardFail ? chalk.red(`${hardFail} failed`) : "0 failed"
  }`
);
console.log(
  `  soft: ${chalk.green(`${softPass} passed`)}, ${
    softFail ? chalk.yellow(`${softFail} warned`) : "0 warned"
  } ${chalk.gray("(quality, non-deterministic - review manually)")}`
);
if (failures.length) {
  console.log(chalk.red("\nHard failures:"));
  for (const f of failures) console.log(chalk.red(`  - ${f}`));
}

process.exit(hardFail > 0 ? 1 : 0);
