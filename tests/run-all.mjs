import { existsSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import {
  distDir,
  isSupported,
  runBenchmark,
} from "./apple-foundation-models/harness.mjs";
import { localModelStatus } from "./local-model/status.mjs";

if (!existsSync(join(distDir, "config.js"))) {
  console.error(
    chalk.red("dist/ not built. Run `npm run bench:all` (it builds first)."),
  );
  process.exit(1);
}

// Registry of models to benchmark. Unavailable ones are skipped (not failed).
const runners = [];

if (isSupported()) {
  runners.push({
    label: "Apple Foundation Models",
    config: { provider: "apple", model: "system" },
  });
} else {
  console.log(
    chalk.yellow("SKIPPED Apple Foundation Models: needs the `fm` CLI on macOS 27+."),
  );
}

const local = await localModelStatus();
if (local.state === "ready") {
  runners.push({
    label: `Local LLM (${local.expected})`,
    config: local.config,
  });
} else {
  console.log(chalk.yellow(`SKIPPED Local LLM: ${local.reason}.`));
}

if (runners.length === 0) {
  console.log(chalk.yellow("\nNo models available to benchmark."));
  process.exit(0);
}

const results = [];
for (const runner of runners) {
  const passed = await runBenchmark(runner);
  results.push({ label: runner.label, passed });
}

console.log(chalk.bold.underline("\nAll-models summary"));
for (const { label, passed } of results) {
  console.log("  " + (passed ? chalk.green("PASS ") : chalk.red("FAIL ")) + label);
}

// Non-zero only when an available model hard-failed.
process.exit(results.some((r) => !r.passed) ? 1 : 0);
