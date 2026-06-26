import { existsSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import { distDir, isSupported, runBenchmark } from "./harness.mjs";

if (!isSupported()) {
  console.log(
    chalk.yellow(
      "SKIPPED: needs the Apple Foundation Models CLI ('fm') on macOS 27+.\n" +
        "Not run in CI (no macOS 27 runners); exits 0 here.",
    ),
  );
  process.exit(0);
}

if (!existsSync(join(distDir, "config.js"))) {
  console.error(
    chalk.red("dist/ not built. Run `npm run test:apple` (it builds first)."),
  );
  process.exit(1);
}

const passed = await runBenchmark({
  label: "Apple Foundation Models",
  config: { provider: "apple", model: "system" },
});

process.exit(passed ? 0 : 1);
