import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import {
  distDir,
  fixturesDir,
  importDist,
  isSupported,
  withConfig,
} from "./harness.mjs";

if (!isSupported()) {
  console.log(
    chalk.yellow(
      "SKIPPED: benchmark needs the Apple Foundation Models CLI ('fm') on macOS 27+."
    )
  );
  process.exit(0);
}

if (!existsSync(join(distDir, "config.js"))) {
  console.error(
    chalk.red("dist/ not built. Run `npm run bench:apple` (it builds first).")
  );
  process.exit(1);
}

const { prepareCommitContext } = await importDist("commands/commit/summarizeDiff.js");
const { generateCommitMessage } = await importDist("commands/commit/generateCommitMessage.js");

const RUNS = Math.max(1, Number(process.env.BENCH_RUNS) || 3);
const MAX_LEN = 72;
const CONVENTIONAL = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?!?: .+/;

const expectations = JSON.parse(
  readFileSync(join(fixturesDir, "expectations.json"), "utf-8")
);
const fixtures = readdirSync(fixturesDir)
  .filter((f) => f.endsWith(".patch"))
  .sort();

const scoreMessage = (message, expected) => {
  const checks = {
    format: CONVENTIONAL.test(message),
    singleLine: !message.includes("\n"),
    length: message.length <= MAX_LEN,
  };
  const type = (message.match(/^(\w+)(\(.+\))?!?:/) || [])[1];
  if (expected?.type) checks.type = type === expected.type;
  if (expected?.mentions) {
    const lower = message.toLowerCase();
    checks.mention = expected.mentions.some((m) => lower.includes(m));
  }
  return checks;
};

const pct = (passed, total) =>
  total === 0 ? null : Math.round((100 * passed) / total);

const cell = (value) =>
  (value === null ? "-" : `${value}%`).padStart(7);

const tint = (text, value) => {
  if (value === null) return chalk.gray(text);
  if (value >= 80) return chalk.green(text);
  if (value >= 50) return chalk.yellow(text);
  return chalk.red(text);
};

const passed = await withConfig({ provider: "apple", model: "system" }, async () => {
  console.log(chalk.bold("\nApple Foundation Models - commit message benchmark"));
  console.log(chalk.gray(`model: system   runs per fixture: ${RUNS}\n`));

  const rows = [];
  const samples = {};

  for (const file of fixtures) {
    const expected = expectations[file];
    const diff = readFileSync(join(fixturesDir, file), "utf-8");
    process.stdout.write(chalk.gray(`  running ${file} ...`));

    const context = await prepareCommitContext(diff);
    const messages = [];
    for (let i = 0; i < RUNS; i++) {
      messages.push((await generateCommitMessage(context)).trim());
    }
    samples[file] = messages;

    const agg = {};
    const total = {};
    for (const message of messages) {
      for (const [key, ok] of Object.entries(scoreMessage(message, expected))) {
        agg[key] = (agg[key] || 0) + (ok ? 1 : 0);
        total[key] = (total[key] || 0) + 1;
      }
    }
    rows.push({ file, agg, total });
    process.stdout.write(chalk.gray(" done\n"));
  }

  const KEYS = ["type", "mention", "format", "length"];
  const header =
    "  " +
    "fixture".padEnd(36) +
    KEYS.map((k) => k.padStart(7)).join("") +
    "score".padStart(8);
  console.log("\n" + chalk.bold(header));
  console.log(chalk.gray("  " + "-".repeat(36 + 7 * KEYS.length + 8)));

  const grand = {};
  const grandTotal = {};
  for (const { file, agg, total } of rows) {
    let scorePassed = 0;
    let scoreTotal = 0;
    for (const key of Object.keys(total)) {
      grand[key] = (grand[key] || 0) + agg[key];
      grandTotal[key] = (grandTotal[key] || 0) + total[key];
      scorePassed += agg[key];
      scoreTotal += total[key];
    }
    const cols = KEYS.map((k) => {
      const value = pct(agg[k] || 0, total[k] || 0);
      return tint(cell(value), value);
    }).join("");
    const score = pct(scorePassed, scoreTotal);
    console.log(
      "  " + file.padEnd(36) + cols + tint(cell(score), score)
    );
  }

  console.log(chalk.gray("  " + "-".repeat(36 + 7 * KEYS.length + 8)));
  let totalPassed = 0;
  let totalChecks = 0;
  for (const key of Object.keys(grandTotal)) {
    totalPassed += grand[key];
    totalChecks += grandTotal[key];
  }
  const overallCols = KEYS.map((k) => {
    const value = pct(grand[k] || 0, grandTotal[k] || 0);
    return tint(cell(value), value);
  }).join("");
  const overall = pct(totalPassed, totalChecks);
  console.log(
    "  " + chalk.bold("overall".padEnd(36)) + overallCols + tint(chalk.bold(cell(overall)), overall)
  );

  console.log(chalk.bold("\nSample messages:"));
  for (const file of fixtures) {
    console.log("  " + chalk.underline(file));
    if (expectations[file]?.reference) {
      console.log(chalk.gray(`    reference: ${expectations[file].reference}`));
    }
    for (const message of samples[file]) {
      console.log("    " + chalk.cyan(message));
    }
  }

  console.log(
    chalk.gray(
      `\nQuality score: ${overall}% (mean of all checks across ${fixtures.length} fixtures x ${RUNS} runs).`
    )
  );
  return true;
});

process.exit(passed ? 0 : 1);
