import { existsSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import {
  distDir,
  importDist,
  runBenchmark,
} from "../apple-foundation-models/harness.mjs";

if (!existsSync(join(distDir, "config.js"))) {
  console.error(
    chalk.red("dist/ not built. Run `npm run bench:local` (it builds first)."),
  );
  process.exit(1);
}

const { getConfig } = await importDist("config.js");
const { customLLMEndpoint: endpoint, model } = getConfig();

// The benchmark is pinned to one model. Default to the configured one; allow
// an explicit override (e.g. when benchmarking a different local model).
const expected = process.env.BENCH_MODEL || model;

if (!endpoint || !expected) {
  console.log(
    chalk.yellow(
      "SKIPPED: no local endpoint/model configured. Run `gitpt setup` first.",
    ),
  );
  process.exit(0);
}

// Ask the local server which models it has and which is loaded.
const fetchModels = async () => {
  try {
    const origin = new URL(endpoint).origin;
    const res = await fetch(`${origin}/api/v0/models`);
    if (!res.ok) return null;
    return (await res.json())?.data ?? [];
  } catch {
    return null;
  }
};

const models = await fetchModels();

// No reachable server → skip (like the Apple runner in CI), don't fail.
if (models === null) {
  console.log(
    chalk.yellow(
      `SKIPPED: local LLM server not reachable at ${endpoint}. Start LM Studio.`,
    ),
  );
  process.exit(0);
}

// Server is up but the expected model isn't the loaded one → hard fail: the
// benchmark must run against exactly the model it claims to measure.
const expectedLoaded = models.some(
  (m) => m.id === expected && m.state === "loaded",
);
if (!expectedLoaded) {
  const loaded =
    models
      .filter((m) => m.state === "loaded")
      .map((m) => m.id)
      .join(", ") || "(none)";
  console.error(
    chalk.red(`Expected model "${expected}" is not the loaded model.`),
  );
  console.error(chalk.gray(`Loaded: ${loaded}. Load it in LM Studio (or set BENCH_MODEL).`));
  process.exit(1);
}

const passed = await runBenchmark({
  label: `Local LLM (${expected})`,
  config: { provider: "local", model: expected, customLLMEndpoint: endpoint },
});

process.exit(passed ? 0 : 1);
