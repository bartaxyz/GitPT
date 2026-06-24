import { existsSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import { distDir, runBenchmark } from "../apple-foundation-models/harness.mjs";
import { localModelStatus } from "./status.mjs";

if (!existsSync(join(distDir, "config.js"))) {
  console.error(
    chalk.red("dist/ not built. Run `npm run bench:local` (it builds first)."),
  );
  process.exit(1);
}

const status = await localModelStatus();

// No reachable server / nothing configured → skip (don't fail), like Apple in CI.
if (status.state === "skip") {
  console.log(chalk.yellow(`SKIPPED: ${status.reason}.`));
  process.exit(0);
}

// Server is up but the expected model isn't loaded → hard fail: this benchmark
// is pinned and must run against exactly the model it claims to measure.
if (status.state === "wrong-model") {
  console.error(chalk.red(`Wrong model loaded — ${status.reason}.`));
  console.error(
    chalk.gray("Load the expected model in LM Studio (or set BENCH_MODEL)."),
  );
  process.exit(1);
}

const passed = await runBenchmark({
  label: `Local LLM (${status.expected})`,
  config: status.config,
});

process.exit(passed ? 0 : 1);
